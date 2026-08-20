import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityService } from '../../common/security.service';
import { WebPushService } from '../notifications/push.service';

const TYPE_AR: Record<string, string> = { seller: 'بائع', driver: 'سائق', customer: 'عميل' };

@Injectable()
export class PwaService {
  constructor(private prisma: PrismaService, private security: SecurityService, private webPush: WebPushService) {}

  // اسم المستخدم حسب نوعه — لعرضه للإدارة عند المراجعة
  private async userName(userType: string, userId: string): Promise<string> {
    try {
      if (userType === 'seller') {
        const s = await this.prisma.seller.findUnique({ where: { id: userId }, include: { stores: { select: { name: true }, take: 1 } } });
        return s ? `${s.name}${s.stores[0] ? ` — ${s.stores[0].name}` : ''}` : 'بائع';
      }
      if (userType === 'driver') {
        const d = await this.prisma.driver.findUnique({ where: { id: userId } });
        return d?.name || 'سائق';
      }
      const c = await this.prisma.customer.findUnique({ where: { id: userId } });
      return c?.name || 'عميل';
    } catch { return TYPE_AR[userType] || 'مستخدم'; }
  }

  // 📱 المستخدم يطلب تطبيق ويب تقدمي للوحته
  async request(user: any) {
    const { sub: userId, typ: userType } = user;
    if (!['seller', 'driver', 'customer'].includes(userType)) {
      throw new BadRequestException('طلبات التطبيقات للبائعين والسائقين والعملاء فقط');
    }
    const existing = await this.prisma.pwaRequest.findFirst({
      where: { userType, userId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing?.status === 'pending') {
      return { request: existing, message: '⏳ طلبك قيد مراجعة الإدارة بالفعل' };
    }
    if (existing?.status === 'approved') {
      return { request: existing, message: '✅ تطبيقك معتمد — ثبّت لوحتك الآن' };
    }
    const created = await this.prisma.pwaRequest.create({
      data: { userType, userId, userName: await this.userName(userType, userId) },
    });
    await this.security.log('pwa.request', { userType, userId });
    // 📲 تنبيه فوري للإدارة — يصل حتى ولوحة التحكم مغلقة
    this.webPush.sendToAdmins({
      title: '📱 طلب تطبيق ويب جديد',
      body: `${created.userName} (${TYPE_AR[userType]}) يطلب اعتماد تطبيق لوحته`,
      url: '/admin/pwa-apps',
    });
    return { request: created, message: '📱 أُرسل طلبك — ستُفعّل ميزة التثبيت فور موافقة الإدارة' };
  }

  // حالة طلبي
  async my(user: any) {
    const request = await this.prisma.pwaRequest.findFirst({
      where: { userType: user.typ, userId: user.sub },
      orderBy: { createdAt: 'desc' },
    });
    return { request, approved: request?.status === 'approved' };
  }

  // ═══ الإدارة ═══
  async adminList(status?: string) {
    const where = status ? { status } : {};
    const [items, pending, approved, rejected] = await Promise.all([
      this.prisma.pwaRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
      this.prisma.pwaRequest.count({ where: { status: 'pending' } }),
      this.prisma.pwaRequest.count({ where: { status: 'approved' } }),
      this.prisma.pwaRequest.count({ where: { status: 'rejected' } }),
    ]);
    return { items, counts: { pending, approved, rejected } };
  }

  async review(id: string, adminId: string, approve: boolean, note?: string) {
    const req = await this.prisma.pwaRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    const updated = await this.prisma.pwaRequest.update({
      where: { id },
      data: {
        status: approve ? 'approved' : 'rejected',
        note: note?.trim() || null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });
    await this.security.log(approve ? 'pwa.approved' : 'pwa.rejected', {
      userType: 'admin', userId: adminId,
      details: { target: `${req.userType}:${req.userId}`, name: req.userName },
    });
    return updated;
  }
}
