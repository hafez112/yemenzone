import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebPushService } from './push.service';

// 🔔 خدمة التنبيهات الداخلية — عالمية، تُحقن في أي خدمة لدفع تنبيه عند حدث
@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService, private webPush: WebPushService) {}

  // دفع تنبيه — لا يرمي أخطاء أبداً حتى لا يعطّل العملية الأم
  async push(userType: 'seller' | 'customer' | 'driver', userId: string, n: { icon?: string; title: string; body?: string; link?: string }) {
    const row = await this.prisma.notification.create({
      data: {
        userType, userId,
        icon: n.icon || '🔔',
        title: n.title,
        body: n.body || null,
        link: n.link || null,
      },
    }).catch(() => null);
    // 🔔 ويب بوش بالتوازي — يصل حتى والمتصفح مغلق (إطلاق ونسيان)
    if (row) {
      this.webPush.sendToUser(userType, userId, { title: n.title, body: n.body, url: n.link || '/' }).catch(() => {});
    }
    return row;
  }

  // تنبيهاتي + عدد غير المقروء
  async my(userType: string, userId: string) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userType, userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({ where: { userType, userId, isRead: false } }),
    ]);
    return { items, unread };
  }

  async unreadCount(userType: string, userId: string) {
    const count = await this.prisma.notification.count({ where: { userType, userId, isRead: false } });
    return { count };
  }

  markRead(userType: string, userId: string, id?: string) {
    return this.prisma.notification.updateMany({
      where: { userType, userId, ...(id ? { id } : {}) },
      data: { isRead: true },
    });
  }

  // تنظيف تلقائي: حذف المقروءة الأقدم من 30 يوماً (يُستدعى عند كل جلب)
  async prune(userType: string, userId: string) {
    const before = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.prisma.notification.deleteMany({
      where: { userType, userId, isRead: true, createdAt: { lt: before } },
    }).catch(() => {});
  }

  // ═══ 📡 البث الجماعي — حملة تنبيهات موزعة على دفعات مع إحصائية قراءة حية ═══
  async broadcast(createdBy: string, data: {
    title: string; body?: string; link?: string;
    audience: 'sellers' | 'customers' | 'store_customers'; storeId?: string;
  }) {
    const title = (data.title || '').trim();
    if (!title) throw new BadRequestException('عنوان الحملة مطلوب');
    if (title.length > 120) throw new BadRequestException('العنوان طويل — الحد 120 حرفاً');
    const body = (data.body || '').trim();
    if (body.length > 500) throw new BadRequestException('نص الحملة طويل — الحد 500 حرف');
    const link = (data.link || '').trim();
    if (link && !/^(https?:\/\/|\/)/.test(link)) throw new BadRequestException('الرابط غير صالح');

    // تحديد المستلمين
    let userType: 'seller' | 'customer';
    let userIds: string[] = [];
    if (data.audience === 'sellers') {
      userType = 'seller';
      const rows = await this.prisma.seller.findMany({ where: { status: 'active' }, select: { id: true } });
      userIds = rows.map((r) => r.id);
    } else if (data.audience === 'customers') {
      userType = 'customer';
      const rows = await this.prisma.customer.findMany({ select: { id: true } });
      userIds = rows.map((r) => r.id);
    } else if (data.audience === 'store_customers' && data.storeId) {
      userType = 'customer';
      // زبائن المتجر = من طلب منه + من أعجب به
      const [buyers, likers] = await Promise.all([
        this.prisma.order.findMany({
          where: { storeId: data.storeId, customerId: { not: null } },
          select: { customerId: true }, distinct: ['customerId'],
        }),
        this.prisma.storeLike.findMany({ where: { storeId: data.storeId }, select: { customerId: true } }),
      ]);
      userIds = [...new Set([...buyers.map((b) => b.customerId!), ...likers.map((l) => l.customerId)])];
    } else {
      throw new BadRequestException('جمهور الحملة غير صالح');
    }
    if (!userIds.length) throw new BadRequestException('لا يوجد مستلمون لهذه الحملة بعد');

    const bc = await this.prisma.broadcast.create({
      data: {
        title, body: body || null, link: link || null,
        audience: data.audience, storeId: data.storeId || null,
        sentCount: userIds.length, createdBy,
      },
    });

    // التوزيع على دفعات 500 — حماية من الضغط على قاعدة البيانات
    const icon = createdBy.startsWith('admin') ? '📡' : '🎁';
    for (let i = 0; i < userIds.length; i += 500) {
      await this.prisma.notification.createMany({
        data: userIds.slice(i, i + 500).map((uid) => ({
          userType, userId: uid, icon, title, body: body || null, link: link || null, broadcastId: bc.id,
        })),
      }).catch(() => {});
    }
    return bc;
  }

  // سجل الحملات مع نسبة القراءة الحية — للإدارة (الكل) أو لبائع (حملاته فقط)
  async listBroadcasts(opts: { admin?: boolean; sellerId?: string }) {
    const items = await this.prisma.broadcast.findMany({
      where: opts.admin ? {} : { createdBy: `seller:${opts.sellerId}` },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    if (!items.length) return [];
    const reads = await this.prisma.notification.groupBy({
      by: ['broadcastId'],
      where: { broadcastId: { in: items.map((b) => b.id) }, isRead: true },
      _count: { _all: true },
    });
    const readMap: Record<string, number> = {};
    for (const r of reads) if (r.broadcastId) readMap[r.broadcastId] = r._count._all;
    // أسماء المتاجر لحملات البائعين (تظهر للإدارة)
    const storeIds = [...new Set(items.filter((b) => b.storeId).map((b) => b.storeId!))];
    const stores = storeIds.length
      ? await this.prisma.store.findMany({ where: { id: { in: storeIds } }, select: { id: true, name: true } })
      : [];
    const storeMap = Object.fromEntries(stores.map((s) => [s.id, s.name]));
    return items.map((b) => ({
      ...b,
      readCount: readMap[b.id] || 0,
      storeName: b.storeId ? storeMap[b.storeId] || null : null,
      fromAdmin: b.createdBy.startsWith('admin'),
    }));
  }

  // عدد زبائن المتجر القابلين للوصول (لصفحة حملات البائع)
  async reachableCustomers(storeId: string) {
    const [buyers, likers] = await Promise.all([
      this.prisma.order.findMany({
        where: { storeId, customerId: { not: null } },
        select: { customerId: true }, distinct: ['customerId'],
      }),
      this.prisma.storeLike.findMany({ where: { storeId }, select: { customerId: true } }),
    ]);
    const unique = new Set([...buyers.map((b) => b.customerId!), ...likers.map((l) => l.customerId)]);
    return { count: unique.size, buyers: buyers.length, likers: likers.length };
  }
}
