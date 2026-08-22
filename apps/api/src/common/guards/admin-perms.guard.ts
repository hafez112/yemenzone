import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// 🛡️ حارس الصلاحيات: PermsGuard('finance') — المدير الخارق أو من يملك الصلاحية
export function PermsGuard(...perms: string[]) {
  @Injectable()
  class Guard implements CanActivate {
    constructor(private prisma: PrismaService) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
      const req = ctx.switchToHttp().getRequest();
      if (!req.user) throw new UnauthorizedException('يجب تسجيل الدخول');
      if (req.user.typ !== 'admin') throw new ForbiddenException('هذه المنطقة للإدارة فقط');

      const admin = await this.prisma.adminUser.findUnique({ where: { id: req.user.sub } });
      if (!admin || admin.status !== 'active') throw new ForbiddenException('حساب الإدارة غير نشط');
      if (admin.isSuper) return true;

      const owned = (admin.permissions as string[]) || [];
      const ok = perms.every((p) => owned.includes(p) || owned.includes('*'));
      if (!ok) throw new ForbiddenException(`تحتاج صلاحية: ${perms.join('، ')}`);
      return true;
    }
  }
  return Guard;
}

// قائمة الصلاحيات المعروفة (تُعرض في واجهة إدارة المديرين)
export const ADMIN_PERMISSIONS: Record<string, string> = {
  stores: 'المتاجر والتجار',
  customers: 'العملاء',
  support: 'الدعم الفني',
  reviews: 'التقييمات',
  supervision: 'الإشراف (إيجارات/فنادق/خدمات)',
  plans: 'الخطط والاشتراكات',
  drivers: 'التوصيل والسائقون',
  messaging: 'المراسلة',
  payments: 'المدفوعات',
  cards: 'البطاقات والمحافظ',
  finance: 'المركز المالي',
  security: 'مركز الأمن',
  design: 'التصميم والصفحات',
  files: 'مدير الملفات',
  ai: 'الذكاء الاصطناعي',
  system: 'النظام وصيانة قاعدة البيانات',
};
