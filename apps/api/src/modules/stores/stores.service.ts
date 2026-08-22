import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LocalAiService, PRODUCT_CATEGORIES } from './local-ai.service';
import { WebPushService } from '../notifications/push.service';
import { CacheService } from '../../common/cache.service';
import { effectiveFeatures, requireFeature, FEATURE_AR, subscriptionActive } from '../../common/features';
import { levelOf, buildBadges } from '../../common/seller-levels';

@Injectable()
export class StoresService {
  constructor(
    private prisma: PrismaService,
    private ai: LocalAiService,
    private webPush: WebPushService,
    private cache: CacheService,
  ) {}

  // ⚡ إبطال كاش الواجهة العامة — يظهر تعديل البائع للزوار فوراً
  private bust(slug: string) {
    this.cache.del(`sf:${slug}`).catch(() => {});
  }

  // 🤝 إحالة التجار: رمز دعوة البائع + عدد التجار الذين انضموا عبره
  async referralInfo(sellerId: string) {
    let seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, referralCode: true },
    });
    if (!seller) throw new NotFoundException('الحساب غير موجود');
    // توليد كسول للحسابات القديمة التي سبقت الميزة
    if (!seller.referralCode) {
      const code = 't' + Math.random().toString(16).slice(2, 10);
      await this.prisma.seller.update({ where: { id: sellerId }, data: { referralCode: code } }).catch(() => {});
      seller = { ...seller, referralCode: code };
    }
    const count = await this.prisma.seller.count({ where: { referredById: sellerId } });
    const recent = await this.prisma.seller.findMany({
      where: { referredById: sellerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { name: true, createdAt: true, stores: { select: { name: true, slug: true }, take: 1 } },
    });
    return { code: seller.referralCode, count, recent };
  }

  // خيارات الإعداد: الأنواع من قاعدة البيانات (تديرها الإدارة) + التصنيفات الستة + القوالب
  async setupOptions() {
    const types = await this.prisma.storeType.findMany({
      where: { isActive: true },
      orderBy: [{ sort: 'asc' }, { nameAr: 'asc' }],
    });
    // 🏷️ كل نشاط يُسمّى باسمه — لا نطلق «متجر» على الفندق أو الإيجارات أو الخدمات
    const fallback = [
      { id: 'products', kind: 'products', name: 'متجر منتجات',   icon: '🛍️', color: '#6C3DF5', desc: 'إلكترونيات، أغذية، ملابس...' },
      { id: 'rentals',  kind: 'rentals',  name: 'عقارات للإيجار', icon: '🏠', color: '#0E9F8C', desc: 'شقق، فلل، محلات للإيجار' },
      { id: 'hotel',    kind: 'hotel',    name: 'فندق',          icon: '🏨', color: '#B45309', desc: 'غرف وحجوزات فندقية' },
      { id: 'services', kind: 'services', name: 'مركز خدمات',    icon: '🛠️', color: '#2563EB', desc: 'صيانة، تصميم، استشارات...' },
      { id: 'restaurants', kind: 'restaurants', name: 'مطعم',    icon: '🍽️', color: '#EA580C', desc: 'مأكولات، مشويات، مشروبات، حلويات...' },
      { id: 'malls',       kind: 'malls',       name: 'مول تجاري', icon: '🏬', color: '#7C3AED', desc: 'سوق إلكتروني شامل: إلكترونيات، أزياء، عطور، أجهزة...' },
    ];
    return {
      kinds: types.length
        ? types.map((t) => ({
            id: t.id, kind: t.kind, name: t.nameAr,
            icon: t.icon || '🏪', color: t.color, desc: t.description,
          }))
        : fallback,
      productCategories: PRODUCT_CATEGORIES,
      templates: [
        { id: 'default', name: 'الافتراضي' },
        { id: 'modern',  name: 'العصري' },
        { id: 'dark',    name: 'الداكن' },
        { id: 'elegant', name: 'الأنيق' },
      ],
    };
  }

  // معاينة الإعداد الذكي قبل الإنشاء (الذكاء المحلي)
  aiPreview(body: { kind: string; name: string; category?: string }) {
    return this.ai.generateSetup(body);
  }

  // إنشاء المتجر مع الإعداد الذكي الكامل
  async create(sellerId: string, body: {
    kind: string; typeId?: string; name: string; category?: string;
    governorate?: string; whatsapp?: string;
  }) {
    // متجر واحد لكل بائع (يمكن التوسع بالخطط لاحقاً)
    const existing = await this.prisma.store.findFirst({ where: { sellerId } });
    if (existing) throw new ConflictException('لديك متجر بالفعل — يمكنك تعديله من الإعدادات');

    if (!body.name || body.name.length < 2) throw new BadRequestException('اسم المتجر مطلوب');

    // النطاق الفرعي: من الاسم
    let slug = body.name
      .toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'store';
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    // النوع: بالمعرف المحدد، أو أول نوع نشط من النشاط الأساسي المطلوب
    const type = body.typeId
      ? await this.prisma.storeType.findFirst({ where: { id: body.typeId, isActive: true } })
      : await this.prisma.storeType.findFirst({
          where: { kind: body.kind as any, isActive: true },
          orderBy: [{ sort: 'asc' }, { nameAr: 'asc' }],
        });
    if (!type) throw new BadRequestException('نوع المتجر غير صحيح');

    // 🤖 الذكاء الاصطناعي المحلي يجهّز كل شيء — حسب نشاط النوع المختار
    const setup = this.ai.generateSetup({ kind: type.kind, name: body.name, category: body.category });

    const store = await this.prisma.store.create({
      data: {
        sellerId,
        typeId: type.id,
        name: body.name,
        slug,
        description: setup.description,
        governorate: body.governorate,
        whatsapp: body.whatsapp,
        template: setup.theme.template,
        themeJson: {
          primary: type.color || setup.theme.primary,
          secondary: setup.theme.secondary,
          category: setup.detectedCategory,
          dashboard: setup.dashboard,
        },
      },
      include: { type: true },
    });

    // إنشاء التصنيفات المقترحة تلقائياً
    for (const cat of setup.suggestedCategories) {
      await this.prisma.category.create({
        data: { storeId: store.id, name: cat.name },
      });
    }

    // ربط بالخطة المجانية الخاصة بنوع النشاط تلقائياً (مع الرجوع للعامة إن وُجدت)
    const freePlan = await this.prisma.plan.findUnique({ where: { slug: `free-${store.type.kind}` } })
      || await this.prisma.plan.findUnique({ where: { slug: 'free' } });
    if (freePlan) {
      await this.prisma.subscription.create({
        data: { storeId: store.id, planId: freePlan.id },
      });
    }

    return { store, aiSetup: setup };
  }

  // متجر البائع الحالي — مع الميزات الفعالة المحسوبة (للواجهة: أقفال/قائمة جانبية)
  async myStore(sellerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { sellerId },
      include: {
        type: true,
        subscription: { include: { plan: true } },
        _count: { select: { products: true, orders: true, reviews: true, rentalUnits: true, rooms: true, services: true } },
      },
    });
    if (!store) throw new NotFoundException('لا يوجد متجر — أنشئ متجرك أولاً');
    // 🧬 عدّاد الحجوزات/الطلبات حسب النشاط — كل نشاط له جدوله الخاص
    const kind = store.type?.kind || 'products';
    const bookingsCount = kind === 'hotel'
      ? await this.prisma.roomBooking.count({ where: { room: { storeId: store.id } } })
      : kind === 'rentals'
        ? await this.prisma.rentalBooking.count({ where: { unit: { storeId: store.id } } })
        : kind === 'services'
          ? await this.prisma.serviceRequest.count({ where: { service: { storeId: store.id } } })
          : 0;
    return {
      ...store,
      bookingsCount,
      features: effectiveFeatures(store),
      featureLabels: FEATURE_AR,
      subscriptionActive: subscriptionActive(store.subscription),
    };
  }

  // تحديث قالب وألوان المتجر — 🔒 ميزة مدفوعة (تخصيص التصميم)
  async updateTheme(sellerId: string, body: { template?: string; primary?: string; secondary?: string; pattern?: string; font?: string; sectionsOrder?: string[] }) {
    const store = await this.prisma.store.findFirst({
      where: { sellerId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    requireFeature(store, 'customDesign');

    const theme: any = { ...(store.themeJson as any) };
    if (body.primary !== undefined) theme.primary = body.primary;
    if (body.secondary !== undefined) theme.secondary = body.secondary;
    // 🎭 لمسات الثيمات الجاهزة
    if (body.pattern !== undefined) body.pattern ? (theme.pattern = String(body.pattern).slice(0, 30)) : delete theme.pattern;
    if (body.font !== undefined) body.font === 'serif' ? (theme.font = 'serif') : delete theme.font;
    // 🧩 ترتيب أقسام الواجهة — قائمة بيضاء فقط
    if (body.sectionsOrder !== undefined) {
      const ALLOWED = ['banners', 'products', 'booking', 'reviews'];
      const clean = (Array.isArray(body.sectionsOrder) ? body.sectionsOrder : []).filter((s) => ALLOWED.includes(s)).slice(0, 6);
      if (clean.length) theme.sectionsOrder = clean; else delete theme.sectionsOrder;
    }

    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: { template: body.template ?? store.template, themeJson: theme },
    });
    this.bust(store.slug);
    return updated;
  }

  // ⭐ طلب تمييز المتجر — القرار النهائي للإدارة وحدها
  async requestFeatured(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    if (store.isFeatured) throw new ConflictException('متجرك متميز بالفعل 🎉');
    if (store.featuredRequested) throw new ConflictException('طلبك قيد المراجعة بالفعل');
    await this.prisma.store.update({
      where: { id: store.id },
      data: { featuredRequested: true },
    });
    return { requested: true, message: 'تم إرسال طلب التمييز — ستصلك الموافقة من الإدارة' };
  }

  // تحديث بيانات المتجر
  async update(sellerId: string, body: any) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: {
        name: body.name,
        description: body.description,
        governorate: body.governorate,
        city: body.city,
        address: body.address,
        // 📍 موقع المتجر على الخريطة — إحداثيات معقّمة ومحدودة النطاق
        ...(body.lat !== undefined ? { lat: body.lat === null || body.lat === '' ? null : Math.max(-90, Math.min(90, Number(body.lat))) } : {}),
        ...(body.lng !== undefined ? { lng: body.lng === null || body.lng === '' ? null : Math.max(-180, Math.min(180, Number(body.lng))) } : {}),
        whatsapp: body.whatsapp,
        phone: body.phone,
        logo: body.logo,
        cover: body.cover,
        metaTitle: body.metaTitle,
        metaDesc: body.metaDesc,
        keywords: body.keywords,
        // 📨 قوالب الرسائل الآلية — قائمة بيضاء معقّمة
        ...(body.messageTemplates !== undefined ? {
          messageTemplates: Object.fromEntries(
            Object.entries(body.messageTemplates || {})
              .filter(([k, v]) => ['confirmed', 'processing', 'shipped', 'delivered', 'completed'].includes(k) && typeof v === 'string')
              .map(([k, v]: any) => [k, v.slice(0, 300)])
          ),
        } : {}),
        // ⏸️ الإغلاق المؤقت — البائع يوقف الطلبات مؤقتاً ويعود متى شاء
        ...(body.paused !== undefined ? {
          pausedAt: body.paused ? (store.pausedAt || new Date()) : null,
          pauseNote: body.paused ? String(body.pauseNote || '').slice(0, 140) || null : null,
        } : {}),
      },
    });
    this.bust(store.slug);
    return updated;
  }

  // 🎖️ حالة توثيق المتجر + سجل الطلبات
  async myVerification(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    const requests = await this.prisma.verificationRequest.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
    });
    return {
      verified: store.isVerified,
      pending: requests.some((r) => r.status === 'pending'),
      requests,
    };
  }

  // 🏅 مستوى البائع + شارات الإنجاز — كلها من نشاط حقيقي
  async achievements(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    const [deliveredOrders, productsCount] = await Promise.all([
      this.prisma.order.count({ where: { storeId: store.id, status: 'delivered' } }),
      this.prisma.product.count({ where: { storeId: store.id, isActive: true } }),
    ]);
    const stats = {
      deliveredOrders,
      ratingAvg: store.ratingAvg,
      ratingCount: store.ratingCount,
      likesCount: store.likesCount,
      productsCount,
      isVerified: store.isVerified,
      storeAgeDays: Math.floor((Date.now() - new Date(store.createdAt).getTime()) / 86400000),
    };
    const { level, next, progress } = levelOf(deliveredOrders);
    const badges = buildBadges(stats);
    return {
      level, next, progress, stats, badges,
      unlockedCount: badges.filter((b) => b.unlocked).length,
    };
  }

  // ═══ 🌐 النطاق الحقيقي للمتجر — ميزة مدفوعة، والتفعيل بموافقة الإدارة ═══
  private static DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

  private async myStoreWithPlan(sellerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { sellerId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    return store;
  }

  async myDomain(sellerId: string) {
    const store = await this.myStoreWithPlan(sellerId);
    return {
      domain: store.customDomain,
      status: store.customDomainStatus,
      note: store.customDomainNote,
      requestedAt: store.domainRequestedAt,
      featureEnabled: !!effectiveFeatures(store).customDomain,
      platformDomain: process.env.PLATFORM_DOMAIN || 'yemenzone1.com',
    };
  }

  // ═══ 💳🚚 طرق الدفع والتوصيل الخاصة بالمتجر — يضبطها البائع لعملائه ═══
  private static PAY_TYPES = ['cash', 'wallet', 'bank', 'transfer'];
  private static MAX_METHODS = 10;

  private async ownStore(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    return store;
  }

  async checkoutSettings(sellerId: string) {
    const store = await this.ownStore(sellerId);
    const [paymentMethods, deliveryMethods] = await Promise.all([
      this.prisma.storePaymentMethod.findMany({ where: { storeId: store.id }, orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.storeDeliveryMethod.findMany({ where: { storeId: store.id }, orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }] }),
    ]);
    return { paymentMethods, deliveryMethods };
  }

  async addPaymentMethod(sellerId: string, body: any) {
    const store = await this.ownStore(sellerId);
    if (!StoresService.PAY_TYPES.includes(body.type)) throw new BadRequestException('نوع الدفع غير معروف');
    if (!body.label?.trim()) throw new BadRequestException('اسم الطريقة مطلوب');
    if (body.type !== 'cash' && !body.account?.trim()) throw new BadRequestException('رقم المحفظة/الحساب مطلوب لهذه الطريقة');
    const count = await this.prisma.storePaymentMethod.count({ where: { storeId: store.id } });
    if (count >= StoresService.MAX_METHODS) throw new BadRequestException(`الحد الأقصى ${StoresService.MAX_METHODS} طرق دفع`);
    return this.prisma.storePaymentMethod.create({
      data: {
        storeId: store.id,
        type: body.type,
        label: body.label.trim().slice(0, 60),
        account: body.account?.trim().slice(0, 60) || null,
        accountName: body.accountName?.trim().slice(0, 60) || null,
        instructions: body.instructions?.trim().slice(0, 300) || null,
        fee: Math.max(0, Math.min(Number(body.fee) || 0, 100000)),
        sort: count,
      },
    });
  }

  async updatePaymentMethod(sellerId: string, id: string, body: any) {
    const store = await this.ownStore(sellerId);
    const m = await this.prisma.storePaymentMethod.findFirst({ where: { id, storeId: store.id } });
    if (!m) throw new NotFoundException('الطريقة غير موجودة');
    return this.prisma.storePaymentMethod.update({
      where: { id },
      data: {
        label: body.label?.trim().slice(0, 60) ?? m.label,
        account: body.account !== undefined ? (body.account?.trim().slice(0, 60) || null) : m.account,
        accountName: body.accountName !== undefined ? (body.accountName?.trim().slice(0, 60) || null) : m.accountName,
        instructions: body.instructions !== undefined ? (body.instructions?.trim().slice(0, 300) || null) : m.instructions,
        fee: body.fee !== undefined ? Math.max(0, Math.min(Number(body.fee) || 0, 100000)) : m.fee,
        isActive: body.isActive !== undefined ? !!body.isActive : m.isActive,
      },
    });
  }

  async deletePaymentMethod(sellerId: string, id: string) {
    const store = await this.ownStore(sellerId);
    const m = await this.prisma.storePaymentMethod.findFirst({ where: { id, storeId: store.id } });
    if (!m) throw new NotFoundException('الطريقة غير موجودة');
    await this.prisma.storePaymentMethod.delete({ where: { id } });
    return { deleted: true };
  }

  async addDeliveryMethod(sellerId: string, body: any) {
    const store = await this.ownStore(sellerId);
    if (!body.label?.trim()) throw new BadRequestException('اسم طريقة التوصيل مطلوب');
    const count = await this.prisma.storeDeliveryMethod.count({ where: { storeId: store.id } });
    if (count >= StoresService.MAX_METHODS) throw new BadRequestException(`الحد الأقصى ${StoresService.MAX_METHODS} طرق توصيل`);
    return this.prisma.storeDeliveryMethod.create({
      data: {
        storeId: store.id,
        label: body.label.trim().slice(0, 60),
        fee: Math.max(0, Math.min(Number(body.fee) || 0, 100000)),
        eta: body.eta?.trim().slice(0, 40) || null,
        areas: body.areas?.trim().slice(0, 200) || null,
        note: body.note?.trim().slice(0, 200) || null,
        sort: count,
      },
    });
  }

  async updateDeliveryMethod(sellerId: string, id: string, body: any) {
    const store = await this.ownStore(sellerId);
    const m = await this.prisma.storeDeliveryMethod.findFirst({ where: { id, storeId: store.id } });
    if (!m) throw new NotFoundException('الطريقة غير موجودة');
    return this.prisma.storeDeliveryMethod.update({
      where: { id },
      data: {
        label: body.label?.trim().slice(0, 60) ?? m.label,
        fee: body.fee !== undefined ? Math.max(0, Math.min(Number(body.fee) || 0, 100000)) : m.fee,
        eta: body.eta !== undefined ? (body.eta?.trim().slice(0, 40) || null) : m.eta,
        areas: body.areas !== undefined ? (body.areas?.trim().slice(0, 200) || null) : m.areas,
        note: body.note !== undefined ? (body.note?.trim().slice(0, 200) || null) : m.note,
        isActive: body.isActive !== undefined ? !!body.isActive : m.isActive,
      },
    });
  }

  async deleteDeliveryMethod(sellerId: string, id: string) {
    const store = await this.ownStore(sellerId);
    const m = await this.prisma.storeDeliveryMethod.findFirst({ where: { id, storeId: store.id } });
    if (!m) throw new NotFoundException('الطريقة غير موجودة');
    await this.prisma.storeDeliveryMethod.delete({ where: { id } });
    return { deleted: true };
  }

  async requestDomain(sellerId: string, rawDomain?: string) {
    const store = await this.myStoreWithPlan(sellerId);
    requireFeature(store, 'customDomain');
    // تطبيع الإدخال: إزالة البروتوكول والمسار وwww والمسافات
    const domain = String(rawDomain || '')
      .trim().toLowerCase()
      .replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    if (!StoresService.DOMAIN_RE.test(domain)) {
      throw new BadRequestException('صيغة النطاق غير صحيحة — مثال: shop.example.com');
    }
    const platformDomain = (process.env.PLATFORM_DOMAIN || 'yemenzone1.com').toLowerCase();
    if (domain === platformDomain || domain.endsWith('.' + platformDomain)) {
      throw new BadRequestException('لا يمكن استخدام نطاق المنصة نفسه');
    }
    const taken = await this.prisma.store.findUnique({ where: { customDomain: domain } });
    if (taken && taken.id !== store.id) throw new ConflictException('هذا النطاق مرتبط بمتجر آخر');
    if (store.customDomain === domain && store.customDomainStatus === 'approved') {
      throw new BadRequestException('نطاقك معتمد ويعمل بالفعل ✅');
    }
    return this.prisma.store.update({
      where: { id: store.id },
      data: { customDomain: domain, customDomainStatus: 'pending', customDomainNote: null, domainRequestedAt: new Date() },
      select: { customDomain: true, customDomainStatus: true },
    });
  }

  async removeDomain(sellerId: string) {
    const store = await this.myStoreWithPlan(sellerId);
    if (!store.customDomain) throw new BadRequestException('لا يوجد نطاق مرتبط');
    return this.prisma.store.update({
      where: { id: store.id },
      data: { customDomain: null, customDomainStatus: 'none', customDomainNote: null, domainRequestedAt: null },
      select: { id: true },
    });
  }

  // 🎖️ تقديم طلب توثيق جديد — الإدارة وحدها تمنح الشارة
  async requestVerification(sellerId: string, body: { docType?: string; docImage?: string; notes?: string }) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    if (store.isVerified) throw new BadRequestException('متجرك موثق بالفعل 🎖️');
    const pending = await this.prisma.verificationRequest.findFirst({
      where: { storeId: store.id, status: 'pending' },
    });
    if (pending) throw new ConflictException('لديك طلب توثيق قيد المراجعة بالفعل');
    const docType = String(body.docType || '').trim();
    const docImage = String(body.docImage || '').trim();
    if (!['id', 'commercial', 'other'].includes(docType)) {
      throw new BadRequestException('نوع الوثيقة غير صالح');
    }
    if (!docImage.startsWith('/uploads/')) throw new BadRequestException('صورة الوثيقة مطلوبة');
    // 📲 تنبيه فوري للإدارة بطلب التوثيق — يصل حتى واللوحة مغلقة
    this.webPush.sendToAdmins({
      title: '🎖️ طلب توثيق جديد',
      body: `${store.name} أرسل وثائق التوثيق — راجعها واعتمدها`,
      url: '/admin/verification',
    });
    return this.prisma.verificationRequest.create({
      data: {
        storeId: store.id,
        docType,
        docImage,
        notes: body.notes ? String(body.notes).slice(0, 500) : null,
      },
    });
  }
}
