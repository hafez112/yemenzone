import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductAiService } from './product-ai.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingService } from '../messaging/messaging.service';
import { WishlistService } from '../wishlist/wishlist.service';
import { CacheService } from '../../common/cache.service';
import { effectiveFeatures, requireFeature } from '../../common/features';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private ai: ProductAiService,
    private notifications: NotificationsService,
    private messaging: MessagingService,
    private wishlist: WishlistService,
    private cache: CacheService,
  ) {}

  // ⚡ إبطال كاش الواجهة العامة بعد أي تعديل — يرى الزوار التغيير فوراً بدل انتظار انتهاء المدة
  private bustStore(store: { slug: string }, productId?: string) {
    const keys = [`sf:${store.slug}`];
    if (productId) keys.push(`sf:${store.slug}:p:${productId}`);
    this.cache.del(...keys).catch(() => {});
  }

  private async sellerStore(sellerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { sellerId },
      include: { type: true, subscription: { include: { plan: true } } },
    });
    if (!store) throw new NotFoundException('أنشئ متجرك أولاً');
    return store;
  }

  // ═══ الأصناف — البائع يضيف أصناف متجره بنفسه ═══
  async listCategories(sellerId: string) {
    const store = await this.sellerStore(sellerId);
    const categories = await this.prisma.category.findMany({
      where: { storeId: store.id },
      include: { _count: { select: { products: true, children: true } } },
      orderBy: { sort: 'asc' },
    });
    // 🤖 الذكاء المحلي يقترح أصنافاً جديدة
    const activity = (store.themeJson as any)?.category || store.type.kind;
    const suggestions = this.ai.suggestCategories(activity, categories.map(c => c.name));
    return { categories, suggestions, isMall: store.type.kind === 'malls' };
  }

  // 🏬 تحقق صنف أب: نفس المتجر + مستوى واحد فقط (الأب لا يكون فرعياً)
  private async validParent(storeId: string, parentId: string, selfId?: string) {
    if (selfId && parentId === selfId) throw new BadRequestException('الصنف لا يمكن أن يكون فرعياً لنفسه');
    const parent = await this.prisma.category.findFirst({ where: { id: parentId, storeId } });
    if (!parent) throw new NotFoundException('الصنف الرئيسي غير موجود');
    if (parent.parentId) throw new BadRequestException('الأصناف الفرعية تتبع صنفاً رئيسياً فقط — مستوى واحد');
    return parent;
  }

  async createCategory(sellerId: string, body: { name: string; icon?: string; parentId?: string }) {
    const store = await this.sellerStore(sellerId);
    if (!body.name?.trim()) throw new BadRequestException('اسم الصنف مطلوب');
    if (body.parentId) await this.validParent(store.id, body.parentId);
    const created = await this.prisma.category.create({
      data: { storeId: store.id, name: body.name.trim(), parentId: body.parentId || null },
    });
    this.bustStore(store);
    return created;
  }

  async updateCategory(sellerId: string, id: string, body: { name?: string; parentId?: string | null }) {
    const store = await this.sellerStore(sellerId);
    const cat = await this.prisma.category.findFirst({ where: { id, storeId: store.id } });
    if (!cat) throw new NotFoundException('الصنف غير موجود');
    let parentId: string | null | undefined = undefined;
    if (body.parentId !== undefined) {
      if (body.parentId) {
        await this.validParent(store.id, body.parentId, id);
        // صنف له فروع لا يتحول إلى فرعي — انقل فروعه أولاً
        const kids = await this.prisma.category.count({ where: { parentId: id } });
        if (kids > 0) throw new BadRequestException('هذا الصنف له أصناف فرعية — لا يمكن جعله فرعياً');
        parentId = body.parentId;
      } else parentId = null;
    }
    const updated = await this.prisma.category.update({
      where: { id },
      data: { name: body.name?.trim() || undefined, parentId },
    });
    this.bustStore(store);
    return updated;
  }

  async deleteCategory(sellerId: string, id: string) {
    const store = await this.sellerStore(sellerId);
    const cat = await this.prisma.category.findFirst({ where: { id, storeId: store.id } });
    if (!cat) throw new NotFoundException('الصنف غير موجود');
    // المنتجات تبقى لكن بلا صنف
    await this.prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    // 🏬 حذف صنف رئيسي → أصنافه الفرعية تصبح رئيسية (لا تُحذف)
    await this.prisma.category.updateMany({ where: { parentId: id }, data: { parentId: null } });
    const deleted = await this.prisma.category.delete({ where: { id } });
    this.bustStore(store);
    return deleted;
  }

  // ═══ المنتجات ═══

  // 🏷️ تعقيم مميزات المنتج: [{key, value}] — نصوص قصيرة فقط، بحد أقصى 30 ميزة
  private sanitizeFeatures(input: any): { key: string; value: string }[] | null {
    if (!Array.isArray(input)) return null;
    const out = input
      .map((f: any) => ({ key: String(f?.key || '').trim().slice(0, 40), value: String(f?.value || '').trim().slice(0, 120) }))
      .filter((f: any) => f.key && f.value)
      .slice(0, 30);
    return out.length ? out : null;
  }

  // 🎨 تعقيم متغيرات المنتج (لون/مقاس/وزن بسعر خاص) — السعر إلزامي لكل متغير
  private sanitizeVariants(input: any): any[] | null {
    if (!Array.isArray(input)) return null;
    const out = input.map((v: any) => {
      const price = Number(v?.price);
      if (!Number.isFinite(price) || price <= 0) return null;
      const sale = v?.salePrice !== undefined && v?.salePrice !== null && v?.salePrice !== '' ? Number(v.salePrice) : null;
      const stock = v?.stock !== undefined && v?.stock !== null && v?.stock !== '' ? Math.max(0, Math.floor(Number(v.stock))) : null;
      return {
        id: String(v?.id || Math.random().toString(36).slice(2, 10)),
        color: String(v?.color || '').trim().slice(0, 30) || null,
        colorHex: /^#[0-9a-fA-F]{6}$/.test(v?.colorHex || '') ? v.colorHex : null,
        size: String(v?.size || '').trim().slice(0, 40) || null,
        price,
        salePrice: sale && sale > 0 && sale < price ? sale : null,
        stock: stock !== null && Number.isFinite(stock) ? stock : null,
        sku: String(v?.sku || '').trim().slice(0, 40) || null,
      };
    }).filter(Boolean).slice(0, 50);
    return out.length ? out : null;
  }

  async listProducts(sellerId: string) {
    const store = await this.sellerStore(sellerId);
    const products = await this.prisma.product.findMany({
      where: { storeId: store.id },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    // 🤖 نصائح مخزون ذكية لكل منتج
    return products.map(p => ({ ...p, stockAdvice: this.ai.stockAdvice(p.stock) }));
  }

  async createProduct(sellerId: string, body: any) {
    const store = await this.sellerStore(sellerId);
    // حدود الخطة الفعالة — تحترم انتهاء الاشتراك ومنح الإدارة (نظام الميزات المركزي)
    const feats = effectiveFeatures(store);
    const max = Number(feats.maxProducts ?? 20);
    if (max !== -1) {
      const count = await this.prisma.product.count({ where: { storeId: store.id } });
      if (count >= max) throw new ForbiddenException({ message: `خطتك تسمح بـ ${max} منتجاً فقط — رقِّ خطتك`, featureCode: 'maxProducts', locked: true });
    }
    const maxImgs = Number(feats.maxImages ?? 3);
    if (Array.isArray(body.images) && body.images.length > maxImgs) {
      throw new ForbiddenException({ message: `خطتك تسمح بـ ${maxImgs} صور لكل منتج — رقِّ خطتك`, featureCode: 'maxImages', locked: true });
    }
    if (!body.name?.trim()) throw new BadRequestException('اسم المنتج مطلوب');
    if (!body.price || Number(body.price) <= 0) throw new BadRequestException('السعر مطلوب');

    // 🎨 المتغيرات — عند وجودها يُحسب المخزون الكلي من مجموع مخزونها
    const variants = this.sanitizeVariants(body.variants);
    const features = this.sanitizeFeatures(body.features);
    const variantStock = variants?.every((v) => v.stock !== null)
      ? variants.reduce((s, v) => s + (v.stock || 0), 0)
      : null;

    // 🤖 تحسين الاسم + توليد وصف إن لم يُدخل + اقتراح سعر تخفيض
    const enhanced = this.ai.enhanceName(body.name);
    const category = body.categoryId
      ? await this.prisma.category.findUnique({ where: { id: body.categoryId } })
      : null;

    const created = await this.prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: body.categoryId || null,
        name: enhanced,
        description: body.description?.trim() || this.ai.generateDescription(enhanced, category?.name),
        // 🏬 حقول المول: وصف مختصر + كلمات مفتاحية + SEO + تمييز
        shortDesc: String(body.shortDesc || '').trim().slice(0, 200) || null,
        keywords: String(body.keywords || '').trim().slice(0, 300) || null,
        metaTitle: String(body.metaTitle || '').trim().slice(0, 120) || null,
        metaDesc: String(body.metaDesc || '').trim().slice(0, 200) || null,
        isFeatured: !!body.isFeatured,
        price: Number(body.price),
        salePrice: body.salePrice ? Number(body.salePrice) : null,
        stock: variantStock ?? Number(body.stock ?? 0),
        lowStockAt: body.lowStockAt !== undefined ? Math.max(0, Number(body.lowStockAt)) : 5,
        sku: String(body.sku || '').trim().slice(0, 60) || null,
        barcode: String(body.barcode || '').trim().slice(0, 60) || null,
        // 🧬 نوع المنتج الفرعي ومواصفاته المنظمة حسب النوع
        productKind: String(body.productKind || '').trim().slice(0, 30) || null,
        specs: body.specs && typeof body.specs === 'object' ? body.specs : undefined,
        features: features ?? undefined,
        variants: variants ?? undefined,
        images: body.images || [],
      },
    });
    this.bustStore(store);
    return created;
  }

  async updateProduct(sellerId: string, id: string, body: any) {
    const store = await this.sellerStore(sellerId);
    const product = await this.prisma.product.findFirst({ where: { id, storeId: store.id } });
    if (!product) throw new NotFoundException('المنتج غير موجود');
    // المخزون الجديد والحد الجديد بعد هذا التحديث
    const nextStock = body.stock !== undefined ? Number(body.stock) : product.stock;
    const nextThreshold = body.lowStockAt !== undefined ? Math.max(0, Number(body.lowStockAt)) : product.lowStockAt;
    // إعادة التخزين فوق الحد → تصفير التنبيه ليعمل مجدداً عند الانخفاض القادم
    const resetAlert = nextStock > nextThreshold ? null : undefined;

    // 🔔 «أعلمني بالتوفر» — المنتج عاد للمخزون من الصفر → أخبر كل المنتظرين
    if (product.stock <= 0 && nextStock > 0) {
      this.notifyBackInStock(product.id, product.name, store.slug).catch(() => {});
    }

    // 🎨 المتغيرات/المميزات — تُحدَّث فقط عند إرسالها
    const variants = body.variants !== undefined ? this.sanitizeVariants(body.variants) : undefined;
    const features = body.features !== undefined ? this.sanitizeFeatures(body.features) : undefined;
    // مخزون المحسوب من المتغيرات يتقدم على الحقل اليدوي عند اكتمال مخزونها
    const variantStock = variants?.length && variants.every((v: any) => v.stock !== null)
      ? variants.reduce((s: number, v: any) => s + (v.stock || 0), 0)
      : undefined;

    // 💸 اكتشاف انخفاض السعر الفعلي — لتنبيه أصحاب المفضلة بعد الحفظ
    const oldEffective = Number(product.salePrice ?? product.price);
    const nextPrice = body.price ? Number(body.price) : Number(product.price);
    const nextSale = body.salePrice !== undefined ? (body.salePrice ? Number(body.salePrice) : null) : (product.salePrice != null ? Number(product.salePrice) : null);
    const newEffective = nextSale ?? nextPrice;
    const priceDropped = newEffective < oldEffective;

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: body.name ? this.ai.enhanceName(body.name) : undefined,
        description: body.description,
        // 🏬 حقول المول
        shortDesc: body.shortDesc !== undefined ? String(body.shortDesc || '').trim().slice(0, 200) || null : undefined,
        keywords: body.keywords !== undefined ? String(body.keywords || '').trim().slice(0, 300) || null : undefined,
        metaTitle: body.metaTitle !== undefined ? String(body.metaTitle || '').trim().slice(0, 120) || null : undefined,
        metaDesc: body.metaDesc !== undefined ? String(body.metaDesc || '').trim().slice(0, 200) || null : undefined,
        isFeatured: body.isFeatured !== undefined ? !!body.isFeatured : undefined,
        price: body.price ? Number(body.price) : undefined,
        salePrice: body.salePrice !== undefined ? (body.salePrice ? Number(body.salePrice) : null) : undefined,
        stock: variantStock ?? (body.stock !== undefined ? Number(body.stock) : undefined),
        lowStockAt: body.lowStockAt !== undefined ? Math.max(0, Number(body.lowStockAt)) : undefined,
        stockAlertedAt: resetAlert,
        categoryId: body.categoryId !== undefined ? body.categoryId || null : undefined,
        sku: body.sku !== undefined ? String(body.sku || '').trim().slice(0, 60) || null : undefined,
        barcode: body.barcode !== undefined ? String(body.barcode || '').trim().slice(0, 60) || null : undefined,
        productKind: body.productKind !== undefined ? String(body.productKind || '').trim().slice(0, 30) || null : undefined,
        specs: body.specs !== undefined ? (body.specs && typeof body.specs === 'object' ? body.specs : Prisma.JsonNull) : undefined,
        features: features === null ? Prisma.JsonNull : features,
        variants: variants === null ? Prisma.JsonNull : variants,
        images: body.images,
        isActive: body.isActive,
      },
    });
    // 💸 انخفض السعر → نبّه من أضافه لمفضلته بسعر أعلى
    if (priceDropped) {
      this.wishlist.notifyPriceDrop(id).catch(() => {});
      this.notifyPriceAlerts(id, updated.name, store.slug, Number(newEffective)).catch(() => {});
    }
    this.bustStore(store, id);
    return updated;
  }

  // 🔔 تنبيه الزوار المشتركين برقم الجوال عند نزول السعر (رسالة نصية/واتساب إن فعّل قالب «price_drop»)
  private async notifyPriceAlerts(productId: string, productName: string, storeSlug: string, newPrice: number) {
    const alerts = await this.prisma.priceAlert.findMany({
      where: { productId, notifiedAt: null, lastPrice: { gt: newPrice } },
    });
    if (!alerts.length) return;
    const link = `${process.env.WEB_URL || 'https://yemenzone1.com'}/store/${storeSlug}/product/${productId}`;
    for (const a of alerts) {
      await this.messaging.send('price_drop', a.phone, {
        name: 'عميلنا', product: productName, price: String(newPrice), link,
      }).catch(() => {});
      await this.prisma.priceAlert.update({ where: { id: a.id }, data: { notifiedAt: new Date(), lastPrice: newPrice } });
    }
  }

  // 🔔 إشعار المنتظرين بعودة منتج — تنبيه داخلي للمسجلين + رسالة للزوار (إن فعّل قالب المراسلة)
  private async notifyBackInStock(productId: string, productName: string, storeSlug: string) {
    const alerts = await this.prisma.stockAlert.findMany({ where: { productId, notifiedAt: null } });
    if (!alerts.length) return;
    const link = `/store/${storeSlug}/product/${productId}`;
    for (const a of alerts) {
      if (a.customerId) {
        await this.notifications.push('customer', a.customerId, {
          icon: '🔔',
          title: `توفّر أخيراً: ${productName}!`,
          body: 'المنتج الذي انتظرته عاد للمخزون — اطلبه قبل النفاد مجدداً',
          link,
        });
      } else {
        // زائر بجوال فقط — رسالة نصية/واتساب إن كانت القناة مفعّلة
        await this.messaging.send('back_in_stock', a.phone, { name: 'عميلنا', product: productName }).catch(() => {});
      }
      await this.prisma.stockAlert.update({ where: { id: a.id }, data: { notifiedAt: new Date() } });
    }
  }

  // 📦 ملخص المخزون الذكي — ميزة مدفوعة (الاحترافية والذهبية)
  async inventory(sellerId: string) {
    const store = await this.sellerStore(sellerId);
    requireFeature(store, 'inventory');
    const products = await this.prisma.product.findMany({
      where: { storeId: store.id, isActive: true },
      select: { id: true, name: true, stock: true, lowStockAt: true, images: true, price: true },
      orderBy: { stock: 'asc' },
    });
    const withStatus = products.map((p) => ({
      ...p,
      status: p.stock <= 0 ? 'out' : p.stock <= p.lowStockAt ? 'low' : 'ok',
    }));
    const out = withStatus.filter((p) => p.status === 'out');
    const low = withStatus.filter((p) => p.status === 'low');
    return {
      summary: { total: products.length, out: out.length, low: low.length, ok: products.length - out.length - low.length },
      attention: [...out, ...low].slice(0, 20), // المنتجات التي تحتاج انتباهاً فورياً
    };
  }

  async deleteProduct(sellerId: string, id: string) {
    const store = await this.sellerStore(sellerId);
    const product = await this.prisma.product.findFirst({ where: { id, storeId: store.id } });
    if (!product) throw new NotFoundException('المنتج غير موجود');
    const deleted = await this.prisma.product.delete({ where: { id } });
    this.bustStore(store, id);
    return deleted;
  }

  // ═══ 🤖 أدوات الذكاء المحلي للبائع ═══
  aiTools(body: { action: string; name?: string; categoryName?: string; price?: number }) {
    switch (body.action) {
      case 'describe':
        return { result: this.ai.generateDescription(body.name || 'المنتج', body.categoryName) };
      case 'enhance-name':
        return { result: this.ai.enhanceName(body.name || '') };
      case 'sale-price':
        return { result: this.ai.suggestSalePrice(Number(body.price)) };
      // 🏬 توليد حقول المول: وصف مختصر + كلمات مفتاحية + عنوان ووصف محرك البحث — محلياً
      case 'seo': {
        const name = (body.name || 'المنتج').trim();
        const cat = (body.categoryName || '').trim();
        const words = [...new Set([...name.split(/\s+/), ...cat.split(/\s+/)].filter(w => w.length > 2))];
        const keywords = [...new Set([name, cat, ...words, 'تسوق أونلاين', 'توصيل سريع', 'اليمن'].filter(Boolean))].join('، ');
        return {
          result: {
            shortDesc: `${name}${cat ? ` — ${cat}` : ''} بجودة مضمونة وسعر منافس`.slice(0, 120),
            keywords: keywords.slice(0, 280),
            metaTitle: `${name}${cat ? ` | ${cat}` : ''} — اطلبه أونلاين`.slice(0, 60),
            metaDesc: `${name}${cat ? ` من قسم ${cat}` : ''} بسعر منافس وجودة مضمونة مع توصيل سريع — اطلبه الآن!`.slice(0, 160),
          },
        };
      }
      default:
        throw new BadRequestException('إجراء غير معروف');
    }
  }

  // ═══ 🏠 رئيسية البائع الذكية — مهام اليوم + نبض مالي + نصيحة يومية (بيانات حقيقية فقط) ═══
  async homeInsights(sellerId: string) {
    const store = await this.sellerStore(sellerId);
    const kind = store.type?.kind || 'products';
    // 🍽️ المطاعم والمولات تسير على محرك المنتجات — المنيو = أصناف، والطلبات طلبات
    const isProductsLike = kind === 'products' || kind === 'restaurants' || kind === 'malls';
    const itemWord = kind === 'restaurants' ? 'صنف' : 'منتج';
    const itemsWord = kind === 'restaurants' ? 'أصناف' : 'منتجات';
    const storeWord = kind === 'restaurants' ? 'مطعمك' : kind === 'malls' ? 'مولك' : 'متجرك';
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 6 * 86400000);
    const since14 = new Date(Date.now() - 14 * 86400000);

    const [pendingOrders, pendingPayRefs, weekOrders, products, payMethods] = await Promise.all([
      this.prisma.order.count({ where: { storeId: store.id, status: 'pending' } }),
      this.prisma.payment.findMany({ where: { status: 'pending', purpose: 'order' }, select: { referenceId: true } }),
      this.prisma.order.findMany({
        where: { storeId: store.id, createdAt: { gte: weekStart }, status: { notIn: ['cancelled', 'refunded'] } },
        select: { total: true, createdAt: true },
      }),
      this.prisma.product.findMany({
        where: { storeId: store.id },
        select: { id: true, name: true, viewsCount: true, stock: true, lowStockAt: true, isActive: true },
      }),
      isProductsLike ? this.prisma.storePaymentMethod.count({ where: { storeId: store.id, isActive: true } }) : Promise.resolve(-1),
    ]);

    // 🧬 إيرادات الأسبوع لأنشطة الحجز — من جداول الحجز الخاصة بكل نشاط (لا علاقة لها بطلبات المنتجات)
    const weekBookings: { total: any; createdAt: Date }[] = isProductsLike ? [] : await (async () => {
      const sel = { total: true as const, createdAt: true as const };
      const base = { createdAt: { gte: weekStart }, status: { notIn: ['cancelled' as any] } };
      if (kind === 'hotel') return this.prisma.roomBooking.findMany({ where: { ...base, room: { storeId: store.id } }, select: sel });
      if (kind === 'rentals') return this.prisma.rentalBooking.findMany({ where: { ...base, unit: { storeId: store.id } }, select: sel });
      return this.prisma.serviceRequest.findMany({ where: { ...base, service: { storeId: store.id } }, select: sel });
    })();

    // 💳 إثباتات دفع تخص طلبات هذا المتجر
    const pendingPayments = pendingPayRefs.length
      ? await this.prisma.order.count({ where: { storeId: store.id, id: { in: pendingPayRefs.map((p) => p.referenceId!) } } })
      : 0;

    // 🔔 مهام اليوم — تتكيف مع نوع المتجر
    const tasks: { icon: string; label: string; count: number; href: string }[] = [];
    let itemsCount = 0;
    if (isProductsLike) {
      const lowStock = products.filter((p) => p.isActive && p.stock > 0 && p.stock <= (p.lowStockAt ?? 5)).length;
      const outStock = products.filter((p) => p.isActive && p.stock <= 0).length;
      if (pendingOrders) tasks.push({ icon: '🛒', label: 'طلبات جديدة بانتظار التأكيد', count: pendingOrders, href: '/seller/orders' });
      if (pendingPayments) tasks.push({ icon: '💳', label: 'إثباتات دفع تنتظر مراجعتك', count: pendingPayments, href: '/seller/orders' });
      if (outStock) tasks.push({ icon: '🚨', label: `${itemsWord} نفدت من ${kind === 'restaurants' ? 'المنيو' : 'المخزون'}`, count: outStock, href: '/seller/inventory' });
      if (lowStock) tasks.push({ icon: '⚠️', label: `${itemsWord} على وشك النفاد`, count: lowStock, href: '/seller/inventory' });
    } else {
      const pendingBookings = kind === 'hotel'
        ? await this.prisma.roomBooking.count({ where: { status: 'pending', room: { storeId: store.id } } })
        : kind === 'rentals'
          ? await this.prisma.rentalBooking.count({ where: { status: 'pending', unit: { storeId: store.id } } })
          : await this.prisma.serviceRequest.count({ where: { status: 'pending', service: { storeId: store.id } } });
      const label = kind === 'hotel' ? 'حجوزات غرف تنتظر الرد' : kind === 'rentals' ? 'طلبات حجز تنتظر الرد' : 'طلبات خدمة واردة جديدة';
      const href = kind === 'hotel' ? '/seller/rooms' : kind === 'rentals' ? '/seller/rentals' : '/seller/services';
      if (pendingBookings) tasks.push({ icon: '📋', label, count: pendingBookings, href });
      if (pendingPayments) tasks.push({ icon: '💳', label: 'إثباتات دفع تنتظر مراجعتك', count: pendingPayments, href });
      // 🧬 عدد عناصر النشاط — لبطاقة الإحصائيات ونصيحة «أضف أول عنصر»
      itemsCount = kind === 'hotel'
        ? await this.prisma.hotelRoom.count({ where: { storeId: store.id } })
        : kind === 'rentals'
          ? await this.prisma.rentalUnit.count({ where: { storeId: store.id } })
          : await this.prisma.serviceItem.count({ where: { storeId: store.id } });
    }

    // 💹 النبض المالي — اليوم مقابل الأمس + سلسلة 7 أيام
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const series: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(weekStart.getTime() + (6 - i) * 86400000);
      series.push({ label: dayNames[d.getDay()], total: 0 });
    }
    for (const o of [...weekOrders, ...weekBookings]) {
      const idx = Math.floor((new Date(o.createdAt).setHours(0, 0, 0, 0) - weekStart.getTime()) / 86400000);
      if (idx >= 0 && idx < 7) series[idx].total += Number(o.total);
    }
    const today = series[6].total;
    const yesterday = series[5].total;
    const deltaPct = yesterday ? Math.round(((today - yesterday) / yesterday) * 100) : today > 0 ? 100 : 0;

    // 💡 نصائح قاعدية محلية — تدور يومياً
    const tips: { icon: string; text: string }[] = [];
    if (isProductsLike) {
      const sold14 = new Set(
        (await this.prisma.orderItem.findMany({
          where: { order: { storeId: store.id, createdAt: { gte: since14 }, status: { notIn: ['cancelled', 'refunded'] } } },
          select: { productId: true },
        })).map((i) => i.productId),
      );
      const hotNoSale = products.filter((p) => p.isActive && p.viewsCount >= 20 && !sold14.has(p.id));
      if (hotNoSale.length) {
        const p = hotNoSale.sort((a, b) => b.viewsCount - a.viewsCount)[0];
        tips.push({ icon: '🎯', text: `«${p.name}» يُشاهد ${p.viewsCount} مرة ولم يُبع خلال أسبوعين — جرّب تخفيضاً بسيطاً أو صوراً أوضح` });
      }
      const outWithViews = products.filter((p) => p.isActive && p.stock <= 0 && p.viewsCount >= 5);
      if (outWithViews.length) tips.push({ icon: '📦', text: `«${outWithViews[0].name}» نفد وما زال يُشاهد — كل يوم تأخير مبيعات ضائعة، أعد تخزينه` });
      if (payMethods === 0) tips.push({ icon: '💳', text: `لم تضبط طرق الدفع الخاصة بـ${storeWord} — العملاء يتحوّلون أكثر حين تتعدد خيارات الدفع` });
      if (products.length && pendingOrders > 2) tips.push({ icon: '⚡', text: `لديك ${pendingOrders} طلبات متراكمة — سرعة التأكيد ترفع تقييم ${storeWord} وترتيبه` });
    }
    if (!store.isVerified) tips.push({ icon: '🎖️', text: 'التوثيق يرفع ثقة العملاء ويظهر ✅ بجانب اسمك — قدّم طلبك من صفحة التوثيق' });
    if (!products.length && kind === 'products') tips.push({ icon: '📦', text: 'متجرك بلا منتجات بعد — أضف أول منتج وابدأ البيع اليوم' });
    if (!products.length && kind === 'restaurants') tips.push({ icon: '🍽️', text: 'منيوك فارغ بعد — أضف أول صنف بصورة شهية وسعره وابدأ استقبال الطلبات اليوم' });
    if (products.length > 0 && kind === 'restaurants') tips.push({ icon: '🔥', text: 'حدّث توفر الأصناف يومياً قبل وقت الذروة — الزبون يغضب حين يطلب صنفاً نافداً' });
    if (!products.length && kind === 'malls') tips.push({ icon: '🏬', text: 'مولك بلا منتجات بعد — نظّم أصنافك الرئيسية والفرعية ثم أضف منتجاتك الأولى' });
    if (products.length > 0 && kind === 'malls') {
      const cats = await this.prisma.category.count({ where: { storeId: store.id } });
      if (!cats) tips.push({ icon: '🗂️', text: 'أنشئ أصنافاً رئيسية وفرعية — تنظيم المول يضاعف وصول العملاء لمنتجاتك' });
      const feat = await this.prisma.product.count({ where: { storeId: store.id, isFeatured: true } });
      if (!feat) tips.push({ icon: '⭐', text: 'ميّز أفضل منتجاتك بعلامة «متميز» لتظهر في واجهة المول الرئيسية' });
    }
    // 🧬 نصائح أنشطة الحجز — بمصطلحات كل نشاط
    if (kind === 'hotel' && !itemsCount) tips.push({ icon: '🛎️', text: 'فندقك بلا غرف بعد — أضف أول غرفة بصورها وسعر الليلة وابدأ استقبال الحجوزات' });
    if (kind === 'rentals' && !itemsCount) tips.push({ icon: '🏠', text: 'لا وحدات إيجار بعد — أضف أول وحدة بالمساحة والسعر والموقع' });
    if (kind === 'services' && !itemsCount) tips.push({ icon: '🛠️', text: 'لا خدمات بعد — أضف أول خدمة بسعرها ومدة تنفيذها وضمانها' });
    if (kind === 'hotel' && itemsCount > 0) tips.push({ icon: '📸', text: 'الغرف المصوّرة جيداً تُحجز أسرع — أضف صوراً واضحة لكل غرفة وحدّث الإطلالة وعدد الأسِرّة' });
    if (kind === 'rentals' && itemsCount > 0) tips.push({ icon: '📐', text: 'اذكر المساحة وعدد الغرف والتأمين لكل وحدة — الوضوح يختصر أسئلة العملاء' });
    if (kind === 'services' && itemsCount > 0) tips.push({ icon: '🛡️', text: 'اكتب نص الضمان ومدة التنفيذ لكل خدمة — الثقة ترفع الطلبات' });

    // نصيحة اليوم: تدور حسب رقم اليوم في السنة
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const tip = tips.length ? tips[dayOfYear % tips.length] : null;

    return {
      kind, tasks, tip, tipsCount: tips.length, itemsCount,
      finance: { today: Math.round(today), yesterday: Math.round(yesterday), deltaPct, series: series.map((s) => ({ ...s, total: Math.round(s.total) })) },
    };
  }

  // ═══ 🚀 مساعد النمو المحلي — تحليلات قاعدية على بيانات المتجر الفعلية (بدون خوادم خارجية) ═══
  async growth(sellerId: string) {
    const store = await this.sellerStore(sellerId);
    const since60 = new Date(Date.now() - 60 * 86400000);
    const since30 = new Date(Date.now() - 30 * 86400000);

    const orders = await this.prisma.order.findMany({
      where: { storeId: store.id, createdAt: { gte: since60 }, status: { notIn: ['cancelled', 'refunded'] } },
      select: { total: true, createdAt: true, customerName: true, customerPhone: true },
    });

    // 🕐 أفضل ساعات البيع (آخر 60 يوماً)
    const hours = Array.from({ length: 24 }, (_, h) => ({ h, orders: 0, revenue: 0 }));
    for (const o of orders) {
      const h = new Date(o.createdAt).getHours();
      hours[h].orders++;
      hours[h].revenue += Number(o.total);
    }
    const bestHour = hours.reduce((a, b) => (b.orders > a.orders ? b : a), hours[0]);

    // 📦 المنتجات الراكدة — نشطة ولم تُبع خلال 30 يوماً رغم المشاهدات
    const soldRecent = new Set(
      (await this.prisma.orderItem.findMany({
        where: { order: { storeId: store.id, createdAt: { gte: since30 }, status: { notIn: ['cancelled', 'refunded'] } } },
        select: { productId: true },
      })).map((i) => i.productId),
    );
    const products = await this.prisma.product.findMany({
      where: { storeId: store.id, isActive: true },
      select: { id: true, name: true, price: true, salePrice: true, viewsCount: true, stock: true, category: { select: { name: true } } },
    });
    const stagnant = products
      .filter((p) => !soldRecent.has(p.id))
      .sort((a, b) => b.viewsCount - a.viewsCount)
      .slice(0, 6)
      .map((p) => ({ ...p, price: Number(p.price), salePrice: p.salePrice ? Number(p.salePrice) : null }));

    // 👥 سلة العملاء المتكررون — من طلبات آخر 60 يوماً
    const custMap: Record<string, any> = {};
    for (const o of orders) {
      const k = o.customerPhone || o.customerName || 'زائر';
      if (!custMap[k]) custMap[k] = { name: o.customerName || 'عميل', phone: o.customerPhone || '', count: 0, spent: 0, last: o.createdAt };
      custMap[k].count++;
      custMap[k].spent += Number(o.total);
      if (new Date(o.createdAt) > new Date(custMap[k].last)) custMap[k].last = o.createdAt;
    }
    const repeatCustomers = Object.values(custMap)
      .filter((c: any) => c.count >= 2)
      .sort((a: any, b: any) => b.count - a.count || b.spent - a.spent)
      .slice(0, 5)
      .map((c: any) => ({ ...c, spent: Math.round(c.spent) }));

    // 💰 اقتراحات التسعير — مقارنة بمتوسط السوق داخل المنصة (منتجات مشابهة بالاسم من متاجر أخرى)
    const pricing: any[] = [];
    const topViewed = [...products].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 5);
    for (const p of topViewed) {
      const token = p.name.trim().split(/\s+/)[0];
      if (!token || token.length < 2) continue;
      const similar = await this.prisma.product.findMany({
        where: { isActive: true, storeId: { not: store.id }, name: { contains: token, mode: 'insensitive' } },
        select: { price: true, salePrice: true },
        take: 30,
      });
      if (similar.length < 2) continue;
      const avg = similar.reduce((s, x) => s + Number(x.salePrice || x.price), 0) / similar.length;
      const mine = Number(p.salePrice || p.price);
      const diff = Math.round(((mine - avg) / avg) * 100);
      pricing.push({
        id: p.id, name: p.name, mine, marketAvg: Math.round(avg), diff, samples: similar.length,
        verdict: diff > 15 ? 'above' : diff < -15 ? 'below' : 'within',
      });
    }

    return {
      kind: store.type?.kind,
      hours: { list: hours, best: bestHour, totalOrders: orders.length, days: 60 },
      stagnant, repeatCustomers, pricing,
    };
  }

  // ═══ 📥📤 أدوات التشغيل الجماعية — تصدير/استيراد CSV وتعديل جماعي ═══

  // 📤 تصدير كل منتجات المتجر — صفوف جاهزة لـ CSV/Excel
  async exportProducts(sellerId: string) {
    const store = await this.sellerStore(sellerId);
    const products = await this.prisma.product.findMany({
      where: { storeId: store.id },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      salePrice: p.salePrice ? Number(p.salePrice) : '',
      stock: p.stock,
      lowStockAt: p.lowStockAt,
      category: p.category?.name || '',
      isActive: p.isActive ? 'نعم' : 'لا',
    }));
  }

  // 📥 استيراد — id موجود = تحديث، بدون id = إنشاء (يحترم حد الخطة)
  async importProducts(sellerId: string, rows: any[]) {
    const store = await this.sellerStore(sellerId);
    if (!Array.isArray(rows) || !rows.length) throw new BadRequestException('لا صفوف للاستيراد');
    if (rows.length > 200) throw new BadRequestException('الحد الأقصى 200 صف في الدفعة');

    const feats = effectiveFeatures(store);
    const max = Number(feats.maxProducts ?? 20);
    const currentCount = await this.prisma.product.count({ where: { storeId: store.id } });

    const report = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
    const cats = await this.prisma.category.findMany({ where: { storeId: store.id } });

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNo = i + 2; // +2 لأن الصف الأول ترويسة
      try {
        const name = String(r.name || '').trim().slice(0, 120);
        if (!name) { report.skipped++; report.errors.push(`صف ${rowNo}: بلا اسم`); continue; }

        // الصنف بالاسم — يُنشأ إن لم يوجد
        let categoryId: string | null = null;
        const catName = String(r.category || '').trim();
        if (catName) {
          let cat = cats.find((c) => c.name === catName);
          if (!cat) {
            cat = await this.prisma.category.create({ data: { storeId: store.id, name: catName.slice(0, 60) } });
            cats.push(cat);
          }
          categoryId = cat.id;
        }

        if (r.id) {
          // تحديث منتج قائم (ملكية مفروضة)
          const existing = await this.prisma.product.findFirst({ where: { id: String(r.id), storeId: store.id } });
          if (!existing) { report.skipped++; report.errors.push(`صف ${rowNo}: «${name}» غير موجود في متجرك`); continue; }
          await this.prisma.product.update({
            where: { id: existing.id },
            data: {
              name,
              ...(r.description !== undefined ? { description: String(r.description || '').slice(0, 2000) } : {}),
              ...(r.price ? { price: Math.max(0, Number(r.price)) } : {}),
              salePrice: r.salePrice ? Math.max(0, Number(r.salePrice)) : null,
              ...(r.stock !== undefined && r.stock !== '' ? { stock: Math.max(0, Number(r.stock)) } : {}),
              ...(r.lowStockAt !== undefined && r.lowStockAt !== '' ? { lowStockAt: Math.max(0, Number(r.lowStockAt)) } : {}),
              categoryId,
              isActive: String(r.isActive).trim() !== 'لا',
            },
          });
          report.updated++;
        } else {
          // إنشاء — حد الخطة
          if (max !== -1 && currentCount + report.created >= max) {
            report.skipped++;
            report.errors.push(`صف ${rowNo}: «${name}» — بلغت حد خطتك (${max} منتجاً)`);
            continue;
          }
          if (!r.price || Number(r.price) <= 0) { report.skipped++; report.errors.push(`صف ${rowNo}: «${name}» بلا سعر صحيح`); continue; }
          await this.prisma.product.create({
            data: {
              storeId: store.id, categoryId, name,
              description: String(r.description || '').slice(0, 2000),
              price: Number(r.price),
              salePrice: r.salePrice ? Math.max(0, Number(r.salePrice)) : null,
              stock: Math.max(0, Number(r.stock || 0)),
              lowStockAt: Math.max(0, Number(r.lowStockAt ?? 5)),
            },
          });
          report.created++;
        }
      } catch {
        report.skipped++;
        report.errors.push(`صف ${rowNo}: خطأ غير متوقع`);
      }
    }
    if (report.created > 0 || report.updated > 0) this.bustStore(store);
    return report;
  }

  // ⚡ تعديل جماعي — أسعار أو مخزون بنسبة أو مبلغ ثابت
  async bulkAdjust(sellerId: string, body: { field: string; mode: string; value: number; direction: string; scope?: string }) {
    const store = await this.sellerStore(sellerId);
    const field = body.field;
    if (!['price', 'salePrice', 'stock'].includes(field)) throw new BadRequestException('الحقل غير مدعوم');
    if (!['percent', 'amount'].includes(body.mode)) throw new BadRequestException('النمط غير مدعوم');
    if (!['increase', 'decrease'].includes(body.direction)) throw new BadRequestException('الاتجاه غير مدعوم');
    const value = Number(body.value);
    if (!value || value <= 0) throw new BadRequestException('أدخل قيمة أكبر من صفر');
    if (body.mode === 'percent' && value > 90 && body.direction === 'decrease') throw new BadRequestException('الخصم لا يتجاوز 90%');

    const where: any = { storeId: store.id, isActive: true };
    if (body.scope === 'sale') where.salePrice = { not: null };
    if (body.scope === 'outofstock') where.stock = 0;
    const products = await this.prisma.product.findMany({ where, select: { id: true, price: true, salePrice: true, stock: true } });

    let affected = 0;
    for (const p of products) {
      const current = field === 'price' ? Number(p.price) : field === 'salePrice' ? Number(p.salePrice || 0) : p.stock;
      if (field === 'salePrice' && !p.salePrice && body.direction === 'decrease') continue; // لا تخفيض على غير موجود
      let next = body.mode === 'percent'
        ? current * (body.direction === 'increase' ? 1 + value / 100 : 1 - value / 100)
        : current + (body.direction === 'increase' ? value : -value);
      next = Math.max(0, Math.round(next));
      if (field === 'stock') next = Math.floor(next);
      if (field === 'salePrice' && next >= Number(p.price)) next = Number(p.price) - 1; // المخفّض دائماً دون الأصلي
      if (field === 'salePrice' && next < 1 && !p.salePrice) continue;
      await this.prisma.product.update({ where: { id: p.id }, data: { [field]: next } });
      affected++;
    }
    if (affected) this.bustStore(store);
    return { affected, scope: body.scope || 'all' };
  }

  // ✍️ مولّد الأوصاف القاعدي — قوالب عربية جاهزة بثلاث نبرات (محلي 100%)
  describeProduct(body: { name?: string; category?: string }) {
    const name = (body.name || '').trim().slice(0, 80);
    if (name.length < 2) throw new BadRequestException('أدخل اسم المنتج أولاً');
    const cat = (body.category || '').trim().slice(0, 40);
    const seed = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
    const pick = (arr: string[]) => arr[seed % arr.length];

    const adj = pick(['الأصلي', 'الفاخر', 'المميز', 'عالي الجودة']);
    const hook = pick(['الأكثر طلباً', 'اختيار العملاء الأول', 'قطعة تستحق الاقتناء', 'وصل حديثاً']);

    const variants = [
      // 🎯 النبرة التسويقية
      `✨ ${name} ${adj} — ${cat ? `من قسم ${cat} ` : ''}${hook}!

▪️ جودة مضمونة وخامات ممتازة
▪️ سعر منافس وتغليف متقن
▪️ توصيل سريع حتى باب البيت

🛒 اطلبه الآن قبل نفاد الكمية — الطلب يزداد عليه يومياً!`,

      // 🛡️ نبرة الثقة والجودة
      `${name} — جودة تتحدث عن نفسها ✅

نختار ${cat ? `منتجات ${cat} ` : ''}منتجاتنا بعناية، وهذا ${name} ${adj} خضع لفحص الجودة قبل عرضه.

📦 يصلك مغلفاً بعناية | 💳 دفع آمن ومتعدد الطرق | 🔄 استبدال في حال وجود ملاحظة

اطلبه بثقة — مئات العملاء يثقون بنا.`,

      // 🎁 النبرة العاطفية
      `تبحث عن ${cat || 'شيء مميز'}؟ 🎁

${name} ${adj} — هدية مثالية لنفسك أو لمن تحب.
${hook} عندنا، وبسعر لن تجده في مكان آخر.

❤️ اطلبه اليوم واستلمه قريباً — السعادة تستحق.`,
    ];

    return { name, variants };
  }
}
