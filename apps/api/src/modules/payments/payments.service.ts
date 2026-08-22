import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrencyService } from '../../prisma/currency.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentAiService } from './payment-ai.service';
import { encryptSecret, decryptSecret, maskSecret } from '../../common/crypto.util';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private messaging: MessagingService,
    private notifications: NotificationsService,
    private ai: PaymentAiService,
    private fx: CurrencyService,
  ) {}

  private inv() { return 'INV-' + Math.random().toString(36).slice(2, 8).toUpperCase(); }

  // ── عام: بوابات الدفع النشطة لنطاق معين (حقول آمنة فقط) ──
  async publicGateways(scope = 'orders') {
    const gateways = await this.prisma.paymentGateway.findMany({ where: { isActive: true } });
    return gateways
      .filter((g) => (g.scopes as string[]).includes(scope))
      .map((g) => ({
        id: g.id, name: g.name, provider: g.provider,
        accountInfo: g.accountInfo, instructions: g.instructions, fee: g.fee,
      }));
  }

  // ── العميل: رفع إثبات دفع لطلب ──
  async submitOrderProof(orderId: string, body: { gatewayId?: string; storeMethodId?: string; proofImage: string; payerPhone: string }) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { store: true } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.customerPhone !== body.payerPhone) throw new BadRequestException('رقم الجوال لا يطابق الطلب');

    const existing = await this.prisma.payment.findFirst({
      where: { referenceId: orderId, purpose: 'order', status: { in: ['pending', 'approved'] } },
    });
    if (existing) throw new BadRequestException(existing.status === 'approved' ? 'تم دفع هذا الطلب مسبقاً' : 'لديك إثبات قيد المراجعة');

    // 💳 إما بوابة منصة أو طريقة دفع خاصة بالمتجر — نتحقق من إحداهما
    let method = 'transfer';
    let gatewayId: string | null = null;
    if (body.storeMethodId) {
      const m = await this.prisma.storePaymentMethod.findFirst({
        where: { id: body.storeMethodId, storeId: order.storeId, isActive: true },
      });
      if (!m || m.type === 'cash') throw new BadRequestException('طريقة الدفع غير متاحة لهذا المتجر');
      method = `store:${m.label}`;
    } else {
      const gateway = await this.prisma.paymentGateway.findUnique({ where: { id: body.gatewayId } });
      if (!gateway || !gateway.isActive) throw new BadRequestException('بوابة الدفع غير متاحة');
      method = `gateway:${gateway.name}`;
      gatewayId = gateway.id;
    }

    const payment = await this.prisma.payment.create({
      data: {
        number: this.inv(),
        payerType: order.customerId ? 'customer' : 'guest',
        payerId: order.customerId || order.customerPhone,
        purpose: 'order',
        amount: order.total,
        currency: order.currency,
        method,
        proofImage: body.proofImage,
        gatewayId,
        referenceId: orderId,
      },
    });
    await this.prisma.order.update({ where: { id: orderId }, data: { paymentMethod: method.startsWith('store:') ? method : 'gateway' } });

    // 🔔 تنبيه البائع: إثبات دفع جديد بانتظار مراجعته
    const orderCur = await this.fx.known(order.currency);
    await this.notifications.push('seller', order.store.sellerId, {
      icon: '💳',
      title: `إثبات دفع للطلب ${order.number}`,
      body: `${order.customerName} حوّل ${Number(order.total).toLocaleString()} ${orderCur.symbol} عبر ${method.replace(/^(gateway|store):/, '')} — راجع الطلب وأكّده`,
      link: '/seller/orders',
    });
    return { payment, message: 'تم استلام إثبات الدفع — سنراجعه ونؤكد طلبك قريباً' };
  }

  // حالة دفع طلب (للعميل برقم الجوال)
  async orderPaymentStatus(orderId: string, phone: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { referenceId: orderId, purpose: 'order' },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) return { status: 'unpaid' };
    return { status: payment.status, number: payment.number, method: payment.method };
  }

  // 🧾 سند الدفع — لصاحبه فقط (عميل/بائع) أو الإدارة
  async receipt(number: string, user: { sub: string; typ: string }) {
    const p = await this.prisma.payment.findUnique({ where: { number } });
    if (!p) throw new NotFoundException('السند غير موجود');
    if (user.typ !== 'admin' && (p.payerType !== user.typ || p.payerId !== user.sub)) {
      throw new ForbiddenException('هذا السند ليس لك');
    }
    const payer = p.payerType === 'seller'
      ? await this.prisma.seller.findUnique({ where: { id: p.payerId }, select: { name: true, phone: true } })
      : await this.prisma.customer.findUnique({ where: { id: p.payerId }, select: { name: true, phone: true } });
    const gateway = p.gatewayId
      ? await this.prisma.paymentGateway.findUnique({ where: { id: p.gatewayId }, select: { name: true } })
      : null;
    return { ...p, payer, gateway };
  }

  // ── الإدارة: قائمة المدفوعات + تحليل ذكي ──
  async adminPayments(q: { status?: string; purpose?: string }) {
    const payments = await this.prisma.payment.findMany({
      where: {
        ...(q.status ? { status: q.status as any } : {}),
        ...(q.purpose ? { purpose: q.purpose } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    });

    // إثراء كل دفعة بالتحليل الذكي
    const enriched = await Promise.all(payments.map(async (p) => {
      let orderTotal: number | null = null;
      if (p.purpose === 'order' && p.referenceId) {
        const order = await this.prisma.order.findUnique({ where: { id: p.referenceId }, select: { total: true, number: true, customerName: true, store: { select: { name: true } } } });
        if (order) orderTotal = Number(order.total);
        (p as any).orderInfo = order ? { number: order.number, customer: order.customerName, store: order.store.name } : null;
      }
      const [sameProofCount, payerRejected] = await Promise.all([
        p.proofImage ? this.prisma.payment.count({ where: { proofImage: p.proofImage, id: { not: p.id } } }) : 0,
        this.prisma.payment.count({ where: { payerId: p.payerId, status: 'rejected' } }),
      ]);
      return { ...p, ai: this.ai.analyzePayment(p, { orderTotal, sameProofCount, payerRejected }) };
    }));
    return enriched;
  }

  // ── الإدارة: مراجعة دفعة (طلبات) ──
  async reviewOrderPayment(paymentId: string, approve: boolean, adminId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.purpose !== 'order') throw new NotFoundException('الدفعة غير موجودة');
    if (payment.status !== 'pending') throw new BadRequestException('تمت مراجعتها مسبقاً');

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: approve ? 'approved' : 'rejected', reviewedBy: adminId, reviewedAt: new Date() },
    });

    if (payment.referenceId) {
      const order = await this.prisma.order.findUnique({ where: { id: payment.referenceId }, include: { store: true } });
      if (order) {
        if (approve) {
          // تأكيد الطلب تلقائياً عند اعتماد الدفع + إيداع محفظة التاجر 💰
          if (order.status === 'pending') {
            await this.prisma.order.update({ where: { id: order.id }, data: { status: 'confirmed' } });
          }
          if (order.store.sellerId) {
            const def = await this.fx.default();
            const wallet = await this.prisma.wallet.upsert({
              where: { sellerId: order.store.sellerId }, update: {}, create: { sellerId: order.store.sellerId, currency: def.code },
            });
            // 💱 الإيداع بعملة المحفظة بعد التحويل من عملة الدفعة
            const credit = await this.fx.convert(Number(payment.amount), payment.currency, wallet.currency);
            await this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: credit } } });
            await this.prisma.walletTransaction.create({
              data: { walletId: wallet.id, type: 'credit', amount: credit, currency: wallet.currency, note: `دفع طلب ${order.number} (${payment.number})`, referenceId: order.number },
            });
          }
          await this.messaging.send('order_status', order.customerPhone, {
            name: order.customerName, number: order.number,
            status: 'تم تأكيد الدفع ✅ وجاري تجهيز طلبك', store: order.store.name,
          });
        } else {
          await this.messaging.send('order_status', order.customerPhone, {
            name: order.customerName, number: order.number,
            status: 'رُفض إثبات الدفع ❌ — تواصل مع المتجر', store: order.store.name,
          });
        }
      }
    }
    return { done: true };
  }

  // ── الإدارة: إحصائيات + نصائح ──
  async adminStats() {
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [pending, approvedToday, rejectedWeek, gateways, totals] = await Promise.all([
      this.prisma.payment.count({ where: { status: 'pending' } }),
      this.prisma.payment.count({ where: { status: 'approved', reviewedAt: { gte: dayAgo } } }),
      this.prisma.payment.count({ where: { status: 'rejected', reviewedAt: { gte: weekAgo } } }),
      this.prisma.paymentGateway.count({ where: { isActive: true } }),
      this.prisma.payment.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
    ]);
    return {
      pending, approvedToday, rejectedWeek, gateways,
      totalApproved: Number(totals._sum.amount || 0),
      tips: this.ai.statsTips({ pending, approvedToday, rejectedWeek, gateways }),
    };
  }

  // ── الإدارة: بوابات الدفع CRUD ──
  async adminGateways() {
    const [gateways, stats] = await Promise.all([
      this.prisma.paymentGateway.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.payment.groupBy({
        by: ['gatewayId', 'status'],
        where: { gatewayId: { not: null } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);
    // تجميع إحصاءات كل بوابة: عدد العمليات + المبالغ المعتمدة
    const map: Record<string, { payments: number; approvedAmount: number; pending: number }> = {};
    for (const s of stats) {
      const id = s.gatewayId as string;
      map[id] = map[id] || { payments: 0, approvedAmount: 0, pending: 0 };
      map[id].payments += s._count._all;
      if (s.status === 'approved') map[id].approvedAmount += Number(s._sum.amount || 0);
      if (s.status === 'pending') map[id].pending += s._count._all;
    }
    // 🎭 الأسرار تُقنَّع قبل الوصول للمتصفح — القيمة الحقيقية لا تغادر الخادم
    return gateways.map((g) => ({
      ...g,
      apiKey: maskSecret(g.apiKey),
      apiSecret: maskSecret(g.apiSecret),
      merchantId: maskSecret(g.merchantId),
      stats: map[g.id] || { payments: 0, approvedAmount: 0, pending: 0 },
    }));
  }

  // 🔌 اختبار اتصال البوابة — فحص محلي مباشر (بدون خوادم خارجية) مع مهلة 5 ثوانٍ
  async testGateway(id: string) {
    const g = await this.prisma.paymentGateway.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('البوابة غير موجودة');
    if (!g.apiUrl) return { ok: false, message: 'لم يُضبط رابط API للبوابة — أضف apiUrl أولاً' };
    const started = Date.now();
    try {
      const apiKey = decryptSecret(g.apiKey);
      const merchantId = decryptSecret(g.merchantId);
      const res = await fetch(g.apiUrl, {
        method: 'GET',
        headers: apiKey ? { Authorization: `Bearer ${apiKey}`, 'x-merchant-id': merchantId || '' } : {},
        signal: AbortSignal.timeout(5000),
      });
      return {
        ok: res.status < 500,
        status: res.status,
        latencyMs: Date.now() - started,
        message: res.status < 400 ? 'الاتصال ناجح ✅' : `البوابة تستجيب لكن برمز ${res.status} — تحقق من المفاتيح`,
      };
    } catch (e: any) {
      return { ok: false, latencyMs: Date.now() - started, message: `تعذر الوصول للبوابة: ${e?.name === 'TimeoutError' ? 'انتهت المهلة (5 ثوانٍ)' : 'خطأ في الشبكة أو العنوان'}` };
    }
  }

  saveGateway(body: { id?: string; name: string; provider: string; scopes: string[]; accountInfo?: string; instructions?: string; fee?: number; apiUrl?: string; apiKey?: string; apiSecret?: string; merchantId?: string; isActive?: boolean }) {
    if (!body.name?.trim()) throw new BadRequestException('اسم البوابة مطلوب');
    if (body.apiUrl && !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(body.apiUrl)) {
      throw new BadRequestException('رابط API غير صالح — يجب أن يبدأ بـ http:// أو https://');
    }
    const data: any = {
      name: body.name,
      provider: body.provider,
      scopes: body.scopes || ['orders'],
      accountInfo: body.accountInfo || null,
      instructions: body.instructions || null,
      fee: Number(body.fee || 0),
      apiUrl: body.apiUrl || null,
      isActive: body.isActive ?? true,
    };
    // 🔐 الأسرار تُخزَّن مشفرة (AES-256-GCM) — وعند التعديل: الحقل الفارغ يُبقي القيمة الحالية
    if (!body.id || body.apiKey) data.apiKey = encryptSecret(body.apiKey);
    if (!body.id || body.apiSecret) data.apiSecret = encryptSecret(body.apiSecret);
    if (!body.id || body.merchantId) data.merchantId = encryptSecret(body.merchantId);
    if (body.id) return this.prisma.paymentGateway.update({ where: { id: body.id }, data });
    return this.prisma.paymentGateway.create({ data });
  }

  async toggleGateway(id: string) {
    const g = await this.prisma.paymentGateway.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('البوابة غير موجودة');
    return this.prisma.paymentGateway.update({ where: { id }, data: { isActive: !g.isActive } });
  }

  deleteGateway(id: string) {
    return this.prisma.paymentGateway.delete({ where: { id } });
  }
}
