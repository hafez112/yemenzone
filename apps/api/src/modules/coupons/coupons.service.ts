import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireFeature } from '../../common/features';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  private async sellerStore(sellerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { sellerId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    return store;
  }

  // ── البائع: قائمة الكوبونات + حالة ذكية محسوبة محلياً ──
  async list(sellerId: string) {
    const store = await this.sellerStore(sellerId);
    const coupons = await this.prisma.coupon.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    return coupons.map((c) => ({
      ...c,
      // 🤖 حالة محلية ذكية: نشط | منتهي | مستنفد
      smartStatus: !c.isActive ? 'paused'
        : c.expiresAt && c.expiresAt < now ? 'expired'
        : c.maxUses && c.usedCount >= c.maxUses ? 'exhausted' : 'active',
      usageRate: c.maxUses ? Math.round((c.usedCount / c.maxUses) * 100) : null,
    }));
  }

  async create(sellerId: string, body: any) {
    const store = await this.sellerStore(sellerId);
    // 🔒 الكوبونات ميزة مدفوعة — تُفتح بترقية الخطة أو منح من الإدارة
    requireFeature(store, 'coupons');
    const code = String(body.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) throw new BadRequestException('كود الكوبون: 3-20 حرفاً إنجليزياً أو رقماً');
    const value = Number(body.value);
    if (!value || value <= 0) throw new BadRequestException('قيمة الخصم غير صحيحة');
    if (body.type === 'percent' && value > 100) throw new BadRequestException('النسبة لا تتجاوز 100%');
    const exists = await this.prisma.coupon.findUnique({ where: { code } });
    if (exists) throw new BadRequestException('هذا الكود مستخدم مسبقاً');
    return this.prisma.coupon.create({
      data: {
        code,
        type: body.type === 'fixed' ? 'fixed' : 'percent',
        value,
        maxUses: body.maxUses ? Number(body.maxUses) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        storeId: store.id,
      },
    });
  }

  async toggle(sellerId: string, id: string) {
    const store = await this.sellerStore(sellerId);
    const c = await this.prisma.coupon.findFirst({ where: { id, storeId: store.id } });
    if (!c) throw new NotFoundException('الكوبون غير موجود');
    return this.prisma.coupon.update({ where: { id }, data: { isActive: !c.isActive } });
  }

  async remove(sellerId: string, id: string) {
    const store = await this.sellerStore(sellerId);
    const c = await this.prisma.coupon.findFirst({ where: { id, storeId: store.id } });
    if (!c) throw new NotFoundException('الكوبون غير موجود');
    await this.prisma.coupon.delete({ where: { id } });
    return { ok: true };
  }

  // ── العام: التحقق من كوبون في السلة ──
  async validate(body: { code: string; storeSlug: string; total: number }) {
    const code = String(body.code || '').trim().toUpperCase();
    const total = Number(body.total) || 0;
    const store = await this.prisma.store.findUnique({ where: { slug: body.storeSlug } });
    if (!store) throw new NotFoundException('المتجر غير موجود');
    const c = await this.prisma.coupon.findUnique({ where: { code } });
    if (!c || !c.isActive) throw new BadRequestException('الكوبون غير صالح');
    if (c.storeId && c.storeId !== store.id) throw new BadRequestException('هذا الكوبون لا يخص هذا المتجر');
    if (c.expiresAt && c.expiresAt < new Date()) throw new BadRequestException('انتهت صلاحية الكوبون');
    if (c.maxUses && c.usedCount >= c.maxUses) throw new BadRequestException('استُنفدت استخدامات الكوبون');
    const discount = c.type === 'percent'
      ? Math.round((total * Number(c.value)) / 100)
      : Math.min(Number(c.value), total);
    const label = c.type === 'percent' ? `خصم ${Number(c.value)}%` : `خصم ${Number(c.value).toLocaleString()} ر.ي`;
    return { code: c.code, label, discount, type: c.type, value: Number(c.value) };
  }
}
