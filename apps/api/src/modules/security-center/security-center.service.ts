import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityService } from '../../common/security.service';
import { SecurityAiService } from './security-ai.service';
import * as argon2 from 'argon2';

@Injectable()
export class SecurityCenterService {
  constructor(
    private prisma: PrismaService,
    private security: SecurityService,
    private ai: SecurityAiService,
  ) {}

  // نظرة عامة: إحصاءات + تحليل التهديدات + خط زمني 14 يوماً + كبار المهاجمين + تقييم الوضع الأمني
  async overview() {
    const since24 = new Date(Date.now() - 24 * 3600 * 1000);
    const since14 = new Date(Date.now() - 13 * 86400000); since14.setHours(0, 0, 0, 0);
    const [logs, totalLogs, bannedCount, pendingDevices, adminsCount, hist, bansList, otpEnabled, activeSessions] = await Promise.all([
      this.prisma.securityLog.findMany({ where: { createdAt: { gte: since24 } }, orderBy: { createdAt: 'desc' }, take: 800 }),
      this.prisma.securityLog.count(),
      this.prisma.bannedIp.count(),
      this.prisma.trustedDevice.count({ where: { status: 'pending' } }),
      this.prisma.adminUser.count(),
      this.prisma.securityLog.findMany({ where: { createdAt: { gte: since14 } }, select: { event: true, ip: true, createdAt: true }, orderBy: { createdAt: 'asc' }, take: 5000 }),
      this.prisma.bannedIp.findMany({ select: { ip: true } }),
      this.security.isOtpEnabled(),
      this.prisma.session.count({ where: { revokedAt: null, expiresAt: { gte: new Date() } } }),
    ]);
    const byEvent: Record<string, number> = {};
    for (const l of logs) byEvent[l.event] = (byEvent[l.event] || 0) + 1;
    const topEvents = Object.entries(byEvent).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([event, count]) => ({ event, count }));
    const analysis = this.ai.analyze(logs);

    // 📈 الخط الزمني — 14 يوماً: محاولات فاشلة / حظر / دخول ناجح
    const days: { date: string; fails: number; bans: number; logins: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), fails: 0, bans: 0, logins: 0 });
    }
    const dayMap = new Map(days.map((d) => [d.date, d]));
    for (const l of hist) {
      const bucket = dayMap.get(l.createdAt.toISOString().slice(0, 10));
      if (!bucket) continue;
      if (/fail|auto_ban/.test(l.event)) bucket.fails++;
      else if (/ban/.test(l.event)) bucket.bans++;
      else if (l.event === 'login_success' || l.event === 'admin_login_success') bucket.logins++;
    }

    // 🎯 أكثر العناوين محاولةً للاختراق (7 أيام) — مع حالة الحظر
    const since7 = new Date(Date.now() - 7 * 86400000);
    const bannedSet = new Set(bansList.map((b) => b.ip));
    const attackerMap = new Map<string, number>();
    for (const l of hist) {
      if (!l.ip || !/fail/.test(l.event) || l.createdAt < since7) continue;
      attackerMap.set(l.ip, (attackerMap.get(l.ip) || 0) + 1);
    }
    const topAttackers = [...attackerMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([ip, attempts]) => ({ ip, attempts, banned: bannedSet.has(ip) }));

    // 🛡️ تقييم الوضع الأمني (Security Posture Score)
    const secretsOk = !!(process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET);
    const checks = [
      { label: 'التحقق برمز OTP مفعّل', ok: otpEnabled, tip: 'فعّل قالب OTP من صفحة الرسائل لحماية التسجيل والدخول' },
      { label: 'مفاتيح JWT مخصّصة (ليست الافتراضية)', ok: secretsOk, tip: 'أضف JWT_SECRET و JWT_REFRESH_SECRET عشوائية إلى ملف .env على الخادم' },
      { label: 'لا أجهزة إدارة بانتظار الاعتماد', ok: pendingDevices === 0, tip: 'راجع تبويب الأجهزة واعتمد أو احظر الأجهزة المعلّقة' },
      { label: 'لا تهديدات عالية الخطورة خلال 24 ساعة', ok: analysis.level !== 'high', tip: 'افحص سجل الأحداث واحظر العناوين المتكررة المحاولة' },
      { label: 'الحظر التلقائي لهجمات التخمين مفعّل', ok: true, tip: '' },
    ];
    const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

    return {
      totalLogs, logs24h: logs.length, bannedCount, pendingDevices, adminsCount, activeSessions,
      topEvents, analysis, timeline: days, topAttackers, posture: { score, checks },
    };
  }

  // سجل الأحداث مع فلاتر
  async logs(q: any) {
    const take = Math.min(Number(q.take) || 60, 200);
    return this.prisma.securityLog.findMany({
      where: {
        ...(q.event ? { event: { contains: q.event } } : {}),
        ...(q.ip ? { ip: { contains: q.ip } } : {}),
        ...(q.userType ? { userType: q.userType } : {}),
      },
      orderBy: { createdAt: 'desc' }, take,
    });
  }

  // 📥 تصدير السجل كملف CSV (UTF-8 مع BOM — يفتح بالعربية في Excel مباشرة)
  async exportLogs(q: any) {
    const rows = await this.prisma.securityLog.findMany({
      where: {
        ...(q.event ? { event: { contains: q.event } } : {}),
        ...(q.ip ? { ip: { contains: q.ip } } : {}),
        ...(q.userType ? { userType: q.userType } : {}),
      },
      orderBy: { createdAt: 'desc' }, take: 1000,
    });
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [
      r.createdAt.toISOString(), r.event, r.userType || '', r.ip || '',
      r.details ? JSON.stringify(r.details) : '',
    ].map(esc).join(','));
    return '﻿' + ['التاريخ,الحدث,نوع المستخدم,عنوان IP,التفاصيل', ...lines].join('\n');
  }

  // 🔑 الجلسات النشطة (بائعون + عملاء) — الأسماء تُجلب يدوياً (لا علاقة مباشرة في المخطط)
  async sessions() {
    const rows = await this.prisma.session.findMany({
      where: { revokedAt: null, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    const sellerIds = [...new Set(rows.map((r) => r.sellerId).filter(Boolean))] as string[];
    const customerIds = [...new Set(rows.map((r) => r.customerId).filter(Boolean))] as string[];
    const [sellers, customers] = await Promise.all([
      sellerIds.length ? this.prisma.seller.findMany({ where: { id: { in: sellerIds } }, select: { id: true, name: true, phone: true } }) : [],
      customerIds.length ? this.prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true, phone: true } }) : [],
    ]);
    const sm = new Map(sellers.map((s) => [s.id, s]));
    const cm = new Map(customers.map((c) => [c.id, c]));
    return rows.map((r) => ({
      id: r.id, ip: r.ip, deviceInfo: r.deviceInfo, createdAt: r.createdAt, expiresAt: r.expiresAt,
      userType: r.sellerId ? 'seller' : 'customer',
      user: r.sellerId ? sm.get(r.sellerId) || null : (r.customerId ? cm.get(r.customerId) || null : null),
    }));
  }

  // إنهاء جلسة عن بُعد (يبطل رمز التحديث فوراً — المستخدم يُطرد عند أول تجديد)
  async revokeSession(adminId: string, id: string) {
    const s = await this.prisma.session.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('الجلسة غير موجودة');
    await this.prisma.session.update({ where: { id }, data: { revokedAt: new Date() } });
    await this.security.log('admin.session_revoked', { userType: 'admin', userId: adminId, details: { sessionId: id, ip: s.ip } });
    return { ok: true };
  }

  // الحظر
  async bans() {
    return this.prisma.bannedIp.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async banIp(adminId: string, body: any) {
    const ip = String(body.ip || '').trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) throw new BadRequestException('عنوان IP غير صالح');
    const exists = await this.prisma.bannedIp.findUnique({ where: { ip } });
    if (exists) throw new BadRequestException('هذا العنوان محظور مسبقاً');
    const ban = await this.prisma.bannedIp.create({
      data: {
        ip, reason: body.reason || 'حظر يدوي من الإدارة', bannedBy: adminId,
        expiresAt: body.days ? new Date(Date.now() + Number(body.days) * 86400000) : null,
      },
    });
    await this.security.log('admin.ip_banned', { userType: 'admin', userId: adminId, details: { ip, reason: ban.reason } });
    return ban;
  }

  async unbanIp(adminId: string, ip: string) {
    await this.prisma.bannedIp.deleteMany({ where: { ip } });
    await this.security.log('admin.ip_unbanned', { userType: 'admin', userId: adminId, details: { ip } });
    return { ok: true };
  }

  // الأجهزة الموثوقة (مع أسماء المديرين يدوياً — لا علاقة مباشرة في المخطط)
  async devices() {
    const devices = await this.prisma.trustedDevice.findMany({ orderBy: { createdAt: 'desc' } });
    const adminIds = [...new Set(devices.map((d) => d.adminId).filter(Boolean))] as string[];
    const admins = await this.prisma.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true, email: true } });
    const map = new Map(admins.map((a) => [a.id, a]));
    return devices.map((d) => ({ ...d, admin: d.adminId ? map.get(d.adminId) || null : null }));
  }

  async setDeviceStatus(adminId: string, id: string, status: 'approved' | 'blocked') {
    if (!['approved', 'blocked'].includes(status)) throw new BadRequestException('حالة غير صالحة');
    const d = await this.prisma.trustedDevice.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('الجهاز غير موجود');
    const updated = await this.prisma.trustedDevice.update({ where: { id }, data: { status } });
    await this.security.log('admin.device_' + status, { userType: 'admin', userId: adminId, details: { fingerprint: d.fingerprint, deviceName: d.name } });
    return updated;
  }

  // المديرون
  async admins() {
    const list = await this.prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } });
    return list.map((a) => ({
      id: a.id, name: a.name, email: a.email, isSuper: a.isSuper,
      permissions: (a.permissions as string[]) || [], status: a.status,
      lastLoginAt: a.lastLoginAt, createdAt: a.createdAt,
    }));
  }

  // 👑 صاحب القرار الأول: إدارة حسابات المدراء حصراً للمشرف العام
  // (نقرأ isSuper من قاعدة البيانات — رمز JWT لا يحملها)
  private async requireSuper(actorId: string) {
    const actor = await this.prisma.adminUser.findUnique({ where: { id: actorId } });
    if (!actor || actor.status !== 'active') throw new ForbiddenException('حساب الإدارة غير نشط');
    if (!actor.isSuper) throw new ForbiddenException('إدارة حسابات المدراء للمشرف العام فقط — صاحب القرار الأول');
    return actor;
  }

  async createAdmin(actor: any, body: any) {
    await this.requireSuper(actor.sub);
    if (!body.email || !body.password || !body.name) throw new BadRequestException('الاسم والبريد وكلمة المرور مطلوبة');
    if (String(body.password).length < 8) throw new BadRequestException('كلمة المرور 8 أحرف على الأقل');
    const email = String(body.email).trim().toLowerCase();
    const dup = await this.prisma.adminUser.findUnique({ where: { email } });
    if (dup) throw new BadRequestException('البريد مستخدم مسبقاً');
    const perms = Array.isArray(body.permissions) ? body.permissions.filter((p: any) => typeof p === 'string') : [];
    const admin = await this.prisma.adminUser.create({
      data: {
        name: body.name, email,
        passwordHash: await argon2.hash(body.password),
        isSuper: false, permissions: perms,
      },
    });
    await this.security.log('admin.created', { userType: 'admin', userId: actor.sub, details: { newAdmin: admin.email, perms } });
    return { id: admin.id, email: admin.email };
  }

  async updateAdmin(actor: any, id: string, body: any) {
    await this.requireSuper(actor.sub);
    const target = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('المدير غير موجود');
    const data: any = {};
    if (Array.isArray(body.permissions)) data.permissions = body.permissions.filter((p: any) => typeof p === 'string');
    if (body.status && ['active', 'suspended'].includes(body.status)) {
      if (target.isSuper) throw new ForbiddenException('لا يمكن تعليق المشرف العام');
      data.status = body.status;
    }
    if (body.password) {
      if (String(body.password).length < 8) throw new BadRequestException('كلمة المرور 8 أحرف على الأقل');
      data.passwordHash = await argon2.hash(body.password);
    }
    if (body.name) data.name = body.name;
    const updated = await this.prisma.adminUser.update({ where: { id }, data });
    await this.security.log('admin.updated', { userType: 'admin', userId: actor.sub, details: { target: target.email, fields: Object.keys(data) } });
    return { id: updated.id };
  }

  async deleteAdmin(actor: any, id: string) {
    await this.requireSuper(actor.sub);
    const target = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('المدير غير موجود');
    if (target.isSuper) throw new ForbiddenException('لا يمكن حذف المشرف العام');
    if (actor.sub === id) throw new BadRequestException('لا يمكنك حذف حسابك');
    await this.prisma.adminUser.delete({ where: { id } });
    await this.security.log('admin.deleted', { userType: 'admin', userId: actor.sub, details: { target: target.email } });
    return { ok: true };
  }
}
