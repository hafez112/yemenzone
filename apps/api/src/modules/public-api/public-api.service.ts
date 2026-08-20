import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { ApiAiService } from './api-ai.service';
import { API_SCOPES } from './api-key.guard';
import { requireFeature } from '../../common/features';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class PublicApiService {
  constructor(
    private prisma: PrismaService,
    private orders: OrdersService,
    private ai: ApiAiService,
  ) {}

  private async myStore(sellerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { sellerId },
      include: { type: true, subscription: { include: { plan: true } } },
    });
    if (!store) throw new NotFoundException('أنشئ متجرك أولاً');
    return store;
  }

  // ═══ البائع: إدارة المفاتيح ═══
  async myKeys(sellerId: string) {
    const store = await this.myStore(sellerId);
    const keys = await this.prisma.apiKey.findMany({
      where: { storeId: store.id }, orderBy: { createdAt: 'desc' },
    });
    return keys.map((k) => ({
      id: k.id, name: k.name, prefix: k.prefix, scopes: k.scopes,
      ratePerMin: k.ratePerMin, totalCalls: k.totalCalls,
      lastUsedAt: k.lastUsedAt, status: k.status, createdAt: k.createdAt,
    }));
  }

  async createKey(sellerId: string, body: any) {
    const store = await this.myStore(sellerId);
    // 🔒 مفاتيح API للمطورين — ميزة الخطة الاحترافية أو منح من الإدارة
    requireFeature(store, 'api');
    if (!body.name?.trim()) throw new BadRequestException('اسم المفتاح مطلوب');
    const validScopes = Object.keys(API_SCOPES);
    const scopes = Array.isArray(body.scopes) ? body.scopes.filter((s: any) => validScopes.includes(s)) : [];
    if (!scopes.length) throw new BadRequestException('اختر صلاحية واحدة على الأقل');
    const count = await this.prisma.apiKey.count({ where: { storeId: store.id, status: 'active' } });
    if (count >= 10) throw new BadRequestException('الحد الأقصى 10 مفاتيح نشطة');

    const ratePerMin = Math.min(Math.max(Number(body.ratePerMin) || 60, 10), 600);
    const fullKey = 'yzk_' + randomBytes(24).toString('hex');
    const keyHash = createHash('sha256').update(fullKey).digest('hex');
    const key = await this.prisma.apiKey.create({
      data: {
        storeId: store.id, name: body.name.trim(),
        prefix: fullKey.slice(0, 12) + '…',
        keyHash, scopes, ratePerMin,
      },
    });
    return { id: key.id, fullKey, warning: 'احفظ المفتاح الآن — لن يظهر مرة أخرى' };
  }

  async revokeKey(sellerId: string, id: string) {
    const store = await this.myStore(sellerId);
    const key = await this.prisma.apiKey.findFirst({ where: { id, storeId: store.id } });
    if (!key) throw new NotFoundException('المفتاح غير موجود');
    await this.prisma.apiKey.update({ where: { id }, data: { status: 'revoked' } });
    return { ok: true };
  }

  async updateKey(sellerId: string, id: string, body: any) {
    const store = await this.myStore(sellerId);
    const key = await this.prisma.apiKey.findFirst({ where: { id, storeId: store.id } });
    if (!key) throw new NotFoundException('المفتاح غير موجود');
    const data: any = {};
    if (body.ratePerMin) data.ratePerMin = Math.min(Math.max(Number(body.ratePerMin), 10), 600);
    if (Array.isArray(body.scopes)) {
      const valid = Object.keys(API_SCOPES);
      const scopes = body.scopes.filter((s: any) => valid.includes(s));
      if (!scopes.length) throw new BadRequestException('اختر صلاحية واحدة على الأقل');
      data.scopes = scopes;
    }
    await this.prisma.apiKey.update({ where: { id }, data });
    return { ok: true };
  }

  // إحصاءات الاستخدام + تحليل الذكاء المحلي
  async usage(sellerId: string) {
    const store = await this.myStore(sellerId);
    const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    const keys = await this.prisma.apiKey.findMany({ where: { storeId: store.id } });
    const rows = await this.prisma.apiUsage.findMany({
      where: { keyId: { in: keys.map((k) => k.id) }, day: { gte: since } },
    });
    // سلسلة 7 أيام مجمعة
    const series: { day: string; calls: number; fails: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const d = rows.filter((r) => r.day === day);
      series.push({ day, calls: d.reduce((s, r) => s + r.calls, 0), fails: d.reduce((s, r) => s + r.fails, 0) });
    }
    const analysis = this.ai.analyze(keys, rows);
    return {
      totalKeys: keys.length,
      activeKeys: keys.filter((k) => k.status === 'active').length,
      totalCalls: keys.reduce((s, k) => s + k.totalCalls, 0),
      weekCalls: series.reduce((s, d) => s + d.calls, 0),
      series, analysis,
      suggestedRate: this.ai.suggestRate((store as any).type?.kind || ''),
      scopesInfo: API_SCOPES,
    };
  }

  // ═══ النقاط العامة (تُستدعى بعد الحارس) ═══
  async storeInfo(store: any) {
    const [productsCount, ordersCount] = await Promise.all([
      this.prisma.product.count({ where: { storeId: store.id, isActive: true } }),
      this.prisma.order.count({ where: { storeId: store.id } }),
    ]);
    return {
      name: store.name, slug: store.slug, description: store.description,
      governorate: store.governorate, city: store.city, phone: store.phone, whatsapp: store.whatsapp,
      isVerified: store.isVerified, ratingAvg: store.ratingAvg, ratingCount: store.ratingCount,
      productsCount, ordersCount,
    };
  }

  async listProducts(store: any, q: any) {
    const take = Math.min(Number(q.take) || 20, 100);
    const skip = Math.max(Number(q.skip) || 0, 0);
    const where: any = { storeId: store.id, isActive: true };
    if (q.q) where.name = { contains: q.q };
    if (q.categoryId) where.categoryId = q.categoryId;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where, take, skip, orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, description: true, price: true, salePrice: true, currency: true,
          stock: true, sku: true, images: true, categoryId: true, createdAt: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async productDetails(store: any, id: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, storeId: store.id, isActive: true },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!p) throw new NotFoundException('المنتج غير موجود');
    return p;
  }

  // إنشاء طلب عبر API — يعيد استخدام منطق الطلبات مع التحقق من المتجر نفسه
  async createOrder(store: any, body: any) {
    if (store.type?.kind !== 'products') throw new BadRequestException('إنشاء الطلبات عبر API متاح لمتاجر المنتجات حالياً');
    const result = await this.orders.create(store.slug, {
      items: body.items, customerName: body.customerName,
      customerPhone: body.customerPhone, address: body.address, notes: body.notes,
    });
    return result;
  }

  async trackOrder(store: any, number: string, phone: string) {
    if (!number || !phone) throw new BadRequestException('رقم الطلب والجوال مطلوبان');
    const order = await this.prisma.order.findFirst({
      where: { storeId: store.id, number: number.toUpperCase(), customerPhone: phone },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('لم يُعثر على الطلب');
    // آخر دفعة مرتبطة بالطلب (إن وُجدت)
    const payment = await this.prisma.payment.findFirst({
      where: { purpose: 'order', referenceId: order.id },
      orderBy: { createdAt: 'desc' },
      select: { status: true, method: true, amount: true },
    }).catch(() => null);
    return {
      number: order.number, status: order.status,
      paymentMethod: order.paymentMethod, paymentStatus: payment?.status || null,
      subtotal: order.subtotal, discount: order.discount, total: order.total, currency: order.currency,
      items: order.items.map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
      createdAt: order.createdAt,
    };
  }
}
