import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// حارس المصادقة: يتحقق من JWT ويمنع الوصول بدون تسجيل دخول
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('يجب تسجيل الدخول أولاً');
    try {
      req.user = await this.jwt.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException('الجلسة منتهية — سجّل الدخول مجدداً');
    }
  }
}

// حارس الأدوار: seller | customer | admin
export function RolesGuard(...roles: string[]) {
  @Injectable()
  class Guard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
      const req = ctx.switchToHttp().getRequest();
      if (!req.user) throw new UnauthorizedException('يجب تسجيل الدخول');
      if (!roles.includes(req.user.typ)) {
        throw new ForbiddenException('ليس لديك صلاحية الوصول');
      }
      return true;
    }
  }
  return Guard;
}
