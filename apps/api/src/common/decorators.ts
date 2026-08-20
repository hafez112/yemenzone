import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// استخراج المستخدم الحالي من الطلب
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user; // { sub: userId, typ: seller|customer|admin }
  },
);

// استخراج IP الزائر
export const ClientIp = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '').trim();
  },
);
