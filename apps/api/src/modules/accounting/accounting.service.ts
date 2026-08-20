import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// 💼 المكتب المحاسبي للمنصة
// قيود يومية مولّدة آلياً من البيانات الفعلية — كل قيد متوازن (مدين = دائن)
// وميزان مراجعة وتسوية وكشوف حسابات وتقارير عمولات

const ACCOUNTS: Record<string, string> = {
  clearing: '🏦 تحصيلات البوابات',
  storeDirect: '🤝 تحصيلات مباشرة للبائعين',
  walletsPayable: '💰 مستحقات البائعين (محافظ)',
  customerWallets: '👛 أرصدة محافظ العملاء',
  commissionRevenue: '💎 إيراد عمولات المنصة',
  commissionReceivable: '📥 ذمم عمولات مستحقة',
  platformRevenue: '🏢 إيراد الاشتراكات والخدمات',
  cashOut: '💸 النقدية الخارجة',
  expenses: '🧾 المصروفات التشغيلية',
};

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  private async commissionRate() {
    const s = await this.prisma.setting.findUnique({ where: { key: 'platform_commission_percent' } });
    return Number((s?.value as any) ?? 5) || 5;
  }

  private range(from?: string, to?: string, defaultDays = 7) {
    const toD = to ? new Date(to + 'T23:59:59.999') : new Date();
    const fromD = from ? new Date(from) : new Date(toD.getTime() - (defaultDays - 1) * 86400000);
    if (!from) fromD.setHours(0, 0, 0, 0);
    return { fromD, toD };
  }

  // 📔 القيود اليومية + ميزان المراجعة
  async journal(from?: string, to?: string) {
    const { fromD, toD } = this.range(from, to);
    const commission = await this.commissionRate();

    const [payments, withdrawals, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'approved', createdAt: { gte: fromD, lte: toD } },
        select: { amount: true, purpose: true, method: true, createdAt: true },
      }),
      this.prisma.withdrawalRequest.findMany({
        where: { status: 'paid', processedAt: { gte: fromD, lte: toD } },
        select: { amount: true, processedAt: true },
      }),
      this.prisma.expense.findMany({
        where: { spentAt: { gte: fromD, lte: toD } },
        select: { amount: true, spentAt: true },
      }),
    ]);

    // تجميع يومي
    const dayKey = (d: Date) => new Date(d).toISOString().slice(0, 10);
    const days: Record<string, any> = {};
    const D = (k: string) => (days[k] = days[k] || { date: k, gatewayOrders: 0, storeOrders: 0, topups: 0, platformRev: 0, withdrawOut: 0, expenseOut: 0 });

    for (const p of payments) {
      const d = D(dayKey(p.createdAt));
      const amount = Number(p.amount);
      if (p.purpose === 'order') {
        if (String(p.method).startsWith('store:')) d.storeOrders += amount;
        else d.gatewayOrders += amount;
      } else if (p.purpose === 'topup') d.topups += amount;
      else d.platformRev += amount; // subscription | pservice
    }
    for (const w of withdrawals) D(dayKey(w.processedAt!)).withdrawOut += Number(w.amount);
    for (const e of expenses) D(dayKey(e.spentAt)).expenseOut += Number(e.amount);

    // توليد القيود المتوازنة
    const entries: { date: string; account: string; accountAr: string; type: 'debit' | 'credit'; amount: number; note: string }[] = [];
    const push = (date: string, account: string, type: 'debit' | 'credit', amount: number, note: string) => {
      if (amount > 0) entries.push({ date, account, accountAr: ACCOUNTS[account], type, amount: Math.round(amount), note });
    };
    for (const d of Object.values(days).sort((a, b) => b.date.localeCompare(a.date))) {
      push(d.date, 'clearing', 'debit', d.gatewayOrders, 'مبيعات إلكترونية معتمدة');
      push(d.date, 'walletsPayable', 'credit', d.gatewayOrders, 'إيداع محافظ البائعين');
      const comm = Math.round((d.gatewayOrders * commission) / 100);
      push(d.date, 'commissionReceivable', 'debit', comm, `عمولة ${commission}% على المبيعات الإلكترونية`);
      push(d.date, 'commissionRevenue', 'credit', comm, 'إيراد عمولة مستحق');
      push(d.date, 'storeDirect', 'debit', d.storeOrders, 'تحصيلات عبر طرق دفع المتاجر (تصل البائع مباشرة)');
      push(d.date, 'storeDirect', 'credit', d.storeOrders, 'قيد إعلامي — لا تدخل خزينة المنصة');
      push(d.date, 'clearing', 'debit', d.topups, 'شحن محافظ العملاء');
      push(d.date, 'customerWallets', 'credit', d.topups, 'أرصدة مضافة للعملاء');
      push(d.date, 'clearing', 'debit', d.platformRev, 'اشتراكات وخدمات المنصة');
      push(d.date, 'platformRevenue', 'credit', d.platformRev, 'إيراد المنصة المباشر');
      push(d.date, 'walletsPayable', 'debit', d.withdrawOut, 'سحوبات مدفوعة للبائعين');
      push(d.date, 'cashOut', 'credit', d.withdrawOut, 'نقدية خرجت للبائعين');
      push(d.date, 'expenses', 'debit', d.expenseOut, 'مصروفات تشغيلية');
      push(d.date, 'cashOut', 'credit', d.expenseOut, 'نقدية خرجت كمصروفات');
    }

    // ⚖️ ميزان المراجعة
    const trial: Record<string, { debit: number; credit: number }> = {};
    for (const e of entries) {
      trial[e.account] = trial[e.account] || { debit: 0, credit: 0 };
      trial[e.account][e.type] += e.amount;
    }
    const totals = Object.values(trial).reduce((s, t) => ({ debit: s.debit + t.debit, credit: s.credit + t.credit }), { debit: 0, credit: 0 });

    return {
      entries, commission,
      trial: Object.entries(trial).map(([k, v]) => ({ account: k, accountAr: ACCOUNTS[k], ...v, balance: v.debit - v.credit })),
      totals, balanced: totals.debit === totals.credit,
      from: fromD, to: toD,
    };
  }

  // 🔄 التسوية الآلية — مطابقة المحافظ والمدفوعات
  async reconciliation() {
    // 1) أرصدة المحافظ مقابل حركاتها
    const wallets = await this.prisma.wallet.findMany({
      include: { transactions: { select: { type: true, amount: true } }, seller: { select: { name: true, phone: true } } },
    });
    const walletMismatches = wallets
      .map((w) => {
        const calc = w.transactions.reduce((s, t) => s + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)), 0);
        return { seller: w.seller?.name || '—', phone: w.seller?.phone, balance: Number(w.balance), calculated: Math.round(calc), diff: Math.round(Number(w.balance) - calc) };
      })
      .filter((w) => Math.abs(w.diff) > 1);

    // 2) مدفوعات طلبات معتمدة — تحقق من القيد والمبلغ
    const orderPayments = await this.prisma.payment.findMany({
      where: { status: 'approved', purpose: 'order' },
      select: { number: true, amount: true, referenceId: true, createdAt: true },
      orderBy: { createdAt: 'desc' }, take: 500,
    });
    const credits = await this.prisma.walletTransaction.findMany({
      where: { type: 'credit' }, select: { note: true, amount: true }, take: 5000,
    });
    const missingCredits: any[] = [];
    const amountMismatches: any[] = [];
    for (const p of orderPayments) {
      const credited = credits.some((c) => c.note?.includes(p.number));
      if (!credited) {
        missingCredits.push({ payment: p.number, amount: Number(p.amount), at: p.createdAt });
        continue;
      }
      if (p.referenceId) {
        const order = await this.prisma.order.findUnique({ where: { id: p.referenceId }, select: { number: true, total: true } });
        if (order && Math.abs(Number(order.total) - Number(p.amount)) > 1) {
          amountMismatches.push({ payment: p.number, order: order.number, paid: Number(p.amount), orderTotal: Number(order.total) });
        }
      }
    }

    return {
      ok: !walletMismatches.length && !missingCredits.length && !amountMismatches.length,
      walletMismatches, missingCredits, amountMismatches,
      checkedPayments: orderPayments.length, checkedWallets: wallets.length,
      at: new Date(),
    };
  }

  // 🧾 كشف حساب متجر لفترة محددة
  async storeStatement(storeId: string, from?: string, to?: string) {
    const { fromD, toD } = this.range(from, to, 30);
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { seller: { include: { wallet: { include: { transactions: { where: { createdAt: { gte: fromD, lte: toD } }, orderBy: { createdAt: 'desc' } } } } } } },
    });
    if (!store) throw new NotFoundException('المتجر غير موجود');
    const commission = await this.commissionRate();

    const orders = await this.prisma.order.findMany({
      where: { storeId, createdAt: { gte: fromD, lte: toD } },
      select: { total: true, status: true, paymentMethod: true },
    });
    const valid = orders.filter((o) => !['cancelled', 'refunded'].includes(o.status));
    const sales = valid.reduce((s, o) => s + Number(o.total), 0);
    const electronic = valid.filter((o) => o.paymentMethod && !['cash'].includes(o.paymentMethod)).reduce((s, o) => s + Number(o.total), 0);
    const commissionDue = Math.round((electronic * commission) / 100);

    const wallet = store.seller.wallet;
    const txs = wallet?.transactions || [];
    const credits = txs.filter((t) => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
    const debits = txs.filter((t) => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0);

    return {
      store: { id: store.id, name: store.name, slug: store.slug, seller: store.seller.name },
      period: { from: fromD, to: toD },
      sales: Math.round(sales), ordersCount: valid.length, cancelled: orders.length - valid.length,
      electronic: Math.round(electronic), commission, commissionDue,
      credits: Math.round(credits), debits: Math.round(debits),
      balance: wallet ? Number(wallet.balance) : 0,
      transactions: txs.map((t) => ({ type: t.type, amount: Number(t.amount), note: t.note, at: t.createdAt })),
    };
  }

  // 📤 تقرير العمولات الشهري لكل متجر
  async commissionsReport(month?: string) {
    const m = /^\d{4}-\d{2}$/.test(month || '') ? month! : new Date().toISOString().slice(0, 7);
    const fromD = new Date(m + '-01T00:00:00');
    const toD = new Date(fromD.getFullYear(), fromD.getMonth() + 1, 0, 23, 59, 59);
    const commission = await this.commissionRate();

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: fromD, lte: toD }, status: { notIn: ['cancelled', 'refunded'] } },
      select: { storeId: true, total: true, paymentMethod: true, store: { select: { name: true, slug: true } } },
    });
    const byStore: Record<string, any> = {};
    for (const o of orders) {
      const s = (byStore[o.storeId] = byStore[o.storeId] || { store: o.store?.name || '—', slug: o.store?.slug, sales: 0, electronic: 0, orders: 0 });
      s.orders++;
      s.sales += Number(o.total);
      if (o.paymentMethod && o.paymentMethod !== 'cash') s.electronic += Number(o.total);
    }
    const rows = Object.values(byStore)
      .map((s) => ({ ...s, sales: Math.round(s.sales), electronic: Math.round(s.electronic), commissionDue: Math.round((s.electronic * commission) / 100) }))
      .sort((a, b) => b.commissionDue - a.commissionDue);

    return {
      month: m, commission, rows,
      totals: {
        sales: rows.reduce((s, r) => s + r.sales, 0),
        electronic: rows.reduce((s, r) => s + r.electronic, 0),
        commissionDue: rows.reduce((s, r) => s + r.commissionDue, 0),
        stores: rows.length,
      },
    };
  }
}
