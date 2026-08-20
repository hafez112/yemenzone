import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException, Header } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { CacheService } from '../../common/cache.service';

// API عام قراءة فقط: /api/v1/*
// ⚡ الجلسة 6: النقاط العامة الثقيلة مغلّفة بكاش قصير الأمد (Redis أو ذاكرة)
@Controller('v1')
export class PublicController {
  constructor(private prisma: PrismaService, private cache: CacheService) {}

  // 🔔 «أعلمني عند التوفر» — تسجيل تنبيه لمنتج نافد (زائر أو مسجل)
  @UseGuards(RateLimit(15, 60 * 60_000, 'stock-alert'))
  @Post('stock-alerts')
  async stockAlert(@Body() body: { productId?: string; phone?: string }) {
    const productId = String(body.productId || '');
    const phone = String(body.phone || '').trim();
    if (!/^[+0-9]{7,20}$/.test(phone)) throw new BadRequestException('رقم الجوال غير صحيح');
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true, stock: true },
    });
    if (!product) throw new BadRequestException('المنتج غير موجود');
    if (product.stock > 0) throw new BadRequestException('المنتج متوفر الآن — اطلبه مباشرة! 🎉');
    const customer = await this.prisma.customer.findUnique({ where: { phone } });
    await this.prisma.stockAlert.upsert({
      where: { productId_phone: { productId, phone } },
      update: {},
      create: { productId, phone, customerId: customer?.id || null },
    });
    return { ok: true, message: '🔔 سجلناك — سنعلمك فور عودته للمخزون' };
  }

  @Get('status')
  status() {
    return {
      name: 'يمن زون API',
      version: '1.0.0',
      status: 'online',
      time: new Date().toISOString(),
    };
  }

  @Get('stores')
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
  async stores(@Query('governorate') gov?: string, @Query('featured') featured?: string) {
    return this.cache.wrap(`pub:stores:${gov || ''}:${featured || ''}`, 45, () => this.buildStores(gov, featured));
  }

  private async buildStores(gov?: string, featured?: string) {
    const stores = await this.prisma.store.findMany({
      where: {
        status: 'active',
        isListed: true, // 🗂️ القوائم العامة تعرض فقط من وافقت الإدارة على إدراجهم
        ...(gov ? { governorate: gov } : {}),
        // ⭐ المتميزة = من وافقت الإدارة عليهم فقط (isFeatured لا يُضبط إلا من لوحة المدير)
        ...(featured ? { isFeatured: true } : {}),
      },
      select: {
        id: true, name: true, slug: true, logo: true, cover: true,
        description: true, governorate: true, ratingAvg: true, ratingCount: true,
        smartScore: true, isVerified: true, likesCount: true, isFeatured: true,
        createdAt: true,
        type: { select: { nameAr: true, icon: true } },
      },
      orderBy: featured ? [{ featuredAt: 'desc' }, { smartScore: 'desc' }] : { createdAt: 'desc' },
      take: featured ? 12 : 50,
    });

    // 🤖 شارات ذكية محلية للمتاجر المتميزة (تُحسب من النشاط الحقيقي)
    if (featured) {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      return Promise.all(stores.map(async (s) => {
        const [ordersTotal, recentOrders] = await Promise.all([
          this.prisma.order.count({ where: { storeId: s.id, status: { notIn: ['cancelled', 'refunded'] } } }),
          this.prisma.order.count({ where: { storeId: s.id, createdAt: { gte: twoWeeksAgo } } }),
        ]);
        const badges: { icon: string; label: string }[] = [];
        if (ordersTotal >= 20) badges.push({ icon: '🏆', label: 'الأكثر مبيعاً' });
        if (recentOrders >= 5) badges.push({ icon: '🚀', label: 'صاعد بسرعة' });
        if (s.ratingAvg >= 4.5 && s.ratingCount >= 3) badges.push({ icon: '💯', label: 'تقييم ممتاز' });
        if (new Date(s.createdAt) > twoWeeksAgo) badges.push({ icon: '🆕', label: 'جديد' });
        return { ...s, badges };
      }));
    }
    return stores;
  }

  @Get('products')
  products(@Query('store') storeId?: string) {
    return this.prisma.product.findMany({
      where: { isActive: true, ...(storeId ? { storeId } : {}) },
      select: {
        id: true, name: true, price: true, salePrice: true,
        currency: true, images: true, storeId: true,
      },
      take: 50,
    });
  }

  // ✨ أقسام الرئيسية الديناميكية — إحصاءات حقيقية + الأكثر مبيعاً + الصاعدة + الجديد
  @Get('home/spotlight')
  @Header('Cache-Control', 'public, max-age=45, stale-while-revalidate=90')
  homeSpotlight() {
    return this.cache.wrap('pub:spotlight', 60, () => this.buildSpotlight());
  }

  private async buildSpotlight() {
    const since14 = new Date(Date.now() - 14 * 86400000);
    const productSelect = {
      id: true, name: true, price: true, salePrice: true, currency: true, images: true,
      store: { select: { name: true, slug: true, isVerified: true } },
    } as const;

    const [storesCount, productsCount, ordersCount, recentItems, newest, risingGroups] = await Promise.all([
      this.prisma.store.count({ where: { status: 'active', isListed: true } }),
      this.prisma.product.count({ where: { isActive: true, store: { status: 'active' } } }),
      this.prisma.order.count({ where: { status: { in: ['delivered', 'completed'] } } }),
      this.prisma.orderItem.findMany({
        where: { order: { createdAt: { gte: since14 }, status: { notIn: ['cancelled', 'refunded'] } } },
        select: { productId: true, qty: true },
      }),
      this.prisma.product.findMany({
        where: { isActive: true, store: { status: 'active' } },
        select: productSelect, orderBy: { createdAt: 'desc' }, take: 8,
      }),
      this.prisma.order.groupBy({
        by: ['storeId'],
        where: { createdAt: { gte: since14 }, status: { notIn: ['cancelled', 'refunded'] } },
        _count: { _all: true },
      }),
    ]);

    // 🔥 الأكثر مبيعاً آخر 14 يوماً — من أصناف الطلبات الفعلية
    const sold = new Map<string, number>();
    for (const it of recentItems) sold.set(it.productId, (sold.get(it.productId) || 0) + it.qty);
    const topIds = [...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
    // 🎖️ الأكثر مبيعاً — للمتاجر الموثقة فقط
    const trendingRaw = topIds.length
      ? await this.prisma.product.findMany({ where: { id: { in: topIds }, isActive: true, store: { status: 'active', isVerified: true } }, select: productSelect })
      : [];
    const trending = topIds
      .map((id) => trendingRaw.find((p) => p.id === id))
      .filter(Boolean)
      .map((p: any) => ({ ...p, sold: sold.get(p.id) || 0 }));

    // 📈 المتاجر الصاعدة — الأكثر طلبات آخر 14 يوماً
    const risingIds = risingGroups.sort((a, b) => b._count._all - a._count._all).slice(0, 6);
    const risingRaw = risingIds.length
      ? await this.prisma.store.findMany({
          where: { id: { in: risingIds.map((r) => r.storeId) }, status: 'active', isListed: true },
          select: {
            id: true, name: true, slug: true, logo: true, governorate: true,
            ratingAvg: true, isVerified: true, type: { select: { nameAr: true, icon: true } },
          },
        })
      : [];
    const rising = risingIds
      .map((r) => {
        const s = risingRaw.find((x) => x.id === r.storeId);
        return s ? { ...s, orders: r._count._all } : null;
      })
      .filter(Boolean);

    return {
      stats: { stores: storesCount, products: productsCount, orders: ordersCount },
      trending, rising, newest,
    };
  }

  // 🔍 صفحة الاستكشاف — فلاتر متعددة على كل منتجات المنصة + فرز ذكي + ترقيم
  @Get('explore')
  @Header('Cache-Control', 'public, max-age=20, stale-while-revalidate=40')
  async explore(@Query() q: any) {
    const key = `pub:explore:${JSON.stringify(q || {})}`;
    return this.cache.wrap(key, 30, () => this.buildExplore(q));
  }

  private async buildExplore(q: any) {
    const page = Math.max(Number(q.page) || 1, 1);
    const take = 24;
    const term = (q.q || '').trim().slice(0, 60);
    const minPrice = Number(q.minPrice) || null;
    const maxPrice = Number(q.maxPrice) || null;

    // فلتر السعر على السعر الفعلي (المخفّض إن وُجد)
    const priceFilter = (minPrice || maxPrice) ? {
      OR: [
        { salePrice: { ...(minPrice ? { gte: minPrice } : {}), ...(maxPrice ? { lte: maxPrice } : {}) } },
        { AND: [{ salePrice: null }, { price: { ...(minPrice ? { gte: minPrice } : {}), ...(maxPrice ? { lte: maxPrice } : {}) } }] },
      ],
    } : {};

    const where: any = {
      isActive: true,
      // 🎖️ الاستكشاف للمتاجر الموثقة فقط — جودة مضمونة للزائر
      store: {
        status: 'active',
        isVerified: true,
        ...(q.governorate ? { governorate: q.governorate } : {}),
        ...(q.type ? { typeId: q.type } : {}),
        ...(Number(q.minRating) ? { ratingAvg: { gte: Number(q.minRating) } } : {}),
      },
      ...(term ? { name: { contains: term, mode: 'insensitive' } } : {}),
      ...(q.sale === '1' ? { salePrice: { not: null } } : {}),
      ...priceFilter,
    };

    const orderBy: any =
      q.sort === 'price_asc' ? [{ salePrice: 'asc' }, { price: 'asc' }] :
      q.sort === 'price_desc' ? [{ price: 'desc' }] :
      q.sort === 'rating' ? [{ store: { ratingAvg: 'desc' } }] :
      q.sort === 'popular' ? [{ viewsCount: 'desc' }] :
      [{ createdAt: 'desc' }];

    const [items, total, govFacets, types, priceMax] = await Promise.all([
      this.prisma.product.findMany({
        where, orderBy, skip: (page - 1) * take, take,
        select: {
          id: true, name: true, price: true, salePrice: true, currency: true, images: true, stock: true,
          store: { select: { name: true, slug: true, isVerified: true, ratingAvg: true, governorate: true } },
        },
      }),
      this.prisma.product.count({ where }),
      this.prisma.store.findMany({ where: { status: 'active', isVerified: true, governorate: { not: null } }, select: { governorate: true }, distinct: ['governorate'] }),
      this.prisma.storeType.findMany({ where: { isActive: true }, select: { id: true, nameAr: true, icon: true } }),
      this.prisma.product.aggregate({ _max: { price: true }, where: { isActive: true } }),
    ]);

    return {
      items, total, pages: Math.ceil(total / take), page,
      facets: {
        governorates: govFacets.map((g) => g.governorate).filter(Boolean).sort(),
        types,
        maxPrice: Number(priceMax._max.price || 0),
      },
    };
  }

  // 🔥 صفحة العروض — كل المنتجات المخفّضة مرتبة بنسبة الخصم
  @Get('offers')
  @Header('Cache-Control', 'public, max-age=45, stale-while-revalidate=90')
  offers() {
    return this.cache.wrap('pub:offers', 60, () => this.buildOffers());
  }

  private async buildOffers() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, salePrice: { not: null }, store: { status: 'active' } },
      select: {
        id: true, name: true, price: true, salePrice: true, currency: true, images: true, stock: true, createdAt: true,
        store: { select: { name: true, slug: true, isVerified: true, governorate: true } },
      },
      take: 150,
    });
    const items = products
      .filter((p) => Number(p.salePrice) < Number(p.price))
      .map((p) => ({ ...p, discount: Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) }))
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 60);
    return {
      items,
      stats: { count: items.length, maxDiscount: items[0]?.discount || 0 },
    };
  }

  // ⚖️ مقارنة منتجات جنباً إلى جنب — حتى 4 منتجات
  @Get('compare')
  async compare(@Query('ids') ids?: string) {
    const list = String(ids || '').split(',').filter(Boolean).slice(0, 4);
    if (!list.length) return { items: [] };
    const items = await this.prisma.product.findMany({
      where: { id: { in: list } },
      select: {
        id: true, name: true, description: true, price: true, salePrice: true,
        currency: true, images: true, stock: true, viewsCount: true,
        category: { select: { name: true } },
        store: { select: { name: true, slug: true, isVerified: true, ratingAvg: true, ratingCount: true, governorate: true } },
      },
    });
    // الحفاظ على ترتيب المستخدم
    return { items: list.map((id) => items.find((p) => p.id === id)).filter(Boolean) };
  }

  // 💬 آراء حقيقية — أحدث تقييمات 5 نجوم معتمدة بتعليق نصي (شريط الثقة)
  @Get('home/testimonials')
  @Header('Cache-Control', 'public, max-age=90, stale-while-revalidate=180')
  testimonials() {
    return this.cache.wrap('pub:testimonials', 120, () => this.buildTestimonials());
  }

  private async buildTestimonials() {
    const reviews = await this.prisma.review.findMany({
      where: {
        rating: { gte: 4 }, isApproved: true,
        comment: { not: null }, storeId: { not: null },
      },
      include: {
        store: { select: { name: true, slug: true, isVerified: true } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' }, take: 20,
    });
    return reviews
      .filter((r) => (r.comment || '').trim().length > 10)
      .slice(0, 8)
      .map((r) => ({
        id: r.id, rating: r.rating, comment: r.comment!.trim().slice(0, 180),
        author: r.customer?.name || 'عميل',
        store: r.store, createdAt: r.createdAt,
        verified: !!r.orderId, // 🧾 مشترٍ موثّق — قيّم بعد شراء فعلي
      }));
  }

  // ⚡ اقتراحات البحث الفورية — خفيفة وسريعة أثناء الكتابة
  @Get('search/suggest')
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
  searchSuggest(@Query('q') q?: string) {
    const term = (q || '').trim().slice(0, 60);
    if (term.length < 2) return { q: term, stores: [], products: [] };
    return this.cache.wrap(`pub:suggest:${term}`, 60, () => this.buildSuggest(term));
  }

  private async buildSuggest(term: string) {
    if (term.length < 2) return { q: term, stores: [], products: [] };
    const [stores, products] = await Promise.all([
      this.prisma.store.findMany({
        where: { status: 'active', name: { contains: term, mode: 'insensitive' } },
        select: { id: true, name: true, slug: true, logo: true, isVerified: true, type: { select: { icon: true } } },
        take: 4,
      }),
      this.prisma.product.findMany({
        where: { isActive: true, store: { status: 'active' }, name: { contains: term, mode: 'insensitive' } },
        select: {
          id: true, name: true, price: true, salePrice: true, images: true,
          store: { select: { slug: true } },
        },
        take: 6,
      }),
    ]);
    return { q: term, stores, products };
  }

  // 🗂️ دليل المتاجر — فلاتر (محافظة/نوع/موثق/بحث) + فرز + عدّادات الفلاتر
  @Get('directory')
  @Header('Cache-Control', 'public, max-age=20, stale-while-revalidate=40')
  directory(
    @Query('governorate') gov?: string,
    @Query('type') typeId?: string,
    @Query('verified') verified?: string,
    @Query('sort') sort?: string,
    @Query('q') q?: string,
  ) {
    const key = `pub:directory:${gov || ''}:${typeId || ''}:${verified || ''}:${sort || ''}:${q || ''}`;
    return this.cache.wrap(key, 30, () => this.buildDirectory(gov, typeId, verified, sort, q));
  }

  private async buildDirectory(gov?: string, typeId?: string, verified?: string, sort?: string, q?: string) {
    const where: any = {
      status: 'active',
      isListed: true, // 🗂️ لا يظهر في الدليل إلا من وافقت الإدارة على إدراجه
      ...(gov ? { governorate: gov } : {}),
      ...(typeId ? { typeId } : {}),
      ...(verified === '1' ? { isVerified: true } : {}),
      ...(q ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { keywords: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    };
    const orderBy: any =
      sort === 'rating' ? [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }] :
      sort === 'popular' ? [{ viewsCount: 'desc' }, { likesCount: 'desc' }] :
      sort === 'oldest' ? { createdAt: 'asc' } :
      [{ isVerified: 'desc' }, { smartScore: 'desc' }, { createdAt: 'desc' }];

    const [stores, govFacets, typeFacets] = await Promise.all([
      this.prisma.store.findMany({
        where,
        select: {
          id: true, name: true, slug: true, logo: true, cover: true,
          description: true, governorate: true, city: true,
          ratingAvg: true, ratingCount: true, smartScore: true,
          isVerified: true, isFeatured: true, likesCount: true, viewsCount: true,
          createdAt: true,
          type: { select: { id: true, nameAr: true, icon: true } },
          _count: { select: { products: { where: { isActive: true } } } },
        },
        orderBy,
        take: 60,
      }),
      this.prisma.store.groupBy({ by: ['governorate'], where: { status: 'active', isListed: true, governorate: { not: null } }, _count: { _all: true } }),
      this.prisma.store.groupBy({ by: ['typeId'], where: { status: 'active', isListed: true }, _count: { _all: true } }),
    ]);

    const types = await this.prisma.storeType.findMany({ where: { isActive: true }, select: { id: true, nameAr: true, icon: true } });
    const typeCount = Object.fromEntries(typeFacets.map((t) => [t.typeId, t._count._all]));

    return {
      total: stores.length,
      stores: stores.map(({ _count, ...s }) => ({ ...s, productsCount: _count.products })),
      facets: {
        governorates: govFacets
          .filter((g) => g.governorate)
          .map((g) => ({ name: g.governorate, count: g._count._all }))
          .sort((a, b) => b.count - a.count),
        types: types.map((t) => ({ ...t, count: typeCount[t.id] || 0 })),
      },
    };
  }

  // 🔎 بحث موحد: متاجر + منتجات — يُسجَّل الاستعلام للإحصاءات المحلية
  @Get('search')
  async search(@Query('q') q?: string) {
    const term = (q || '').trim().slice(0, 100);
    if (term.length < 2) return { q: term, stores: [], products: [] };

    const [stores, products] = await Promise.all([
      this.prisma.store.findMany({
        where: {
          status: 'active',
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { keywords: { contains: term, mode: 'insensitive' } },
            { city: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true, name: true, slug: true, logo: true, description: true,
          governorate: true, ratingAvg: true, ratingCount: true,
          isVerified: true, isFeatured: true,
          type: { select: { nameAr: true, icon: true } },
        },
        orderBy: [{ isVerified: 'desc' }, { smartScore: 'desc' }],
        take: 12,
      }),
      this.prisma.product.findMany({
        where: {
          isActive: true,
          store: { status: 'active' },
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true, name: true, price: true, salePrice: true, currency: true,
          images: true, storeId: true,
          store: { select: { name: true, slug: true, isVerified: true } },
        },
        orderBy: { viewsCount: 'desc' },
        take: 24,
      }),
    ]);

    // 📊 تسجيل الاستعلام (بدون انتظار — لا يؤخر الرد)
    this.prisma.searchQuery.create({
      data: { term, resultsCount: stores.length + products.length },
    }).catch(() => {});

    return { q: term, stores, products };
  }

  @Get('plans')
  @Header('Cache-Control', 'public, max-age=300')
  plans() {
    return this.cache.wrap('pub:plans', 300, () =>
      this.prisma.plan.findMany({ where: { isActive: true }, orderBy: { sort: 'asc' } }));
  }

  @Get('governorates')
  @Header('Cache-Control', 'public, max-age=300')
  governorates() {
    return this.cache.wrap('pub:governorates', 300, () =>
      this.prisma.governorate.findMany({ where: { isActive: true }, orderBy: { sort: 'asc' } }));
  }

  @Get('currencies')
  @Header('Cache-Control', 'public, max-age=300')
  currencies() {
    return this.cache.wrap('pub:currencies', 300, () =>
      this.prisma.currency.findMany({ where: { isActive: true } }));
  }

  @Get('store-types')
  @Header('Cache-Control', 'public, max-age=300')
  storeTypes() {
    return this.cache.wrap('pub:store-types', 300, () =>
      this.prisma.storeType.findMany({ where: { isActive: true } }));
  }

  // 🎁 التحقق من رمز إحالة في صفحة التسجيل — يعيد اسم صاحب الدعوة فقط
  @Get('referral/check')
  async referralCheck(@Query('code') code?: string) {
    const c = (code || '').trim();
    if (!c) return { valid: false };
    const referrer = await this.prisma.customer.findUnique({
      where: { referralCode: c },
      select: { name: true },
    });
    return referrer ? { valid: true, name: referrer.name } : { valid: false };
  }

  // 🌐 تحويل نطاق مخصص إلى متجر — يستخدمه middleware الواجهة لتوجيه النطاقات الحقيقية
  @Get('resolve-domain')
  @Header('Cache-Control', 'public, max-age=300')
  async resolveDomain(@Query('host') host?: string) {
    const h = (host || '').trim().toLowerCase().replace(/^www\./, '');
    if (!h || h.length > 253) return { slug: null };
    return this.cache.wrap(`pub:domain:${h}`, 300, () => this.buildResolveDomain(h));
  }

  private async buildResolveDomain(h: string) {
    const store = await this.prisma.store.findFirst({
      where: { customDomain: h, customDomainStatus: 'approved', status: 'active' },
      select: { slug: true, name: true },
    });
    return { slug: store?.slug || null };
  }
}
