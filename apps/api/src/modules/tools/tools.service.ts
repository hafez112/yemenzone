import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CardsService } from '../cards/cards.service';
import { saveImage } from '../../common/upload';
import { randomBytes } from 'crypto';

// 🧰 سجل خدمات «تكنولوجيا المنصة» — المفاتيح المعروفة وترتيبها الافتراضي
export const TOOL_KEYS = [
  'currency', 'invoice', 'qr', 'barcode', 'designer', 'bg-remover', 'writer',
  'catalog', 'pricing', 'installments', 'debts', 'whatsapp', 'zakat', 'prayer',
  'compressor', 'ocr', 'docs', 'bio', 'site-check', 'tech', 'card-scan', 'add-me', 'logo-ai', 'ad-maker',
  'quick-sell', 'share-card', 'price-hunt', 'requests', 'posts', 'used-market',
] as const;

// أسماء عربية للخدمات — تُستخدم في تسميات مواضع الإعلانات ولوحة الإدارة
export const TOOL_LABELS: Record<string, string> = {
  currency: 'محوّل العملات', invoice: 'صانع الفواتير', qr: 'مولّد QR', barcode: 'مولّد الباركود',
  designer: 'استوديو العروض', 'bg-remover': 'مزيل الخلفيات', writer: 'كاتب الأوصاف',
  catalog: 'قائمة الأسعار', pricing: 'حاسبة التسعير', installments: 'حاسبة الأقساط',
  debts: 'دفتر الديون', whatsapp: 'رابط واتساب', zakat: 'حاسبة الزكاة', prayer: 'مواقيت الصلاة',
  compressor: 'ضاغط الصور', ocr: 'ماسح الفواتير', docs: 'المستندات الرسمية', bio: 'صفحة روابطي',
  'site-check': 'فاحص المواقع', tech: 'تكنولوجيا المنصة', 'card-scan': 'ماسح البطاقات', 'add-me': 'أضفني لمحركات البحث',
  'logo-ai': 'مصمم الشعارات والأغلفة', 'ad-maker': 'صانع الإعلانات المتحركة',
  'quick-sell': 'بع برابط واحد', 'share-card': 'بطاقة مشاركة المنتج',
  'price-hunt': 'مقارن الأسعار الذكي', requests: 'اطلبها ونوفرها', posts: 'منشورات السوشيال الجاهزة',
  'used-market': 'سوق المستعمل',
};

const CONFIG_KEY = 'tools.config';

@Injectable()
export class ToolsService {
  constructor(private prisma: PrismaService, private cards: CardsService) {}

  // يضمن وجود صف لكل أداة معروفة (يُنشئ الناقص بالترتيب الافتراضي)
  private async ensureRows() {
    const existing = await this.prisma.platformTool.findMany({ select: { key: true } });
    const have = new Set(existing.map((e) => e.key));
    const missing = TOOL_KEYS.filter((k) => !have.has(k));
    if (missing.length) {
      await this.prisma.platformTool.createMany({
        data: missing.map((key) => ({ key, order: TOOL_KEYS.indexOf(key as any) })),
      });
    }
  }

  async getConfig(): Promise<{ fx: Record<string, number>; aiImages: boolean }> {
    const row = await this.prisma.setting.findUnique({ where: { key: CONFIG_KEY } });
    const v: any = row?.value || {};
    return {
      fx: v.fx && typeof v.fx === 'object' ? v.fx : {},
      aiImages: !!v.aiImages, // 🤖 توليد الشعارات بالذكاء الخارجي — تفعّله الإدارة فقط (مطفأ افتراضياً)
    };
  }

  async saveConfig(fx?: Record<string, number>, aiImages?: boolean) {
    const cur = await this.getConfig();
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(fx || cur.fx)) {
      const key = String(k).toUpperCase().replace(/[^A-Z_]/g, '').slice(0, 12);
      const num = Number(v);
      if (key && isFinite(num) && num > 0 && num < 1e12) clean[key] = num;
    }
    const value = { fx: clean, aiImages: aiImages === undefined ? cur.aiImages : !!aiImages };
    await this.prisma.setting.upsert({
      where: { key: CONFIG_KEY },
      update: { value },
      create: { key: CONFIG_KEY, group: 'tools', value },
    });
    return value;
  }

  // 🎨 توليد شعار/غلاف بالذكاء الاصطناعي — عبر خادم مجاني وسيط، والإدارة وحدها تفعّله
  async generateImage(promptRaw: string, kind: string) {
    const { aiImages } = await this.getConfig();
    if (!aiImages) throw new ForbiddenException('توليد الصور بالذكاء الاصطناعي غير مفعّل — تفعّله إدارة المنصة من لوحة الخدمات');
    const prompt = String(promptRaw || '').trim().slice(0, 400);
    if (prompt.length < 10) throw new BadRequestException('وصف التصميم قصير جداً');
    const [w, h] = kind === 'cover' ? [1584, 640] : [1024, 1024];
    const seed = Math.floor(Math.random() * 1e6);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
    let dataUrl: string;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 90_000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('bad');
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 10_000) throw new Error('small');
      dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
    } catch {
      throw new BadRequestException('محرك الذكاء مشغول الآن — جرّب بعد لحظات أو استخدم «التصميم المحلي الفوري»');
    }
    return { image: dataUrl, width: w, height: h };
  }

  // 🌐 القائمة العامة: الأدوات الظاهرة فقط مرتبة + إعدادات الصرف
  async publicList() {
    await this.ensureRows();
    const rows = await this.prisma.platformTool.findMany({
      where: { isVisible: true },
      orderBy: [{ order: 'asc' }],
      select: { key: true },
    });
    const { fx, aiImages } = await this.getConfig();
    // 💰 أسعار الخدمات — تُرسل للواجهة لتعرف المجانية من المدفوعة
    const all = await this.prisma.platformTool.findMany({ select: { key: true, price: true } });
    const prices: Record<string, number> = {};
    for (const t of all) if (Number(t.price || 0) > 0) prices[t.key] = Number(t.price);
    return { tools: rows.map((r) => r.key), fx, aiImages, prices };
  }

  // 🔓 وصولي للخدمات المدفوعة — ما اشتريته يعمل فوراً ودائماً
  async myAccess(ownerType: string, ownerId: string) {
    const rows = await this.prisma.toolPurchase.findMany({
      where: { ownerType, ownerId },
      select: { slug: true, amount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { purchased: rows.map((r) => r.slug), purchases: rows };
  }

  // 💳 شراء خدمة مدفوعة ببطاقة يمن زون فقط — عند الدفع تفتح تلقائياً
  async buyTool(ownerType: string, ownerId: string, key: string) {
    if (!TOOL_KEYS.includes(key as any)) throw new NotFoundException('الخدمة غير معروفة');
    await this.ensureRows();
    const tool = await this.prisma.platformTool.findUnique({ where: { key } });
    const price = Number(tool?.price || 0);
    if (!price) throw new BadRequestException('هذه الخدمة مجانية — لا تحتاج شراء');
    if (!tool?.isVisible) throw new BadRequestException('هذه الخدمة غير متاحة حالياً');

    const existing = await this.prisma.toolPurchase.findUnique({
      where: { ownerType_ownerId_slug: { ownerType, ownerId, slug: key } },
    });
    if (existing) return { unlocked: true, already: true, message: 'الخدمة مشتراة مسبقاً — هي لك دائماً' };

    // 💳 الدفع من بطاقة يمن زون حصراً — يرمي خطأ واضحاً عند نقص الرصيد أو إيقاف البطاقة
    const card = await this.cards.chargeYzCard(ownerType, ownerId, price);

    await this.prisma.$transaction([
      this.prisma.toolPurchase.create({
        data: { ownerType, ownerId, slug: key, amount: price, cardId: card.id },
      }),
      this.prisma.payment.create({
        data: {
          number: 'SRV-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
          payerType: ownerType, payerId: ownerId, purpose: 'tool',
          amount: price, method: 'yz-card', status: 'approved',
          reviewedAt: new Date(), referenceId: key,
        },
      }),
    ]);
    return { unlocked: true, amount: price, message: `🎉 تم الدفع من بطاقتك — الخدمة «${TOOL_LABELS[key] || key}» مفتوحة لك الآن دائماً` };
  }

  // 👑 للإدارة: كل الأدوات مع الحالة والعدادات (استخدام + زيارات)
  async adminList() {
    await this.ensureRows();
    const rows = await this.prisma.platformTool.findMany({ orderBy: [{ order: 'asc' }] });
    const { fx, aiImages } = await this.getConfig();
    const bios = await this.prisma.bioLink.count();
    const hubViews = await this.hubViews();
    return {
      tools: rows, fx, aiImages,
      stats: { bios, hubViews, totalUses: rows.reduce((s, r) => s + r.uses, 0), totalViews: rows.reduce((s, r) => s + r.views, 0) },
    };
  }

  async updateTool(key: string, patch: { isVisible?: boolean; order?: number; seoTitle?: string; seoDesc?: string; seoKeys?: string; price?: number | null }) {
    if (!TOOL_KEYS.includes(key as any)) throw new NotFoundException('الأداة غير معروفة');
    await this.ensureRows();
    const data: any = {};
    if (typeof patch.isVisible === 'boolean') data.isVisible = patch.isVisible;
    if (patch.order !== undefined && isFinite(Number(patch.order))) data.order = Math.max(0, Math.min(999, Math.round(Number(patch.order))));
    // 💰 التسعير: صفر/فارغ = مجانية — غير ذلك سعر الشراء ببطاقة يمن زون
    if (patch.price !== undefined) {
      const p = Number(patch.price);
      data.price = p > 0 && isFinite(p) && p < 1e9 ? p : null;
    }
    if (patch.seoTitle !== undefined) data.seoTitle = String(patch.seoTitle).trim().slice(0, 120) || null;
    if (patch.seoDesc !== undefined) data.seoDesc = String(patch.seoDesc).trim().slice(0, 300) || null;
    if (patch.seoKeys !== undefined) data.seoKeys = String(patch.seoKeys).trim().slice(0, 300) || null;
    const tool = await this.prisma.platformTool.update({ where: { key }, data });
    return { ok: true, tool };
  }

  // 👁️ زيارة صفحة خدمة (أو البوابة hub) — صامتة ومعدودة بحد
  async trackView(key: string) {
    if (key !== 'hub' && !TOOL_KEYS.includes(key as any)) return { ok: false };
    if (key === 'hub') {
      // زيارات البوابة تُخزَّن في الإعدادات
      const row = await this.prisma.setting.findUnique({ where: { key: 'tools.hubViews' } });
      const n = (Number((row?.value as any)?.n) || 0) + 1;
      await this.prisma.setting.upsert({
        where: { key: 'tools.hubViews' },
        update: { value: { n } },
        create: { key: 'tools.hubViews', group: 'tools', value: { n } },
      });
      return { ok: true };
    }
    await this.prisma.platformTool.upsert({
      where: { key },
      update: { views: { increment: 1 } },
      create: { key, order: TOOL_KEYS.indexOf(key as any), views: 1 },
    });
    return { ok: true };
  }

  // 🔍 SEO مخصص لخدمة — يُقرأ من الواجهة (SSR) لتوليد الميتا
  async getSeo(key: string) {
    if (!TOOL_KEYS.includes(key as any)) throw new NotFoundException('الأداة غير معروفة');
    const row = await this.prisma.platformTool.findUnique({
      where: { key },
      select: { seoTitle: true, seoDesc: true, seoKeys: true },
    });
    return { title: row?.seoTitle || '', desc: row?.seoDesc || '', keywords: row?.seoKeys || '' };
  }

  // زيارات البوابة للوحة الإدارة
  async hubViews(): Promise<number> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'tools.hubViews' } });
    return Number((row?.value as any)?.n) || 0;
  }

  // 📈 عداد استخدام — يُستدعى من الواجهة عند فتح الأداة (صامت)
  async trackUse(key: string) {
    if (!TOOL_KEYS.includes(key as any)) return { ok: false };
    await this.prisma.platformTool.upsert({
      where: { key },
      update: { uses: { increment: 1 } },
      create: { key, order: TOOL_KEYS.indexOf(key as any), uses: 1 },
    });
    return { ok: true };
  }

  // 🔗 صفحات «روابطي»
  async createBio(body: { name?: string; slug?: string; data?: any }) {
    const name = String(body.name || '').trim().slice(0, 80);
    if (!name) throw new BadRequestException('الاسم مطلوب');
    const data = body.data && typeof body.data === 'object' ? body.data : {};
    let slug = String(body.slug || '').trim().toLowerCase();
    if (slug) {
      if (!/^[a-z0-9][a-z0-9-]{2,30}$/.test(slug)) throw new BadRequestException('الرابط المخصص غير صالح (أحرف إنجليزية وأرقام وشرطات فقط)');
      const taken = await this.prisma.bioLink.findUnique({ where: { slug } });
      if (taken) throw new BadRequestException('هذا الرابط محجوز — جرّب اسماً آخر');
    } else {
      slug = randomBytes(4).toString('hex');
    }
    const editKey = randomBytes(12).toString('hex');
    const bio = await this.prisma.bioLink.create({ data: { slug, editKey, name, data } });
    return { slug: bio.slug, editKey };
  }

  async getBio(slug: string) {
    const bio = await this.prisma.bioLink.findUnique({ where: { slug } });
    if (!bio) throw new NotFoundException('الصفحة غير موجودة');
    await this.prisma.bioLink.update({ where: { slug }, data: { views: { increment: 1 } } }).catch(() => {});
    return { slug: bio.slug, name: bio.name, data: bio.data, views: bio.views + 1 };
  }

  async updateBio(slug: string, body: { editKey?: string; name?: string; data?: any }) {
    const bio = await this.prisma.bioLink.findUnique({ where: { slug } });
    if (!bio) throw new NotFoundException('الصفحة غير موجودة');
    if (String(body.editKey || '') !== bio.editKey) throw new ForbiddenException('مفتاح التعديل غير صحيح');
    const name = String(body.name || bio.name).trim().slice(0, 80);
    const data = body.data && typeof body.data === 'object' ? body.data : bio.data;
    await this.prisma.bioLink.update({ where: { slug }, data: { name, data } });
    return { ok: true };
  }

  // ═══ 🚀 «أضفني إلى محركات البحث» — دليل المحلات المجانية ═══

  async submitBiz(body: any) {
    const name = String(body.name || '').trim().slice(0, 80);
    const desc = String(body.desc || '').trim().slice(0, 600);
    const phone = String(body.phone || '').replace(/[^0-9+]/g, '');
    const whatsapp = String(body.whatsapp || '').replace(/[^0-9+]/g, '') || phone;
    const lat = Number(body.lat), lng = Number(body.lng);
    if (name.length < 2) throw new BadRequestException('أدخل اسم المحل التجاري');
    if (desc.length < 10) throw new BadRequestException('اكتب وصفاً أوضح لما يقدمه المحل (10 أحرف على الأقل)');
    if (phone.length < 7) throw new BadRequestException('أدخل رقم اتصال صحيحاً');
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new BadRequestException('حدّد موقع المحل على الخريطة أولاً — زر «حدد موقعي تلقائياً»');
    }
    const slug = 'b' + randomBytes(4).toString('hex');
    await this.prisma.bizListing.create({
      data: {
        slug, name, desc, phone, whatsapp, lat, lng,
        keywords: String(body.keywords || '').trim().slice(0, 300) || null,
        website: String(body.website || '').trim().slice(0, 200) || null,
        note: String(body.note || '').trim().slice(0, 300) || null,
        category: String(body.category || '').trim().slice(0, 40) || null,
        governorate: String(body.governorate || '').trim().slice(0, 40) || null,
      },
    });
    return { ok: true, message: '✅ استلمنا طلبك — ستراجعه إدارة المنصة وتُنشر صفحتك بعد الموافقة' };
  }

  // الصفحة العامة — المعتمدة فقط
  async getBiz(slug: string) {
    const biz = await this.prisma.bizListing.findUnique({ where: { slug } });
    if (!biz || biz.status !== 'approved') throw new NotFoundException('الصفحة غير موجودة');
    await this.prisma.bizListing.update({ where: { slug }, data: { views: { increment: 1 } } }).catch(() => {});
    const { note, ...pub } = biz;
    return pub;
  }

  // 📍 المحلات القريبة — مرتبة بالمسافة (هافرساين)
  async nearbyBiz(latRaw: any, lngRaw: any) {
    const lat = Number(latRaw), lng = Number(lngRaw);
    if (!isFinite(lat) || !isFinite(lng)) throw new BadRequestException('إحداثيات غير صحيحة');
    const all = await this.prisma.bizListing.findMany({
      where: { status: 'approved' },
      select: { slug: true, name: true, desc: true, keywords: true, phone: true, whatsapp: true, website: true, lat: true, lng: true },
      take: 500,
    });
    const R = 6371;
    const rad = Math.PI / 180;
    const withDist = all.map((b) => {
      const dLat = (b.lat - lat) * rad, dLng = (b.lng - lng) * rad;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
      return { ...b, km: Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10 };
    });
    return withDist.sort((x, y) => x.km - y.km).slice(0, 30);
  }

  // 👑 الإدارة
  async adminBiz(status?: string) {
    const where: any = status && ['pending', 'approved', 'rejected'].includes(status) ? { status } : {};
    const [items, pending, approved, rejected] = await Promise.all([
      this.prisma.bizListing.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
      this.prisma.bizListing.count({ where: { status: 'pending' } }),
      this.prisma.bizListing.count({ where: { status: 'approved' } }),
      this.prisma.bizListing.count({ where: { status: 'rejected' } }),
    ]);
    const totalViews = await this.prisma.bizListing.aggregate({ _sum: { views: true } });
    return { items, counts: { pending, approved, rejected, views: totalViews._sum.views || 0 } };
  }

  async setBizStatus(id: string, status: string) {
    if (!['approved', 'rejected'].includes(status)) throw new BadRequestException('حالة غير صحيحة');
    const biz = await this.prisma.bizListing.findUnique({ where: { id } });
    if (!biz) throw new NotFoundException('الطلب غير موجود');
    await this.prisma.bizListing.update({ where: { id }, data: { status } });
    return { ok: true, slug: biz.slug };
  }

  async removeBiz(id: string) {
    const biz = await this.prisma.bizListing.findUnique({ where: { id } });
    if (!biz) throw new NotFoundException('الطلب غير موجود');
    await this.prisma.bizListing.delete({ where: { id } });
    return { ok: true };
  }

  // ═══ 🔗 «بع برابط واحد» — صفحة منتج فورية بلا متجر ═══

  // 📤 رفع صورة منتج سريع (عام — حد صارم + WebP محسّمة)
  async uploadQuickSellImage(file: Express.Multer.File) {
    const url = await saveImage(file, 'quick', 1600);
    return { url };
  }

  async createQuickSell(body: any) {
    const name = String(body.name || '').trim().slice(0, 80);
    const desc = String(body.desc || '').trim().slice(0, 600) || null;
    const price = Number(body.price);
    const currency = ['YER', 'SAR', 'USD'].includes(String(body.currency || '').toUpperCase())
      ? String(body.currency).toUpperCase() : 'YER';
    const whatsapp = String(body.whatsapp || '').replace(/[^0-9+]/g, '');
    const phone = String(body.phone || '').replace(/[^0-9+]/g, '') || null;
    const governorate = String(body.governorate || '').trim().slice(0, 40) || null;
    const images = (Array.isArray(body.images) ? body.images : [])
      .map((p: any) => String(p))
      .filter((p: string) => p.startsWith('/uploads/quick/') && /^\/uploads\/quick\/[\w\-\.]+\.webp$/.test(p))
      .slice(0, 5);

    if (name.length < 2) throw new BadRequestException('أدخل اسم المنتج');
    if (!isFinite(price) || price <= 0 || price >= 1e12) throw new BadRequestException('أدخل سعراً صحيحاً');
    if (whatsapp.replace(/[^0-9]/g, '').length < 7) throw new BadRequestException('أدخل رقم واتساب صحيحاً — عليه ستصلك الطلبات');

    const slug = 'q' + randomBytes(4).toString('hex');
    await this.prisma.quickSell.create({
      data: { slug, name, desc, price, currency, whatsapp, phone, governorate, images },
    });
    return { ok: true, slug };
  }

  // الصفحة العامة — النشطة فقط، مع عداد زيارات
  async getQuickSell(slug: string) {
    const item = await this.prisma.quickSell.findUnique({ where: { slug } });
    if (!item || item.status !== 'active') throw new NotFoundException('الصفحة غير موجودة أو أُخفيت');
    await this.prisma.quickSell.update({ where: { slug }, data: { views: { increment: 1 } } }).catch(() => {});
    return { ...item, views: item.views + 1 };
  }

  // 👑 الإدارة — إشراف ومراجعة
  async adminQuickSells(status?: string, q?: string) {
    const where: any = {
      ...(status && ['active', 'hidden'].includes(status) ? { status } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    };
    const [items, active, hidden, viewsAgg] = await Promise.all([
      this.prisma.quickSell.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
      this.prisma.quickSell.count({ where: { status: 'active' } }),
      this.prisma.quickSell.count({ where: { status: 'hidden' } }),
      this.prisma.quickSell.aggregate({ _sum: { views: true } }),
    ]);
    return { items, counts: { active, hidden, views: viewsAgg._sum.views || 0, total: active + hidden } };
  }

  async setQuickSellStatus(id: string, status: string) {
    if (!['active', 'hidden'].includes(status)) throw new BadRequestException('حالة غير صحيحة');
    const item = await this.prisma.quickSell.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('الصفحة غير موجودة');
    await this.prisma.quickSell.update({ where: { id }, data: { status } });
    return { ok: true, slug: item.slug };
  }

  async removeQuickSell(id: string) {
    const item = await this.prisma.quickSell.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('الصفحة غير موجودة');
    await this.prisma.quickSell.delete({ where: { id } });
    return { ok: true };
  }

  // ═══ ♻️ سوق المستعمل — إعلانات مبوبة فورية للأفراد ═══
  static USED_CATS = ['cars', 'phones', 'electronics', 'realestate', 'furniture', 'clothes', 'other'];
  static USED_CONDS = ['like-new', 'used-good', 'used-fair'];

  // 📤 رفع صورة إعلان مستعمل (عام — حد صارم + WebP محسّمة)
  async uploadUsedImage(file: Express.Multer.File) {
    const url = await saveImage(file, 'used', 1600);
    return { url };
  }

  async createUsed(body: any) {
    const title = String(body.title || '').trim().slice(0, 80);
    const desc = String(body.desc || '').trim().slice(0, 800) || null;
    const price = Number(body.price);
    const currency = ['YER', 'SAR', 'USD'].includes(String(body.currency || '').toUpperCase())
      ? String(body.currency).toUpperCase() : 'YER';
    const category = ToolsService.USED_CATS.includes(body.category) ? body.category : 'other';
    const condition = ToolsService.USED_CONDS.includes(body.condition) ? body.condition : 'used-good';
    const whatsapp = String(body.whatsapp || '').replace(/[^0-9+]/g, '');
    const governorate = String(body.governorate || '').trim().slice(0, 40) || null;
    const images = (Array.isArray(body.images) ? body.images : [])
      .map((p: any) => String(p))
      .filter((p: string) => /^\/uploads\/used\/[\w\-\.]+\.webp$/.test(p))
      .slice(0, 5);

    if (title.length < 3) throw new BadRequestException('أدخل عنواناً واضحاً للإعلان');
    if (!isFinite(price) || price <= 0 || price >= 1e12) throw new BadRequestException('أدخل سعراً صحيحاً');
    if (whatsapp.replace(/[^0-9]/g, '').length < 7) throw new BadRequestException('أدخل رقم واتساب صحيحاً — عليه سيتواصل معك المشترون');

    const slug = 'u' + randomBytes(4).toString('hex');
    await this.prisma.usedListing.create({
      data: { slug, title, desc, price, currency, category, condition, whatsapp, governorate, images },
    });
    return { ok: true, slug };
  }

  // السوق العام — النشطة فقط مع فلاتر التصنيف/المحافظة/البحث
  async listUsed(cat?: string, gov?: string, q?: string) {
    const where: any = {
      status: 'active',
      ...(cat && ToolsService.USED_CATS.includes(cat) ? { category: cat } : {}),
      ...(gov ? { governorate: gov } : {}),
      ...(q ? { OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { desc: { contains: q, mode: 'insensitive' as const } },
      ] } : {}),
    };
    const [items, catGroups, govGroups] = await Promise.all([
      this.prisma.usedListing.findMany({
        where, orderBy: { createdAt: 'desc' }, take: 60,
        select: { slug: true, title: true, price: true, currency: true, category: true, condition: true, images: true, governorate: true, views: true, createdAt: true },
      }),
      this.prisma.usedListing.groupBy({ by: ['category'], where: { status: 'active' }, _count: true }),
      this.prisma.usedListing.groupBy({ by: ['governorate'], where: { status: 'active', governorate: { not: null } }, _count: true }),
    ]);
    return {
      items,
      cats: catGroups.map((c) => ({ key: c.category, count: c._count })),
      govs: govGroups.map((g) => ({ key: g.governorate, count: g._count })),
    };
  }

  // صفحة الإعلان — النشطة فقط، مع عداد زيارات
  async getUsed(slug: string) {
    const item = await this.prisma.usedListing.findUnique({ where: { slug } });
    if (!item || item.status !== 'active') throw new NotFoundException('الإعلان غير موجود أو أُخفي');
    await this.prisma.usedListing.update({ where: { slug }, data: { views: { increment: 1 } } }).catch(() => {});
    // إعلانات مشابهة من نفس التصنيف
    const similar = await this.prisma.usedListing.findMany({
      where: { status: 'active', category: item.category, slug: { not: slug } },
      orderBy: { createdAt: 'desc' }, take: 4,
      select: { slug: true, title: true, price: true, currency: true, images: true, governorate: true },
    });
    return { ...item, views: item.views + 1, similar };
  }

  // 👑 الإدارة — إشراف ومراجعة
  async adminUsed(status?: string, q?: string) {
    const where: any = {
      ...(status && ['active', 'hidden'].includes(status) ? { status } : {}),
      ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
    };
    const [items, active, hidden, viewsAgg] = await Promise.all([
      this.prisma.usedListing.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
      this.prisma.usedListing.count({ where: { status: 'active' } }),
      this.prisma.usedListing.count({ where: { status: 'hidden' } }),
      this.prisma.usedListing.aggregate({ _sum: { views: true } }),
    ]);
    return { items, counts: { active, hidden, views: viewsAgg._sum.views || 0, total: active + hidden } };
  }

  async setUsedStatus(id: string, status: string) {
    if (!['active', 'hidden'].includes(status)) throw new BadRequestException('حالة غير صحيحة');
    const item = await this.prisma.usedListing.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('الإعلان غير موجود');
    await this.prisma.usedListing.update({ where: { id }, data: { status } });
    return { ok: true, slug: item.slug };
  }

  async removeUsed(id: string) {
    const item = await this.prisma.usedListing.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('الإعلان غير موجود');
    await this.prisma.usedListing.delete({ where: { id } });
    return { ok: true };
  }

  // ═══ 🔔 تنبيه نزول السعر للزوار — برقم الجوال دون تسجيل ═══
  async subscribePriceAlert(body: any) {
    const productId = String(body.productId || '').trim();
    const phone = String(body.phone || '').replace(/[^0-9+]/g, '');
    if (!productId) throw new BadRequestException('المنتج غير محدد');
    if (phone.replace(/[^0-9]/g, '').length < 7) throw new BadRequestException('أدخل رقم جوال صحيحاً ليصلك التنبيه');

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, price: true, salePrice: true, isActive: true, store: { select: { status: true } } },
    });
    if (!product || !product.isActive || product.store.status !== 'active')
      throw new NotFoundException('المنتج غير متاح حالياً');

    const effective = product.salePrice ?? product.price;
    await this.prisma.priceAlert.upsert({
      where: { productId_phone: { productId, phone } },
      update: { lastPrice: effective, notifiedAt: null },
      create: { productId, phone, lastPrice: effective },
    });
    return { ok: true, message: '✅ تم الاشتراك — سنرسل لك رسالة فور نزول سعر «' + product.name + '»' };
  }

  // ═══ 📖 دليل الأعمال اليمني — المحلات المعتمدة مصنّفة وقابلة للتصفية ═══
  async listDirectory(cat?: string, gov?: string, q?: string) {
    const where: any = {
      status: 'approved',
      ...(cat ? { category: cat } : {}),
      ...(gov ? { governorate: gov } : {}),
      ...(q ? { OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { desc: { contains: q, mode: 'insensitive' as const } },
        { keywords: { contains: q, mode: 'insensitive' as const } },
      ] } : {}),
    };
    const [items, catGroups, govGroups, total] = await Promise.all([
      this.prisma.bizListing.findMany({
        where, orderBy: { createdAt: 'desc' }, take: 90,
        select: { slug: true, name: true, desc: true, category: true, governorate: true, phone: true, whatsapp: true, website: true, views: true },
      }),
      this.prisma.bizListing.groupBy({ by: ['category'], where: { status: 'approved', category: { not: null } }, _count: true }),
      this.prisma.bizListing.groupBy({ by: ['governorate'], where: { status: 'approved', governorate: { not: null } }, _count: true }),
      this.prisma.bizListing.count({ where: { status: 'approved' } }),
    ]);
    return {
      items, total,
      cats: catGroups.map((c) => ({ key: c.category, count: c._count })),
      govs: govGroups.map((g) => ({ key: g.governorate, count: g._count })),
    };
  }

  // ═══ ⚖️ مقارن الأسعار الذكي — ابحث عن منتج وشاهد أسعاره في كل المتاجر ═══
  async priceCompare(qRaw: string) {
    const q = String(qRaw || '').trim().slice(0, 80);
    if (q.length < 2) throw new BadRequestException('اكتب اسم المنتج الذي تبحث عنه');
    const tokens = q.split(/\s+/).filter((t) => t.length >= 2).slice(0, 4);
    if (!tokens.length) throw new BadRequestException('اكتب اسم المنتج الذي تبحث عنه');

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        store: { status: 'active' },
        OR: tokens.map((t) => ({ name: { contains: t, mode: 'insensitive' as const } })),
      },
      select: {
        id: true, name: true, price: true, salePrice: true, currency: true, images: true, stock: true,
        store: { select: { name: true, slug: true, isVerified: true, governorate: true } },
      },
      take: 60,
    });

    // الأكثر تطابقاً أولاً ثم الأرخص — السعر الفعلي (بعد الخصم) هو أساس المقارنة
    const items = products
      .map((p) => {
        const nm = p.name.toLowerCase();
        const match = tokens.filter((t) => nm.includes(t.toLowerCase())).length;
        return { ...p, effPrice: Number(p.salePrice || p.price), match };
      })
      .filter((p) => p.match > 0)
      .sort((a, b) => b.match - a.match || a.effPrice - b.effPrice)
      .slice(0, 30);

    if (!items.length) return { q, items: [], stats: null };
    const prices = items.map((p) => p.effPrice);
    const min = Math.min(...prices), max = Math.max(...prices);
    return {
      q, items,
      stats: {
        count: items.length,
        stores: new Set(items.map((p) => p.store.slug)).size,
        min, max, save: max - min,
      },
    };
  }

  // ═══ 📢 «اطلبها ونوفرها» — سوق الطلبات العكسي ═══

  async createRequest(body: any) {
    const title = String(body.title || '').trim().slice(0, 120);
    const details = String(body.details || '').trim().slice(0, 600) || null;
    const budget = body.budget ? Number(body.budget) : null;
    const currency = ['YER', 'SAR', 'USD'].includes(String(body.currency || '').toUpperCase())
      ? String(body.currency).toUpperCase() : 'YER';
    const governorate = String(body.governorate || '').trim().slice(0, 40) || null;
    const whatsapp = String(body.whatsapp || '').replace(/[^0-9+]/g, '');

    if (title.length < 5) throw new BadRequestException('اكتب ما تبحث عنه بوضوح (5 أحرف على الأقل)');
    if (budget !== null && (!isFinite(budget) || budget <= 0 || budget >= 1e12)) throw new BadRequestException('الميزانية غير صحيحة');
    if (whatsapp.replace(/[^0-9]/g, '').length < 7) throw new BadRequestException('أدخل رقم واتساب صحيحاً — تصلك عليه ردود التجار');

    const slug = 'r' + randomBytes(4).toString('hex');
    await this.prisma.buyerRequest.create({
      data: { slug, title, details, budget, currency, governorate, whatsapp },
    });
    return { ok: true, message: '✅ استلمنا طلبك — سيُنشر للتجار بعد مراجعة الإدارة' };
  }

  // 📋 لوحة الطلبات العامة — المعتمدة فقط
  async listRequests(gov?: string, q?: string) {
    const where: any = {
      status: 'approved',
      ...(gov ? { governorate: gov } : {}),
      ...(q ? { title: { contains: q.slice(0, 60), mode: 'insensitive' as const } } : {}),
    };
    const items = await this.prisma.buyerRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        slug: true, title: true, budget: true, currency: true, governorate: true, views: true, createdAt: true,
        _count: { select: { replies: { where: { status: 'approved' } } } },
      },
    });
    const govs = await this.prisma.buyerRequest.findMany({
      where: { status: 'approved', governorate: { not: null } },
      select: { governorate: true }, distinct: ['governorate'], take: 25,
    });
    return {
      items: items.map((r) => ({ ...r, replies: r._count.replies, _count: undefined })),
      govs: govs.map((g) => g.governorate).filter(Boolean),
    };
  }

  // الصفحة العامة للطلب — المعتمدة فقط + الردود المعتمدة (واتساب الطالب لا يظهر علناً)
  async getRequest(slug: string) {
    const req = await this.prisma.buyerRequest.findUnique({
      where: { slug },
      include: {
        replies: {
          where: { status: 'approved' },
          orderBy: { createdAt: 'asc' },
          select: { id: true, sellerName: true, message: true, price: true, whatsapp: true, createdAt: true },
        },
      },
    });
    if (!req || req.status !== 'approved') throw new NotFoundException('الطلب غير موجود');
    await this.prisma.buyerRequest.update({ where: { slug }, data: { views: { increment: 1 } } }).catch(() => {});
    const { whatsapp, ...pub } = req;
    return { ...pub, views: req.views + 1 };
  }

  // 💬 رد تاجر على طلب — يُراجع قبل الظهور
  async replyRequest(slug: string, body: any) {
    const req = await this.prisma.buyerRequest.findUnique({ where: { slug } });
    if (!req || req.status !== 'approved') throw new NotFoundException('الطلب غير موجود');
    const sellerName = String(body.sellerName || '').trim().slice(0, 60);
    const message = String(body.message || '').trim().slice(0, 500);
    const price = body.price ? Number(body.price) : null;
    const whatsapp = String(body.whatsapp || '').replace(/[^0-9+]/g, '');
    if (sellerName.length < 2) throw new BadRequestException('أدخل اسمك أو اسم محلك');
    if (message.length < 10) throw new BadRequestException('اكتب عرضك بوضوح (10 أحرف على الأقل)');
    if (price !== null && (!isFinite(price) || price <= 0 || price >= 1e12)) throw new BadRequestException('السعر غير صحيح');
    if (whatsapp.replace(/[^0-9]/g, '').length < 7) throw new BadRequestException('أدخل رقم واتساب صحيحاً — يتواصل معك الطالب عليه');
    await this.prisma.requestReply.create({
      data: { requestId: req.id, sellerName, message, price, whatsapp },
    });
    return { ok: true, message: '✅ أُرسل ردك — سيظهر تحت الطلب بعد مراجعة الإدارة' };
  }

  // 👑 الإدارة — الطلبات
  async adminRequests(status?: string) {
    const where: any = status && ['pending', 'approved', 'closed'].includes(status) ? { status } : {};
    const [items, pending, approved, closed, viewsAgg] = await Promise.all([
      this.prisma.buyerRequest.findMany({
        where, orderBy: { createdAt: 'desc' }, take: 200,
        include: { _count: { select: { replies: true } } },
      }),
      this.prisma.buyerRequest.count({ where: { status: 'pending' } }),
      this.prisma.buyerRequest.count({ where: { status: 'approved' } }),
      this.prisma.buyerRequest.count({ where: { status: 'closed' } }),
      this.prisma.buyerRequest.aggregate({ _sum: { views: true } }),
    ]);
    return { items, counts: { pending, approved, closed, views: viewsAgg._sum.views || 0 } };
  }

  async setRequestStatus(id: string, status: string) {
    if (!['pending', 'approved', 'closed'].includes(status)) throw new BadRequestException('حالة غير صحيحة');
    const req = await this.prisma.buyerRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    await this.prisma.buyerRequest.update({ where: { id }, data: { status } });
    return { ok: true, slug: req.slug };
  }

  async removeRequest(id: string) {
    const req = await this.prisma.buyerRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    await this.prisma.buyerRequest.delete({ where: { id } }); // الردود تُحذف تبعاً (onDelete: Cascade)
    return { ok: true };
  }

  // 👑 الإدارة — ردود التجار
  async adminReplies(status?: string) {
    const where: any = status && ['pending', 'approved', 'hidden'].includes(status) ? { status } : {};
    const [items, pending, approved, hidden] = await Promise.all([
      this.prisma.requestReply.findMany({
        where, orderBy: { createdAt: 'desc' }, take: 200,
        include: { request: { select: { slug: true, title: true } } },
      }),
      this.prisma.requestReply.count({ where: { status: 'pending' } }),
      this.prisma.requestReply.count({ where: { status: 'approved' } }),
      this.prisma.requestReply.count({ where: { status: 'hidden' } }),
    ]);
    return { items, counts: { pending, approved, hidden } };
  }

  async setReplyStatus(id: string, status: string) {
    if (!['approved', 'hidden'].includes(status)) throw new BadRequestException('حالة غير صحيحة');
    const rep = await this.prisma.requestReply.findUnique({ where: { id } });
    if (!rep) throw new NotFoundException('الرد غير موجود');
    await this.prisma.requestReply.update({ where: { id }, data: { status } });
    return { ok: true };
  }

  async removeReply(id: string) {
    const rep = await this.prisma.requestReply.findUnique({ where: { id } });
    if (!rep) throw new NotFoundException('الرد غير موجود');
    await this.prisma.requestReply.delete({ where: { id } });
    return { ok: true };
  }

  // 🌐 فاحص المواقع — جلب من الخادم (يتجاوز CORS) مع مهلة صارمة
  async siteCheck(rawUrl: string) {
    let url = String(rawUrl || '').trim();
    if (!url) throw new BadRequestException('أدخل رابط الموقع');
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new BadRequestException('الرابط غير صالح'); }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(parsed.hostname)) throw new BadRequestException('النطاق غير صالح');

    const started = Date.now();
    let html = '', status = 0, ok = false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'YemenZone-SiteCheck/1.0 (+https://yemenzone1.com)' },
      });
      clearTimeout(timer);
      status = res.status;
      ok = res.ok;
      const buf = await res.arrayBuffer();
      const bytes = buf.byteLength > 600_000 ? buf.slice(0, 600_000) : buf;
      html = new TextDecoder('utf-8').decode(bytes as any);
    } catch {
      throw new BadRequestException('تعذّر الوصول للموقع — تأكد من الرابط أو أن الموقع يعمل');
    }
    const ms = Date.now() - started;
    const pick = (re: RegExp) => { const m = html.match(re); return m ? m[1].trim().slice(0, 300) : ''; };
    const title = pick(/<title[^>]*>([^<]*)<\/title>/i);
    const metaDesc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
      || pick(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    const h1 = pick(/<h1[^>]*>([^<]*)<\/h1>/i);
    const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    const images = (html.match(/<img\b/gi) || []).length;
    const imgsNoAlt = (html.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) || []).length;
    const sizeKB = Math.round(html.length / 1024);

    // التقييم: 100 نقطة موزعة على الأساسيات
    let score = 0;
    const checks: { label: string; ok: boolean; tip: string }[] = [
      { label: 'اتصال آمن HTTPS', ok: parsed.protocol === 'https:', tip: 'فعّل شهادة SSL — جوجل يعاقب المواقع غير الآمنة' },
      { label: 'الموقع يستجيب بنجاح', ok, tip: 'الخادم أعاد خطأ — راجع الاستضافة' },
      { label: 'سرعة الاستجابة أقل من 1.5 ثانية', ok: ms < 1500, tip: `الاستجابة ${ms}ms — الكاش والاستضافة الأقرب للزائر يختصرانها` },
      { label: 'عنوان الصفحة (Title)', ok: !!title, tip: 'أضف عنواناً واضحاً يحتوي اسم نشاطك' },
      { label: 'وصف ميتا (Meta Description)', ok: !!metaDesc, tip: 'الوصف يظهر في نتائج البحث ويزيد النقرات' },
      { label: 'متوافق مع الجوال (Viewport)', ok: viewport, tip: 'أضف وسم viewport — أكثر من 80% من زوارك بالجوال' },
      { label: 'عنوان رئيسي H1', ok: !!h1, tip: 'كل صفحة تحتاج عنواناً رئيسياً واحداً واضحاً' },
      { label: 'نص بديل للصور (Alt)', ok: images === 0 || imgsNoAlt / Math.max(images, 1) < 0.4, tip: `${imgsNoAlt} صورة بلا نص بديل — مهم لمحركات البحث` },
    ];
    const weights = [20, 15, 15, 12, 12, 10, 8, 8];
    checks.forEach((c, i) => { if (c.ok) score += weights[i]; });

    return {
      url, status, ms, sizeKB, title, metaDesc, h1, images, score,
      grade: score >= 85 ? 'ممتاز' : score >= 65 ? 'جيد' : score >= 45 ? 'يحتاج تحسين' : 'ضعيف',
      checks,
    };
  }
}
