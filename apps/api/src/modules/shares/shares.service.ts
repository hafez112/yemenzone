import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CardsService } from '../cards/cards.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrencyService } from '../../prisma/currency.service';
import { sanitizeText } from '../../libs/security';

// ═══════════════════════════════════════════════════════════════
//  📈 أسهم منصة يمن زون
//  • الإدارة تطرح جولات بيع من إسهام المنصة بسعر محدد
//  • الشراء: بطاقة يمن زون (فوري) أو تحويل بإثبات (بموافقة الإدارة)
//  • كل عملية تُسجَّل في سجل المدفوعات → تدخل الإدارة المالية تلقائياً
//  • المؤشر الاسترشادي يرتبط بدخل المنصة الفعلي (المدفوعات المعتمدة)
// ═══════════════════════════════════════════════════════════════

const SETTINGS_KEY = 'shares.config';

// ⚙️ الإعدادات الافتراضية — تعدّلها الإدارة من لوحة الأسهم
const DEFAULT_SETTINGS = {
  totalShares: 100000,   // إجمالي أسهم رأس مال المنصة
  basePrice: 1000,       // سعر السهم التأسيسي (أساس المؤشر = 100 نقطة)
  baseMonthIncome: 0,    // دخل شهر الأساس — 0 = يُضبط تلقائياً من أول شهر بدخل
  profitSharePct: 70,    // نسبة الدخل القابلة للتوزيع على الأسهم (ربح السهم الاسترشادي)
};

@Injectable()
export class SharesService {
  constructor(
    private prisma: PrismaService,
    private cards: CardsService,
    private notifications: NotificationsService,
    private fx: CurrencyService,
  ) {}

  // ─── الإعدادات ───────────────────────────────────────────────
  async getSettings() {
    const row = await this.prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    return { ...DEFAULT_SETTINGS, ...((row?.value as any) || {}) };
  }

  async saveSettings(body: any) {
    const cur = await this.getSettings();
    const next = {
      totalShares: Math.max(Math.round(Number(body.totalShares ?? cur.totalShares)) || cur.totalShares, 1),
      basePrice: Math.max(Number(body.basePrice ?? cur.basePrice) || cur.basePrice, 1),
      baseMonthIncome: Math.max(Number(body.baseMonthIncome ?? cur.baseMonthIncome) || 0, 0),
      profitSharePct: Math.min(Math.max(Number(body.profitSharePct ?? cur.profitSharePct) || cur.profitSharePct, 1), 100),
    };
    await this.prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      create: { group: 'finance', key: SETTINGS_KEY, value: next },
      update: { value: next },
    });
    return { ok: true, settings: next };
  }

  // ─── 💰 دخل المنصة الشهري (المدفوعات المعتمدة — بلا مبيعات الأسهم نفسها) ───
  private async monthlyIncome(months = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1); since.setHours(0, 0, 0, 0);
    const rows = await this.prisma.payment.findMany({
      where: { status: 'approved', createdAt: { gte: since }, purpose: { not: 'shares' } },
      select: { amount: true, createdAt: true },
    });
    const byMonth = new Map<string, number>();
    for (const p of rows) {
      const k = p.createdAt.toISOString().slice(0, 7); // YYYY-MM
      byMonth.set(k, (byMonth.get(k) || 0) + Number(p.amount));
    }
    // مصفوفة مرتبة من الأقدم للأحدث — الأشهر الفارغة تظهر بصفر
    const out: { month: string; income: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const k = d.toISOString().slice(0, 7);
      out.push({ month: k, income: Math.round(byMonth.get(k) || 0) });
    }
    return out;
  }

  // ─── 📊 مؤشر السهم الاسترشادي + التوقع — مرتبط بمستوى دخل المنصة ───
  async index() {
    const s = await this.getSettings();
    const months = await this.monthlyIncome(6);
    const last3 = months.slice(-3);
    const avg3 = last3.reduce((a, m) => a + m.income, 0) / 3;
    // شهر الأساس: المُدخل من الإدارة، أو متوسط أول 3 أشهر بدخل فعلي
    const baseIncome = s.baseMonthIncome > 0
      ? s.baseMonthIncome
      : (months.filter((m) => m.income > 0).slice(0, 3).reduce((a, m) => a + m.income, 0) / Math.max(months.filter((m) => m.income > 0).slice(0, 3).length, 1)) || 0;
    // السعر الاسترشادي = التأسيسي × نسبة نمو الدخل — لا ينزل عن التأسيسي
    const growth = baseIncome > 0 ? Math.max(avg3 / baseIncome, 1) : 1;
    const price = Math.round(s.basePrice * growth);
    const yzx = Math.round((price / s.basePrice) * 10000) / 100; // مؤشر يمن زون — الأساس 100

    // 📈 التوقع: اتجاه خطي لدخل آخر 6 أشهر → إسقاط السعر بعد 3 و6 و12 شهراً
    const n = months.length;
    const xs = months.map((_, i) => i);
    const ys = months.map((m) => m.income);
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    const cov = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
    const varx = xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1;
    const slope = cov / varx; // نمو الدخل الشهري
    const project = (ahead: number) => {
      const futureIncome = Math.max(my + slope * (n - 1 + ahead), 0);
      const g = baseIncome > 0 ? Math.max(futureIncome / baseIncome, 1) : 1;
      return Math.round(s.basePrice * g);
    };

    // 💵 ربح السهم الشهري الاسترشادي = (متوسط دخل 3 أشهر × نسبة التوزيع) ÷ إجمالي الأسهم
    const eps = Math.round(((avg3 * s.profitSharePct) / 100 / s.totalShares) * 100) / 100;

    const soldAgg = await this.prisma.shareCertificate.aggregate({
      where: { status: 'active' }, _sum: { shares: true, totalAmount: true }, _count: true,
    });
    return {
      yzx, price, basePrice: s.basePrice,
      changePct: Math.round((growth - 1) * 10000) / 100,
      months, trendPerMonth: Math.round(slope),
      forecast: { m3: project(3), m6: project(6), m12: project(12) },
      eps, profitSharePct: s.profitSharePct, totalShares: s.totalShares,
      soldShares: soldAgg._sum.shares || 0,
      raised: Math.round(Number(soldAgg._sum.totalAmount || 0)),
      holders: soldAgg._count,
      avgMonthIncome: Math.round(avg3),
    };
  }

  // ─── 🌐 عام: الجولة النشطة + المؤشر ───
  async publicOffering() {
    const offering = await this.prisma.shareOffering.findFirst({
      where: { isActive: true }, orderBy: { createdAt: 'desc' },
    });
    const idx = await this.index();
    let sold = 0;
    if (offering) {
      const agg = await this.prisma.shareCertificate.aggregate({
        where: { offeringId: offering.id, status: { in: ['active', 'pending'] } },
        _sum: { shares: true },
      });
      sold = agg._sum.shares || 0;
    }
    return {
      offering: offering ? {
        id: offering.id, title: offering.title, description: offering.description,
        totalShares: offering.totalShares, pricePerShare: Number(offering.pricePerShare),
        currency: offering.currency, sold, available: Math.max(offering.totalShares - sold, 0),
        endsAt: offering.endsAt,
      } : null,
      index: idx,
    };
  }

  // ─── 💳 شراء أسهم — بطاقة يمن زون فوري / تحويل بإثبات يراجع ───
  async buy(ownerType: string, ownerId: string, body: any) {
    if (!['customer', 'seller'].includes(ownerType)) throw new ForbiddenException('الشراء للعملاء والتجار المسجلين');
    const offering = await this.prisma.shareOffering.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!offering) throw new NotFoundException('لا توجد جولة بيع نشطة حالياً');

    const shares = Math.round(Number(body.shares) || 0);
    if (shares < 1 || shares > 100000) throw new BadRequestException('عدد الأسهم غير صالح');
    const soldAgg = await this.prisma.shareCertificate.aggregate({
      where: { offeringId: offering.id, status: { in: ['active', 'pending'] } }, _sum: { shares: true },
    });
    const available = offering.totalShares - (soldAgg._sum.shares || 0);
    if (shares > available) throw new BadRequestException(`المتاح في هذه الجولة ${available.toLocaleString()} سهم فقط`);

    // بيانات المالك من سجله
    const owner = ownerType === 'seller'
      ? await this.prisma.seller.findUnique({ where: { id: ownerId }, select: { name: true, phone: true } })
      : await this.prisma.customer.findUnique({ where: { id: ownerId }, select: { name: true, phone: true } });
    if (!owner) throw new NotFoundException('الحساب غير موجود');

    // 🪪 الاسم الرباعي — يُكتب في الصك كما أدخله المساهم (إلزامي: 4 مقاطع على الأقل)
    const fullName = sanitizeText(String(body.ownerName || ''), 80).replace(/\s+/g, ' ').trim();
    const nameParts = fullName.split(' ').filter(Boolean);
    if (nameParts.length < 4) throw new BadRequestException('أدخل اسمك الرباعي كاملاً كما تريده في الصك (4 مقاطع على الأقل)');
    if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(fullName)) throw new BadRequestException('الاسم يجب أن يكون حروفاً عربية أو إنجليزية فقط');

    const total = Math.round(shares * Number(offering.pricePerShare));
    const method = String(body.method || '');
    const number = await this.nextNumber();

    if (method === 'yz-card') {
      // ⚡ فوري: خصم من البطاقة وإصدار الصك مباشرة
      const card = await this.cards.chargeYzCard(ownerType, ownerId, total, offering.currency);
      const [cert] = await this.prisma.$transaction([
        this.prisma.shareCertificate.create({
          data: {
            number, offeringId: offering.id, ownerType, ownerId,
            ownerName: fullName, ownerPhone: owner.phone,
            shares, pricePerShare: offering.pricePerShare, totalAmount: total,
            currency: offering.currency, method: 'yz-card', status: 'active', reviewedAt: new Date(),
          },
        }),
        // 📔 قيد الدفع — يدخل الإدارة المالية تلقائياً (إيراد منصة معتمد)
        this.prisma.payment.create({
          data: {
            number: 'SHR-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
            payerType: ownerType, payerId: ownerId, purpose: 'shares',
            amount: total, currency: offering.currency, method: 'yz-card',
            status: 'approved', reviewedAt: new Date(), referenceId: number,
          },
        }),
      ]);
      return {
        ok: true, active: true, certificate: cert.number,
        message: `🎉 مبارك! اشتريت ${shares.toLocaleString()} سهم — صكك «${number}» جاهز للطباعة والمشاركة`,
      };
    }

    if (method === 'transfer') {
      const proof = String(body.proofImage || '');
      if (!proof.startsWith('/uploads/')) throw new BadRequestException('أرفق صورة إثبات التحويل');
      const cert = await this.prisma.shareCertificate.create({
        data: {
          number, offeringId: offering.id, ownerType, ownerId,
          ownerName: fullName, ownerPhone: owner.phone,
          shares, pricePerShare: offering.pricePerShare, totalAmount: total,
          currency: offering.currency, method: 'transfer', proofImage: proof, status: 'pending',
        },
      });
      await this.prisma.payment.create({
        data: {
          number: 'SHR-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
          payerType: ownerType, payerId: ownerId, purpose: 'shares',
          amount: total, currency: offering.currency, method: 'transfer',
          proofImage: proof, status: 'pending', referenceId: number,
        },
      });
      return {
        ok: true, active: false, certificate: cert.number,
        message: '📩 استلمنا طلبك وإثبات التحويل — يُصدر صكك فور مراجعة الإدارة واعتماد الدفعة',
      };
    }

    throw new BadRequestException('طريقة الدفع غير معروفة — yz-card أو transfer');
  }

  // صكوك المستخدم الحالي
  async mine(ownerType: string, ownerId: string) {
    const rows = await this.prisma.shareCertificate.findMany({
      where: { ownerType, ownerId, status: { not: 'rejected' } },
      orderBy: { createdAt: 'desc' },
      include: { offering: { select: { title: true } } },
    });
    return {
      certificates: rows.map((c) => ({
        number: c.number, shares: c.shares, totalAmount: Number(c.totalAmount), currency: c.currency,
        status: c.status, method: c.method, createdAt: c.createdAt, offering: c.offering.title,
      })),
    };
  }

  // 📜 عرض الصك العام (تحقق بالرقم) — بلا بيانات حساسة
  async certificate(number: string) {
    const c = await this.prisma.shareCertificate.findUnique({
      where: { number: String(number || '').toUpperCase() },
      include: { offering: { select: { title: true } } },
    });
    if (!c || c.status === 'rejected') throw new NotFoundException('الصك غير موجود');
    const s = await this.getSettings();
    const idx = await this.index();
    return {
      number: c.number, ownerName: c.ownerName, shares: c.shares,
      pricePerShare: Number(c.pricePerShare), totalAmount: Number(c.totalAmount), currency: c.currency,
      status: c.status, method: c.method, createdAt: c.createdAt,
      offering: c.offering.title,
      // نسبة الملكية من إجمالي أسهم المنصة + القيمة الاسترشادية الحالية
      ownershipPct: Math.round((c.shares / s.totalShares) * 1000000) / 10000,
      currentValue: Math.round(c.shares * idx.price),
      indexPrice: idx.price, yzx: idx.yzx,
    };
  }

  // ═══ 👑 الإدارة ═══

  async adminOverview() {
    const [offerings, pending, certs, idx] = await Promise.all([
      this.prisma.shareOffering.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { certificates: true } } },
      }),
      this.prisma.shareCertificate.findMany({
        where: { status: 'pending' }, orderBy: { createdAt: 'asc' },
        include: { offering: { select: { title: true } } },
      }),
      this.prisma.shareCertificate.findMany({
        where: { status: { in: ['active', 'cancelled'] } }, orderBy: { createdAt: 'desc' }, take: 100,
        include: { offering: { select: { title: true } } },
      }),
      this.index(),
    ]);
    // المبيعات لكل جولة
    const soldByOffering = new Map<string, number>();
    for (const o of offerings) {
      const agg = await this.prisma.shareCertificate.aggregate({
        where: { offeringId: o.id, status: { in: ['active', 'pending'] } }, _sum: { shares: true },
      });
      soldByOffering.set(o.id, agg._sum.shares || 0);
    }
    return {
      offerings: offerings.map((o) => ({
        id: o.id, title: o.title, description: o.description, totalShares: o.totalShares,
        pricePerShare: Number(o.pricePerShare), currency: o.currency, isActive: o.isActive,
        startsAt: o.startsAt, endsAt: o.endsAt, sold: soldByOffering.get(o.id) || 0,
        certs: o._count.certificates,
      })),
      pending: pending.map((c) => this.adminCert(c)),
      certificates: certs.map((c) => this.adminCert(c)),
      index: idx,
      settings: await this.getSettings(),
    };
  }

  private adminCert(c: any) {
    return {
      id: c.id, number: c.number, ownerName: c.ownerName, ownerPhone: c.ownerPhone,
      ownerType: c.ownerType, shares: c.shares, totalAmount: Number(c.totalAmount), currency: c.currency,
      method: c.method, proofImage: c.proofImage, status: c.status, createdAt: c.createdAt,
      offering: c.offering?.title,
    };
  }

  // ➕ طرح جولة بيع جديدة من إسهام المنصة
  async createOffering(body: any) {
    const title = sanitizeText(body.title, 80);
    const totalShares = Math.round(Number(body.totalShares) || 0);
    const price = Math.round(Number(body.pricePerShare) || 0);
    if (!title) throw new BadRequestException('اسم الجولة مطلوب');
    if (totalShares < 1) throw new BadRequestException('عدد الأسهم مطلوب');
    if (price < 1) throw new BadRequestException('سعر بيع السهم مطلوب');
    const currency = (await this.fx.requireActive(body.currency || 'YER')).code;
    // جولة نشطة واحدة فقط — الجديدة تغلق السابقة تلقائياً
    await this.prisma.shareOffering.updateMany({ where: { isActive: true }, data: { isActive: false } });
    const o = await this.prisma.shareOffering.create({
      data: {
        title, description: sanitizeText(body.description, 500) || null,
        totalShares, pricePerShare: price, currency,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
      },
    });
    return { ok: true, id: o.id, message: `✅ طُرحت «${title}» — ${totalShares.toLocaleString()} سهم بسعر ${price.toLocaleString()} ${currency}` };
  }

  async updateOffering(id: string, body: any) {
    const o = await this.prisma.shareOffering.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('الجولة غير موجودة');
    const data: any = {};
    if (body.title !== undefined) data.title = sanitizeText(body.title, 80) || o.title;
    if (body.description !== undefined) data.description = sanitizeText(body.description, 500) || null;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (body.pricePerShare !== undefined) {
      const p = Math.round(Number(body.pricePerShare) || 0);
      if (p < 1) throw new BadRequestException('السعر غير صالح');
      data.pricePerShare = p;
    }
    await this.prisma.shareOffering.update({ where: { id }, data });
    return { ok: true, message: '✅ حُدّثت الجولة' };
  }

  // ✅ مراجعة شراء بالتحويل — الموافقة تفعّل الصك وتعتمد الدفعة مالياً
  async reviewPurchase(id: string, approve: boolean) {
    const c = await this.prisma.shareCertificate.findUnique({ where: { id } });
    if (!c || c.status !== 'pending') throw new NotFoundException('الطلب غير موجود أو رُوجع سابقاً');
    if (approve) {
      await this.prisma.$transaction([
        this.prisma.shareCertificate.update({ where: { id }, data: { status: 'active', reviewedAt: new Date() } }),
        this.prisma.payment.updateMany({
          where: { referenceId: c.number, purpose: 'shares' },
          data: { status: 'approved', reviewedAt: new Date() },
        }),
      ]);
      await this.notifications.push(c.ownerType as any, c.ownerId, {
        icon: '📜', title: 'مبارك! صك أسهمك صدر',
        body: `اعتماد شراء ${c.shares.toLocaleString()} سهم — صكك «${c.number}» جاهز للطباعة والمشاركة`,
        link: `/share-certificate/${c.number}`,
      });
      return { ok: true, message: `✅ اعتُمدت الدفعة وصدر الصك «${c.number}» — أُشعر المشتري` };
    }
    await this.prisma.$transaction([
      this.prisma.shareCertificate.update({ where: { id }, data: { status: 'rejected', reviewedAt: new Date() } }),
      this.prisma.payment.updateMany({
        where: { referenceId: c.number, purpose: 'shares' },
        data: { status: 'rejected', reviewedAt: new Date() },
      }),
    ]);
    await this.notifications.push(c.ownerType as any, c.ownerId, {
      icon: '❌', title: 'اعتذار — طلب شراء الأسهم', body: 'تعذّر اعتماد إثبات التحويل — تواصل مع إدارة المنصة', link: '/invest',
    });
    return { ok: true, message: '❌ رُفض الطلب وأُشعر المشتري' };
  }

  // 🚫 إلغاء صك نشط (تصحيح إداري — يعكس قيد الدفع)
  async cancelCertificate(id: string) {
    const c = await this.prisma.shareCertificate.findUnique({ where: { id } });
    if (!c || c.status !== 'active') throw new NotFoundException('الصك غير موجود أو غير نشط');
    await this.prisma.$transaction([
      this.prisma.shareCertificate.update({ where: { id }, data: { status: 'cancelled', reviewedAt: new Date() } }),
      this.prisma.payment.updateMany({
        where: { referenceId: c.number, purpose: 'shares' },
        data: { status: 'rejected', reviewedAt: new Date() },
      }),
    ]);
    await this.notifications.push(c.ownerType as any, c.ownerId, {
      icon: '⚠️', title: 'إشعار بخصوص صك الأسهم', body: `أُلغي الصك «${c.number}» إدارياً — تواصل مع إدارة المنصة`, link: '/invest',
    });
    return { ok: true, message: `🚫 أُلغي الصك «${c.number}» وعُكست دفعته من الإيراد` };
  }

  // ترقيع أرقام الصكوك — YZS-000001 تصاعدي
  private async nextNumber() {
    const count = await this.prisma.shareCertificate.count();
    return `YZS-${String(count + 1).padStart(6, '0')}`;
  }
}
