import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as webpush from 'web-push';

// 🔔 إشعارات الويب الفورية (Web Push) — تصل حتى والمتصفح مغلق
// مفاتيح VAPID تُولَّد ذاتياً أول مرة وتُحفظ في الإعدادات
@Injectable()
export class WebPushService {
  private ready = false;
  private publicKey = '';

  constructor(private prisma: PrismaService) {}

  private async ensureKeys() {
    if (this.ready) return;
    let row = await this.prisma.setting.findUnique({ where: { key: 'push_vapid' } });
    if (!row) {
      const keys = webpush.generateVAPIDKeys();
      row = await this.prisma.setting.create({
        data: { key: 'push_vapid', group: 'general', value: keys as any },
      });
    }
    const v = row.value as any;
    this.publicKey = v.publicKey;
    webpush.setVapidDetails('mailto:support@yemenzone1.com', v.publicKey, v.privateKey);
    this.ready = true;
  }

  async getPublicKey() {
    await this.ensureKeys();
    return { publicKey: this.publicKey };
  }

  async subscribe(userType: string, userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: { userType, userId, keys: sub.keys as any },
      create: { userType, userId, endpoint: sub.endpoint, keys: sub.keys as any },
    });
    return { ok: true };
  }

  async unsubscribe(endpoint: string) {
    if (!endpoint) return { ok: false };
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { ok: true };
  }

  // إرسال لكل أجهزة المستخدم — صامت تماماً، والاشتراكات الميتة تُكنس تلقائياً
  async sendToUser(userType: string, userId: string, payload: { title: string; body?: string; url?: string; icon?: string }) {
    try {
      await this.ensureKeys();
      const subs = await this.prisma.pushSubscription.findMany({ where: { userType, userId } });
      for (const s of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: s.keys as any },
            JSON.stringify({ ...payload, icon: payload.icon || '/icons/icon-192.png' }),
            { TTL: 3600 },
          );
        } catch (e: any) {
          // الاشتراك انتهى أو أُلغي — احذفه
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          }
        }
      }
    } catch {}
  }

  // 🛡️ إرسال لكل أجهزة كل المديرين — تنبيهات المنصة الحرجة تصل حتى ولوحة الإدارة مغلقة
  async sendToAdmins(payload: { title: string; body?: string; url?: string; icon?: string }) {
    try {
      await this.ensureKeys();
      const subs = await this.prisma.pushSubscription.findMany({ where: { userType: 'admin' } });
      for (const s of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: s.keys as any },
            JSON.stringify({ ...payload, icon: payload.icon || '/icons/icon-192.png' }),
            { TTL: 3600 },
          );
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          }
        }
      }
    } catch {}
  }
}
