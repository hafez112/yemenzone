import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShieldService } from '../shield/shield.service';
import { FinanceService } from '../finance/finance.service';

// ↩️ الاسترجاع: العميل يطلب بعد الاستلام ← البائع يقبل أو يرفض
// القبول: إرجاع الكميات للمخزون (مع خيارات المنتج) + استرداد المبلغ تلقائياً لطلبات البطاقة + إشعار العميل
@Injectable()
export class ReturnsService {
  constructor(
    private prisma: PrismaService,
    private messaging: MessagingService,
    private notifications: NotificationsService,
    private shield: ShieldService,
    private finance: FinanceService,
  ) {}

  // ═══ العميل: تقديم طلب استرجاع (عام — برقم الطلب والجوال) ═══
  async create(body: { number: string; phone: string; reason: string; captchaId?: string; captchaAnswer?: string }) {
    await this.shield.requireCaptcha('return', body.captchaId, body.captchaAnswer); // 🤖 لست روبوت
    const number = (body.number || '').toUpperCase().trim();
    const phone = (body.phone || '').replace(/\D/g, '');
    const reason = (body.reason || '').trim();
    if (!number || !phone) throw new BadRequestException('رقم الطلب والجوال مطلوبان');
    if (reason.length < 10) throw new BadRequestException('اكتب سبب الاسترجاع بتفصيل (10 أحرف على الأقل)');
    if (reason.length > 500) throw new BadRequestException('السبب طويل جداً — 500 حرف كحد أقصى');

    const order = await this.prisma.order.findFirst({
      where: { number, customerPhone: phone },
      include: { store: { select: { id: true, name: true, sellerId: true } } },
    });
    if (!order) throw new NotFoundException('لم يُعثر على الطلب — تأكد من الرقم والجوال');
    if (!['delivered', 'completed'].includes(order.status))
      throw new BadRequestException('الاسترجاع متاح بعد استلام طلبك فقط');
    // مهلة الاسترجاع: 7 أيام من التسليم
    const ageDays = (Date.now() - new Date(order.updatedAt).getTime()) / 86400000;
    if (ageDays > 7) throw new BadRequestException('انتهت مهلة الاسترجاع (7 أيام من الاستلام)');

    const existing = await this.prisma.returnRequest.findFirst({
      where: { orderId: order.id, status: { in: ['pending', 'accepted'] } },
    });
    if (existing)
      throw new BadRequestException(existing.status === 'pending'
        ? 'لديك طلب استرجاع قيد المراجعة لهذا الطلب'
        : 'قُبل طلب استرجاع هذا الطلب مسبقاً');

    const ret = await this.prisma.returnRequest.create({
      data: { orderId: order.id, customerName: order.customerName, customerPhone: order.customerPhone, reason },
    });

    // 🔔 إشعار البائع الداخلي + رسالة واتساب/نصية إن فعّل قالب return_request
    this.notifications.push('seller', order.store.sellerId!, {
      icon: '↩️',
      title: `طلب استرجاع جديد للطلب ${order.number}`,
      body: `${order.customerName}: ${reason.slice(0, 120)}`,
      link: '/seller/returns',
    }).catch(() => {});
    const seller = await this.prisma.seller.findUnique({ where: { id: order.store.sellerId! }, select: { phone: true } });
    if (seller?.phone) {
      this.messaging.send('return_request', seller.phone, {
        number: order.number, customer: order.customerName, reason: reason.slice(0, 150), store: order.store.name,
      }).catch(() => {});
    }
    return { ok: true, id: ret.id, message: '✅ وصل طلب استرجاعك للبائع — سيُشعرك بقراره' };
  }

  // ═══ العميل: حالة طلبات الاسترجاع لطلب معين (عام) ═══
  async forOrder(number: string, phone: string) {
    const order = await this.prisma.order.findFirst({
      where: { number: (number || '').toUpperCase().trim(), customerPhone: (phone || '').replace(/\D/g, '') },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('لم يُعثر على الطلب');
    return this.prisma.returnRequest.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, reason: true, status: true, sellerNote: true, refundedAmount: true, createdAt: true, reviewedAt: true },
    });
  }

  // ═══ البائع: قائمة طلبات الاسترجاع ═══
  async list(sellerId: string, status?: string) {
    const store = await this.sellerStore(sellerId);
    const where: any = { order: { storeId: store.id } };
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) where.status = status;
    const [items, counts] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          order: {
            select: {
              number: true, total: true, currency: true, paymentMethod: true, status: true, createdAt: true,
              items: { select: { name: true, qty: true, price: true, variant: true } },
            },
          },
        },
      }),
      this.prisma.returnRequest.groupBy({
        by: ['status'], where: { order: { storeId: store.id } }, _count: true,
      }),
    ]);
    return {
      items,
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    };
  }

  // ═══ البائع: قبول / رفض ═══
  async review(sellerId: string, id: string, body: { approve: boolean; note?: string }) {
    const store = await this.sellerStore(sellerId);
    const ret = await this.prisma.returnRequest.findFirst({
      where: { id, order: { storeId: store.id } },
      include: { order: { include: { items: true } } },
    });
    if (!ret) throw new NotFoundException('طلب الاسترجاع غير موجود');
    if (ret.status !== 'pending') throw new BadRequestException('رُوجع هذا الطلب مسبقاً');
    const note = (body.note || '').trim().slice(0, 300) || null;
    const order = ret.order;

    // ── الرفض: تحديث الحالة + إشعار العميل ──
    if (!body.approve) {
      await this.prisma.returnRequest.update({
        where: { id }, data: { status: 'rejected', sellerNote: note, reviewedAt: new Date() },
      });
      this.notifyCustomer(order, 'return_status', {
        name: order.customerName, number: order.number,
        status: `نأسف، رُفض طلب استرجاع طلبك${note ? ` — السبب: ${note}` : ''}`,
      }, '❌ نتيجة طلب الاسترجاع', `رُفض طلب استرجاع طلبك ${order.number}${note ? ` — ${note}` : ''}`, order.customerId);
      return { ok: true, status: 'rejected' };
    }

    // ── القبول ──
    if (order.status === 'refunded') throw new BadRequestException('هذا الطلب مسترجع مسبقاً');

    // 💳 طلب مدفوع بالبطاقة؟ الاسترداد تلقائي: محفظة البائع ← بطاقة العميل
    const cardPaid = order.paymentMethod === 'card';
    let wallet: any = null;
    let customerCard: any = null;
    if (cardPaid) {
      wallet = await this.prisma.wallet.findUnique({ where: { sellerId } });
      if (!wallet || Number(wallet.balance) < Number(order.total))
        throw new BadRequestException(`رصيد محفظتك (${Number(wallet?.balance || 0).toLocaleString()}) لا يكفي لإرجاع ${Number(order.total).toLocaleString()} ر.ي للعميل`);
      const customer = order.customerId
        ? await this.prisma.customer.findUnique({ where: { id: order.customerId } })
        : await this.prisma.customer.findUnique({ where: { phone: order.customerPhone } });
      if (customer) {
        customerCard = await this.prisma.customerCard.findFirst({ where: { customerId: customer.id } });
      }
      if (!customerCard) throw new BadRequestException('لم يُعثر على بطاقة العميل لإعادة المبلغ — تواصل مع الإدارة');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1) إرجاع الكميات للمخزون — مع مخزون خيارات المنتج إن وجدت
      for (const it of order.items) {
        const product = await tx.product.findUnique({ where: { id: it.productId } });
        if (!product) continue;
        let variantsData: any;
        if (it.variantId && Array.isArray(product.variants)) {
          const variants = [...(product.variants as any[])];
          const target = variants.find((v) => v.id === it.variantId);
          if (target && target.stock !== null && target.stock !== undefined) {
            target.stock = (target.stock || 0) + it.qty;
            variantsData = variants;
          }
        }
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { increment: it.qty }, ...(variantsData ? { variants: variantsData } : {}) },
        });
      }

      // 2) الاسترداد المالي لطلبات البطاقة
      if (cardPaid) {
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: order.total } } });
        await tx.walletTransaction.create({
          data: { walletId: wallet.id, type: 'debit', amount: order.total, note: `استرداد الطلب ${order.number} (استرجاع)`, referenceId: order.number },
        });
        await tx.customerCard.update({ where: { id: customerCard.id }, data: { balance: { increment: order.total } } });
        await tx.cardTopup.create({
          data: {
            cardId: customerCard.id, customerId: customerCard.customerId, amount: order.total,
            method: `refund:${order.number}`, status: 'approved', reviewedAt: new Date(),
          },
        });
        await tx.payment.updateMany({
          where: { referenceId: order.id, purpose: 'order', status: 'approved' },
          data: { status: 'refunded' },
        });
      }

      // 3) حالة الاسترجاع + حالة الطلب
      await tx.returnRequest.update({
        where: { id },
        data: { status: 'accepted', sellerNote: note, reviewedAt: new Date(), refundedAmount: cardPaid ? order.total : null },
      });
      await tx.order.update({ where: { id: order.id }, data: { status: 'refunded' } });
    }, { timeout: 30000 });

    // 🤝 عكس عمولة المنصة — لا عمولة على طلب مُسترجع
    await this.finance.reverseCommission(order.id).catch(() => {});

    // 4) إشعار العميل بالقبول
    const statusMsg = cardPaid
      ? `قُبل طلب استرجاعك ✅ — أُعيد مبلغ ${Number(order.total).toLocaleString()} ر.ي إلى بطاقتك، وسيُرتب البائع معك استلام المنتج`
      : 'قُبل طلب استرجاعك ✅ — سيُرتب البائع معك استلام المنتج وإعادة المبلغ';
    this.notifyCustomer(order, 'return_status', {
      name: order.customerName, number: order.number, status: statusMsg,
    }, '✅ قُبل طلب الاسترجاع', `طلبك ${order.number}: ${statusMsg}`, order.customerId);

    return { ok: true, status: 'accepted', refunded: cardPaid ? Number(order.total) : 0 };
  }

  // إشعار العميل: رسالة خارجية (إن فعّل القالب) + تنبيه داخلي للمسجل
  private notifyCustomer(order: any, event: string, vars: Record<string, string>, title: string, body: string, customerId?: string | null) {
    this.messaging.send(event, order.customerPhone, vars).catch(() => {});
    if (customerId) {
      this.notifications.push('customer', customerId, { icon: '↩️', title, body, link: '/customer/orders' }).catch(() => {});
    }
  }

  private async sellerStore(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر لهذا الحساب');
    return store;
  }
}
