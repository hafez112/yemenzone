import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// 🛡️ حدود الحظر التلقائي للهجمات
const AUTO_BAN_THRESHOLD = 12; // محاولة فاشلة من نفس IP خلال النافذة الزمنية
const AUTO_BAN_HOURS = 24;

// خدمة الأمن المركزية: رموز JWT + سجل الأحداث + حظر IP + محاولات الدخول
@Injectable()
export class SecurityService {
  private attempts = new Map<string, { count: number; until: number }>();

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  // ── توليد زوج الرموز (وصول + تحديث) ──
  async issueTokens(userType: 'seller' | 'customer' | 'admin' | 'driver', userId: string) {
    const payload = { sub: userId, typ: userType };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret-32chars',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any,
    });
    return { accessToken, refreshToken };
  }

  async verifyRefresh(token: string) {
    return this.jwt.verifyAsync(token, {
      secret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret-32chars',
    });
  }

  // ── حماية محاولات الدخول (Rate Limit) ──
  checkAttempts(key: string, max = 5, windowMs = 10 * 60 * 1000): boolean {
    const rec = this.attempts.get(key);
    if (!rec) return true;
    if (Date.now() > rec.until) { this.attempts.delete(key); return true; }
    return rec.count < max;
  }
  failAttempt(key: string, windowMs = 10 * 60 * 1000) {
    const rec = this.attempts.get(key) || { count: 0, until: Date.now() + windowMs };
    rec.count++;
    this.attempts.set(key, rec);
    // 🛡️ حظر تلقائي: إذا تجاوزت المحاولات الفاشلة من نفس IP الحد → حظر مؤقت + تسجيل الحدث
    const ipMatch = key.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (ipMatch && rec.count >= AUTO_BAN_THRESHOLD) this.autoBan(ipMatch[1]).catch(() => {});
  }
  clearAttempts(key: string) { this.attempts.delete(key); }

  // ── حظر IP تلقائياً (يُستدعى داخلياً عند رصد هجوم تخمين) ──
  private async autoBan(ip: string) {
    const existing = await this.prisma.bannedIp.findUnique({ where: { ip } }).catch(() => null);
    if (existing) return;
    await this.prisma.bannedIp.create({
      data: {
        ip,
        reason: '🤖 حظر تلقائي: محاولات فاشلة متكررة (حماية من التخمين)',
        bannedBy: 'system',
        expiresAt: new Date(Date.now() + AUTO_BAN_HOURS * 3600_000),
      },
    }).catch(() => {});
    await this.log('security.auto_ban', { ip, details: { threshold: AUTO_BAN_THRESHOLD, hours: AUTO_BAN_HOURS } });
  }

  // ── إدارة الجلسات (Refresh Token) — تجزئة SHA-256، لا يُحفظ التوكن الخام أبداً ──
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // تسجيل جلسة جديدة عند تسجيل الدخول
  async recordSession(type: 'seller' | 'customer', userId: string, refreshToken: string, ip?: string) {
    await this.prisma.session.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        ip: ip || null,
        sellerId: type === 'seller' ? userId : null,
        customerId: type === 'customer' ? userId : null,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600_000),
      },
    }).catch(() => {});
  }

  // فحص حالة الجلسة عند طلب تحديث الرمز
  async touchSession(refreshToken: string): Promise<'ok' | 'missing' | 'revoked' | 'expired'> {
    const s = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
    }).catch(() => null);
    if (!s) return 'missing';
    if (s.revokedAt) return 'revoked';
    if (s.expiresAt < new Date()) return 'expired';
    return 'ok';
  }

  // تدوير الجلسة: ربطها برمز التحديث الجديد (يبطل الرمز القديم فوراً)
  async rotateSession(oldToken: string, newToken: string) {
    await this.prisma.session.updateMany({
      where: { tokenHash: this.hashToken(oldToken), revokedAt: null },
      data: { tokenHash: this.hashToken(newToken) },
    }).catch(() => {});
  }

  // إنهاء جلسة (من لوحة الأمن أو عند تغيير كلمة المرور)
  async revokeSessionById(id: string) {
    await this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    }).catch(() => {});
  }

  // ── فحص IP محظور ──
  async isIpBanned(ip: string): Promise<boolean> {
    if (!ip) return false;
    const rec = await this.prisma.bannedIp.findUnique({ where: { ip } });
    if (!rec) return false;
    if (rec.expiresAt && rec.expiresAt < new Date()) {
      await this.prisma.bannedIp.delete({ where: { ip } });
      return false;
    }
    return true;
  }

  // ── تسجيل حدث أمني ──
  async log(event: string, data: { ip?: string; userType?: string; userId?: string; details?: any }) {
    await this.prisma.securityLog.create({
      data: {
        event,
        ip: data.ip,
        userType: data.userType,
        userId: data.userId,
        details: data.details ?? undefined,
      },
    }).catch(() => {});
  }

  // ── هل قالب OTP مفعّل؟ ──
  async isOtpEnabled(): Promise<boolean> {
    const t = await this.prisma.messageTemplate.findUnique({ where: { event: 'otp' } });
    return !!t?.isActive;
  }
}
