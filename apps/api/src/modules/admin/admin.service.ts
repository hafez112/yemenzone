import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SecurityService } from '../../common/security.service';
import { FEATURE_AR } from '../../common/features';
import { levelOf } from '../../common/seller-levels';
import { generateTotpSecret, verifyTotp, otpauthUrl } from '../../common/totp';
import { encryptSecret, decryptSecret, isEncrypted } from '../../common/crypto.util';
import * as argon2 from 'argon2';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private security: SecurityService,
  ) {}

  // ═══ 👤 حساب المدير — كل مدير يعدّل حسابه بنفسه ═══
  // 🔔 تنبيهات الإدارة — كل ما يحتاج إجراءً الآن: مدفوعات معلقة، شكاوى مفتوحة، توثيق، نطاقات
  async alerts() {
    const since24 = new Date(Date.now() - 24 * 3600 * 1000);
    const [payments, complaints, verifications, domains, security, pwa] = await Promise.all([
      this.prisma.payment.count({ where: { status: 'pending' } }),
      this.prisma.complaint.count({ where: { status: 'open' } }),
      this.prisma.verificationRequest.count({ where: { status: 'pending' } }),
      this.prisma.store.count({ where: { customDomainStatus: 'pending' } }),
      // 🚨 أحداث أمنية مشبوهة خلال 24 ساعة: محاولات فاشلة + حظر تلقائي
      this.prisma.securityLog.count({
        where: { createdAt: { gte: since24 }, OR: [{ event: { contains: 'fail' } }, { event: { contains: 'auto_ban' } }] },
      }),
      // 📱 طلبات تطبيقات الويب التقدمية المعلقة
      this.prisma.pwaRequest.count({ where: { status: 'pending' } }),
    ]);
    const [recentPayments, recentComplaints, recentVerifs, recentDomains, recentSecurity] = await Promise.all([
      this.prisma.payment.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 3 }),
      this.prisma.complaint.findMany({ where: { status: 'open' }, orderBy: { createdAt: 'desc' }, take: 3 }),
      this.prisma.verificationRequest.findMany({
        where: { status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 3,
        include: { store: { select: { name: true } } },
      }),
      this.prisma.store.findMany({
        where: { customDomainStatus: 'pending' }, orderBy: { domainRequestedAt: 'desc' }, take: 3,
        select: { name: true, customDomain: true, domainRequestedAt: true },
      }),
      this.prisma.securityLog.findMany({
        where: { createdAt: { gte: since24 }, OR: [{ event: { contains: 'fail' } }, { event: { contains: 'auto_ban' } }] },
        orderBy: { createdAt: 'desc' }, take: 3,
      }),
    ]);
    const groups = [
      { key: 'payments', icon: '💳', label: 'إثباتات دفع معلقة', count: payments, link: '/admin/payments' },
      { key: 'complaints', icon: '📣', label: 'شكاوى مفتوحة', count: complaints, link: '/admin/complaints' },
      { key: 'verifications', icon: '🎖️', label: 'طلبات توثيق المتاجر', count: verifications, link: '/admin/verification' },
      { key: 'domains', icon: '🌐', label: 'طلبات النطاقات الخاصة', count: domains, link: '/admin/domains' },
      { key: 'security', icon: '🚨', label: 'محاولات مشبوهة (24 ساعة)', count: security, link: '/admin/security' },
      { key: 'pwa', icon: '📱', label: 'طلبات تطبيقات الويب', count: pwa, link: '/admin/pwa-apps' },
    ];
    const recent = [
      ...recentPayments.map((p) => ({ icon: '💳', title: `دفعة ${p.number}`, body: `${Number(p.amount).toLocaleString()} ${p.currency} — ${p.purpose}`, link: '/admin/payments', at: p.createdAt })),
      ...recentComplaints.map((c) => ({ icon: '📣', title: `شكوى ${c.number}`, body: `${c.name}: ${c.subject}`, link: '/admin/complaints', at: c.createdAt })),
      ...recentVerifs.map((v) => ({ icon: '🎖️', title: 'طلب توثيق متجر', body: v.store?.name || '', link: '/admin/verification', at: v.createdAt })),
      ...recentDomains.map((d) => ({ icon: '🌐', title: 'طلب نطاق خاص', body: `${d.name} — ${d.customDomain || ''}`, link: '/admin/domains', at: d.domainRequestedAt })),
      ...recentSecurity.map((s) => ({ icon: s.event.includes('auto_ban') ? '🤖' : '🚨', title: s.event.includes('auto_ban') ? 'حظر تلقائي لعنوان مهاجم' : 'محاولات دخول فاشلة', body: `${s.ip || 'IP غير معروف'} — ${s.event}`, link: '/admin/security', at: s.createdAt })),
    ].sort((a, b) => +new Date(b.at || 0) - +new Date(a.at || 0)).slice(0, 8);
    return { total: payments + complaints + verifications + domains + security + pwa, groups, recent };
  }

  async getMe(adminId: string) {    const me = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!me) throw new NotFoundException('الحساب غير موجود');
    return {
      id: me.id, name: me.name, email: me.email, isSuper: me.isSuper,
      permissions: (me.permissions as string[]) || [], status: me.status,
      totpEnabled: me.totpEnabled,
      lastLoginAt: me.lastLoginAt, createdAt: me.createdAt,
    };
  }

  // ═══ 🔐 المصادقة الثنائية (TOTP) لحسابات الإدارة ═══

  // 1) توليد سر جديد — يُحفظ مشفّراً ولا يُفعّل حتى إثبات الرمز
  async twoFactorSetup(adminId: string) {
    const me = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!me) throw new NotFoundException('الحساب غير موجود');
    if (me.totpEnabled) throw new BadRequestException('المصادقة الثنائية مفعّلة أصلاً — عطّلها أولاً لإعادة الضبط');
    const secret = generateTotpSecret();
    await this.prisma.adminUser.update({ where: { id: adminId }, data: { totpSecret: encryptSecret(secret) } });
    return { secret, url: otpauthUrl(secret, me.email) };
  }

  // 2) تفعيل — يتطلب رمزاً صحيحاً من تطبيق المصادقة
  async twoFactorEnable(adminId: string, code: string) {
    const me = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!me?.totpSecret) throw new BadRequestException('ابدأ بإعداد المصادقة أولاً');
    const secret = decryptSecret(me.totpSecret);
    if (!secret || !verifyTotp(secret, code)) throw new BadRequestException('رمز التحقق غير صحيح — تأكد من تطابق ساعة جهازك');
    await this.prisma.adminUser.update({ where: { id: adminId }, data: { totpEnabled: true } });
    await this.security.log('admin.2fa_enabled', { userType: 'admin', userId: adminId });
    return { ok: true };
  }

  // 3) تعطيل — يتطلب رمزاً صحيحاً (إثبات الملكية قبل الإطفاء)
  async twoFactorDisable(adminId: string, code: string) {
    const me = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!me?.totpEnabled || !me.totpSecret) throw new BadRequestException('المصادقة الثنائية غير مفعّلة');
    const secret = decryptSecret(me.totpSecret);
    if (!secret || !verifyTotp(secret, code)) throw new BadRequestException('رمز التحقق غير صحيح');
    await this.prisma.adminUser.update({ where: { id: adminId }, data: { totpEnabled: false, totpSecret: null } });
    await this.security.log('admin.2fa_disabled', { userType: 'admin', userId: adminId });
    return { ok: true };
  }

  // ═══ 📜 سجل التدقيق الإداري — استعراض وفلترة ═══
  async auditLogs(q: { method?: string; adminId?: string; search?: string; from?: string; to?: string; page?: string }) {
    const page = Math.max(Number(q.page) || 1, 1);
    const take = 30;
    const where: any = {
      ...(q.method ? { method: q.method } : {}),
      ...(q.adminId ? { adminId: q.adminId } : {}),
      ...(q.search ? { path: { contains: q.search } } : {}),
      ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to + 'T23:59:59') } : {}) } } : {}),
    };
    const [rows, total, admins] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take }),
      this.prisma.auditLog.count({ where }),
      this.prisma.adminUser.findMany({ select: { id: true, name: true, email: true } }),
    ]);
    const names = Object.fromEntries(admins.map((a) => [a.id, a.name || a.email]));
    return {
      rows: rows.map((r) => ({ ...r, adminName: r.adminId ? names[r.adminId] || 'مدير محذوف' : '—' })),
      total, pages: Math.ceil(total / take), page,
      admins: admins.map((a) => ({ id: a.id, name: a.name || a.email })),
    };
  }

  async updateMe(adminId: string, body: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    const me = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!me) throw new NotFoundException('الحساب غير موجود');
    const data: any = {};

    if (body.name !== undefined) {
      const name = String(body.name || '').trim();
      if (name.length < 2) throw new BadRequestException('الاسم قصير جداً');
      data.name = name.slice(0, 60);
    }

    if (body.email !== undefined) {
      const email = String(body.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('البريد الإلكتروني غير صالح');
      const dup = await this.prisma.adminUser.findUnique({ where: { email } });
      if (dup && dup.id !== adminId) throw new BadRequestException('البريد مستخدم من مدير آخر');
      data.email = email;
    }

    // 🔑 تغيير كلمة المرور يتطلب تأكيد الحالية — حماية حتى لو تُركت الجلسة مفتوحة
    if (body.newPassword) {
      if (String(body.newPassword).length < 8) throw new BadRequestException('كلمة المرور الجديدة 8 أحرف على الأقل');
      if (!body.currentPassword) throw new BadRequestException('أدخل كلمة المرور الحالية للتأكيد');
      const ok = await argon2.verify(me.passwordHash, body.currentPassword).catch(() => false);
      if (!ok) throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');
      data.passwordHash = await argon2.hash(body.newPassword);
    }

    if (Object.keys(data).length === 0) throw new BadRequestException('لا توجد تغييرات');
    await this.prisma.adminUser.update({ where: { id: adminId }, data });
    await this.security.log('admin.self_updated', { userType: 'admin', userId: adminId, details: { fields: Object.keys(data) } });
    return { ok: true };
  }

  // ═══ 📈 تحليلات المنصة — نمو 6 أشهر + توزيع + نصائح ذكية محلية ═══
  async analytics() {
    const now = new Date();
    const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    // أداء آخر 6 أشهر
    const months: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const [newStores, orders, subsRev, adsRev, gmv] = await Promise.all([
        this.prisma.store.count({ where: { createdAt: { gte: from, lt: to } } }),
        this.prisma.order.count({ where: { createdAt: { gte: from, lt: to } } }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { purpose: 'subscription', status: 'approved', reviewedAt: { gte: from, lt: to } },
        }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { purpose: 'ad', status: 'approved', reviewedAt: { gte: from, lt: to } },
        }),
        this.prisma.order.aggregate({
          _sum: { total: true },
          where: { createdAt: { gte: from, lt: to }, status: { notIn: ['cancelled', 'refunded'] } },
        }),
      ]);
      months.push({
        label: AR_MONTHS[from.getMonth()],
        newStores, orders,
        subsRevenue: Number(subsRev._sum.amount || 0),
        adsRevenue: Number(adsRev._sum.amount || 0),
        gmv: Number(gmv._sum.total || 0),
      });
    }

    // توزيع المتاجر على المحافظات (أعلى 6)
    const govRaw = await this.prisma.store.groupBy({
      by: ['governorate'],
      _count: { governorate: true },
      orderBy: { _count: { governorate: 'desc' } },
      take: 6,
    });
    const topGovs = govRaw
      .filter((g) => g.governorate)
      .map((g) => ({ name: g.governorate, count: g._count.governorate }));

    // توزيع الاشتراكات على الخطط
    const planRaw = await this.prisma.subscription.groupBy({ by: ['planId'], _count: { planId: true } });
    const planNames = await this.prisma.plan.findMany({ select: { id: true, name: true } });
    const plansDist = planRaw.map((p) => ({
      name: planNames.find((n) => n.id === p.planId)?.name || '—',
      count: p._count.planId,
    }));

    // 🔎 أكثر كلمات البحث استخداماً (آخر 30 يوماً) — من سجل البحث الموحد
    const searchFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const topSearches = await this.prisma.searchQuery.groupBy({
      by: ['term'],
      where: { createdAt: { gte: searchFrom } },
      _count: { _all: true },
      _avg: { resultsCount: true },
      orderBy: { _count: { term: 'desc' } },
      take: 10,
    });

    // إجماليات + معلقات تحتاج قرار المدير
    const [totalStores, totalSellers, totalCustomers, totalProducts, pendingSubs, pendingAds, featured] = await Promise.all([
      this.prisma.store.count(),
      this.prisma.seller.count(),
      this.prisma.customer.count(),
      this.prisma.product.count(),
      this.prisma.payment.count({ where: { purpose: 'subscription', status: 'pending' } }),
      this.prisma.payment.count({ where: { purpose: 'ad', status: 'pending' } }),
      this.prisma.store.count({ where: { isFeatured: true } }),
    ]);

    // 🤖 نصائح ذكية محلية للمدير
    const tips: string[] = [];
    const thisM = months[5], prevM = months[4];
    if (prevM.newStores > 0 && thisM.newStores > prevM.newStores) {
      tips.push(`📈 نمو المتاجر الجديدة ارتفع ${Math.round(((thisM.newStores - prevM.newStores) / prevM.newStores) * 100)}% هذا الشهر — وقت ممتاز لحملة إعلانية`);
    } else if (thisM.newStores === 0) {
      tips.push('📣 لا متاجر جديدة هذا الشهر — فعّل عرضاً ترويجياً للبائعين الجدد');
    }
    if (pendingSubs > 0) tips.push(`💎 ${pendingSubs} طلب اشتراك بانتظار مراجعتك — الموافقة السريعة ترفع ثقة البائعين`);
    if (pendingAds > 0) tips.push(`📢 ${pendingAds} طلب إعلان مدفوع بانتظارك — إيراد مباشر للمنصة`);
    if (thisM.subsRevenue > 0 && prevM.subsRevenue > 0 && thisM.subsRevenue > prevM.subsRevenue) {
      tips.push('💰 إيرادات الاشتراكات في نمو — حافظ على جودة الخدمة لتجديد المشتركين');
    }
    if (featured === 0) tips.push('⭐ لا متاجر متميزة حالياً — ميّز أفضل المتاجر لجذب ثقة الزوار');
    if (!tips.length) tips.push('✨ أداء المنصة مستقر — راجع التقارير الشهرية بانتظام');

    return {
      months, topGovs, plansDist, tips,
      topSearches: topSearches.map((s) => ({
        term: s.term,
        count: s._count._all,
        avgResults: Math.round(s._avg.resultsCount || 0),
      })),
      totals: {
        stores: totalStores, sellers: totalSellers, customers: totalCustomers,
        products: totalProducts, pendingSubs, pendingAds, featured,
        subsRevenueTotal: months.reduce((s, m) => s + m.subsRevenue, 0),
        adsRevenueTotal: months.reduce((s, m) => s + m.adsRevenue, 0),
      },
    };
  }

  // ═══ إحصائيات المنصة ═══
  async stats() {
    const [stores, sellers, customers, orders, bookings, reviews, pendingOrders] = await Promise.all([
      this.prisma.store.count(),
      this.prisma.seller.count(),
      this.prisma.customer.count(),
      this.prisma.order.count(),
      this.prisma.rentalBooking.count(),
      this.prisma.review.count(),
      this.prisma.order.count({ where: { status: 'pending' } }),
    ]);
    const revenue = await this.prisma.payment.aggregate({
      where: { status: 'approved' },
      _sum: { amount: true },
    });
    const verified = await this.prisma.store.count({ where: { isVerified: true } });

    // أحدث المتاجر
    const latestStores = await this.prisma.store.findMany({
      include: { type: { select: { nameAr: true, icon: true } }, seller: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // أكثر المتاجر طلبات
    const topStores = await this.prisma.store.findMany({
      orderBy: { smartScore: 'desc' },
      select: { id: true, name: true, slug: true, smartScore: true, ratingAvg: true, isVerified: true },
      take: 5,
    });

    return {
      counts: { stores, sellers, customers, orders, bookings, reviews, pendingOrders, verified },
      revenue: Number(revenue._sum.amount || 0),
      latestStores,
      topStores,
    };
  }

  // ═══ إدارة المتاجر/التجار ═══
  async stores(q?: string, status?: string, kind?: string) {
    const stores = await this.prisma.store.findMany({
      where: {
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        ...(status ? { status: status as any } : {}),
        ...(kind ? { type: { kind: kind as any } } : {}),
      },
      include: {
        type: { select: { nameAr: true, icon: true, kind: true } },
        seller: { select: { id: true, name: true, phone: true, status: true } },
        subscription: { include: { plan: { select: { name: true } } } },
        _count: { select: { orders: true, products: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    // 🏅 مستوى كل بائع من طلباته المكتملة (استعلام واحد مجمّع)
    const delivered = await this.prisma.order.groupBy({
      by: ['storeId'],
      where: { storeId: { in: stores.map((s) => s.id) }, status: 'delivered' },
      _count: { _all: true },
    });
    const dMap = Object.fromEntries(delivered.map((d) => [d.storeId, d._count._all]));
    return stores.map((s) => ({ ...s, sellerLevel: levelOf(dMap[s.id] || 0).level }));
  }

  async setStoreStatus(id: string, status: string) {
    return this.prisma.store.update({ where: { id }, data: { status: status as any } });
  }

  // 🏬 نظرة شاملة على المولات التجارية — مولات + إيرادات محققة + طلبات نشطة
  async mallsOverview(q?: string) {
    const malls = await this.prisma.store.findMany({
      where: {
        type: { kind: 'malls' },
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      include: {
        seller: { select: { id: true, name: true, phone: true, status: true } },
        subscription: { include: { plan: { select: { name: true, priceMonthly: true } } } },
        _count: { select: { orders: true, products: true, categories: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const ids = malls.map((m) => m.id);
    // إيرادات كل مول من الطلبات المسلّمة (استعلام مجمّع واحد)
    const revenue = ids.length ? await this.prisma.order.groupBy({
      by: ['storeId'],
      where: { storeId: { in: ids }, status: 'delivered' },
      _sum: { total: true },
      _count: { _all: true },
    }) : [];
    const rMap = Object.fromEntries(revenue.map((r) => [r.storeId, r]));
    const items = malls.map((m) => ({
      ...m,
      revenue: Number(rMap[m.id]?._sum?.total || 0),
      deliveredOrders: rMap[m.id]?._count?._all || 0,
    }));
    return {
      items,
      totals: {
        malls: malls.length,
        active: malls.filter((m) => m.status === 'active').length,
        products: malls.reduce((s, m) => s + m._count.products, 0),
        orders: malls.reduce((s, m) => s + m._count.orders, 0),
        revenue: items.reduce((s, m) => s + m.revenue, 0),
      },
    };
  }

  async setSellerStatus(id: string, status: string) {
    return this.prisma.seller.update({ where: { id }, data: { status: status as any } });
  }

  // توثيق / إلغاء توثيق متجر
  async toggleVerify(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('المتجر غير موجود');
    return this.prisma.store.update({
      where: { id },
      data: { isVerified: !store.isVerified },
    });
  }

  // ⭐ تمييز / إلغاء تمييز متجر — الموافقة على طلب البائع تتم هنا تلقائياً
  async toggleFeatured(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('المتجر غير موجود');
    const updated = await this.prisma.store.update({
      where: { id },
      data: store.isFeatured
        ? { isFeatured: false, featuredAt: null }
        : { isFeatured: true, featuredAt: new Date(), featuredRequested: false },
    });
    // 🔔 تنبيه البائع عند الموافقة على التمييز
    if (!store.isFeatured && updated.isFeatured) {
      await this.notifications.push('seller', store.sellerId, {
        icon: '⭐',
        title: 'وافقت الإدارة على تمييز متجرك! 🎉',
        body: 'متجرك يظهر الآن في "المتاجر المتميزة" بالصفحة الرئيسية',
        link: '/seller/subscription',
      });
    }
    return updated;
  }

  // 🗂️ إظهار/إخفاء متجر في دليل المتاجر — الإدارة وحدها توافق على الظهور
  async toggleListed(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('المتجر غير موجود');
    const updated = await this.prisma.store.update({
      where: { id },
      data: store.isListed
        ? { isListed: false, listedAt: null }
        : { isListed: true, listedAt: new Date() },
    });
    // 🔔 تنبيه البائع عند الموافقة على ظهور متجره في الدليل
    if (!store.isListed && updated.isListed) {
      await this.notifications.push('seller', store.sellerId, {
        icon: '🗂️',
        title: 'وافقت الإدارة على ظهور متجرك في الدليل! 🎉',
        body: 'متجرك يظهر الآن في دليل المتاجر ويمكن للزوار العثور عليه',
        link: '/seller',
      });
    }
    return updated;
  }

  // رفض طلب تمييز — يمسح الطلب دون منح التمييز
  async rejectFeatured(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('المتجر غير موجود');
    return this.prisma.store.update({ where: { id }, data: { featuredRequested: false } });
  }

  // ═══ 🌐 طلبات النطاقات الحقيقية — الإدارة وحدها تعتمد الربط ═══
  async domains(status?: string) {
    const where: any = { customDomainStatus: status && status !== 'all' ? status : { not: 'none' } };
    const stores = await this.prisma.store.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true, phone: true } },
        _count: { select: { products: true, orders: true } },
      },
      orderBy: [{ customDomainStatus: 'asc' }, { domainRequestedAt: 'desc' }],
      take: 200,
    });
    return {
      stores,
      platformDomain: process.env.PLATFORM_DOMAIN || 'yemenzone1.com',
      counts: {
        pending: stores.filter((s) => s.customDomainStatus === 'pending').length,
        approved: stores.filter((s) => s.customDomainStatus === 'approved').length,
        rejected: stores.filter((s) => s.customDomainStatus === 'rejected').length,
      },
    };
  }

  async reviewDomain(storeId: string, approve: boolean, note?: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store || !store.customDomain) throw new NotFoundException('لا يوجد طلب نطاق لهذا المتجر');
    const why = (note || '').trim().slice(0, 300);
    if (!approve && !why) throw new BadRequestException('اذكر سبب الرفض ليظهر للبائع');
    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: approve
        ? { customDomainStatus: 'approved', customDomainNote: null }
        : { customDomainStatus: 'rejected', customDomainNote: why },
    });
    await this.notifications.push('seller', store.sellerId, approve ? {
      icon: '🌐',
      title: 'تم اعتماد نطاقك الخاص! 🎉',
      body: `${store.customDomain} يعمل الآن — وجّه سجل CNAME إلى ${process.env.PLATFORM_DOMAIN || 'yemenzone1.com'}`,
      link: '/seller/domain',
    } : {
      icon: '🌐',
      title: 'رُفض طلب ربط النطاق',
      body: `${store.customDomain}: ${why}`,
      link: '/seller/domain',
    });
    return updated;
  }

  // 🔑 منح صلاحيات استثنائية — مفاتيح معروفة فقط، القيمة true وحدها تُحفظ
  async setStoreGrants(id: string, grants: any) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('المتجر غير موجود');
    const clean: Record<string, boolean> = {};
    for (const k of Object.keys(FEATURE_AR)) {
      if (grants?.[k] === true) clean[k] = true;
    }
    const updated = await this.prisma.store.update({ where: { id }, data: { grants: clean } });
    // 🔔 تنبيه البائع بالصلاحيات الممنوحة حديثاً
    const newly = Object.keys(clean).filter((k) => !((store.grants as any)?.[k]));
    if (newly.length) {
      await this.notifications.push('seller', store.sellerId, {
        icon: '🔑',
        title: 'منحتك الإدارة صلاحيات خاصة 🎁',
        body: newly.map((k) => FEATURE_AR[k]).join('، '),
        link: '/seller/subscription',
      });
    }
    return updated;
  }

  async deleteStore(id: string) {
    return this.prisma.store.delete({ where: { id } });
  }

  // ═══ 🎖️ طلبات توثيق المتاجر ═══
  async verificationRequests(status?: string) {
    return this.prisma.verificationRequest.findMany({
      where: status ? { status } : {},
      include: {
        store: { select: { id: true, name: true, slug: true, logo: true, isVerified: true, seller: { select: { name: true, phone: true } } } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  // مراجعة طلب توثيق — الموافقة تمنح الشارة وتُغلق الطلبات المعلقة الأخرى
  async reviewVerification(id: string, approve: boolean, reason?: string) {
    const req = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    if (req.status !== 'pending') throw new BadRequestException('تمت مراجعة هذا الطلب مسبقاً');
    const why = (reason || '').trim().slice(0, 300);
    if (!approve && !why) throw new BadRequestException('سبب الرفض مطلوب');

    if (approve) {
      await this.prisma.$transaction([
        this.prisma.verificationRequest.update({
          where: { id },
          data: { status: 'approved', reviewedAt: new Date() },
        }),
        this.prisma.store.update({ where: { id: req.storeId }, data: { isVerified: true } }),
        // إغلاق أي طلبات معلقة أخرى لنفس المتجر
        this.prisma.verificationRequest.updateMany({
          where: { storeId: req.storeId, status: 'pending', id: { not: id } },
          data: { status: 'rejected', rejectReason: 'تم التوثيق عبر طلب آخر', reviewedAt: new Date() },
        }),
      ]);
      await this.notifications.push('seller', req.store.sellerId, {
        icon: '🎖️',
        title: 'مبارك! متجرك أصبح موثقاً',
        body: 'حصل متجرك على الشارة الزرقاء ويظهر الآن كمتجر موثق للعملاء',
        link: '/seller/verification',
      });
    } else {
      await this.prisma.verificationRequest.update({
        where: { id },
        data: { status: 'rejected', rejectReason: why, reviewedAt: new Date() },
      });
      await this.notifications.push('seller', req.store.sellerId, {
        icon: '❌',
        title: 'تم رفض طلب توثيق متجرك',
        body: why,
        link: '/seller/verification',
      });
    }
    return this.prisma.verificationRequest.findUnique({ where: { id } });
  }

  // ═══ إدارة العملاء ═══
  async customers(q?: string, status?: string) {
    return this.prisma.customer.findMany({
      where: {
        ...(q ? { OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ] } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: { _count: { select: { orders: true, reviews: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async setCustomerStatus(id: string, status: string) {
    return this.prisma.customer.update({ where: { id }, data: { status: status as any } });
  }

  async deleteCustomer(id: string) {
    return this.prisma.customer.delete({ where: { id } });
  }

  // ═══ الإشراف على التقييمات ═══
  async reviews(approved?: string) {
    return this.prisma.review.findMany({
      where: approved !== undefined ? { isApproved: approved === '1' } : {},
      include: {
        customer: { select: { name: true, phone: true } },
        store: { select: { name: true, slug: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async setReviewApproval(id: string, approved: boolean) {
    return this.prisma.review.update({ where: { id }, data: { isApproved: approved } });
  }

  // إشراف المدير على ردود البائعين — إخفاء رد مسيء دون حذف التقييم
  async setReviewReplyHidden(id: string, hidden: boolean) {
    const r = await this.prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('التقييم غير موجود');
    return this.prisma.review.update({ where: { id }, data: { replyHidden: hidden } });
  }

  async deleteReview(id: string) {
    return this.prisma.review.delete({ where: { id } });
  }

  // 🧾 إعداد التقييم الموثوق: عند التفعيل لا يُقبل تقييم بلا طلب مكتمل مطابق
  async reviewsConfig() {
    const row = await this.prisma.setting.findUnique({ where: { key: 'reviews.config' } });
    return { onlyBuyers: !!(row?.value as any)?.onlyBuyers };
  }

  async saveReviewsConfig(b: { onlyBuyers?: boolean }) {
    const value = { onlyBuyers: !!b.onlyBuyers };
    await this.prisma.setting.upsert({
      where: { key: 'reviews.config' },
      update: { value },
      create: { group: 'general', key: 'reviews.config', value },
    });
    return value;
  }

  // ═══ الإشراف على الإيجارات/الغرف/الخدمات ═══
  private supervisionModel(kind: string) {
    if (kind === 'rentals') return this.prisma.rentalUnit;
    if (kind === 'hotel') return this.prisma.hotelRoom;
    return this.prisma.serviceItem;
  }

  async supervisionItems(kind: string, q?: string) {
    const model: any = this.supervisionModel(kind);
    return model.findMany({
      where: q ? { title: { contains: q, mode: 'insensitive' } } : {},
      include: {
        store: { select: { name: true, slug: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async supervisionBookings(kind: string) {
    if (kind === 'rentals') {
      return this.prisma.rentalBooking.findMany({
        include: { unit: { select: { title: true, store: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' }, take: 50,
      });
    }
    if (kind === 'hotel') {
      return this.prisma.roomBooking.findMany({
        include: { room: { select: { title: true, store: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' }, take: 50,
      });
    }
    return this.prisma.serviceRequest.findMany({
      include: { service: { select: { title: true, store: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
  }

  async toggleHide(kind: string, id: string) {
    const model: any = this.supervisionModel(kind);
    const item = await model.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('العنصر غير موجود');
    return model.update({ where: { id }, data: { isHidden: !item.isHidden } });
  }

  async supervisionDelete(kind: string, id: string) {
    const model: any = this.supervisionModel(kind);
    return model.delete({ where: { id } });
  }

  // ═══ إعدادات المنصة ═══
  async getSettings() {
    const rows = await this.prisma.setting.findMany();
    const map: Record<string, any> = {};
    for (const r of rows) map[r.key] = r.value;
    const otp = await this.prisma.messageTemplate.findUnique({ where: { event: 'otp' } });
    return { settings: map, otpEnabled: !!otp?.isActive };
  }

  async saveSettings(body: { settings?: Record<string, any>; otpEnabled?: boolean }) {
    if (body.settings && typeof body.settings === 'object') {
      for (const [key, value] of Object.entries(body.settings)) {
        if (!/^[a-zA-Z][\w-]{1,40}$/.test(key)) continue;
        const group = key === 'layout' ? 'theme' : 'general';
        await this.prisma.setting.upsert({ where: { key }, update: { value: value as any }, create: { group, key, value: value as any } });
      }
    }
    if (typeof body.otpEnabled === 'boolean') {
      const exists = await this.prisma.messageTemplate.findUnique({ where: { event: 'otp' } });
      if (exists) {
        await this.prisma.messageTemplate.update({ where: { event: 'otp' }, data: { isActive: body.otpEnabled } });
      } else {
        await this.prisma.messageTemplate.create({ data: { event: 'otp', channel: 'sms', body: 'يمن زون: رمز التحقق هو {code} — صالح 5 دقائق', isActive: body.otpEnabled } });
      }
    }
    return { ok: true };
  }

  // ═══ إدارة المستخدمين (بائعون/عملاء/سائقون) ═══
  async users(role: string, q?: string, status?: string) {
    const where: any = {
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { phone: { contains: q } }] } : {}),
      ...(status && role !== 'driver' ? { status } : {}),
    };
    if (role === 'seller') {
      return this.prisma.seller.findMany({
        where,
        include: {
          stores: { select: { id: true, name: true, slug: true, status: true } },
          wallet: { select: { balance: true } },
        },
        orderBy: { createdAt: 'desc' }, take: 200,
      });
    }
    if (role === 'driver') {
      return this.prisma.driver.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
    }
    return this.prisma.customer.findMany({
      where,
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' }, take: 200,
    });
  }

  async setUserStatus(role: string, id: string, status: string) {
    if (!['active', 'suspended', 'banned'].includes(status)) throw new BadRequestException('حالة غير صحيحة');
    if (role === 'seller') return this.prisma.seller.update({ where: { id }, data: { status: status as any } });
    if (role === 'driver') return this.prisma.driver.update({ where: { id }, data: { isActive: status === 'active' } });
    return this.prisma.customer.update({ where: { id }, data: { status: status as any } });
  }

  // ═══ 🧠 غرفة العمليات الذكية — نبض المنصة لحظة بلحظة ═══
  async opsRoom(range: string) {
    const days = range === 'today' ? 1 : range === 'month' ? 30 : 7;
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const since = startOfDay(new Date(Date.now() - (days - 1) * 86400000));
    const prevSince = new Date(since.getTime() - days * 86400000);

    const [orders, prevOrders, sellers, customers, prevSellers, prevCustomers, payments, feed] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, updatedAt: true, total: true, status: true, store: { select: { governorate: true } } },
      }),
      this.prisma.order.findMany({ where: { createdAt: { gte: prevSince, lt: since } }, select: { total: true, status: true } }),
      this.prisma.seller.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.customer.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.seller.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
      this.prisma.customer.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
      this.prisma.payment.findMany({ where: { createdAt: { gte: since }, status: { in: ['approved', 'rejected'] } }, select: { status: true } }),
      this.prisma.securityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
    ]);

    // ── السلاسل الزمنية ──
    const buckets: { label: string; revenue: number; orders: number; regs: number }[] = [];
    if (range === 'today') {
      for (let h = 0; h < 24; h++) buckets.push({ label: `${h}:00`, revenue: 0, orders: 0, regs: 0 });
      const idx = (d: Date) => new Date(d).getHours();
      for (const o of orders) { const b = buckets[idx(o.createdAt)]; b.orders++; if (!['cancelled', 'refunded'].includes(o.status)) b.revenue += Number(o.total); }
      for (const s of [...sellers, ...customers]) buckets[idx(s.createdAt)].regs++;
    } else {
      const names = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(since.getTime() + (days - 1 - i) * 86400000);
        buckets.push({ label: days <= 7 ? names[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`, revenue: 0, orders: 0, regs: 0 });
      }
      const idx = (d: Date) => Math.floor((startOfDay(new Date(d)).getTime() - since.getTime()) / 86400000);
      for (const o of orders) { const i = idx(o.createdAt); if (i >= 0 && i < buckets.length) { buckets[i].orders++; if (!['cancelled', 'refunded'].includes(o.status)) buckets[i].revenue += Number(o.total); } }
      for (const s of [...sellers, ...customers]) { const i = idx(s.createdAt); if (i >= 0 && i < buckets.length) buckets[i].regs++; }
    }

    // ── خريطة المحافظات الحرارية ──
    const heatMap: Record<string, { name: string; revenue: number; orders: number }> = {};
    for (const o of orders) {
      if (['cancelled', 'refunded'].includes(o.status)) continue;
      const gov = o.store?.governorate?.trim() || 'غير محدد';
      if (!heatMap[gov]) heatMap[gov] = { name: gov, revenue: 0, orders: 0 };
      heatMap[gov].revenue += Number(o.total);
      heatMap[gov].orders++;
    }
    const heat = Object.values(heatMap).sort((a, b) => b.revenue - a.revenue);

    // ── مؤشرات الصحة (إشارات مرور) ──
    const payOk = payments.filter((p) => p.status === 'approved').length;
    const payBad = payments.filter((p) => p.status === 'rejected').length;
    const payRate = payOk + payBad ? Math.round((payOk / (payOk + payBad)) * 100) : null;
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    const cancelRate = orders.length ? Math.round((cancelled / orders.length) * 100) : null;
    const delivered = orders.filter((o) => ['delivered', 'completed'].includes(o.status));
    const avgDeliveryH = delivered.length
      ? Math.round(delivered.reduce((s, o) => s + (new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()) / 3600000, 0) / delivered.length)
      : null;
    const light = (v: number | null, green: number, yellow: number, invert = false) =>
      v == null ? 'gray' : (invert ? (v <= green ? 'green' : v <= yellow ? 'yellow' : 'red') : (v >= green ? 'green' : v >= yellow ? 'yellow' : 'red'));

    // ── الإجماليات + مقارنة بالفترة السابقة ──
    const sum = (arr: any[]) => arr.filter((o) => !['cancelled', 'refunded'].includes(o.status)).reduce((s, o) => s + Number(o.total), 0);
    const totals = { revenue: sum(orders), orders: orders.length, regs: sellers.length + customers.length, cancelled };
    const prevTotals = { revenue: sum(prevOrders), orders: prevOrders.length, regs: prevSellers + prevCustomers };

    return {
      range: range === 'today' ? 'today' : range === 'month' ? 'month' : 'week',
      series: buckets,
      heat,
      health: {
        payRate: { value: payRate, light: light(payRate, 90, 70) },
        cancelRate: { value: cancelRate, light: light(cancelRate, 5, 15, true) },
        deliveryH: { value: avgDeliveryH, light: light(avgDeliveryH, 24, 48, true) },
      },
      totals,
      prevTotals,
      feed,
      at: new Date(),
    };
  }

  // ═══ 🗄️ صيانة قاعدة البيانات — للمشرف العام ومن يُمنح صلاحية النظام ═══

  // 📊 إحصاءات القاعدة — أحجام الجداول الرئيسية + حجم القاعدة الكلي
  async dbStats() {
    const [stores, sellers, customers, drivers, products, orders, payments, reviews, notifications, sessions, logs] = await Promise.all([
      this.prisma.store.count(),
      this.prisma.seller.count(),
      this.prisma.customer.count(),
      this.prisma.driver.count(),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.payment.count(),
      this.prisma.review.count(),
      this.prisma.notification.count(),
      this.prisma.session.count(),
      this.prisma.securityLog.count(),
    ]);
    const sizeRow: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT pg_size_pretty(pg_database_size(current_database())) AS size`,
    );
    return {
      counts: { stores, sellers, customers, drivers, products, orders, payments, reviews, notifications, sessions, logs },
      size: sizeRow?.[0]?.size || '—',
      checkedAt: new Date(),
    };
  }

  // 🩺 إصلاح ذاتي آمن — يصحح الشوائب وينظف المنتهي دون لمس أي بيانات جوهرية
  async dbRepair(adminId: string) {
    const now = new Date();
    const tasks: { icon: string; label: string; detail: string }[] = [];

    // 1) مخزون سالب → صفر
    const negStock = await this.prisma.product.updateMany({ where: { stock: { lt: 0 } }, data: { stock: 0 } });
    tasks.push({ icon: '📦', label: 'تصحيح المخزون السالب', detail: negStock.count ? `عولج ${negStock.count} منتج` : 'سليم ✅' });

    // 2) أسعار سالبة → صفر
    const negPrice = await this.prisma.product.updateMany({ where: { price: { lt: 0 } }, data: { price: 0 } });
    tasks.push({ icon: '🏷️', label: 'تصحيح الأسعار السالبة', detail: negPrice.count ? `عولج ${negPrice.count} منتج` : 'سليم ✅' });

    // 3) رموز OTP منتهية الصلاحية
    const otps = await this.prisma.otpCode.deleteMany({ where: { expiresAt: { lt: now } } });
    tasks.push({ icon: '🔑', label: 'تنظيف رموز التحقق المنتهية', detail: otps.count ? `حُذف ${otps.count} رمز` : 'سليم ✅' });

    // 4) جلسات الدخول المنتهية أو الملغاة
    const sessions = await this.prisma.session.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }] } });
    tasks.push({ icon: '🎫', label: 'تنظيف الجلسات المنتهية', detail: sessions.count ? `حُذفت ${sessions.count} جلسة` : 'سليم ✅' });

    // 5) الإشعارات الأقدم من 90 يوماً
    const notifs = await this.prisma.notification.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 86400000) } } });
    tasks.push({ icon: '🔔', label: 'أرشفة الإشعارات القديمة (90+ يوم)', detail: notifs.count ? `حُذف ${notifs.count} إشعار` : 'سليم ✅' });

    // 6) حظر عناوين IP المنتهية مدته
    const bans = await this.prisma.bannedIp.deleteMany({ where: { expiresAt: { not: null, lt: now } } });
    tasks.push({ icon: '🛡️', label: 'رفع الحظر المنتهي عن العناوين', detail: bans.count ? `فُكّ حظر ${bans.count} عنوان` : 'سليم ✅' });

    // 7) مزامنة أرصدة المحافظ مع حركاتها الفعلية
    const wallets = await this.prisma.wallet.findMany({ include: { transactions: { select: { type: true, amount: true } } } });
    let fixedWallets = 0;
    for (const w of wallets) {
      const calc = w.transactions.reduce((s, t) => s + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)), 0);
      if (Math.abs(calc - Number(w.balance)) > 0.01) {
        await this.prisma.wallet.update({ where: { id: w.id }, data: { balance: calc } });
        fixedWallets++;
      }
    }
    tasks.push({ icon: '💰', label: 'مزامنة أرصدة المحافظ مع الحركات', detail: fixedWallets ? `صُحّحت ${fixedWallets} محفظة` : 'سليم ✅' });

    // 8) عدّادات مشاهدات سالبة (حماية من أي خلل)
    const negViews = await this.prisma.product.updateMany({ where: { viewsCount: { lt: 0 } }, data: { viewsCount: 0 } });
    tasks.push({ icon: '👁️', label: 'تصحيح عدّادات المشاهدة', detail: negViews.count ? `عولج ${negViews.count} منتج` : 'سليم ✅' });

    // 9) 🔐 تشفير أسرار البوابات غير المشفرة (ترقية البيانات القديمة)
    let encrypted = 0;
    const gateways = await this.prisma.paymentGateway.findMany({ select: { id: true, apiKey: true, apiSecret: true, merchantId: true } });
    for (const g of gateways) {
      const data: any = {};
      if (g.apiKey && !isEncrypted(g.apiKey)) data.apiKey = encryptSecret(g.apiKey);
      if (g.apiSecret && !isEncrypted(g.apiSecret)) data.apiSecret = encryptSecret(g.apiSecret);
      if (g.merchantId && !isEncrypted(g.merchantId)) data.merchantId = encryptSecret(g.merchantId);
      if (Object.keys(data).length) { await this.prisma.paymentGateway.update({ where: { id: g.id }, data }); encrypted++; }
    }
    const providers = await this.prisma.messagingProvider.findMany({ select: { id: true, apiKey: true } });
    for (const p of providers) {
      if (p.apiKey && !isEncrypted(p.apiKey)) {
        await this.prisma.messagingProvider.update({ where: { id: p.id }, data: { apiKey: encryptSecret(p.apiKey) } });
        encrypted++;
      }
    }
    tasks.push({ icon: '🔐', label: 'تشفير أسرار البوابات والمراسلة', detail: encrypted ? `شُفّرت ${encrypted} سجلّاً` : 'كل الأسرار مشفرة ✅' });

    await this.security.log('db.repair', { userType: 'admin', userId: adminId, details: { fixed: tasks.filter((t) => !t.detail.includes('✅')).length } });
    return { ok: true, tasks, at: new Date() };
  }

  // ♻️ إعادة ضبط المصنع — تُفرّغ البيانات التشغيلية وتُبقي المرجعية (الخطط، الإعدادات، العملات، المحافظات، المديرون)
  async dbReset(adminId: string, confirm: string) {
    if ((confirm || '').trim() !== 'إعادة ضبط') {
      throw new BadRequestException('⚠️ اكتب عبارة التأكيد «إعادة ضبط» كاملة للمتابعة');
    }
    const WIPE = [
      'notifications', 'message_logs', 'broadcasts', 'pwa_requests', 'api_usage', 'api_keys',
      'security_logs', 'banned_ips', 'trusted_devices', 'sessions', 'otp_codes',
      'wallet_transactions', 'withdrawal_requests', 'card_topups', 'customer_cards', 'payment_cards', 'card_batches', 'payments', 'wallets',
      'order_items', 'orders', 'rental_bookings', 'rental_units', 'room_bookings', 'hotel_rooms',
      'service_requests', 'service_items', 'reviews', 'store_likes', 'ads', 'coupons', 'search_queries',
      'products', 'categories', 'store_payment_methods', 'store_delivery_methods', 'verification_requests',
      'subscriptions', 'stores',
      'points_transactions', 'referrals', 'complaints', 'expenses', 'platform_service_orders',
      'blog_posts', 'custom_pages', 'slides', 'theme_backups',
      'store_delivery_companies', 'delivery_companies', 'drivers', 'customers', 'sellers',
      'backup_records',
    ];
    await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${WIPE.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
    await this.security.log('db.reset', { userType: 'admin', userId: adminId, details: { wipedTables: WIPE.length } });
    return { ok: true, wipedTables: WIPE.length, at: new Date() };
  }

  // ═══ 🎟️ كوبونات المنصة المركزية — تخصم من ميزانية المنصة لا من البائع ═══

  // قائمة كوبونات المنصة + إحصاءات الأداء الحقيقية
  async platformCoupons() {
    const coupons = await this.prisma.coupon.findMany({
      where: { storeId: null },
      orderBy: { createdAt: 'desc' },
    });
    const stats = await Promise.all(coupons.map(async (c) => {
      const orders = await this.prisma.order.findMany({
        where: { couponId: c.id },
        select: { total: true, discount: true, status: true },
      });
      const valid = orders.filter((o) => !['cancelled', 'refunded'].includes(o.status));
      return {
        orders: valid.length,
        discountGiven: Math.round(valid.reduce((s, o) => s + Number(o.discount), 0)),
        revenue: Math.round(valid.reduce((s, o) => s + Number(o.total), 0)),
      };
    }));
    return coupons.map((c, i) => ({ ...c, value: Number(c.value), minTotal: Number(c.minTotal), stats: stats[i] }));
  }

  async createPlatformCoupon(body: any) {
    const code = String(body.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(code)) throw new BadRequestException('الكود: 3-20 حرفاً إنجليزياً أو رقماً');
    const value = Number(body.value);
    if (!value || value <= 0) throw new BadRequestException('القيمة يجب أن تكون أكبر من صفر');
    if (body.type === 'percent' && value > 90) throw new BadRequestException('نسبة الخصم لا تتجاوز 90%');
    const dup = await this.prisma.coupon.findUnique({ where: { code } });
    if (dup) throw new BadRequestException('الكود مستخدم مسبقاً — اختر غيره');
    if (body.startsAt && body.expiresAt && new Date(body.startsAt) >= new Date(body.expiresAt)) {
      throw new BadRequestException('تاريخ البداية يجب أن يسبق النهاية');
    }
    return this.prisma.coupon.create({
      data: {
        code,
        type: body.type === 'fixed' ? 'fixed' : 'percent',
        value,
        minTotal: Math.max(0, Number(body.minTotal) || 0),
        maxUses: body.maxUses ? Math.max(1, Number(body.maxUses)) : null,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        storeId: null, // 🏢 منصة — يعمل في كل المتاجر
      },
    });
  }

  async updatePlatformCoupon(id: string, body: any) {
    const c = await this.prisma.coupon.findUnique({ where: { id } });
    if (!c || c.storeId !== null) throw new NotFoundException('الكوبون غير موجود');
    const data: any = {};
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.maxUses !== undefined) data.maxUses = body.maxUses ? Math.max(1, Number(body.maxUses)) : null;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (body.minTotal !== undefined) data.minTotal = Math.max(0, Number(body.minTotal) || 0);
    return this.prisma.coupon.update({ where: { id }, data });
  }

  async deletePlatformCoupon(id: string) {
    const c = await this.prisma.coupon.findUnique({ where: { id } });
    if (!c || c.storeId !== null) throw new NotFoundException('الكوبون غير موجود');
    await this.prisma.coupon.delete({ where: { id } });
    return { ok: true };
  }

  // ═══ 🏙️ إدارة المحافظات — تظهر للبائعين والزوار في الفلاتر والعناوين ═══
  governorates() {
    return this.prisma.governorate.findMany({ orderBy: [{ sort: 'asc' }, { name: 'asc' }] });
  }

  async addGovernorate(body: any) {
    const name = (body.name || '').trim();
    if (!name) throw new BadRequestException('اسم المحافظة مطلوب');
    const dup = await this.prisma.governorate.findFirst({ where: { name } });
    if (dup) throw new BadRequestException('هذه المحافظة مضافة مسبقاً');
    return this.prisma.governorate.create({
      data: { name, nameEn: (body.nameEn || '').trim() || null, sort: Number(body.sort) || 0, isActive: true },
    });
  }

  async updateGovernorate(id: string, body: any) {
    const g = await this.prisma.governorate.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('المحافظة غير موجودة');
    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.nameEn !== undefined) data.nameEn = String(body.nameEn || '').trim() || null;
    if (body.sort !== undefined) data.sort = Number(body.sort) || 0;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    return this.prisma.governorate.update({ where: { id }, data });
  }

  async deleteGovernorate(id: string) {
    const g = await this.prisma.governorate.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('المحافظة غير موجودة');
    await this.prisma.governorate.delete({ where: { id } });
    return { ok: true };
  }

  // ═══ 💱 إدارة العملات — عملة افتراضية واحدة وأسعار صرف محدثة ═══
  currencies() {
    return this.prisma.currency.findMany({ orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] });
  }

  async addCurrency(body: any) {
    const code = String(body.code || '').trim().toUpperCase();
    const name = (body.name || '').trim();
    const symbol = (body.symbol || '').trim();
    const rate = Number(body.rateToUsd);
    if (!code || code.length > 5) throw new BadRequestException('رمز العملة مطلوب (مثل YER)');
    if (!name || !symbol) throw new BadRequestException('الاسم والرمز مطلوبان');
    if (!rate || rate <= 0) throw new BadRequestException('سعر الصرف مقابل الدولار يجب أن يكون أكبر من صفر');
    const dup = await this.prisma.currency.findUnique({ where: { code } });
    if (dup) throw new BadRequestException('هذه العملة مضافة مسبقاً');
    return this.prisma.$transaction(async (tx) => {
      if (body.isDefault) await tx.currency.updateMany({ data: { isDefault: false } });
      return tx.currency.create({ data: { code, name, symbol, rateToUsd: rate, isDefault: !!body.isDefault, isActive: true } });
    });
  }

  async updateCurrency(id: string, body: any) {
    const c = await this.prisma.currency.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('العملة غير موجودة');
    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.symbol !== undefined) data.symbol = String(body.symbol).trim();
    if (body.rateToUsd !== undefined) {
      const rate = Number(body.rateToUsd);
      if (!rate || rate <= 0) throw new BadRequestException('سعر الصرف يجب أن يكون أكبر من صفر');
      data.rateToUsd = rate;
    }
    if (body.isActive !== undefined) {
      if (!body.isActive && c.isDefault) throw new BadRequestException('لا يمكن تعطيل العملة الافتراضية — عيّن عملة أخرى أولاً');
      data.isActive = !!body.isActive;
    }
    return this.prisma.$transaction(async (tx) => {
      if (body.isDefault && !c.isDefault) { await tx.currency.updateMany({ data: { isDefault: false } }); data.isDefault = true; }
      return tx.currency.update({ where: { id }, data });
    });
  }

  async deleteCurrency(id: string) {
    const c = await this.prisma.currency.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('العملة غير موجودة');
    if (c.isDefault) throw new BadRequestException('لا يمكن حذف العملة الافتراضية — عيّن عملة أخرى أولاً');
    await this.prisma.currency.delete({ where: { id } });
    return { ok: true };
  }
}
