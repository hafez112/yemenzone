import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createLimiter } from '../../libs/security';

// 🚦 تحديد معدل الطلبات — نافذة انزلاقية لكل (نطاق + عنوان IP)
// يحمي نقاط الدخول الحساسة من التخمين والقصف الآلي
// المحدد يُستدعى من مكتبة libs/security

// محدد مشترك لكل حراس المعدل (ذاكرة واحدة — كنس كل 500 عملية)
const guardLimiter = createLimiter(500);

export function RateLimit(limit: number, windowMs: number, scope: string) {
  @Injectable()
  class Guard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
      const req = ctx.switchToHttp().getRequest();
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      if (!guardLimiter.allow(`${scope}:${ip}`, limit, windowMs)) {
        throw new HttpException(
          `⚠️ طلبات كثيرة جداً — انتظر ${Math.ceil(windowMs / 60000)} دقيقة ثم أعد المحاولة`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return true;
    }
  }
  return Guard;
}
