import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CardAiService } from './card-ai.service';

// 🎫💰 البطاقات والمحافظ: بطاقات شحن + بطاقة العميل + محفظة التاجر + السحب
@Injectable()
export class CardsService {
  private redeemAttempts = new Map<string, { count: number; until: number }>();

  constructor(
    private prisma: PrismaService,
    private messaging: MessagingService,
    private notifications: NotificationsService,
    private ai: CardAiService,
  ) {}

  private cardNumber() {
    const seg = () => crypto.randomInt(1000, 9999);
    return `YZ-${seg()}-${seg()}-${seg()}`;
  }
  private pin() { return crypto.randomInt(100000, 999999).toString(); }

  // ═══ الإدارة: دفعات البطاقات ═══
  async createBatch(body: { name: string; count: number; value: number }) {
    const count = Math.min(Math.max(body.count || 1, 1), 500);
    const value = Number(body.value);
    if (!body.name || !value || value <= 0) throw new BadRequestException('اسم الدفعة والقيمة مطلوبان');

    const batch = await this.prisma.cardBatch.create({ data: { name: body.name, count, value } });
    const cards = Array.from({ length: count }, () => ({
      batchId: batch.id, cardNumber: this.cardNumber(), pin: this.pin(), value,
    }));
    await this.prisma.paymentCard.createMany({ data: cards });
    return { batch, generated: count };
  }

  batches() {
    return this.prisma.cardBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { cards: true } } },
    });
  }

  cards(q: { batchId?: string; status?: string }) {
    return this.prisma.paymentCard.findMany({
      where: {
        ...(q.batchId ? { batchId: q.batchId } : {}),
        ...(q.status === 'used' ? { isUsed: true } : q.status === 'unused' ? { isUsed: false } : q.status === 'disabled' ? { isDisabled: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { batch: { select: { name: true } } },
    });
  }

  async toggleCard(id: string) {
    const c = await this.prisma.paymentCard.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('البطاقة غير موجودة');
    return this.prisma.paymentCard.update({ where: { id }, data: { isDisabled: !c.isDisabled } });
  }

  // ═══ العميل: بطاقته ═══
  async myCard(customerId: string) {
    let card = await this.prisma.customerCard.findFirst({ where: { customerId } });
    if (!card) {
      card = await this.prisma.customerCard.create({
        data: { customerId, cardNumber: this.cardNumber() },
      });
    }
    const topups = await this.prisma.cardTopup.findMany({
      where: { customerId }, orderBy: { createdAt: 'desc' }, take: 20,
    });
    const tips = this.ai.customerCardTips(Number(card.balance), topups.length);
    return { card, topups, tips };
  }

  // شحن ببطاقة يمن زون (فوري)
  async redeem(customerId: string, body: { cardNumber: string; pin: string }) {
    const key = `redeem:${customerId}`;
    const att = this.redeemAttempts.get(key);
    const failedCount = att && Date.now() < att.until ? att.count : 0;

    const card = await this.prisma.paymentCard.findUnique({ where: { cardNumber: body.cardNumber?.toUpperCase().trim() } });
    const risk = this.ai.redeemRisk(failedCount, card?.isDisabled || false);
    if (risk.blocked) throw new BadRequestException(risk.reason);

    if (!card || card.pin !== body.pin?.trim()) {
      this.redeemAttempts.set(key, { count: failedCount + 1, until: Date.now() + 15 * 60 * 1000 });
      throw new BadRequestException(`رقم البطاقة أو الرمز غير صحيح${risk.warning ? ' — ' + risk.warning : ''}`);
    }
    if (card.isUsed) throw new BadRequestException('هذه البطاقة استُخدمت مسبقاً');

    const myCard = await this.prisma.customerCard.findFirst({ where: { customerId } });
    if (!myCard) throw new NotFoundException('بطاقتك غير موجودة');

    await this.prisma.$transaction([
      this.prisma.paymentCard.update({
        where: { id: card.id },
        data: { isUsed: true, usedBy: customerId, usedAt: new Date() },
      }),
      this.prisma.customerCard.update({
        where: { id: myCard.id },
        data: { balance: { increment: card.value } },
      }),
      this.prisma.cardTopup.create({
        data: { cardId: myCard.id, customerId, amount: card.value, method: 'payment-card', status: 'approved', reviewedAt: new Date() },
      }),
    ]);
    this.redeemAttempts.delete(key);
    return { success: true, added: Number(card.value), message: `🎉 شُحنت بطاقتك بـ ${Number(card.value).toLocaleString()} ر.ي` };
  }

  // شحن عبر بوابة (إثبات → مراجعة)
  async topupProof(customerId: string, body: { amount: number; gatewayName: string; proofImage: string }) {
    const myCard = await this.prisma.customerCard.findFirst({ where: { customerId } });
    if (!myCard) throw new NotFoundException('بطاقتك غير موجودة');
    const pending = await this.prisma.cardTopup.findFirst({ where: { customerId, status: 'pending' } });
    if (pending) throw new BadRequestException('لديك طلب شحن قيد المراجعة');
    return this.prisma.cardTopup.create({
      data: { cardId: myCard.id, customerId, amount: Number(body.amount), method: `gateway:${body.gatewayName}`, proofImage: body.proofImage },
    });
  }

  // ═══ الدفع ببطاقة العميل (مع OTP) ═══
  async payWithCard(customerId: string, body: { orderId: string; otp?: string }) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    const myCard = await this.prisma.customerCard.findFirst({ where: { customerId } });
    if (!customer || !myCard) throw new NotFoundException('بطاقتك غير موجودة');
    if (!myCard.isActive) throw new BadRequestException('بطاقتك موقوفة');

    const order = await this.prisma.order.findUnique({ where: { id: body.orderId }, include: { store: true } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.customerPhone !== customer.phone) throw new BadRequestException('هذا الطلب ليس لك');
    if (!['pending', 'confirmed'].includes(order.status)) throw new BadRequestException('لا يمكن دفع هذا الطلب');

    const paid = await this.prisma.payment.findFirst({
      where: { referenceId: order.id, purpose: 'order', status: { in: ['pending', 'approved'] } },
    });
    if (paid) throw new BadRequestException('هذا الطلب مدفوع أو قيد المراجعة');

    if (Number(myCard.balance) < Number(order.total))
      throw new BadRequestException(`رصيدك ${Number(myCard.balance).toLocaleString()} لا يكفي — المطلوب ${Number(order.total).toLocaleString()}`);

    // 🔐 OTP إن كان قالب card_verify مفعّلاً
    const otpTpl = await this.prisma.messageTemplate.findUnique({ where: { event: 'card_verify' } });
    const otpEnabled = !!otpTpl?.isActive;

    if (otpEnabled && !body.otp) {
      const code = crypto.randomInt(100000, 999999).toString();
      await this.prisma.otpCode.create({
        data: { phone: customer.phone, code, purpose: 'card_verify', expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      });
      await this.messaging.send('card_verify', customer.phone, { code, name: customer.name || 'عميلنا' });
      return { otpRequired: true, message: 'أرسلنا رمز تأكيد الدفع إلى جوالك' };
    }

    if (otpEnabled) {
      const otp = await this.prisma.otpCode.findFirst({
        where: { phone: customer.phone, code: body.otp, purpose: 'card_verify', usedAt: null, expiresAt: { gte: new Date() } },
        orderBy: { createdAt: 'desc' },
      });
      if (!otp) throw new BadRequestException('رمز التأكيد غير صحيح أو منتهي');
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
    }

    // تنفيذ الدفع: خصم العميل + إيداع التاجر + سجل دفعة معتمدة
    const wallet = await this.prisma.wallet.upsert({
      where: { sellerId: order.store.sellerId! },
      update: {},
      create: { sellerId: order.store.sellerId! },
    });
    const inv = 'INV-' + Math.random().toString(36).slice(2, 8).toUpperCase();

    await this.prisma.$transaction([
      this.prisma.customerCard.update({ where: { id: myCard.id }, data: { balance: { decrement: order.total } } }),
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: order.total } } }),
      this.prisma.walletTransaction.create({
        data: { walletId: wallet.id, type: 'credit', amount: order.total, note: `دفع طلب ${order.number} بالبطاقة`, referenceId: order.number },
      }),
      this.prisma.payment.create({
        data: {
          number: inv, payerType: 'customer', payerId: customerId, purpose: 'order',
          amount: order.total, currency: order.currency, method: 'card',
          status: 'approved', reviewedAt: new Date(), referenceId: order.id,
        },
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: { paymentMethod: 'card', status: order.status === 'pending' ? 'confirmed' : order.status },
      }),
    ]);

    await this.messaging.send('order_status', customer.phone, {
      name: order.customerName, number: order.number,
      status: 'تم الدفع بالبطاقة ✅ وجاري تجهيز طلبك', store: order.store.name,
    });
    // 🔔 إشعار البائع بوصول المبلغ لمحفظته — إطلاق ونسيان
    this.notifications.push('seller', order.store.sellerId!, {
      icon: '💰',
      title: `استلمت ${Number(order.total).toLocaleString()} ر.ي في محفظتك`,
      body: `دفع العميل ${order.customerName} طلبه ${order.number} ببطاقة يمن زون — المبلغ في محفظتك الآن`,
      link: '/seller/wallet',
    }).catch(() => {});
    return { paid: true, message: `✅ تم الدفع ${Number(order.total).toLocaleString()} ر.ي من بطاقتك` };
  }

  // ═══ محفظة التاجر ═══
  async myWallet(sellerId: string) {
    const wallet = await this.prisma.wallet.upsert({ where: { sellerId }, update: {}, create: { sellerId } });
    const [transactions, withdrawals, monthSales] = await Promise.all([
      this.prisma.walletTransaction.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      this.prisma.withdrawalRequest.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.order.count({ where: { store: { sellerId }, createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } } }),
    ]);
    const pendingW = withdrawals.filter((wd) => wd.status === 'pending').length;
    return {
      wallet, transactions, withdrawals,
      tips: this.ai.sellerWalletTips(Number(wallet.balance), pendingW, monthSales),
    };
  }

  async requestWithdrawal(sellerId: string, body: { amount: number; method: string; accountInfo: string }) {
    const wallet = await this.prisma.wallet.findUnique({ where: { sellerId } });
    if (!wallet) throw new NotFoundException('محفظتك غير موجودة');
    const amount = Number(body.amount);
    if (!amount || amount < 1000) throw new BadRequestException('أقل مبلغ للسحب 1,000 ر.ي');
    if (amount > Number(wallet.balance)) throw new BadRequestException('المبلغ أكبر من رصيدك');
    const pending = await this.prisma.withdrawalRequest.findFirst({ where: { walletId: wallet.id, status: 'pending' } });
    if (pending) throw new BadRequestException('لديك طلب سحب قيد المعالجة');
    if (!body.accountInfo?.trim()) throw new BadRequestException('أدخل بيانات الحساب للتحويل');

    // حجز المبلغ فوراً (يُعاد عند الرفض)
    const [, request] = await this.prisma.$transaction([
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: amount } } }),
      this.prisma.withdrawalRequest.create({
        data: { walletId: wallet.id, amount, method: body.method || 'حوالة', accountInfo: body.accountInfo },
      }),
      this.prisma.walletTransaction.create({
        data: { walletId: wallet.id, type: 'debit', amount, note: 'حجز طلب سحب', },
      }),
    ]);
    return { request, message: '✅ استلمنا طلب السحب — سنحوّل خلال 24-48 ساعة' };
  }

  // ═══ الإدارة: الشحن والسحب ═══
  adminTopups(status?: string) {
    return this.prisma.cardTopup.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' }, take: 100,
      include: { customer: { select: { name: true, phone: true } }, card: { select: { cardNumber: true } } },
    });
  }

  async reviewTopup(id: string, approve: boolean) {
    const topup = await this.prisma.cardTopup.findUnique({ where: { id }, include: { customer: true } });
    if (!topup) throw new NotFoundException('الطلب غير موجود');
    if (topup.status !== 'pending') throw new BadRequestException('تمت مراجعته مسبقاً');
    await this.prisma.$transaction([
      this.prisma.cardTopup.update({ where: { id }, data: { status: approve ? 'approved' : 'rejected', reviewedAt: new Date() } }),
      ...(approve ? [this.prisma.customerCard.update({ where: { id: topup.cardId }, data: { balance: { increment: topup.amount } } })] : []),
    ]);
    return { done: true };
  }

  adminWithdrawals(status?: string) {
    return this.prisma.withdrawalRequest.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' }, take: 100,
      include: { wallet: { include: { seller: { select: { name: true, phone: true } } } } },
    });
  }

  async reviewWithdrawal(id: string, approve: boolean, note?: string) {
    const wd = await this.prisma.withdrawalRequest.findUnique({ where: { id }, include: { wallet: { include: { seller: true } } } });
    if (!wd) throw new NotFoundException('الطلب غير موجود');
    if (wd.status !== 'pending') throw new BadRequestException('تمت معالجته مسبقاً');

    const ops: any[] = [
      this.prisma.withdrawalRequest.update({
        where: { id },
        data: { status: approve ? 'paid' : 'rejected', processedAt: new Date(), note: note || null },
      }),
    ];
    if (!approve) {
      // إعادة المبلغ المحجوز عند الرفض
      ops.push(this.prisma.wallet.update({ where: { id: wd.walletId }, data: { balance: { increment: wd.amount } } }));
      ops.push(this.prisma.walletTransaction.create({
        data: { walletId: wd.walletId, type: 'credit', amount: wd.amount, note: 'إعادة مبلغ سحب مرفوض' },
      }));
    }
    await this.prisma.$transaction(ops);
    await this.messaging.send('order_status', wd.wallet.seller.phone, {
      name: wd.wallet.seller.name, number: `سحب ${Number(wd.amount).toLocaleString()}`,
      status: approve ? 'حُوّل طلب السحب ✅' : 'رُفض طلب السحب وأُعيد المبلغ لمحفظتك', store: 'يمن زون',
    });
    return { done: true };
  }

  // ═══ إحصائيات الإدارة ═══
  async adminStats() {
    const [unusedCards, usedCards, disabledCards, pendingTopups, pendingWithdrawals, cardsBalance, walletsBalance] = await Promise.all([
      this.prisma.paymentCard.count({ where: { isUsed: false, isDisabled: false } }),
      this.prisma.paymentCard.count({ where: { isUsed: true } }),
      this.prisma.paymentCard.count({ where: { isDisabled: true } }),
      this.prisma.cardTopup.count({ where: { status: 'pending' } }),
      this.prisma.withdrawalRequest.count({ where: { status: 'pending' } }),
      this.prisma.customerCard.aggregate({ _sum: { balance: true } }),
      this.prisma.wallet.aggregate({ _sum: { balance: true } }),
    ]);
    return {
      unusedCards, usedCards, disabledCards, pendingTopups, pendingWithdrawals,
      cardsBalance: Number(cardsBalance._sum.balance || 0),
      walletsBalance: Number(walletsBalance._sum.balance || 0),
      tips: this.ai.adminTips({ unusedCards, usedCards, pendingTopups, pendingWithdrawals }),
    };
  }
}
