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
  // 🎯 تحديد مالك البطاقة (عميل أو بائع) — شرط الاستعلام الموحد
  private ownerWhere(ownerType: string, ownerId: string) {
    return ownerType === 'seller'
      ? { ownerType: 'seller', sellerId: ownerId }
      : { ownerType: 'customer', customerId: ownerId };
  }

  // جلب اسم وجوال المالك من سجله
  private async ownerInfo(ownerType: string, ownerId: string) {
    const u = ownerType === 'seller'
      ? await this.prisma.seller.findUnique({ where: { id: ownerId }, select: { name: true, phone: true } })
      : await this.prisma.customer.findUnique({ where: { id: ownerId }, select: { name: true, phone: true } });
    return u || { name: '', phone: '' };
  }

  async myCard(ownerType: string, ownerId: string) {
    let card = await this.prisma.customerCard.findFirst({ where: this.ownerWhere(ownerType, ownerId) as any });
    if (!card) {
      const info = await this.ownerInfo(ownerType, ownerId);
      card = await this.prisma.customerCard.create({
        data: {
          ...this.ownerWhere(ownerType, ownerId),
          holderName: info.name, phone: info.phone,
          cardNumber: this.cardNumber(),
        } as any,
      });
    }
    // بطاقات قديمة بلا بيانات مالك — تُستكمل تلقائياً من سجله
    if (!card.holderName || !card.phone) {
      const info = await this.ownerInfo(ownerType, ownerId);
      card = await this.prisma.customerCard.update({
        where: { id: card.id },
        data: { holderName: card.holderName || info.name, phone: card.phone || info.phone },
      });
    }
    const topups = await this.prisma.cardTopup.findMany({
      where: { cardId: card.id }, orderBy: { createdAt: 'desc' }, take: 20,
    });
    const editRequests = await this.prisma.cardEditRequest.findMany({
      where: { cardId: card.id }, orderBy: { createdAt: 'desc' }, take: 5,
    });
    const tips = this.ai.customerCardTips(Number(card.balance), topups.length);
    return { card, topups, editRequests, tips };
  }

  // شحن ببطاقة يمن زون (فوري) — للعميل والبائع
  async redeem(ownerType: string, ownerId: string, body: { cardNumber: string; pin: string }) {
    const key = `redeem:${ownerType}:${ownerId}`;
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

    const myCard = await this.prisma.customerCard.findFirst({ where: this.ownerWhere(ownerType, ownerId) as any });
    if (!myCard) throw new NotFoundException('بطاقتك غير موجودة');

    await this.prisma.$transaction([
      this.prisma.paymentCard.update({
        where: { id: card.id },
        data: { isUsed: true, usedBy: `${ownerType}:${ownerId}`, usedAt: new Date() },
      }),
      this.prisma.customerCard.update({
        where: { id: myCard.id },
        data: { balance: { increment: card.value } },
      }),
      this.prisma.cardTopup.create({
        data: { cardId: myCard.id, ...(ownerType === 'seller' ? { sellerId: ownerId } : { customerId: ownerId }), amount: card.value, method: 'payment-card', status: 'approved', reviewedAt: new Date() },
      }),
    ]);
    this.redeemAttempts.delete(key);
    return { success: true, added: Number(card.value), message: `🎉 شُحنت بطاقتك بـ ${Number(card.value).toLocaleString()} ر.ي` };
  }

  // شحن عبر بوابة (إثبات → مراجعة) — للعميل والبائع
  async topupProof(ownerType: string, ownerId: string, body: { amount: number; gatewayName: string; proofImage: string }) {
    const myCard = await this.prisma.customerCard.findFirst({ where: this.ownerWhere(ownerType, ownerId) as any });
    if (!myCard) throw new NotFoundException('بطاقتك غير موجودة');
    const pending = await this.prisma.cardTopup.findFirst({ where: { cardId: myCard.id, status: 'pending' } });
    if (pending) throw new BadRequestException('لديك طلب شحن قيد المراجعة');
    return this.prisma.cardTopup.create({
      data: { cardId: myCard.id, ...(ownerType === 'seller' ? { sellerId: ownerId } : { customerId: ownerId }), amount: Number(body.amount), method: `gateway:${body.gatewayName}`, proofImage: body.proofImage },
    });
  }

  // 📝 طلب تعديل بيانات البطاقة — يرسله المالك وتنفذه الإدارة
  async requestCardEdit(ownerType: string, ownerId: string, body: { holderName?: string; phone?: string; message?: string }) {
    const card = await this.prisma.customerCard.findFirst({ where: this.ownerWhere(ownerType, ownerId) as any });
    if (!card) throw new NotFoundException('بطاقتك غير موجودة');
    const holderName = String(body.holderName || '').trim().slice(0, 80) || null;
    const phone = String(body.phone || '').trim().slice(0, 20) || null;
    const message = String(body.message || '').trim().slice(0, 300) || null;
    if (!holderName && !phone) throw new BadRequestException('أدخل الاسم أو رقم الجوال المطلوب تعديله');
    if (holderName && holderName === card.holderName) throw new BadRequestException('الاسم مطابق للحالي — لا حاجة للتعديل');
    if (phone && phone === card.phone) throw new BadRequestException('رقم الجوال مطابق للحالي — لا حاجة للتعديل');
    const pending = await this.prisma.cardEditRequest.findFirst({ where: { cardId: card.id, status: 'pending' } });
    if (pending) throw new BadRequestException('لديك طلب تعديل قيد المراجعة — انتظر رد الإدارة');
    await this.prisma.cardEditRequest.create({
      data: { cardId: card.id, ownerType, ownerId, holderName, phone, message },
    });
    return { sent: true, message: '📨 أُرسل طلبك للإدارة — سيُعدَّل بعد المراجعة' };
  }

  // 💳 خصم من بطاقة يمن زون — أساس الدفع للخدمات المدفوعة والاشتراكات (عميل أو بائع)
  async chargeYzCard(ownerType: string, ownerId: string, amount: number) {
    const card = await this.prisma.customerCard.findFirst({ where: this.ownerWhere(ownerType, ownerId) as any });
    if (!card) throw new NotFoundException('لا تملك بطاقة يمن زون بعد — افتح صفحة «بطاقتي» لإصدارها');
    if (!card.isActive) throw new BadRequestException('بطاقتك موقوفة — تواصل مع إدارة المنصة');
    if (Number(card.balance) < amount) {
      throw new BadRequestException(`رصيد بطاقتك ${Number(card.balance).toLocaleString()} ر.ي لا يكفي — المطلوب ${amount.toLocaleString()} ر.ي`);
    }
    return this.prisma.customerCard.update({
      where: { id: card.id },
      data: { balance: { decrement: amount } },
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
      include: { customer: { select: { name: true, phone: true } }, seller: { select: { name: true, phone: true } }, card: { select: { cardNumber: true } } },
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

  // ═══ 👑 إدارة بطاقات يمن زون (عملاء + بائعون) ═══

  // بحث شامل: برقم البطاقة أو اسم صاحبها أو جوالها المرتبط
  async yzCards(q?: string) {
    const term = String(q || '').trim().slice(0, 60);
    const where: any = term
      ? { OR: [
          { cardNumber: { contains: term.toUpperCase() } },
          { holderName: { contains: term } },
          { phone: { contains: term } },
          { customer: { name: { contains: term } } },
          { customer: { phone: { contains: term } } },
          { seller: { name: { contains: term } } },
          { seller: { phone: { contains: term } } },
        ] }
      : {};
    const rows = await this.prisma.customerCard.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 60,
      include: {
        customer: { select: { name: true, phone: true } },
        seller: { select: { name: true, phone: true } },
        _count: { select: { topups: true, purchases: true } },
      },
    });
    const pendingEdits = await this.prisma.cardEditRequest.groupBy({
      by: ['cardId'], where: { status: 'pending' }, _count: true,
    });
    const pendMap = new Map(pendingEdits.map((p: any) => [p.cardId, p._count]));
    return rows.map((c: any) => ({
      id: c.id,
      cardNumber: c.cardNumber,
      balance: Number(c.balance),
      currency: c.currency,
      isActive: c.isActive,
      ownerType: c.ownerType,
      holderName: c.holderName,
      phone: c.phone,
      ownerName: c.customer?.name || c.seller?.name || '',
      ownerPhone: c.customer?.phone || c.seller?.phone || '',
      note: c.note,
      topups: c._count.topups,
      purchases: c._count.purchases,
      pendingEdits: pendMap.get(c.id) || 0,
      createdAt: c.createdAt,
    }));
  }

  // ✏️ تعديل بيانات البطاقة من الإدارة مباشرة
  async updateYzCard(id: string, patch: { holderName?: string; phone?: string; note?: string }) {
    const card = await this.prisma.customerCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('البطاقة غير موجودة');
    const data: any = {};
    if (patch.holderName !== undefined) data.holderName = String(patch.holderName).trim().slice(0, 80) || null;
    if (patch.phone !== undefined) data.phone = String(patch.phone).trim().slice(0, 20) || null;
    if (patch.note !== undefined) data.note = String(patch.note).trim().slice(0, 300) || null;
    return this.prisma.customerCard.update({ where: { id }, data });
  }

  // ⛔ إيقاف / ▶️ تفعيل البطاقة
  async toggleYzCard(id: string) {
    const card = await this.prisma.customerCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('البطاقة غير موجودة');
    const updated = await this.prisma.customerCard.update({ where: { id }, data: { isActive: !card.isActive } });
    return { isActive: updated.isActive };
  }

  // 📨 طلبات تعديل البطاقات الواردة من الملاك
  async cardEditRequests(status?: string) {
    const rows = await this.prisma.cardEditRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' }, take: 100,
      include: { card: { include: { customer: { select: { name: true, phone: true } }, seller: { select: { name: true, phone: true } } } } },
    });
    return rows.map((r: any) => ({
      id: r.id,
      status: r.status,
      ownerType: r.ownerType,
      holderName: r.holderName,
      phone: r.phone,
      message: r.message,
      adminNote: r.adminNote,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      cardNumber: r.card.cardNumber,
      currentName: r.card.holderName,
      currentPhone: r.card.phone,
      ownerName: r.card.customer?.name || r.card.seller?.name || '',
      ownerPhone: r.card.customer?.phone || r.card.seller?.phone || '',
    }));
  }

  // ✅ تنفيذ طلب التعديل (يُطبَّق على البطاقة) أو ❌ رفضه
  async reviewCardEdit(id: string, approve: boolean, adminNote?: string) {
    const req = await this.prisma.cardEditRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    if (req.status !== 'pending') throw new BadRequestException('تمت مراجعته مسبقاً');
    const ops: any[] = [
      this.prisma.cardEditRequest.update({
        where: { id },
        data: { status: approve ? 'approved' : 'rejected', reviewedAt: new Date(), adminNote: String(adminNote || '').trim().slice(0, 300) || null },
      }),
    ];
    if (approve) {
      const data: any = {};
      if (req.holderName) data.holderName = req.holderName;
      if (req.phone) data.phone = req.phone;
      if (Object.keys(data).length) ops.push(this.prisma.customerCard.update({ where: { id: req.cardId }, data }));
    }
    await this.prisma.$transaction(ops);
    // 🔔 إشعار المالك بنتيجة طلبه
    this.notifications.push(req.ownerType, req.ownerId, {
      icon: approve ? '✅' : '❌',
      title: approve ? 'عُدّلت بيانات بطاقتك' : 'رُفض طلب تعديل بطاقتك',
      body: approve
        ? 'نفّذت الإدارة طلبك وحدّثت بيانات بطاقة يمن زون الخاصة بك'
        : `رُفض طلب تعديل البطاقة${adminNote ? ` — ${adminNote}` : ''}`,
      link: req.ownerType === 'seller' ? '/seller/card' : '/customer/card',
    }).catch(() => {});
    return { done: true };
  }
}
