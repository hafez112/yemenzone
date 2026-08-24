import { Controller, Get, Param, Query, NotFoundException, Header } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductAiService } from '../products/product-ai.service';
import { CacheService } from '../../common/cache.service';
import { levelOf } from '../../common/seller-levels';
import { effectiveFeatures } from '../../common/features';

// واجهة المتجر العامة: /api/v1/storefront/:slug
// ⚡ الجلسة 6: كاش قصير الأمد (Redis أو ذاكرة) — أثقل نقطة عامة في المنصة
@Controller('v1/storefront')
export class StorefrontController {
  constructor(
    private prisma: PrismaService,
    private ai: ProductAiService,
    private cache: CacheService,
  ) {}

  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=20, stale-while-revalidate=40')
  async storefront(@Param('slug') slug: string) {
    // عدّاد المشاهدات يعمل مع كل طلب (حتى المخزّنة) — تحديث مباشر بلا جلب
    this.prisma.store.updateMany({ where: { slug }, data: { viewsCount: { increment: 1 } } }).catch(() => {});
    return this.cache.wrap(`sf:${slug}`, 30, () => this.buildStorefront(slug));
  }

  private async buildStorefront(slug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug },
      include: {
        type: true,
        categories: {
          include: {
            products: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { sort: 'asc' },
        },
        products: {
          where: { isActive: true, categoryId: null },
          orderBy: { createdAt: 'desc' },
        },
        rentalUnits: { where: { isActive: true, isHidden: false } },
        rooms: { where: { isActive: true, isHidden: false } },
        services: { where: { isActive: true, isHidden: false } },
        reviews: {
          where: { isApproved: true, productId: null },
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 6,
        },
        subscription: { include: { plan: true } },
        // 💳🚚 طرق الدفع والتوصيل النشطة — تظهر للعميل عند إتمام الطلب
        paymentMethods: {
          where: { isActive: true },
          orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
        },
        deliveryMethods: {
          where: { isActive: true },
          orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
        },
        _count: { select: { products: true } },
      },
    });

    if (!store || store.status !== 'active') {
      throw new NotFoundException('المتجر غير موجود');
    }

    // 🏅 مستوى البائع — يظهر بجانب اسم المتجر للزوار
    const deliveredOrders = await this.prisma.order.count({
      where: { storeId: store.id, status: 'delivered' },
    });
    const { level } = levelOf(deliveredOrders);

    // 🤖 ترتيب ذكي للمنتجات داخل كل صنف
    const categories = store.categories
      .map(c => ({ ...c, products: this.ai.sortProductsSmart(c.products) }))
      .filter(c => c.products.length > 0);

    const features = effectiveFeatures(store);
    const kind = (store.type as any)?.kind || 'products';

    // 🏬 حمولة الواجهة الغنية: شجرة الأصناف + الأجنحة (متميزة/مبيعات/جديد/عروض)
    // للمولات ومتاجر المنتجات معاً — تُشغّل صفحات الأصناف والأقسام والعرض المبتكر
    let mall: any = undefined;
    if (kind === 'malls' || kind === 'products') {
      const allCats = store.categories.map((c: any) => ({
        ...c,
        products: this.ai.sortProductsSmart(c.products),
      }));
      const tops = allCats.filter((c: any) => !c.parentId);
      const kidsOf = (pid: string) => allCats.filter((c: any) => c.parentId === pid);
      const categoriesTree = tops.map((t: any) => ({
        id: t.id, name: t.name, image: t.image, sort: t.sort,
        productsCount: t.products.length + kidsOf(t.id).reduce((s: number, k: any) => s + k.products.length, 0),
        children: kidsOf(t.id).map((k: any) => ({ id: k.id, name: k.name, image: k.image, sort: k.sort, productsCount: k.products.length })),
      }));

      const allProducts = allCats.flatMap((c: any) => c.products).concat(
        this.ai.sortProductsSmart(store.products),
      );
      const uniq = new Map<string, any>();
      for (const p of allProducts) if (!uniq.has(p.id)) uniq.set(p.id, p);
      const pool = [...uniq.values()];

      // 🔥 الأكثر مبيعاً — من بنود الطلبات الفعلية
      const since90 = new Date(Date.now() - 90 * 86400000);
      const topItems = await this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { storeId: store.id, createdAt: { gte: since90 }, status: { notIn: ['cancelled', 'refunded'] } } },
        _sum: { qty: true },
        orderBy: { _sum: { qty: 'desc' } },
        take: 12,
      });
      const topIds = topItems.filter((t) => (t._sum.qty || 0) > 0).map((t) => t.productId);
      const topSellers = topIds.length
        ? (await this.prisma.product.findMany({ where: { id: { in: topIds }, isActive: true } }))
            .sort((a, b) => topIds.indexOf(a.id) - topIds.indexOf(b.id))
        : [];

      mall = {
        categoriesTree,
        featured: pool.filter((p) => p.isFeatured).slice(0, 12),
        topSellers: topSellers.slice(0, 12),
        newArrivals: [...pool].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 12),
        offers: pool.filter((p) => p.salePrice != null && Number(p.salePrice) < Number(p.price))
          .sort((a, b) => (1 - Number(b.salePrice) / Number(b.price)) - (1 - Number(a.salePrice) / Number(a.price)))
          .slice(0, 12),
      };
    }

    // 📱 تطبيق المتجر (PWA) — خدمة مدفوعة تُشترى ببطاقة يمن زون وتفتح فوراً (ليست ميزة خطة)
    const appBought = await this.prisma.toolPurchase.findUnique({
      where: { ownerType_ownerId_slug: { ownerType: 'seller', ownerId: store.sellerId, slug: 'store-app' } },
      select: { id: true },
    });

    return {
      ...store,
      subscription: undefined, // لا نرسل تفاصيل الاشتراك للزوار — الميزات فقط
      sellerLevel: level,
      features: { pwa: !!features.pwa || !!appBought, storeAds: !!features.storeAds },
      categories,
      uncategorized: this.ai.sortProductsSmart(store.products),
      mall,
      // الردود المخفية بقرار الإدارة لا تظهر للزوار
      reviews: store.reviews.map((r: any) => ({ ...r, reply: r.replyHidden ? null : r.reply })),
    };
  }

  // ═══ 🏬 أقسام المول — صفحات كاملة بترقيم حقيقي ═══

  // قسم: featured | top | new | offers
  @Get(':slug/mall/section/:section')
  @Header('Cache-Control', 'public, max-age=20, stale-while-revalidate=40')
  async mallSection(
    @Param('slug') slug: string,
    @Param('section') section: string,
    @Query('page') page?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    return this.cache.wrap(`sf:${slug}:m:${section}:${p}`, 30, () => this.buildMallSection(slug, section, p));
  }

  private async mallStore(slug: string) {
    const store = await this.prisma.store.findUnique({ where: { slug }, include: { type: true } });
    if (!store || store.status !== 'active') throw new NotFoundException('المول غير موجود');
    return store;
  }

  private async buildMallSection(slug: string, section: string, page: number) {
    const store = await this.mallStore(slug);
    const take = 24;
    const skip = (page - 1) * take;
    const base = { storeId: store.id, isActive: true };

    if (section === 'top') {
      // 🔥 الأكثر مبيعاً — ترتيب من بنود الطلبات الفعلية
      const top = await this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { storeId: store.id, status: { notIn: ['cancelled', 'refunded'] } } },
        _sum: { qty: true },
        orderBy: { _sum: { qty: 'desc' } },
        take: 200,
      });
      const ids = top.filter((t) => (t._sum.qty || 0) > 0).map((t) => t.productId);
      const items = await this.prisma.product.findMany({
        where: { ...base, id: { in: ids.slice(skip, skip + take) } },
        include: { category: { select: { id: true, name: true, parentId: true } } },
      });
      const order = ids.slice(skip, skip + take);
      items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      return { store: { name: store.name, slug: store.slug }, section, page, total: ids.length, items };
    }

    const where: any =
      section === 'featured' ? { ...base, isFeatured: true } :
      section === 'offers' ? { ...base, salePrice: { not: null } } :
      section === 'new' ? { ...base, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } :
      null;
    if (!where) throw new NotFoundException('القسم غير موجود');
    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true, parentId: true } } },
        orderBy: section === 'offers' ? { updatedAt: 'desc' } : { createdAt: 'desc' },
        skip, take,
      }),
    ]);
    return { store: { name: store.name, slug: store.slug }, section, page, total, items };
  }

  // صفحة صنف: بياناته + فروعه + منتجاته (ومنتجات فروعه) بترقيم
  @Get(':slug/mall/category/:categoryId')
  @Header('Cache-Control', 'public, max-age=20, stale-while-revalidate=40')
  async mallCategory(
    @Param('slug') slug: string,
    @Param('categoryId') categoryId: string,
    @Query('page') page?: string,
    @Query('sub') sub?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    return this.cache.wrap(`sf:${slug}:mc:${categoryId}:${sub || ''}:${p}`, 30, () => this.buildMallCategory(slug, categoryId, p, sub));
  }

  private async buildMallCategory(slug: string, categoryId: string, page: number, sub?: string) {
    const store = await this.mallStore(slug);
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, storeId: store.id },
      include: {
        parent: { select: { id: true, name: true } },
        children: { orderBy: { sort: 'asc' }, include: { _count: { select: { products: true } } } },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundException('الصنف غير موجود');

    // عرض صنف فرعي محدد أو الصنف مع كل فروعه
    const catIds = sub && category.children.some((c) => c.id === sub)
      ? [sub]
      : [category.id, ...category.children.map((c) => c.id)];
    const take = 24;
    const skip = (page - 1) * take;
    const where = { storeId: store.id, isActive: true, categoryId: { in: catIds } };
    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true, parentId: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take,
      }),
    ]);
    return {
      store: { name: store.name, slug: store.slug },
      category: {
        id: category.id, name: category.name, image: category.image,
        parent: category.parent,
        children: category.children.map((c) => ({ id: c.id, name: c.name, image: c.image, productsCount: c._count.products })),
        productsCount: category._count.products,
      },
      activeSub: sub || null,
      page, total, items,
    };
  }

  // تفاصيل منتج داخل المتجر + منتجات مشابهة (ذكاء محلي: نفس الصنف)
  @Get(':slug/product/:id')
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
  async product(@Param('slug') slug: string, @Param('id') id: string) {
    // عدّاد مشاهدات المنتج — مع كل طلب حتى المخزّنة
    this.prisma.product.updateMany({ where: { id }, data: { viewsCount: { increment: 1 } } }).catch(() => {});
    return this.cache.wrap(`sf:${slug}:p:${id}`, 60, () => this.buildProduct(slug, id));
  }

  private async buildProduct(slug: string, id: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug },
      include: { type: true },
    });
    if (!store || store.status !== 'active') throw new NotFoundException('المتجر غير موجود');

    const product = await this.prisma.product.findFirst({
      where: { id, storeId: store.id, isActive: true },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) throw new NotFoundException('المنتج غير موجود');

    // 🤖 منتجات مشابهة: نفس الصنف، مرتبة ذكياً
    const similar = product.categoryId
      ? this.ai.sortProductsSmart(await this.prisma.product.findMany({
          where: { storeId: store.id, categoryId: product.categoryId, isActive: true, id: { not: id } },
          take: 4,
        }))
      : [];

    // 🏅 شارات الثقة الذكية — محسوبة من بيانات البيع والتسليم الفعلية
    const since30 = new Date(Date.now() - 30 * 86400000);
    const badges: { icon: string; label: string }[] = [];

    // 🔥 الأكثر مبيعاً في متجره (ضمن أول 3 آخر 30 يوماً)
    const topItems = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { storeId: store.id, createdAt: { gte: since30 }, status: { notIn: ['cancelled', 'refunded'] } } },
      _sum: { qty: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: 3,
    });
    if (topItems.some((t) => t.productId === id && (t._sum.qty || 0) > 0)) {
      badges.push({ icon: '🔥', label: 'الأكثر مبيعاً في متجره' });
    }

    // ⚡ شحن سريع — متوسط تسليم المتجر الفعلي أقل من 30 ساعة
    const delivered = await this.prisma.order.findMany({
      where: { storeId: store.id, status: { in: ['delivered', 'completed'] } },
      select: { createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }, take: 10,
    });
    if (delivered.length >= 2) {
      const avgH = delivered.reduce((s, o) => s + (o.updatedAt.getTime() - o.createdAt.getTime()) / 3600000, 0) / delivered.length;
      if (avgH <= 30) badges.push({ icon: '⚡', label: `شحن سريع — يصل خلال ${Math.max(Math.round(avgH), 1)} ساعة وسطياً` });
    }

    // 🆕 وصل حديثاً — أضيف خلال 14 يوماً
    if (Date.now() - product.createdAt.getTime() < 14 * 86400000) {
      badges.push({ icon: '🆕', label: 'وصل حديثاً' });
    }

    return { store, product: { ...product, badges }, similar };
  }
}
