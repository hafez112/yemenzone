import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityService } from '../../common/security.service';
import { DeliveryAiService } from './delivery-ai.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebPushService } from '../notifications/push.service';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private security: SecurityService,
    private ai: DeliveryAiService,
    private messaging: MessagingService,
    private notifications: NotificationsService,
    private finance: FinanceService,
    private webPush: WebPushService,
  ) {}

  // ── دخول السائق (جوال + كلمة مرور) ──
  async driverLogin(phone: string, password: string, ip: string) {
    if (await this.security.isIpBanned(ip)) throw new UnauthorizedException('تم حظر هذا العنوان');
    if (!this.security.checkAttempts(`drv:${ip}`)) throw new UnauthorizedException('محاولات كثيرة — حاول بعد 10 دقائق');

    const driver = await this.prisma.driver.findUnique({ where: { phone } });
    if (!driver || !driver.isActive || !driver.passwordHash) {
      this.security.failAttempt(`drv:${ip}`);
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }
    const ok = await argon2.verify(driver.passwordHash, password);
    if (!ok) {
      this.security.failAttempt(`drv:${ip}`);
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }
    this.security.clearAttempts(`drv:${ip}`);
    const tokens = await this.security.issueTokens('driver', driver.id);
    await this.security.log('driver_login', { ip, userType: 'driver', userId: driver.id, details: `سائق: ${driver.name}` });
    return { ...tokens, driver: { id: driver.id, name: driver.name, phone: driver.phone, vehicle: driver.vehicle, governorate: driver.governorate } };
  }

  // ── طلبات السائق ──
  async driverOrders(driverId: string, status?: string) {
    const where: any = { driverId };
    if (status && status !== 'all') where.status = status;
    else where.status = { in: ['confirmed', 'processing', 'shipped', 'delivered'] };
    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { store: { select: { name: true, slug: true, phone: true, governorate: true } }, items: true },
      take: 50,
    });
    const counts = await this.prisma.order.groupBy({
      by: ['status'],
      where: { driverId, status: { in: ['confirmed', 'processing', 'shipped', 'delivered'] } },
      _count: true,
    });
    return { orders, counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) };
  }

  // ── تحديث حالة الطلب من السائق (مسموح: shipped / delivered فقط) ──
  // 📍 تحديث موقع السائق المباشر — بقراره، أثناء جولات التوصيل
  async driverUpdateLocation(driverId: string, body: any) {
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new BadRequestException('إحداثيات غير صالحة');
    }
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, locationAt: new Date() },
    });
    return { ok: true };
  }

  // 📍 إيقاف مشاركة الموقع (نهاية الجولة)
  async driverClearLocation(driverId: string) {
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { lat: null, lng: null, locationAt: null },
    });
    return { ok: true };
  }

  async driverUpdateStatus(driverId: string, orderId: string, status: string) {
    if (!['shipped', 'delivered'].includes(status))
      throw new BadRequestException('السائق يمكنه فقط تحديث: في الطريق / تم التسليم');
    const order = await this.prisma.order.findFirst({ where: { id: orderId, driverId } });
    if (!order) throw new NotFoundException('الطلب غير موجود أو غير مسند إليك');
    const updated = await this.prisma.order.update({ where: { id: orderId }, data: { status: status as any } });
    await this.security.log('driver_order_status', { userType: 'driver', userId: driverId, details: `طلب ${order.number} → ${status}` });

    // 🤝 خصم عمولة المنصة عند التسليم (مرة واحدة)
    if (status === 'delivered') {
      await this.finance.chargeCommissionForOrder(orderId).catch(() => {});
      // 💰 أجرة التوصيل تُودع في محفظة السائق عندما يكون الدفع مسبقاً ببطاقة يمن زون
      await this.creditDriverForOrder(orderId).catch(() => {});
    }

    // 🔔 تنبيه العميل: طلبه في الطريق أو وصل
    if (order.customerId) {
      await this.notifications.push('customer', order.customerId, {
        icon: status === 'shipped' ? '🚚' : '📍',
        title: status === 'shipped' ? `طلبك ${order.number} في الطريق إليك` : `طلبك ${order.number} وصل`,
        body: status === 'shipped' ? 'المندوب خرج بطلبك — تجهّز للاستلام' : 'سلّمك المندوب الطلب — نتمنى أن ينال رضاك',
        link: `/track?number=${order.number}&phone=${encodeURIComponent(order.customerPhone)}`,
      });
    }
    // 🔔 تنبيه البائع بحركة سائقه
    const store = await this.prisma.store.findUnique({ where: { id: order.storeId } });
    if (store) {
      await this.notifications.push('seller', store.sellerId, {
        icon: status === 'shipped' ? '🚚' : '📍',
        title: status === 'shipped' ? `الطلب ${order.number} خرج للتوصيل` : `سائقك سلّم الطلب ${order.number}`,
        body: `${order.customerName} — ${Number(order.total).toLocaleString()} ر.ي`,
        link: '/seller/orders',
      });
    }
    return updated;
  }

  // ═══════════════ 💰 محفظة السائق ═══════════════

  // إيداع أجرة التوصيل — مرة واحدة لكل طلب (idempotent عبر referenceId)
  private async creditDriverForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !order.driverId) return;
    // فقط المدفوع مسبقاً ببطاقة يمن زون — النقدي يحصّله السائق من العميل مباشرة
    if (order.paymentMethod !== 'card') return;
    const fee = Number(order.deliveryFee || 0);
    if (fee <= 0) return;
    const wallet = await this.prisma.driverWallet.upsert({
      where: { driverId: order.driverId },
      update: {},
      create: { driverId: order.driverId },
    });
    // حماية من الإيداع المزدوج
    const dup = await this.prisma.driverWalletTransaction.findFirst({
      where: { walletId: wallet.id, referenceId: order.number, type: 'credit' },
    });
    if (dup) return;
    await this.prisma.$transaction([
      this.prisma.driverWallet.update({ where: { id: wallet.id }, data: { balance: { increment: fee } } }),
      this.prisma.driverWalletTransaction.create({
        data: { walletId: wallet.id, type: 'credit', amount: fee, currency: order.currency || 'YER', note: `أجرة توصيل الطلب ${order.number}`, referenceId: order.number },
      }),
    ]);
    await this.notifications.push('driver', order.driverId, {
      icon: '💰', title: 'أُودعت أجرة التوصيل في محفظتك',
      body: `${fee.toLocaleString()} ${order.currency || 'ر.ي'} — الطلب ${order.number}`,
      link: '/driver/wallet',
    }).catch(() => {});
  }

  // 💰 محفظة السائق: الرصيد + الحركات + طلبات السحب
  async driverWallet(driverId: string) {
    const wallet = await this.prisma.driverWallet.upsert({
      where: { driverId }, update: {}, create: { driverId },
    });
    const [transactions, withdrawals] = await Promise.all([
      this.prisma.driverWalletTransaction.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.driverWithdrawal.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    return { balance: Number(wallet.balance), currency: wallet.currency, transactions, withdrawals };
  }

  // 📤 طلب سحب — يحجز المبلغ فوراً، ويُعاد عند الرفض
  async driverWithdraw(driverId: string, body: any) {
    const amount = Math.round(Number(body.amount || 0));
    if (!isFinite(amount) || amount <= 0) throw new BadRequestException('المبلغ غير صالح');
    if (amount < 1000) throw new BadRequestException('أقل مبلغ للسحب 1,000 ر.ي');
    const wallet = await this.prisma.driverWallet.upsert({
      where: { driverId }, update: {}, create: { driverId },
    });
    if (Number(wallet.balance) < amount) throw new BadRequestException('الرصيد غير كافٍ');
    const method = String(body.method || '').trim().slice(0, 50);
    const accountInfo = String(body.accountInfo || '').trim().slice(0, 200);
    if (!method || !accountInfo) throw new BadRequestException('حدد طريقة الاستلام وبياناته');

    const [withdrawal] = await this.prisma.$transaction([
      this.prisma.driverWithdrawal.create({
        data: { walletId: wallet.id, amount, currency: wallet.currency, method, accountInfo },
      }),
      this.prisma.driverWallet.update({ where: { id: wallet.id }, data: { balance: { decrement: amount } } }),
      this.prisma.driverWalletTransaction.create({
        data: { walletId: wallet.id, type: 'debit', amount, currency: wallet.currency, note: 'حجز لطلب سحب' },
      }),
    ]);
    await this.security.log('driver_withdraw_request', { userType: 'driver', userId: driverId, details: `سحب ${amount} ${wallet.currency} عبر ${method}` });
    return { ok: true, withdrawal };
  }

  // ── الإدارة: طلبات سحب السائقين ──
  async adminDriverWithdrawals(status?: string) {
    const where: any = status && status !== 'all' ? { status } : {};
    const rows = await this.prisma.driverWithdrawal.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 100,
      include: { wallet: { include: { driver: { select: { id: true, name: true, phone: true, governorate: true } } } } },
    });
    const counts = await this.prisma.driverWithdrawal.groupBy({ by: ['status'], _count: { status: true } });
    return {
      withdrawals: rows.map((w) => ({ ...w, driver: w.wallet.driver, wallet: undefined })),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count.status])),
    };
  }

  // ✅ اعتماد/رفض طلب السحب — الرفض يعيد المبلغ للمحفظة
  async adminProcessDriverWithdrawal(id: string, approve: boolean, note?: string) {
    const w = await this.prisma.driverWithdrawal.findUnique({ where: { id } });
    if (!w) throw new NotFoundException('الطلب غير موجود');
    if (w.status !== 'pending') throw new BadRequestException('الطلب عولج مسبقاً');
    if (approve) {
      await this.prisma.driverWithdrawal.update({
        where: { id }, data: { status: 'paid', processedAt: new Date(), note: note || w.note },
      });
    } else {
      await this.prisma.$transaction([
        this.prisma.driverWithdrawal.update({
          where: { id }, data: { status: 'rejected', processedAt: new Date(), note: note || w.note },
        }),
        this.prisma.driverWallet.update({ where: { id: w.walletId }, data: { balance: { increment: w.amount } } }),
        this.prisma.driverWalletTransaction.create({
          data: { walletId: w.walletId, type: 'credit', amount: w.amount, currency: w.currency, note: 'إعادة مبلغ سحب مرفوض' },
        }),
      ]);
    }
    const wallet = await this.prisma.driverWallet.findUnique({ where: { id: w.walletId } });
    if (wallet) {
      await this.notifications.push('driver', wallet.driverId, {
        icon: approve ? '✅' : '⚠️',
        title: approve ? 'تم صرف طلب السحب' : 'رُفض طلب السحب وأُعيد المبلغ',
        body: `${Number(w.amount).toLocaleString()} ${w.currency}`,
        link: '/driver/wallet',
      }).catch(() => {});
    }
    return { ok: true };
  }

  // ── البائع: السائقون + اقتراح ذكي ──
  async sellerDrivers(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    const suggestion = await this.ai.suggestDriver(store.governorate);
    const unassigned = await this.prisma.order.count({
      where: { storeId: store.id, driverId: null, status: { in: ['confirmed', 'processing'] } },
    });
    const linkedCompanies = await this.prisma.storeDeliveryCompany.count({ where: { storeId: store.id } });
    const activeDrivers = suggestion.drivers.length;
    // 🛵 السائقون المربوطون بالمتجر (تسندهم الإدارة) — يظهرون أولاً بشارة
    const linked = await this.prisma.storeDriver.findMany({ where: { storeId: store.id }, select: { driverId: true } });
    const linkedIds = new Set(linked.map((l) => l.driverId));
    const drivers = suggestion.drivers
      .map((d: any) => ({ ...d, linked: linkedIds.has(d.id) }))
      .sort((a: any, b: any) => Number(b.linked) - Number(a.linked) || b.score - a.score);
    return {
      ...suggestion,
      drivers,
      linkedDrivers: linkedIds.size,
      eta: this.ai.estimateDelivery(suggestion.suggested?.governorate, store.governorate),
      tips: this.ai.sellerTips(activeDrivers, unassigned, linkedCompanies),
      unassigned,
    };
  }

  // ── البائع: طلبات تحتاج تعيين سائق ──
  async sellerOrdersToAssign(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    return this.prisma.order.findMany({
      where: { storeId: store.id, status: { in: ['confirmed', 'processing', 'shipped'] } },
      orderBy: { createdAt: 'desc' },
      include: { driver: { select: { id: true, name: true, phone: true } }, items: true },
      take: 50,
    });
  }

  // ── البائع: تعيين سائق لطلب ──
  async assignDriver(sellerId: string, orderId: string, driverId: string | null) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    const order = await this.prisma.order.findFirst({ where: { id: orderId, storeId: store.id } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (driverId) {
      const driver = await this.prisma.driver.findFirst({ where: { id: driverId, isActive: true } });
      if (!driver) throw new BadRequestException('السائق غير متاح');
      // 🔗 إن ربطت الإدارة سائقين بهذا المتجر — التعيين يقتصر عليهم
      const linked = await this.prisma.storeDriver.findMany({ where: { storeId: store.id }, select: { driverId: true } });
      if (linked.length && !linked.some((l) => l.driverId === driverId)) {
        throw new BadRequestException('هذا السائق غير مرتبط بمتجرك — الإدارة أسندت لك سائقين محددين، اختر منهم أو اطلب ربط سائق جديد');
      }
      // 📨 إشعار العميل بأن طلبه مع السائق
      await this.messaging.send('driver_assigned', order.customerPhone, {
        name: order.customerName, number: order.number,
        driver: driver.name, driverPhone: driver.phone,
      });
      // 📲 إشعار فوري للسائق بالطلب المُسند — يصله حتى وتطبيقه مغلق
      this.webPush.sendToUser('driver', driver.id, {
        title: `🛵 طلب توصيل جديد ${order.number}`,
        body: `${store.name} — ${order.customerName} · افتح لوحتك لقبول المشوار`,
        url: '/driver',
      });
    }
    return this.prisma.order.update({ where: { id: orderId }, data: { driverId } });
  }

  // ── البائع: شركات التوصيل (المتاحة + المرتبطة) ──
  async sellerCompanies(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    const companies = await this.prisma.deliveryCompany.findMany({ where: { isActive: true } });
    const links = await this.prisma.storeDeliveryCompany.findMany({ where: { storeId: store.id } });
    const linkedIds = new Set(links.map((l) => l.companyId));
    return {
      companies: companies.map((c) => ({ ...c, apiKey: undefined, linked: linkedIds.has(c.id) })),
    };
  }

  async linkCompany(sellerId: string, companyId: string, link: boolean) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    if (link) {
      await this.prisma.storeDeliveryCompany.upsert({
        where: { storeId_companyId: { storeId: store.id, companyId } },
        create: { storeId: store.id, companyId },
        update: {},
      });
    } else {
      await this.prisma.storeDeliveryCompany.deleteMany({ where: { storeId: store.id, companyId } });
    }
    return { ok: true };
  }

  // ── الإدارة: سائقون CRUD ──
  async adminDrivers(q?: string) {
    const drivers = await this.prisma.driver.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {},
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
      take: 100,
    });
    return drivers.map((d) => ({ ...d, passwordHash: undefined, ordersCount: d._count.orders }));
  }

  async adminSaveDriver(body: { id?: string; name: string; phone: string; password?: string; vehicle?: string; governorate?: string; isActive?: boolean }) {
    const data: any = {
      name: body.name,
      phone: body.phone,
      vehicle: body.vehicle || null,
      governorate: body.governorate || null,
      isActive: body.isActive ?? true,
    };
    if (body.password) data.passwordHash = await argon2.hash(body.password);
    if (body.id) {
      const { password, ...rest } = body as any;
      return this.prisma.driver.update({ where: { id: body.id }, data });
    }
    if (!body.password) throw new BadRequestException('كلمة المرور مطلوبة للسائق الجديد');
    return this.prisma.driver.create({ data });
  }

  async adminToggleDriver(id: string) {
    const d = await this.prisma.driver.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('السائق غير موجود');
    return this.prisma.driver.update({ where: { id }, data: { isActive: !d.isActive } });
  }

  async adminDeleteDriver(id: string) {
    await this.prisma.order.updateMany({ where: { driverId: id }, data: { driverId: null } });
    return this.prisma.driver.delete({ where: { id } });
  }

  // ── الإدارة: شركات توصيل CRUD ──
  adminCompanies() {
    return this.prisma.deliveryCompany.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { stores: true } } },
    });
  }

  adminSaveCompany(body: { id?: string; name: string; apiUrl?: string; apiKey?: string; panelUrl?: string; isActive?: boolean }) {
    const data = {
      name: body.name,
      apiUrl: body.apiUrl || null,
      apiKey: body.apiKey || null,
      panelUrl: body.panelUrl || null,
      isActive: body.isActive ?? true,
    };
    if (body.id) return this.prisma.deliveryCompany.update({ where: { id: body.id }, data });
    return this.prisma.deliveryCompany.create({ data });
  }

  async adminToggleCompany(id: string) {
    const c = await this.prisma.deliveryCompany.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('الشركة غير موجودة');
    return this.prisma.deliveryCompany.update({ where: { id }, data: { isActive: !c.isActive } });
  }

  adminDeleteCompany(id: string) {
    return this.prisma.deliveryCompany.delete({ where: { id } });
  }

  // ═══ الإدارة: ربط السائقين وشركات التوصيل بمتاجر البائعين ═══

  // متاجر + روابطها الحالية + كل السائقين والشركات للتبديل
  async adminDeliveryLinks(q?: string) {
    const [stores, drivers, companies] = await Promise.all([
      this.prisma.store.findMany({
        where: q ? { OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ] } : {},
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true, name: true, slug: true, governorate: true, status: true,
          seller: { select: { name: true, phone: true } },
          deliveryCompanies: { select: { companyId: true } },
          drivers: { select: { driverId: true } },
        },
      }),
      this.prisma.driver.findMany({
        where: { isActive: true }, orderBy: { name: 'asc' }, take: 100,
        select: { id: true, name: true, phone: true, vehicle: true, governorate: true },
      }),
      this.prisma.deliveryCompany.findMany({
        where: { isActive: true }, orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
    ]);
    return {
      drivers, companies,
      stores: stores.map((s) => ({
        id: s.id, name: s.name, slug: s.slug, governorate: s.governorate, status: s.status,
        sellerName: s.seller?.name, sellerPhone: s.seller?.phone,
        companyIds: s.deliveryCompanies.map((c) => c.companyId),
        driverIds: s.drivers.map((d) => d.driverId),
      })),
    };
  }

  async adminLinkCompany(storeId: string, companyId: string, link: boolean) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('المتجر غير موجود');
    const company = await this.prisma.deliveryCompany.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('شركة التوصيل غير موجودة');
    if (link) {
      await this.prisma.storeDeliveryCompany.upsert({
        where: { storeId_companyId: { storeId, companyId } },
        create: { storeId, companyId }, update: {},
      });
    } else {
      await this.prisma.storeDeliveryCompany.deleteMany({ where: { storeId, companyId } });
    }
    await this.security.log('admin_delivery_link', { details: `${link ? 'ربط' : 'فك'} شركة ${company.name} ${link ? 'بـ' : 'من'} متجر ${store.name}` });
    // 🔔 تنبيه البائع بالربط الجديد
    if (link) {
      await this.notifications.push('seller', store.sellerId, {
        icon: '🚚', title: `الإدارة ربطت متجرك بشركة ${company.name}`,
        body: 'يمكنك الآن الشحن عبرها — راجع قسم التوصيل في لوحتك', link: '/seller/delivery',
      });
    }
    return { ok: true };
  }

  async adminLinkDriver(storeId: string, driverId: string, link: boolean) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('المتجر غير موجود');
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('السائق غير موجود');
    if (link) {
      await this.prisma.storeDriver.upsert({
        where: { storeId_driverId: { storeId, driverId } },
        create: { storeId, driverId }, update: {},
      });
    } else {
      await this.prisma.storeDriver.deleteMany({ where: { storeId, driverId } });
    }
    await this.security.log('admin_delivery_link', { details: `${link ? 'إسناد' : 'فك'} السائق ${driver.name} ${link ? 'إلى' : 'من'} متجر ${store.name}` });
    if (link) {
      await this.notifications.push('seller', store.sellerId, {
        icon: '🛵', title: `الإدارة أسندت لك السائق ${driver.name}`,
        body: 'أصبح متاحاً لتعيين طلباتك من لوحة التوصيل', link: '/seller/delivery',
      });
    }
    return { ok: true };
  }
}
