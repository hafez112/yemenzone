import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CardsService } from '../cards/cards.service';
import { effectiveFeatures, subscriptionActive, FEATURE_AR } from '../../common/features';

@Injectable()
export class PlansService {
  constructor(
    private prisma: PrismaService,
    private messaging: MessagingService,
    private notifications: NotificationsService,
    private cards: CardsService,
  ) {}

  private async sellerStore(sellerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { sellerId },
      include: { subscription: { include: { plan: true } }, type: true },
    });
    if (!store) throw new NotFoundException('أنشئ متجرك أولاً');
    return store;
  }

  // ═══ اشتراكي الحالي + الخطط المتاحة ═══
  async mySubscription(sellerId: string) {
    const store = await this.sellerStore(sellerId);
    // 🎯 باقات تناسب نشاط المتجر: العامة (kind=null) + المخصصة لنوع نشاطه
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true, OR: [{ kind: null }, { kind: store.type.kind }] },
      orderBy: { sort: 'asc' },
    });
    const pendingPayment = await this.prisma.payment.findFirst({
      where: { payerId: sellerId, purpose: 'subscription', status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    return {
      store, plans, current: store.subscription, pendingPayment,
      // الميزات الفعالة + أسماؤها — الواجهة تبني منها شاشة الاشتراك والأقفال
      features: effectiveFeatures(store),
      featureLabels: FEATURE_AR,
      subscriptionActive: subscriptionActive(store.subscription),
      grants: (store.grants as any) || {},
    };
  }

  // طلب ترقية خطة (مع إثبات تحويل)
  async subscribe(sellerId: string, body: { planId: string; method: string; proofImage?: string }) {
    const store = await this.sellerStore(sellerId);
    const plan = await this.prisma.plan.findUnique({ where: { id: body.planId } });
    if (!plan || !plan.isActive) throw new NotFoundException('الخطة غير موجودة');
    if (store.subscription?.planId === plan.id) throw new ConflictException('أنت مشترك بهذه الخطة بالفعل');

    // الخطة المجانية: ترقية فورية
    if (Number(plan.priceMonthly) === 0) {
      await this.prisma.subscription.upsert({
        where: { storeId: store.id },
        update: { planId: plan.id, isActive: true },
        create: { storeId: store.id, planId: plan.id },
      });
      return { activated: true, message: 'تم التحويل للخطة المجانية' };
    }

    // 💳 الدفع ببطاقة يمن زون — خصم فوري وتفعيل فوري بدون مراجعة
    if (body.method === 'yz-card') {
      const card = await this.cards.chargeYzCard('seller', sellerId, Number(plan.priceMonthly));
      const number = 'INV-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      const endsAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      await this.prisma.$transaction([
        this.prisma.subscription.upsert({
          where: { storeId: store.id },
          update: { planId: plan.id, isActive: true, startsAt: new Date(), expiresAt: endsAt },
          create: { storeId: store.id, planId: plan.id, isActive: true, startsAt: new Date(), expiresAt: endsAt },
        }),
        this.prisma.payment.create({
          data: {
            number, payerType: 'seller', payerId: sellerId, purpose: 'subscription',
            amount: plan.priceMonthly, method: 'yz-card', status: 'approved',
            reviewedAt: new Date(), referenceId: plan.id,
          },
        }),
      ]);
      this.notifications.push('seller', sellerId, {
        icon: '💳',
        title: `اشتركت في خطة ${plan.name} ✅`,
        body: `دُفع ${Number(plan.priceMonthly).toLocaleString()} ر.ي من بطاقتك وفُعّلت خطتك فوراً حتى ${endsAt.toLocaleDateString('ar-YE')}`,
        link: '/seller/subscription',
      }).catch(() => {});
      return { activated: true, paidByCard: true, message: `🎉 دُفع من بطاقتك وفعّلت خطة ${plan.name} فوراً` };
    }

    // منع تكرار طلب معلق
    const pending = await this.prisma.payment.findFirst({
      where: { payerId: sellerId, purpose: 'subscription', status: 'pending' },
    });
    if (pending) throw new ConflictException('لديك طلب اشتراك قيد المراجعة بالفعل');

    const number = 'INV-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const payment = await this.prisma.payment.create({
      data: {
        number,
        payerType: 'seller',
        payerId: sellerId,
        purpose: 'subscription',
        amount: plan.priceMonthly,
        method: body.method || 'transfer',
        proofImage: body.proofImage,
        referenceId: plan.id,
      },
    });
    return { activated: false, payment, message: 'تم استلام طلبك — سيتم تفعيل الخطة بعد مراجعة الإثبات' };
  }

  // ملاحظة: منطق الكوبونات انتقل بالكامل إلى CouponsModule — لا تكرار هنا

  // ═══ إدارة الخطط (للمدير) ═══
  async adminPlans() {
    return this.prisma.plan.findMany({
      include: { _count: { select: { subscriptions: true } } },
      orderBy: { sort: 'asc' },
    });
  }

  async savePlan(id: string | null, body: any) {
    const KINDS = ['products', 'rentals', 'hotel', 'services', 'restaurants', 'malls'];
    const data = {
      name: body.name,
      kind: KINDS.includes(body.kind) ? body.kind : null, // 🎯 نوع النشاط المستهدف — فارغ = عامة
      priceMonthly: Number(body.priceMonthly || 0),
      priceYearly: body.priceYearly ? Number(body.priceYearly) : null,
      features: body.features || {},
      isActive: body.isActive ?? true,
      sort: Number(body.sort || 0),
    };
    if (id) return this.prisma.plan.update({ where: { id }, data });
    return this.prisma.plan.create({ data: { ...data, slug: body.slug || `plan-${Date.now()}` } });
  }

  async adminSubscriptions() {
    return this.prisma.subscription.findMany({
      include: {
        store: { select: { name: true, slug: true } },
        plan: { select: { name: true, priceMonthly: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ترقية متجر يدوياً من المدير
  async adminSetPlan(storeId: string, planId: string, months = 1) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);
    return this.prisma.subscription.upsert({
      where: { storeId },
      update: { planId, isActive: true, expiresAt },
      create: { storeId, planId, expiresAt },
    });
  }

  // موافقة/رفض طلب اشتراك
  async reviewSubscriptionPayment(paymentId: string, approve: boolean, adminId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.purpose !== 'subscription') throw new NotFoundException('الدفعة غير موجودة');
    if (payment.status !== 'pending') throw new BadRequestException('تمت مراجعتها مسبقاً');

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: approve ? 'approved' : 'rejected', reviewedBy: adminId, reviewedAt: new Date() },
    });

    if (payment.referenceId) {
      const store = await this.prisma.store.findFirst({ where: { sellerId: payment.payerId }, include: { seller: true } });
      if (store?.seller) {
        const plan = await this.prisma.plan.findUnique({ where: { id: payment.referenceId } });
        if (approve) {
          await this.adminSetPlan(store.id, payment.referenceId, 1);
          // 📨 إشعار التاجر بتفعيل اشتراكه
          await this.messaging.send('subscription_approved', store.seller.phone, {
            name: store.seller.name, plan: plan?.name || '', store: store.name,
          });
          // 🔔 تنبيه داخلي — فُتحت الميزات
          await this.notifications.push('seller', store.sellerId, {
            icon: '💎',
            title: `فُعّلت خطة "${plan?.name}" — مبارك! 🎉`,
            body: 'انفتحت كل ميزات خطتك الجديدة الآن',
            link: '/seller/subscription',
          });
        } else {
          await this.notifications.push('seller', store.sellerId, {
            icon: '❌',
            title: 'رُفض طلب الاشتراك',
            body: `فاتورة ${payment.number} — تواصل مع الإدارة للتفاصيل`,
            link: '/seller/subscription',
          });
        }
      }
    }
    return { done: true };
  }
}
