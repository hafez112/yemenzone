import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// ❤️ المفضلة — حفظ المنتجات + تنبيه انخفاض السعر (آلة البيع)
@Injectable()
export class WishlistService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // تبديل: إضافة أو إزالة — يرجع الحالة الجديدة
  async toggle(customerId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, price: true, salePrice: true, isActive: true },
    });
    if (!product || !product.isActive) throw new NotFoundException('المنتج غير موجود');
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });
    if (existing) {
      await this.prisma.wishlistItem.delete({ where: { id: existing.id } });
      return { added: false };
    }
    const price = Number(product.salePrice ?? product.price);
    await this.prisma.wishlistItem.create({ data: { customerId, productId, priceAtAdd: price } });
    return { added: true };
  }

  async list(customerId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: { store: { select: { slug: true, name: true } } },
        },
      },
    });
    return items.map((i) => {
      const p: any = i.product;
      const current = Number(p.salePrice ?? p.price);
      const atAdd = i.priceAtAdd != null ? Number(i.priceAtAdd) : null;
      return {
        id: i.id,
        addedAt: i.createdAt,
        priceAtAdd: atAdd,
        dropped: atAdd != null && current < atAdd, // 💸 انخفض السعر منذ الإضافة
        product: {
          id: p.id,
          name: p.name,
          price: Number(p.price),
          salePrice: p.salePrice != null ? Number(p.salePrice) : null,
          currency: p.currency,
          images: p.images,
          stock: p.stock,
          isActive: p.isActive,
          store: p.store,
        },
      };
    });
  }

  async ids(customerId: string) {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { customerId },
      select: { productId: true },
    });
    return rows.map((r) => r.productId);
  }

  async remove(customerId: string, productId: string) {
    await this.prisma.wishlistItem.deleteMany({ where: { customerId, productId } });
    return { ok: true };
  }

  // 💸 يُستدعى عند تحديث سعر المنتج — ينبّه من أضافه بسعر أعلى
  async notifyPriceDrop(productId: string) {
    const p = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, price: true, salePrice: true, store: { select: { slug: true } } },
    });
    if (!p) return;
    const effective = Number(p.salePrice ?? p.price);
    const items = await this.prisma.wishlistItem.findMany({
      where: { productId, priceAtAdd: { gt: effective } },
      take: 200,
      select: { id: true, customerId: true },
    });
    for (const it of items) {
      await this.notifications.push('customer', it.customerId, {
        icon: '💸',
        title: 'انخفض سعر منتج في مفضلتك!',
        body: `${p.name} — أصبح الآن بسعر أقل`,
        link: `/store/${p.store.slug}/product/${p.id}`,
      }).catch(() => {});
      // خط الأساس الجديد حتى يعمل التنبيه على الانخفاضات القادمة
      await this.prisma.wishlistItem.update({ where: { id: it.id }, data: { priceAtAdd: effective } }).catch(() => {});
    }
  }
}
