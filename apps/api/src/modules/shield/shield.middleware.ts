import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityService } from '../../common/security.service';
import { ShieldService } from './shield.service';
import { clientIp, createLimiter, hasInjection, isAttackPath, isBotUA } from '../../libs/security';

// 🧱 جدار الحماية الأمامي — يعمل قبل أي مسار:
// 1) فرض حظر IP على كل الطلبات  2) تحديد معدل عام لكل IP
// 3) صد مسارات الهجوم الشائعة   4) كشف أنماط الحقن في الرابط  5) رفض الطلبات بلا متصفح
// كل قواعد الرصد ومحدد المعدل تُستدعى من مكتبة libs/security

// محدد معدل الجدار (ذاكرة مستقلة — كنس كل 1000 عملية)
const shieldLimiter = createLimiter(1000);

@Injectable()
export class ShieldMiddleware implements NestMiddleware {
  private banCache = { at: 0, ips: new Set<string>() };

  constructor(
    private prisma: PrismaService,
    private security: SecurityService,
    private shield: ShieldService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const path = req.path || '';
    if (!path.startsWith('/api')) return next(); // uploads والثابتات تُخدم مباشرة

    const ip = clientIp(req);
    const ua = String(req.headers['user-agent'] || '');

    // ── 1) حظر IP (مخزن مؤقت 30 ثانية) ──
    if (Date.now() - this.banCache.at > 30_000) {
      const rows = await this.prisma.bannedIp.findMany({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        select: { ip: true },
      }).catch(() => [] as any[]);
      this.banCache = { at: Date.now(), ips: new Set(rows.map((r) => r.ip)) };
    }
    if (ip && this.banCache.ips.has(ip)) {
      return res.status(HttpStatus.FORBIDDEN).json({ message: '🚫 عنوانك محظور — تواصل مع إدارة المنصة' });
    }

    // ── 2) جدار التطبيق: مسارات هجومية أو أنماط حقن في الرابط (قواعد libs/security) ──
    const rawUrl = req.originalUrl || '';
    if (isAttackPath(path) || hasInjection(rawUrl)) {
      if (ip) {
        this.security.failAttempt(`ip:${ip}`);
        this.security.failAttempt(`ip:${ip}`); // الاستطلاع الهجومي يُحتسب مضاعفاً
        this.security.log('security.waf_block', { ip, details: { url: rawUrl.slice(0, 200), ua: ua.slice(0, 120) } });
      }
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Not found' }); // 404 — لا نكشف وجود الجدار
    }

    // ── 3) رفض الطلبات الآلية الساذجة (بلا User-Agent حقيقي) ──
    if (isBotUA(ua) && !path.startsWith('/api/v1/health')) {
      if (ip) this.security.log('security.bad_ua', { ip, details: { url: path } });
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Forbidden' });
    }

    // ── 4) تحديد المعدل العام (نافذة انزلاقية من libs/security) ──
    const cfg = await this.shield.getConfig();
    const isAuthZone = path.startsWith('/api/auth/') || path.startsWith('/api/v1/captcha');
    const limit = isAuthZone ? cfg.rateAuthPerMin : cfg.rateGlobalPerMin;
    const key = `${isAuthZone ? 'A' : 'G'}:${ip || 'unknown'}`;
    if (!shieldLimiter.allow(key, limit, 60_000)) {
      if (ip) this.security.failAttempt(`ip:${ip}`);
      return res.status(HttpStatus.TOO_MANY_REQUESTS).json({ message: '⚠️ طلبات كثيرة جداً — انتظر دقيقة وأعد المحاولة' });
    }

    next();
  }
}
