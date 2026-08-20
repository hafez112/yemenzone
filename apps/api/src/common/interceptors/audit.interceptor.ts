import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

// 📜 سجل التدقيق الإداري — يسجّل كل إجراء معدِّل (POST/PATCH/PUT/DELETE)
// داخل مسارات /admin/* مع هوية المدير والعنوان والنتيجة — دون إبطاء الاستجابة
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const method: string = req.method;
    const path: string = (req.originalUrl || req.url || '').split('?')[0];
    const isAdminMutation =
      req.user?.typ === 'admin' &&
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) &&
      path.startsWith('/api/admin');

    return next.handle().pipe(
      tap({
        next: () => { if (isAdminMutation) this.write(req, method, path, 200); },
        error: (err) => { if (isAdminMutation) this.write(req, method, path, err?.status || 500); },
      }),
    );
  }

  private write(req: any, method: string, path: string, status: number) {
    // 🔥 إطلاق ونسيان — فشل التسجيل لا يوقف عمل الإدارة
    this.prisma.auditLog.create({
      data: {
        adminId: req.user.sub,
        adminName: req.user.name || null,
        method,
        path: path.slice(0, 190),
        status,
        ip: req.ip || req.headers?.['x-forwarded-for'] || null,
        userAgent: (req.headers?.['user-agent'] || '').slice(0, 150) || null,
      },
    }).catch(() => {});
  }
}
