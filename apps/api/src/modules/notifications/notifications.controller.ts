import { BadRequestException, Body, Controller, Get, NotFoundException, Patch, Post, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';
import { requireFeature } from '../../common/features';

// 🔔 تنبيهات البائع الداخلية
@Controller('seller/notifications')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerNotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  async my(@CurrentUser() u: any) {
    const result = await this.svc.my('seller', u.sub);
    this.svc.prune('seller', u.sub); // تنظيف صامت في الخلفية
    return result;
  }

  @Get('unread-count')
  unread(@CurrentUser() u: any) { return this.svc.unreadCount('seller', u.sub); }

  @Patch('read-all')
  readAll(@CurrentUser() u: any) { return this.svc.markRead('seller', u.sub); }

  @Patch(':id/read')
  readOne(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.markRead('seller', u.sub, id); }
}

// 🔔 تنبيهات الزبون الداخلية — تصله ردود المتاجر وحملات المنصة
@Controller('customer/notifications')
@UseGuards(AuthGuard, RolesGuard('customer'))
export class CustomerNotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  async my(@CurrentUser() u: any) {
    const result = await this.svc.my('customer', u.sub);
    this.svc.prune('customer', u.sub);
    return result;
  }

  @Get('unread-count')
  unread(@CurrentUser() u: any) { return this.svc.unreadCount('customer', u.sub); }

  @Patch('read-all')
  readAll(@CurrentUser() u: any) { return this.svc.markRead('customer', u.sub); }

  @Patch(':id/read')
  readOne(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.markRead('customer', u.sub, id); }
}

// 📡 مركز البث الجماعي — الإدارة ترسل لكل البائعين أو كل الزبائن
@Controller('admin/broadcasts')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('messaging'))
export class AdminBroadcastController {
  constructor(private svc: NotificationsService) {}

  @Get()
  list() { return this.svc.listBroadcasts({ admin: true }); }

  @Post()
  send(@CurrentUser() u: any, @Body() body: any) {
    if (!['sellers', 'customers'].includes(body.audience)) {
      throw new BadRequestException('الجمهور: sellers أو customers');
    }
    return this.svc.broadcast(`admin:${u.sub}`, {
      title: body.title, body: body.body, link: body.link, audience: body.audience,
    });
  }
}

// 🎁 حملات البائع لزبائن متجره — ميزة مدفوعة يتحكم بها المدير (campaigns)
@Controller('seller/campaigns')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerCampaignsController {
  constructor(private svc: NotificationsService, private prisma: PrismaService) {}

  private async myStore(sellerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { sellerId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    return store;
  }

  @Get()
  async my(@CurrentUser() u: any) {
    const store = await this.myStore(u.sub);
    const [campaigns, reachable] = await Promise.all([
      this.svc.listBroadcasts({ sellerId: u.sub }),
      this.svc.reachableCustomers(store.id),
    ]);
    // آخر حملة — حماية من الإزعاج: حملة واحدة كل 24 ساعة
    const last = campaigns[0]?.createdAt || null;
    const canSendAt = last ? new Date(new Date(last).getTime() + 24 * 60 * 60 * 1000) : null;
    return { campaigns, reachable, canSendAt: canSendAt && canSendAt > new Date() ? canSendAt : null };
  }

  @Post()
  async send(@CurrentUser() u: any, @Body() body: any) {
    const store = await this.myStore(u.sub);
    requireFeature(store, 'campaigns'); // 🔒 ميزة مدفوعة أو منحة إدارية

    // حملة واحدة كل 24 ساعة
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.prisma.broadcast.count({
      where: { createdBy: `seller:${u.sub}`, createdAt: { gte: dayAgo } },
    });
    if (recent > 0) throw new BadRequestException('يمكنك إرسال حملة واحدة كل 24 ساعة — حمايةً لزبائنك من الإزعاج');

    return this.svc.broadcast(`seller:${u.sub}`, {
      title: body.title, body: body.body, link: body.link || `/store/${store.slug}`,
      audience: 'store_customers', storeId: store.id,
    });
  }
}
