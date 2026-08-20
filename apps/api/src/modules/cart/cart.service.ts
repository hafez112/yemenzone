import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SecurityService } from '../../common/security.service';

// 🛒 سلال السيرفر — مزامنة سلة العميل + كشف السلات المهجورة وتذكيرها (آلة البيع)
@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private notifications: NotificationsService,
    private security: SecurityService,
  ) {}

  // مزامنة سلة متجر كاملة (استبدال) — عميل مسجل أو زائر بجلسة
  async sync(authHeader: string | undefined, body: any) {
    let customerId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload: any = await this.jwt.verifyAsync(authHeader.slice(7));
        if (payload?.typ === 'customer') customerId = payload.sub;
      } catch { /* زائر */ }
    }
    const sessionId = String(body.sessionId || '').trim().slice(0, 64) || null;
    if (!customerId && !sessionId) throw new BadRequestException('معرّف الجلسة مطلوب');
    const storeId = String(body.storeId || '');
    const store = await this.prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
    if (!store) throw new BadRequestException('المتجر غير موجود');

    const owner = customerId ? { customerId } : { sessionId };
    const raw: any[] = Array.isArray(body.items) ? body.items.slice(0, 50) : [];

    // تحقق من المنتجات — تجاهل أي منتج ليس من هذا المتجر
    const ids = [...new Set(raw.map((i) => String(i.productId || '')))].filter(Boolean);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, storeId },
      select: { id: true, price: true, salePrice: true },
    });
    const pmap = new Map(products.map((p) => [p.id, p]));

    const items = raw
      .filter((i) => pmap.has(String(i.productId)))
      .map((i) => {
        const p = pmap.get(String(i.productId))!;
        return {
          ...owner,
          storeId,
          productId: String(i.productId),
          variantId: i.variantId ? String(i.variantId).slice(0, 64) : null,
          variant: i.variant ? String(i.variant).slice(0, 120) : null,
          qty: Math.max(1, Math.min(99, Number(i.qty) || 1)),
          price: Number(p.salePrice ?? p.price), // السعر الحقيقي من السيرفر — لا نثق بالعميل
        };
      });

    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { ...owner, storeId } }),
      ...items.map((data) => this.prisma.cartItem.create({ data })),
    ]);
    return { ok: true, count: items.length };
  }

  // 🛒 السلات المهجورة: آخر تحديث قبل أكثر من ساعة — مجموعة لكل (عميل/جلسة + متجر)
  async abandoned(q?: string) {
    const since = new Date(Date.now() - 60 * 60_000);
    const items = await this.prisma.cartItem.findMany({
      where: { updatedAt: { lt: since } },
      orderBy: { updatedAt: 'desc' },
      take: 2000,
      include: {
        product: { select: { id: true, name: true, images: true, isActive: true } },
        customer: { select: { id: true, name: true, phone: true } },
        store: { select: { id: true, name: true, slug: true } },
      },
    });
    const groups = new Map<string, any>();
    for (const it of items) {
      const key = `${it.customerId || it.sessionId}|${it.storeId}`;
      let g = groups.get(key);
      if (!g) {
        g = {
          key,
          customer: it.customer,
          sessionId: it.customerId ? null : it.sessionId,
          store: it.store,
          items: [],
          total: 0,
          updatedAt: it.updatedAt,
          remindedAt: null as any,
        };
        groups.set(key, g);
      }
      g.items.push({
        productId: it.productId,
        name: it.product.name,
        image: (it.product.images as any)?.[0] || null,
        variant: it.variant,
        qty: it.qty,
        price: Number(it.price),
        available: it.product.isActive,
      });
      g.total += Number(it.price) * it.qty;
      if (!g.remindedAt || (it.remindedAt && it.remindedAt > g.remindedAt)) g.remindedAt = it.remindedAt;
    }
    let list = [...groups.values()];
    if (q?.trim()) {
      const s = q.trim();
      list = list.filter(
        (g) =>
          g.store.name.includes(s) ||
          g.customer?.name?.includes(s) ||
          g.customer?.phone?.includes(s),
      );
    }
    return {
      stats: {
        carts: list.length,
        value: Math.round(list.reduce((s, g) => s + g.total, 0) * 100) / 100,
        registered: list.filter((g) => g.customer).length,
      },
      carts: list.slice(0, 100),
    };
  }

  // 🔔 تذكير بسلة مهجورة — للعملاء المسجلين فقط
  async remind(body: any, adminId: string) {
    const customerId = String(body.customerId || '');
    const storeId = String(body.storeId || '');
    if (!customerId) throw new BadRequestException('لا يمكن تذكير زائر غير مسجل — التذكير للعملاء المسجلين فقط');
    const items = await this.prisma.cartItem.findMany({
      where: { customerId, storeId },
      include: { store: { select: { name: true, slug: true } } },
    });
    if (!items.length) throw new BadRequestException('لا توجد سلة لهذا العميل في هذا المتجر');
    await this.notifications.push('customer', customerId, {
      icon: '🛒',
      title: 'نسيت شيئاً في سلتك!',
      body: `لديك ${items.length} ${items.length === 1 ? 'منتج' : 'منتجات'} بانتظارك في متجر ${items[0].store.name} — أكمل طلبك قبل نفاد الكمية`,
      link: `/store/${items[0].store.slug}`,
    }).catch(() => {});
    await this.prisma.cartItem.updateMany({
      where: { customerId, storeId },
      data: { remindedAt: new Date() },
    });
    await this.security.log('cart_reminded', {
      userType: 'admin',
      userId: adminId,
      details: `تذكير سلة — متجر ${items[0].store.name} (${items.length} منتجات)`,
    });
    return { ok: true, count: items.length };
  }
}
