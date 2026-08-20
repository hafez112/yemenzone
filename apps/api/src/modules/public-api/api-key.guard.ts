import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash } from 'crypto';

// نافذة منزلقة في الذاكرة لكل مفتاح
const windows = new Map<string, number[]>();

export function ApiKeyGuard(...requiredScopes: string[]) {
  @Injectable()
  class Guard implements CanActivate {
    constructor(private prisma: PrismaService) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
      const req = ctx.switchToHttp().getRequest();
      const raw = req.headers['x-api-key'] || req.query?.api_key;
      if (!raw || typeof raw !== 'string') {
        throw new UnauthorizedException('مفتاح API مطلوب — أرسله في ترويسة x-api-key');
      }
      const keyHash = createHash('sha256').update(raw).digest('hex');
      const key = await this.prisma.apiKey.findUnique({ where: { keyHash }, include: { store: { include: { type: true } } } });
      if (!key) throw new UnauthorizedException('مفتاح API غير صالح');
      if (key.status !== 'active') throw new ForbiddenException('هذا المفتاح موقوف');
      if (!key.store || key.store.status !== 'active') throw new ForbiddenException('المتجر غير نشط');

      // الصلاحيات
      const scopes = (key.scopes as string[]) || [];
      const ok = requiredScopes.every((s) => scopes.includes(s) || scopes.includes('*'));
      if (!ok) throw new ForbiddenException(`المفتاح يفتقد صلاحية: ${requiredScopes.join('، ')}`);

      // حد الاستخدام: نافذة 60 ثانية
      const now = Date.now();
      const arr = (windows.get(key.id) || []).filter((t) => now - t < 60_000);
      if (arr.length >= key.ratePerMin) {
        throw new ForbiddenException(`تجاوزت حد الاستخدام (${key.ratePerMin} طلب/دقيقة) — أعد المحاولة بعد لحظات`);
      }
      arr.push(now);
      windows.set(key.id, arr);

      // عدادات (لا ننتظرها حتى لا نبطئ الطلب)
      const day = new Date().toISOString().slice(0, 10);
      this.prisma.apiKey.update({ where: { id: key.id }, data: { totalCalls: { increment: 1 }, lastUsedAt: new Date() } }).catch(() => {});
      this.prisma.apiUsage.upsert({
        where: { keyId_day: { keyId: key.id, day } },
        create: { keyId: key.id, day, calls: 1 },
        update: { calls: { increment: 1 } },
      }).catch(() => {});

      req.apiKey = key;
      req.apiStore = key.store;
      return true;
    }
  }
  return Guard;
}

// تسجيل فشل طلب (يُستدعى من الكنترولر عند رمي خطأ تجاري)
export async function trackApiFail(prisma: PrismaService, keyId: string) {
  const day = new Date().toISOString().slice(0, 10);
  await prisma.apiUsage.upsert({
    where: { keyId_day: { keyId, day } },
    create: { keyId, day, fails: 1 },
    update: { fails: { increment: 1 } },
  }).catch(() => {});
}

export const API_SCOPES: Record<string, string> = {
  'store:read': 'قراءة بيانات المتجر',
  'products:read': 'قراءة المنتجات',
  'orders:read': 'تتبع الطلبات',
  'orders:write': 'إنشاء الطلبات',
};
