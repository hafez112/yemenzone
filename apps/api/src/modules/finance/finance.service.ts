import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceAiService } from './finance-ai.service';
import { SecurityService } from '../../common/security.service';
import { NotificationsService } from '../notifications/notifications.service';
import { requireFeature } from '../../common/features';
import { calcCommission, settlementNet } from '../../common/money';

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const EXPENSE_CATS = ['hosting', 'marketing', 'salaries', 'fees', 'other'];

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private ai: FinanceAiService,
    private security: SecurityService,
    private notifications: NotificationsService,
  ) {}

  // ── أدوات ──
  private last6Months() {
    const months: { key: string; label: string; from: Date; to: Date }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: MONTHS_AR[d.getMonth()],
        from: d,
        to: new Date(d.getFullYear(), d.getMonth() + 1, 1),
      });
    }
    return months;
  }

  private async getSettingNumber(key: string, def: number) {
    const s = await this.prisma.setting.findUnique({ where: { key } });
    return s ? Number(s.value) : def;
  }

  // ═══ العملات ═══
  currencies() {
    return this.prisma.currency.findMany({ orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] });
  }

  async saveCurrency(body: { code: string; name: string; symbol: string; rateToUsd: number }) {
    const code = body.code?.toUpperCase().trim();
    if (!code || !body.name || !body.symbol || !body.rateToUsd) throw new BadRequestException('كل الحقول مطلوبة');
    return this.prisma.currency.upsert({
      where: { code },
      update: { name: body.name, symbol: body.symbol, rateToUsd: Number(body.rateToUsd) },
      create: { code, name: body.name, symbol: body.symbol, rateToUsd: Number(body.rateToUsd) },
    });
  }

  async updateRate(code: string, rate: number) {
    if (!rate || rate <= 0) throw new BadRequestException('سعر غير صحيح');
    return this.prisma.currency.update({ where: { code: code.toUpperCase() }, data: { rateToUsd: Number(rate) } });
  }

  async toggleCurrency(code: string) {
    const c = await this.prisma.currency.findUnique({ where: { code: code.toUpperCase() } });
    if (!c) throw new NotFoundException('العملة غير موجودة');
    if (c.isDefault) throw new BadRequestException('لا يمكن تعطيل العملة الافتراضية');
    return this.prisma.currency.update({ where: { code: c.code }, data: { isActive: !c.isActive } });
  }

  async setDefault(code: string) {
    const c = await this.prisma.currency.findUnique({ where: { code: code.toUpperCase() } });
    if (!c || !c.isActive) throw new NotFoundException('العملة غير موجودة أو معطلة');
    await this.prisma.$transaction([
      this.prisma.currency.updateMany({ data: { isDefault: false } }),
      this.prisma.currency.update({ where: { code: c.code }, data: { isDefault: true } }),
    ]);
    return { done: true };
  }

  // ═══ العمولة ═══
  async getCommission() { return this.getSettingNumber('platform_commission_percent', 5); }

  async setCommission(percent: number) {
    const p = Number(percent);
    if (isNaN(p) || p < 0 || p > 30) throw new BadRequestException('العمولة بين 0 و 30%');
    await this.prisma.setting.upsert({
      where: { key: 'platform_commission_percent' },
      update: { value: p },
      create: { key: 'platform_commission_percent', group: 'general', value: p },
    });
    return { commission: p };
  }

  // ═══════════════════════════════════════════════════
  // 🤝 محرك العمولة الآلي — خصم من محفظة البائع عند التسليم
  // ═══════════════════════════════════════════════════

  // النسبة الفعلية لمتجر: المخصصة أولاً ثم العامة
  async rateForStore(store: { commissionPercent?: number | null }): Promise<number> {
    if (store.commissionPercent != null) return store.commissionPercent;
    return this.getCommission();
  }

  // ⚙️ خصم عمولة الطلب — يُستدعى عند وصول الطلب إلى «سُلّم/مكتمل» (idempotent)
  async chargeCommissionForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { store: true } });
    if (!order || order.commissionCharged) return null;
    if (!['delivered', 'completed'].includes(order.status)) return null;
    const store = order.store;
    if (!store) return null;
    const rate = await this.rateForStore(store);
    const amount = calcCommission(Number(order.total), rate);

    if (amount <= 0) {
      await this.prisma.order.update({ where: { id: order.id }, data: { commissionCharged: true, commissionAmount: 0 } });
      return { amount: 0, rate };
    }

    const wallet = await this.prisma.wallet.upsert({
      where: { sellerId: store.sellerId },
      create: { sellerId: store.sellerId },
      update: {},
    });
    await this.prisma.$transaction([
      // الرصيد قد يصبح سالباً = دين عمولة للمنصة على البائع (طلبات الكاش)
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: amount } } }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id, type: 'debit', amount,
          note: `عمولة المنصة (${rate}%) — الطلب ${order.number}`,
          referenceId: order.number,
        },
      }),
      this.prisma.order.update({ where: { id: order.id }, data: { commissionCharged: true, commissionAmount: amount } }),
    ]);
    await this.security.log('commission_charged', { userType: 'seller', userId: store.sellerId, details: `${order.number} — ${amount} (${rate}%)` });
    return { amount, rate };
  }

  // ↩️ عكس العمولة عند قبول استرجاع طلب مخصوم (idempotent)
  async reverseCommission(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { store: true } });
    if (!order?.commissionCharged || order.commissionReversed) return null;
    const amount = Number(order.commissionAmount || 0);
    if (amount <= 0 || !order.store) return null;
    const wallet = await this.prisma.wallet.upsert({
      where: { sellerId: order.store.sellerId },
      create: { sellerId: order.store.sellerId },
      update: {},
    });
    await this.prisma.$transaction([
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } }),
      this.prisma.walletTransaction.create({
        data: { walletId: wallet.id, type: 'credit', amount, note: `عكس عمولة — استرجاع الطلب ${order.number}`, referenceId: order.number },
      }),
      this.prisma.order.update({ where: { id: order.id }, data: { commissionReversed: true } }),
    ]);
    return { amount };
  }

  // 📊 تقرير أرباح العمولات — من الطلبات المخصومة فعلياً
  async commissionReport() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const [allTime, thisMonth, lastMonth, globalRate, stores] = await Promise.all([
      this.prisma.order.aggregate({ where: { commissionCharged: true }, _sum: { commissionAmount: true }, _count: true }),
      this.prisma.order.aggregate({ where: { commissionCharged: true, updatedAt: { gte: monthStart } }, _sum: { commissionAmount: true }, _count: true }),
      this.prisma.order.aggregate({ where: { commissionCharged: true, updatedAt: { gte: prevStart, lt: monthStart } }, _sum: { commissionAmount: true }, _count: true }),
      this.getCommission(),
      this.prisma.store.findMany({
        select: { id: true, name: true, slug: true, commissionPercent: true },
        orderBy: { createdAt: 'desc' }, take: 100,
      }),
    ]);
    // 🏆 أكثر المتاجر دفعاً للعمولات
    const topRaw = await this.prisma.order.groupBy({
      by: ['storeId'],
      where: { commissionCharged: true },
      _sum: { commissionAmount: true },
      orderBy: { _sum: { commissionAmount: 'desc' } },
      take: 5,
    });
    const topStores = topRaw.map((t) => ({
      storeId: t.storeId,
      name: stores.find((s) => s.id === t.storeId)?.name || '—',
      total: Math.round(Number(t._sum.commissionAmount || 0)),
    }));
    return {
      globalRate,
      allTime: { total: Math.round(Number(allTime._sum.commissionAmount || 0)), orders: allTime._count },
      thisMonth: { total: Math.round(Number(thisMonth._sum.commissionAmount || 0)), orders: thisMonth._count },
      lastMonth: { total: Math.round(Number(lastMonth._sum.commissionAmount || 0)), orders: lastMonth._count },
      topStores,
      stores: stores.map((s) => ({ id: s.id, name: s.name, slug: s.slug, override: s.commissionPercent })),
    };
  }

  // 🎯 عمولة مخصصة لمتجر (null = العودة للنسبة العامة)
  async setStoreCommission(storeId: string, percent: number | null, adminId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('المتجر غير موجود');
    if (percent !== null) {
      const p = Number(percent);
      if (isNaN(p) || p < 0 || p > 30) throw new BadRequestException('العمولة بين 0 و 30%');
    }
    const updated = await this.prisma.store.update({ where: { id: storeId }, data: { commissionPercent: percent } });
    await this.security.log('commission_store_set', { userType: 'admin', userId: adminId, details: `متجر ${store.name} → ${percent === null ? 'النسبة العامة' : percent + '%'}` });
    return { id: updated.id, commissionPercent: updated.commissionPercent };
  }

  // ═══ 📋 كشوف التسوية — بيان مالي دوري قابل للطباعة والتصدير ═══

  async generateSettlement(sellerId: string, fromRaw: string | undefined, toRaw: string | undefined, adminId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      include: { stores: { select: { id: true, name: true } } },
    });
    if (!seller || !seller.stores.length) throw new NotFoundException('البائع أو متجره غير موجود');
    const now = new Date();
    const from = fromRaw ? new Date(fromRaw) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = toRaw ? new Date(toRaw + 'T23:59:59') : now;
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) throw new BadRequestException('فترة غير صالحة');

    const storeIds = seller.stores.map((s) => s.id);
    const [orders, refundsAgg] = await Promise.all([
      this.prisma.order.findMany({
        where: { storeId: { in: storeIds }, status: { in: ['delivered', 'completed'] }, updatedAt: { gte: from, lte: to } },
        select: { total: true, commissionAmount: true, commissionCharged: true, commissionReversed: true },
      }),
      this.prisma.returnRequest.aggregate({
        where: { status: 'accepted', reviewedAt: { gte: from, lte: to }, order: { storeId: { in: storeIds } } },
        _sum: { refundedAmount: true },
      }),
    ]);
    const gross = orders.reduce((s, o) => s + Number(o.total), 0);
    const commission = orders
      .filter((o) => o.commissionCharged && !o.commissionReversed)
      .reduce((s, o) => s + Number(o.commissionAmount || 0), 0);
    const refunds = Number(refundsAgg._sum.refundedAmount || 0);
    const number = 'ST-' + Math.random().toString(36).slice(2, 8).toUpperCase();

    const settlement = await this.prisma.settlement.create({
      data: {
        number, sellerId, periodStart: from, periodEnd: to,
        ordersCount: orders.length,
        gross: Math.round(gross), commission: Math.round(commission), refunds: Math.round(refunds),
        net: settlementNet(gross, commission, refunds),
        issuedBy: adminId,
      },
    });
    await this.security.log('settlement_issued', { userType: 'admin', userId: adminId, details: `${number} للبائع ${seller.name} — صافي ${settlement.net}` });
    // 🔔 إشعار البائع بكشفه الجديد
    await this.notifications.push('seller', sellerId, {
      icon: '📋', title: `كشف تسوية جديد ${number}`,
      body: `الفترة ${from.toLocaleDateString('ar-YE')} — ${to.toLocaleDateString('ar-YE')} · الصافي ${Number(settlement.net).toLocaleString()} ر.ي`,
      link: '/seller/wallet',
    });
    return settlement;
  }

  listSettlements(q?: string) {
    return this.prisma.settlement.findMany({
      where: q ? { OR: [{ number: { contains: q, mode: 'insensitive' } }, { seller: { name: { contains: q, mode: 'insensitive' } } }] } : {},
      include: { seller: { select: { name: true, phone: true, stores: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  sellerSettlementsList(sellerId: string) {
    return this.prisma.settlement.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // تفاصيل كشف مع طلبات الفترة — للطباعة (ملكية: المدير أو البائع المالك)
  async settlementDetail(id: string) {
    const st = await this.prisma.settlement.findUnique({
      where: { id },
      include: { seller: { select: { id: true, name: true, phone: true, stores: { select: { id: true, name: true, slug: true } } } } },
    });
    if (!st) throw new NotFoundException('الكشف غير موجود');
    const storeIds = st.seller.stores.map((s) => s.id);
    const orders = await this.prisma.order.findMany({
      where: { storeId: { in: storeIds }, status: { in: ['delivered', 'completed'] }, updatedAt: { gte: st.periodStart, lte: st.periodEnd } },
      select: { number: true, total: true, paymentMethod: true, status: true, commissionAmount: true, commissionReversed: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
      take: 200,
    });
    return { ...st, orders };
  }

  async markSettlementPaid(id: string, adminId: string) {
    const st = await this.prisma.settlement.findUnique({ where: { id } });
    if (!st) throw new NotFoundException('الكشف غير موجود');
    if (st.status === 'paid') throw new BadRequestException('الكشف مسوّى مسبقاً');
    const updated = await this.prisma.settlement.update({ where: { id }, data: { status: 'paid', paidAt: new Date() } });
    await this.security.log('settlement_paid', { userType: 'admin', userId: adminId, details: `${st.number}` });
    await this.notifications.push('seller', st.sellerId, {
      icon: '✅', title: `سُوّي كشف ${st.number}`,
      body: `أُغلقت التسوية بصافي ${Number(st.net).toLocaleString()} ر.ي`, link: '/seller/wallet',
    });
    return updated;
  }

  // 📥 تصدير CSV — سطر لكل طلب + الملخص
  async settlementCsv(id: string) {
    const st = await this.settlementDetail(id);
    const rows = [
      ['رقم الطلب', 'الإجمالي', 'العمولة', 'الدفع', 'الحالة', 'التاريخ'],
      ...st.orders.map((o) => [
        o.number, String(Math.round(Number(o.total))),
        o.commissionReversed ? 'معكوسة' : String(Math.round(Number(o.commissionAmount || 0))),
        o.paymentMethod || 'cash', o.status, o.updatedAt.toISOString().slice(0, 10),
      ]),
      [],
      ['الإجمالي', String(Math.round(Number(st.gross))), String(Math.round(Number(st.commission))), '', '', ''],
      ['المرتجعات', String(Math.round(Number(st.refunds))), '', '', '', ''],
      ['الصافي', String(Math.round(Number(st.net))), '', '', '', ''],
    ];
    return '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  // ═══ نظرة مالية عامة للمنصة ═══
  async overview() {
    const months = this.last6Months();
    const sixMonthsAgo = months[0].from;
    const commission = await this.getCommission();

    const approved = await this.prisma.payment.findMany({
      where: { status: 'approved', createdAt: { gte: sixMonthsAgo } },
      select: { amount: true, purpose: true, method: true, createdAt: true, currency: true },
    });

    // سلسلة شهرية + تفصيل بالأغراض والوسائل
    const monthly = months.map((m) => ({
      label: m.label,
      total: approved.filter((p) => p.createdAt >= m.from && p.createdAt < m.to).reduce((s, p) => s + Number(p.amount), 0),
    }));

    const byPurpose: Record<string, number> = {};
    const byMethod: Record<string, number> = {};
    let ordersRevenue = 0;
    for (const p of approved) {
      byPurpose[p.purpose] = (byPurpose[p.purpose] || 0) + Number(p.amount);
      const method = p.method.startsWith('gateway') ? 'gateway' : p.method;
      byMethod[method] = (byMethod[method] || 0) + Number(p.amount);
      if (p.purpose === 'order') ordersRevenue += Number(p.amount);
    }

    // كل الأوقات
    const allTime = await this.prisma.payment.aggregate({ where: { status: 'approved' }, _sum: { amount: true }, _count: true });

    const [pendingPayments, wallets, cards, currencies] = await Promise.all([
      this.prisma.payment.count({ where: { status: 'pending' } }),
      this.prisma.wallet.aggregate({ _sum: { balance: true } }),
      this.prisma.customerCard.aggregate({ _sum: { balance: true } }),
      this.prisma.currency.findMany({ where: { isActive: true } }),
    ]);

    const stale = currencies
      .filter((c) => Date.now() - c.updatedAt.getTime() > 30 * 24 * 3600 * 1000)
      .map((c) => c.code);

    const analysis = this.ai.analyzeMonthly(monthly);
    const commissionEarnings = Math.round((ordersRevenue * commission) / 100);

    return {
      allTime: { total: Number(allTime._sum.amount || 0), count: allTime._count },
      sixMonths: { total: approved.reduce((s, p) => s + Number(p.amount), 0), count: approved.length },
      monthly, byPurpose, byMethod, analysis,
      commission, commissionEarnings, ordersRevenue,
      walletsLiability: Number(wallets._sum.balance || 0),
      cardsLiability: Number(cards._sum.balance || 0),
      pendingPayments,
      tips: this.ai.platformTips({
        commission, pendingPayments,
        walletsLiability: Number(wallets._sum.balance || 0),
        cardsLiability: Number(cards._sum.balance || 0),
        staleCurrencies: stale,
      }),
    };
  }

  // ═══ 💸 المصروفات التشغيلية ═══
  async expenses(q: any = {}) {
    const where: any = {};
    if (q.category) where.category = q.category;
    if (q.month) {
      const [y, m] = q.month.split('-').map(Number);
      if (y && m) where.spentAt = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }
    const [items, agg] = await Promise.all([
      this.prisma.expense.findMany({ where, orderBy: { spentAt: 'desc' }, take: 200 }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);
    return { items, total: Number(agg._sum.amount || 0) };
  }

  async addExpense(adminId: string, body: any) {
    if (!body.title?.trim()) throw new BadRequestException('بيان المصروف مطلوب');
    const amount = Number(body.amount);
    if (!amount || amount <= 0) throw new BadRequestException('المبلغ غير صحيح');
    const category = EXPENSE_CATS.includes(body.category) ? body.category : 'other';
    const exp = await this.prisma.expense.create({
      data: {
        title: body.title.trim(), category, amount,
        note: body.note || null, createdBy: adminId,
        spentAt: body.spentAt ? new Date(body.spentAt) : new Date(),
      },
    });
    await this.security.log('finance.expense_added', { userType: 'admin', userId: adminId, details: { title: exp.title, amount, category } });
    return exp;
  }

  async deleteExpense(adminId: string, id: string) {
    const exp = await this.prisma.expense.findUnique({ where: { id } });
    if (!exp) throw new NotFoundException('المصروف غير موجود');
    await this.prisma.expense.delete({ where: { id } });
    await this.security.log('finance.expense_deleted', { userType: 'admin', userId: adminId, details: { title: exp.title, amount: Number(exp.amount) } });
    return { ok: true };
  }

  // ═══ 📒 دفتر اليومية الموحّد — كل حركة مالية في المنصة ═══
  async journal(q: any = {}) {
    const months = this.last6Months();
    const from = q.from ? new Date(q.from) : months[0].from;
    const to = q.to ? new Date(q.to + 'T23:59:59') : new Date();
    const inRange = { gte: from, lte: to };

    const [payments, walletTxs, withdrawals, topups, expenses] = await Promise.all([
      this.prisma.payment.findMany({ where: { status: 'approved', createdAt: inRange }, orderBy: { createdAt: 'desc' }, take: 500 }),
      this.prisma.walletTransaction.findMany({ where: { createdAt: inRange }, orderBy: { createdAt: 'desc' }, take: 300, include: { wallet: { include: { seller: { select: { name: true } } } } } }),
      this.prisma.withdrawalRequest.findMany({ where: { status: 'paid', processedAt: inRange }, take: 200, include: { wallet: { include: { seller: { select: { name: true } } } } } }),
      this.prisma.cardTopup.findMany({ where: { status: 'approved', createdAt: inRange }, take: 200, include: { customer: { select: { name: true } } } }),
      this.prisma.expense.findMany({ where: { spentAt: inRange }, orderBy: { spentAt: 'desc' }, take: 200 }),
    ]);

    const PURPOSE_AR: Record<string, string> = { order: 'مبيعات طلبات', subscription: 'اشتراك خطة', topup: 'شحن رصيد', pservice: 'خدمة منصة' };
    type Entry = { date: Date; doc: string; kind: string; description: string; party: string; debit: number; credit: number };
    const entries: Entry[] = [];

    for (const p of payments) entries.push({
      date: p.createdAt, doc: p.number, kind: 'payment',
      description: `إيراد: ${PURPOSE_AR[p.purpose] || p.purpose}`, party: p.payerType === 'seller' ? 'بائع' : 'عميل',
      debit: Number(p.amount), credit: 0,
    });
    for (const t of walletTxs) entries.push({
      date: t.createdAt, doc: t.id.slice(-8).toUpperCase(), kind: 'wallet',
      description: t.note || (t.type === 'credit' ? 'إيداع محفظة' : 'خصم محفظة'), party: t.wallet?.seller?.name || 'بائع',
      debit: t.type === 'credit' ? Number(t.amount) : 0,
      credit: t.type === 'debit' ? Number(t.amount) : 0,
    });
    for (const w of withdrawals) entries.push({
      date: w.processedAt!, doc: w.id.slice(-8).toUpperCase(), kind: 'withdrawal',
      description: `تسوية سحب${w.method ? ' — ' + w.method : ''}`, party: w.wallet?.seller?.name || 'بائع',
      debit: 0, credit: Number(w.amount),
    });
    for (const t of topups) entries.push({
      date: t.createdAt, doc: t.id.slice(-8).toUpperCase(), kind: 'topup',
      description: 'شحن بطاقة عميل (التزام)', party: t.customer?.name || 'عميل',
      debit: Number(t.amount), credit: 0,
    });
    for (const e of expenses) entries.push({
      date: e.spentAt, doc: e.id.slice(-8).toUpperCase(), kind: 'expense',
      description: `مصروف: ${e.title}`, party: 'المنصة',
      debit: 0, credit: Number(e.amount),
    });
    // ملاحظة: طلبات خدمات المنصة المعتمدة تُنشئ دفعة purpose=pservice تلقائياً — تظهر هنا ضمن "payment" ولا تُكرر

    entries.sort((a, b) => +b.date - +a.date);
    const filtered = q.kind ? entries.filter((e) => e.kind === q.kind) : entries;
    return {
      entries: filtered.slice(0, 400),
      totals: {
        debit: filtered.reduce((s, e) => s + e.debit, 0),
        credit: filtered.reduce((s, e) => s + e.credit, 0),
        count: filtered.length,
      },
    };
  }

  // 📥 تصدير دفتر اليومية CSV
  async exportJournal(q: any = {}) {
    const { entries } = await this.journal(q);
    const KIND_AR: Record<string, string> = { payment: 'دفعة', wallet: 'محفظة', withdrawal: 'سحب', topup: 'شحن بطاقة', expense: 'مصروف', pservice: 'خدمة منصة' };
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = entries.map((e) => [
      e.date.toISOString().slice(0, 16).replace('T', ' '), e.doc, KIND_AR[e.kind] || e.kind,
      e.description, e.party, e.debit || '', e.credit || '',
    ].map(esc).join(','));
    return '﻿' + ['التاريخ,المستند,النوع,البيان,الطرف,مدين (وارد),دائن (منصرف)', ...lines].join('\n');
  }

  // ═══ 📊 قائمة الدخل (الأرباح والخسائر) — 6 أشهر ═══
  // الإيراد الحقيقي للمنصة = العمولات + الاشتراكات + خدمات المنصة
  // (شحن البطاقات وأرصدة المحافظ التزامات وليست إيراداً — مبدأ الاستحقاق)
  async incomeStatement() {
    const months = this.last6Months();
    const commission = await this.getCommission();

    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'approved', createdAt: { gte: months[0].from } },
        select: { amount: true, purpose: true, createdAt: true },
      }),
      this.prisma.expense.findMany({
        where: { spentAt: { gte: months[0].from } },
        select: { amount: true, category: true, spentAt: true },
      }),
    ]);

    const rows = months.map((m) => {
      const pm = payments.filter((p) => p.createdAt >= m.from && p.createdAt < m.to);
      const em = expenses.filter((e) => e.spentAt >= m.from && e.spentAt < m.to);
      const orderSales = pm.filter((p) => p.purpose === 'order').reduce((s, p) => s + Number(p.amount), 0);
      const commissions = Math.round((orderSales * commission) / 100);
      const subscriptions = pm.filter((p) => p.purpose === 'subscription').reduce((s, p) => s + Number(p.amount), 0);
      const pservices = pm.filter((p) => p.purpose === 'pservice').reduce((s, p) => s + Number(p.amount), 0);
      const revenue = commissions + subscriptions + pservices;
      const byCat: Record<string, number> = {};
      for (const e of em) byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount);
      const expenseTotal = em.reduce((s, e) => s + Number(e.amount), 0);
      return {
        key: m.key, label: m.label,
        revenue: { commissions, subscriptions, pservices, total: revenue },
        expenses: { byCategory: byCat, total: expenseTotal },
        net: revenue - expenseTotal,
      };
    });

    const totals = rows.reduce((acc, r) => ({
      revenue: acc.revenue + r.revenue.total,
      expenses: acc.expenses + r.expenses.total,
      net: acc.net + r.net,
    }), { revenue: 0, expenses: 0, net: 0 });

    return { months: rows, totals, commission };
  }

  // ═══ ⚖️ المركز المالي (ميزانية مبسطة) ═══
  async balanceSheet() {
    const [approved, paidWithdrawals, pendingWithdrawals, expenses, wallets, cards, pendingPayments] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
      this.prisma.withdrawalRequest.aggregate({ where: { status: 'paid' }, _sum: { amount: true } }),
      this.prisma.withdrawalRequest.aggregate({ where: { status: 'pending' }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ _sum: { amount: true } }),
      this.prisma.wallet.aggregate({ _sum: { balance: true } }),
      this.prisma.customerCard.aggregate({ _sum: { balance: true } }),
      this.prisma.payment.aggregate({ where: { status: 'pending' }, _sum: { amount: true }, _count: true }),
    ]);

    // النقدية التشغيلية = المقبوضات المعتمدة − السحوبات المدفوعة − المصروفات − أرصدة المحافظ المتبقية
    // (أرصدة المحافظ التزام قائم لم يُدفع بعد، لذا تُخصم من النقد ولا تُحسب مرتين)
    const received = Number(approved._sum.amount || 0);
    const paid = Number(paidWithdrawals._sum.amount || 0);
    const spent = Number(expenses._sum.amount || 0);
    const walletsLiab = Number(wallets._sum.balance || 0);
    const cardsLiab = Number(cards._sum.balance || 0);
    const pendingW = Number(pendingWithdrawals._sum.amount || 0);
    const receivable = Number(pendingPayments._sum.amount || 0);

    const cash = Math.max(received - paid - spent - walletsLiab, 0);
    const assets = cash + receivable;
    const liabilities = walletsLiab + cardsLiab + pendingW;
    const equity = assets - liabilities;

    return {
      assets: { cash, receivable, receivableCount: pendingPayments._count, total: assets },
      liabilities: { wallets: walletsLiab, cards: cardsLiab, pendingWithdrawals: pendingW, total: liabilities },
      equity,
    };
  }

  // ═══ 🤝 تسويات البائعين — مستحقات كل بائع بدقة ═══
  async sellerSettlements() {
    const commission = await this.getCommission();
    const sellers = await this.prisma.seller.findMany({
      where: { status: 'active' },
      select: {
        id: true, name: true, phone: true,
        stores: { select: { id: true, name: true } },
        wallet: { select: { balance: true, withdrawals: { where: { status: 'pending' }, select: { amount: true } } } },
      },
      take: 100,
    });

    const storeIds = sellers.flatMap((s) => s.stores.map((st) => st.id));
    const payments = storeIds.length ? await this.prisma.payment.findMany({
      where: { status: 'approved', purpose: 'order' },
      select: { amount: true, referenceId: true }, take: 5000,
    }) : [];
    // نربط دفعات الطلبات بالمتاجر عبر الطلبات المرجعية
    const orderIds = payments.map((p) => p.referenceId).filter(Boolean) as string[];
    const orders = orderIds.length ? await this.prisma.order.findMany({
      where: { id: { in: orderIds }, storeId: { in: storeIds } },
      select: { id: true, storeId: true },
    }) : [];
    const orderStore = new Map(orders.map((o) => [o.id, o.storeId]));
    const storeSales = new Map<string, number>();
    for (const p of payments) {
      const sid = p.referenceId ? orderStore.get(p.referenceId) : undefined;
      if (sid) storeSales.set(sid, (storeSales.get(sid) || 0) + Number(p.amount));
    }

    return sellers.map((s) => {
      const sales = s.stores.reduce((sum, st) => sum + (storeSales.get(st.id) || 0), 0);
      const commissionDue = Math.round((sales * commission) / 100);
      const walletBalance = Number(s.wallet?.balance || 0);
      const pendingWithdrawal = (s.wallet?.withdrawals || []).reduce((sum, w) => sum + Number(w.amount), 0);
      return {
        sellerId: s.id, name: s.name, phone: s.phone,
        storeName: s.stores[0]?.name || '—',
        sales, commissionDue, walletBalance, pendingWithdrawal,
        netPosition: walletBalance - pendingWithdrawal,
      };
    }).sort((a, b) => b.sales - a.sales);
  }

  // ═══ 🧾 التقرير الزكوي والضريبي (تقديري — للمراجعة القانونية) ═══
  async taxReport() {
    const [income, balance] = await Promise.all([this.incomeStatement(), this.balanceSheet()]);
    // الوعاء الزكوي المبسّط: النقدية + الذمم المدينة − الالتزامات قصيرة الأجل
    const zakatBase = Math.max(balance.assets.cash + balance.assets.receivable - balance.liabilities.total, 0);
    const zakatDue = Math.round(zakatBase * 0.025); // 2.5%
    const annualizedNet = Math.round((income.totals.net / 6) * 12);
    return {
      zakat: { base: zakatBase, rate: 2.5, due: zakatDue },
      annualized: { netProfit: annualizedNet, revenue: Math.round((income.totals.revenue / 6) * 12) },
      notes: [
        '⚖️ هذا التقرير تقديري لأغراض الإدارة — راجع محاسبك القانوني قبل الإقرار الرسمي',
        '🕌 الزكاة = 2.5% من (النقدية + الذمم − الالتزامات قصيرة الأجل) عند حولان الحول وبلوغ النصاب',
        '📋 احتفظ بسندات المصروفات وإثباتات الدفع لكل قيد — دفتر اليومية قابل للتصدير',
        '🧾 راجع التزامات ضريبة القيمة المضافة/المبيعات حسب قوانين بلد التسجيل',
      ],
    };
  }

  // ═══ تقرير التاجر — ميزة مدفوعة (الاحترافية والذهبية) ═══
  async sellerReport(sellerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { sellerId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    requireFeature(store, 'finance');
    const months = this.last6Months();

    const orders = await this.prisma.order.findMany({
      where: { storeId: store.id, status: { notIn: ['cancelled', 'refunded'] }, createdAt: { gte: months[0].from } },
      select: { total: true, status: true, paymentMethod: true, createdAt: true },
    });

    const monthly = months.map((m) => {
      const list = orders.filter((o) => o.createdAt >= m.from && o.createdAt < m.to);
      return { label: m.label, total: list.reduce((s, o) => s + Number(o.total), 0), count: list.length };
    });

    const byStatus: Record<string, number> = {};
    let electronic = 0, cash = 0;
    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (o.paymentMethod === 'cash' || !o.paymentMethod) cash += Number(o.total);
      else electronic += Number(o.total);
    }

    const thisMonth = monthly[monthly.length - 1];
    const total = orders.reduce((s, o) => s + Number(o.total), 0);
    const avgOrder = orders.length ? total / orders.length : 0;
    const analysis = this.ai.analyzeMonthly(monthly);

    const wallet = await this.prisma.wallet.findUnique({ where: { sellerId } });
    const commission = await this.getCommission();

    const defaultCurrency = await this.prisma.currency.findFirst({ where: { isDefault: true } });

    return {
      store: { name: store.name, currency: defaultCurrency?.code || 'YER', symbol: defaultCurrency?.symbol || 'ر.ي' },
      monthly, byStatus, analysis,
      totals: {
        total, count: orders.length, avgOrder: Math.round(avgOrder),
        electronic: Math.round(electronic), cash: Math.round(cash),
        thisMonthTotal: thisMonth.total, thisMonthCount: thisMonth.count,
      },
      wallet: { balance: Number(wallet?.balance || 0) },
      commission,
      commissionDue: Math.round((electronic * commission) / 100),
      tips: this.ai.sellerTips({
        growth: analysis.growth, avgOrder,
        ordersThisMonth: thisMonth.count,
        walletBalance: Number(wallet?.balance || 0),
      }),
    };
  }
}
