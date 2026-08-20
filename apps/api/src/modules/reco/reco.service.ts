import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// 🧠 توصيات محلية قائمة على قواعد — بدون أي خوادم خارجية (آلة البيع)
@Injectable()
export class RecoService {
  constructor(private prisma: PrismaService) {}

  private card(p: any) {
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price),
      salePrice: p.salePrice != null ? Number(p.salePrice) : null,
      currency: p.currency,
      images: p.images,
      viewsCount: p.viewsCount,
      store: p.store ? { slug: p.store.slug, name: p.store.name } : undefined,
    };
  }

  // منتجات مشابهة: نفس الصنف +3، نفس المتجر +2، عليه تخفيض +1 — والأكثر مشاهدة يتقدم
  async related(productId: string, take = 8) {
    const p = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, storeId: true, categoryId: true, isActive: true },
    });
    if (!p || !p.isActive) return [];
    const candidates = await this.prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: p.id },
        OR: [
          p.categoryId ? { categoryId: p.categoryId } : {},
          { storeId: p.storeId },
        ],
        store: { status: 'active' },
      },
      include: { store: { select: { slug: true, name: true } } },
      take: 60,
      orderBy: { viewsCount: 'desc' },
    });
    const scored = candidates
      .map((c) => {
        let score = 0;
        if (p.categoryId && c.categoryId === p.categoryId) score += 3;
        if (c.storeId === p.storeId) score += 2;
        if (c.salePrice != null) score += 1;
        return { c, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || b.c.viewsCount - a.c.viewsCount)
      .slice(0, take);
    return scored.map((s) => this.card(s.c));
  }

  // جلب منتجات بمعرّفاتها (لـ«شوهد مؤخراً») — بنفس ترتيب الإدخال
  async byIds(ids: string[]) {
    const clean = [...new Set(ids.map((i) => String(i)))].filter(Boolean).slice(0, 24);
    if (!clean.length) return [];
    const products = await this.prisma.product.findMany({
      where: { id: { in: clean }, isActive: true, store: { status: 'active' } },
      include: { store: { select: { slug: true, name: true } } },
    });
    const map = new Map(products.map((p) => [p.id, p]));
    return clean.filter((id) => map.has(id)).map((id) => this.card(map.get(id)));
  }

  // الرائج الآن: الأكثر طلباً خلال 30 يوماً ثم الأكثر مشاهدة
  async trending(take = 8) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const rows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { createdAt: { gte: since }, status: { notIn: ['cancelled', 'refunded'] } } },
      _sum: { qty: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: take * 2,
    });
    const ids = rows.map((r) => r.productId);
    // 🎖️ الأكثر مبيعاً — منتجات المتاجر الموثقة فقط (التوثيق بموافقة الإدارة)
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, isActive: true, store: { status: 'active', isVerified: true } },
      include: { store: { select: { slug: true, name: true } } },
    });
    const map = new Map(products.map((p) => [p.id, p]));
    const ordered = ids.filter((id) => map.has(id)).map((id) => this.card(map.get(id)));
    if (ordered.length >= take) return ordered.slice(0, take);
    // إكمال النقص بالأكثر مشاهدة — من المتاجر الموثقة فقط أيضاً
    const filler = await this.prisma.product.findMany({
      where: { isActive: true, id: { notIn: ids }, store: { status: 'active', isVerified: true } },
      include: { store: { select: { slug: true, name: true } } },
      orderBy: { viewsCount: 'desc' },
      take: take - ordered.length,
    });
    return [...ordered, ...filler.map((p) => this.card(p))];
  }
}
