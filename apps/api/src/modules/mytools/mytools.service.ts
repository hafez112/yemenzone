import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// 🛍️ خدمات التاجر — متاحة للبائعين فقط، تظهر في لوحة تحكم البائع
const MERCHANT_TOOLS = new Set([
  'invoice', 'qr', 'barcode', 'writer', 'catalog',
  'pricing', 'installments', 'debts', 'docs', 'posts',
  // 💎 خدمات التاجر المدفوعة
  'inventory', 'crm', 'delivery', 'expenses', 'coupons',
  'quotes', 'vouchers', 'sales-report', 'backup', 'appointments',
  'menu-qr', 'rooms', 'rental-contract', 'tickets',
]);

const SLUG_RE = /^[a-z0-9-]{1,40}$/;

// 🧰 خدمات المستخدم — إضافة/إزالة + قاعدة بيانات خاصة لكل خدمة يستخدمها
@Injectable()
export class MyToolsService {
  constructor(private prisma: PrismaService) {}

  private checkSlug(slug: string) {
    if (!SLUG_RE.test(slug)) throw new BadRequestException('خدمة غير معروفة');
  }

  // 📋 خدماتي — القائمة مع حالة البيانات وآخر تحديث
  async list(userType: string, userId: string) {
    const rows = await this.prisma.userTool.findMany({
      where: { userType, userId },
      orderBy: { createdAt: 'desc' },
      select: { slug: true, createdAt: true, updatedAt: true, data: true },
    });
    return rows.map((r) => ({
      slug: r.slug,
      addedAt: r.createdAt,
      updatedAt: r.updatedAt,
      hasData: r.data != null, // 🗄️ لهذه الخدمة بيانات محفوظة في قاعدتها
    }));
  }

  // ➕ إضافة خدمة إلى لوحتي — خدمات التاجر للبائعين فقط
  async add(userType: string, userId: string, slug: string) {
    this.checkSlug(slug);
    if (MERCHANT_TOOLS.has(slug) && userType !== 'seller') {
      throw new ForbiddenException('هذه الخدمة خاصة بالتجار — أنشئ حساب بائع لاستخدامها');
    }
    const row = await this.prisma.userTool.upsert({
      where: { userType_userId_slug: { userType, userId, slug } },
      create: { userType, userId, slug },
      update: {},
    });
    return { added: true, slug: row.slug };
  }

  // ✕ إزالة خدمة من لوحتي (تُحذف قاعدة بياناتها معها)
  async remove(userType: string, userId: string, slug: string) {
    this.checkSlug(slug);
    await this.prisma.userTool.deleteMany({ where: { userType, userId, slug } });
    return { removed: true };
  }

  // 📥 قراءة قاعدة بيانات الخدمة الخاصة بالمستخدم
  async getData(userType: string, userId: string, slug: string) {
    this.checkSlug(slug);
    const row = await this.prisma.userTool.findUnique({
      where: { userType_userId_slug: { userType, userId, slug } },
      select: { data: true, updatedAt: true },
    });
    if (!row) throw new NotFoundException('الخدمة غير مضافة إلى لوحتك');
    return { data: row.data ?? null, updatedAt: row.updatedAt };
  }

  // 📤 حفظ بيانات الخدمة — تُنشئ سجل الخدمة تلقائياً إن لم تكن مضافة
  async saveData(userType: string, userId: string, slug: string, data: any) {
    this.checkSlug(slug);
    if (MERCHANT_TOOLS.has(slug) && userType !== 'seller') {
      throw new ForbiddenException('هذه الخدمة خاصة بالتجار');
    }
    // حماية الحجم: 512KB كحد أقصى لقاعدة بيانات الخدمة الواحدة
    const size = JSON.stringify(data ?? null).length;
    if (size > 512 * 1024) throw new BadRequestException('بيانات الخدمة تجاوزت الحد المسموح');
    const row = await this.prisma.userTool.upsert({
      where: { userType_userId_slug: { userType, userId, slug } },
      create: { userType, userId, slug, data: data ?? null },
      update: { data: data ?? null },
    });
    return { saved: true, updatedAt: row.updatedAt };
  }

  // 🏬 تصدير بيانات متجر البائع كاملة — تستهلكها خدمات التاجر (نسخ احتياطي، استيراد...)
  async storeExport(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId }, include: { type: true } });
    if (!store) throw new BadRequestException('لا يوجد متجر مرتبط بحسابك');
    const [categories, products, orders] = await Promise.all([
      this.prisma.category.findMany({ where: { storeId: store.id }, orderBy: { name: 'asc' } }),
      this.prisma.product.findMany({ where: { storeId: store.id }, orderBy: { createdAt: 'desc' } }),
      this.prisma.order.findMany({
        where: { storeId: store.id }, orderBy: { createdAt: 'desc' }, take: 500,
        include: { items: true },
      }),
    ]);
    // 👥 زبائن المتجر — مجمعون من الطلبات (اسم + جوال + عدد الطلبات + الإجمالي)
    const custMap = new Map<string, any>();
    for (const o of orders) {
      const key = o.customerPhone;
      const c = custMap.get(key) || { name: o.customerName, phone: o.customerPhone, orders: 0, total: 0, lastAt: o.createdAt };
      c.orders++;
      if (!['cancelled', 'refunded'].includes(o.status)) c.total += Number(o.total);
      if (o.createdAt > c.lastAt) { c.lastAt = o.createdAt; c.name = o.customerName; }
      custMap.set(key, c);
    }
    return {
      exportedAt: new Date().toISOString(),
      store: {
        name: store.name, slug: store.slug, type: store.type?.nameAr || '',
        governorate: store.governorate, phone: store.phone, whatsapp: store.whatsapp,
        logo: store.logo, description: store.description,
      },
      categories: categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId })),
      products: products.map((p) => ({
        id: p.id, name: p.name, shortDesc: p.shortDesc, price: Number(p.price),
        salePrice: p.salePrice ? Number(p.salePrice) : null, currency: p.currency,
        stock: p.stock, sku: p.sku, barcode: p.barcode, categoryId: p.categoryId,
        images: p.images, isActive: p.isActive,
      })),
      orders: orders.map((o) => ({
        number: o.number, customerName: o.customerName, customerPhone: o.customerPhone,
        status: o.status, subtotal: Number(o.subtotal), total: Number(o.total),
        currency: o.currency, createdAt: o.createdAt,
        items: o.items.map((it) => ({ name: it.name, qty: it.qty, price: Number(it.price) })),
      })),
      customers: [...custMap.values()].sort((a, b) => b.total - a.total),
    };
  }
}
