import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from './realtime.gateway';

// 💬 المحادثة المباشرة — عميل ↔ بائع، داخل المنصة بسجل محفوظ
@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private realtime: RealtimeGateway,
  ) {}

  private clean(body: string) {
    const t = (body || '').trim().slice(0, 500);
    if (!t) throw new BadRequestException('الرسالة فارغة');
    return t;
  }

  // ── العميل: فتح محادثة مع متجر (تُنشأ عند أول رسالة) ──
  async customerOpen(customerId: string, storeSlug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug },
      select: { id: true, name: true, slug: true, logo: true, status: true },
    });
    if (!store || store.status !== 'active') throw new NotFoundException('المتجر غير متاح');

    const conv = await this.prisma.conversation.upsert({
      where: { storeId_customerId: { storeId: store.id, customerId } },
      update: {},
      create: { storeId: store.id, customerId },
    });

    // قراءة رسائل البائع
    await this.prisma.chatMessage.updateMany({
      where: { conversationId: conv.id, fromType: 'seller', readAt: null },
      data: { readAt: new Date() },
    });

    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' }, take: 100,
    });
    return { conversation: { id: conv.id }, store, messages };
  }

  // ── العميل: إرسال ──
  async customerSend(customerId: string, storeSlug: string, body: string) {
    const text = this.clean(body);
    const store = await this.prisma.store.findUnique({ where: { slug: storeSlug }, select: { id: true, name: true, sellerId: true, status: true } });
    if (!store || store.status !== 'active') throw new NotFoundException('المتجر غير متاح');

    const conv = await this.prisma.conversation.upsert({
      where: { storeId_customerId: { storeId: store.id, customerId } },
      update: {},
      create: { storeId: store.id, customerId },
    });
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { name: true } });

    const msg = await this.prisma.chatMessage.create({
      data: { conversationId: conv.id, fromType: 'customer', body: text },
    });

    // 🔔 تنبيه البائع فوراً (داخلي + ويب بوش)
    await this.notifications.push('seller', store.sellerId, {
      icon: '💬',
      title: `رسالة جديدة من ${customer?.name || 'عميل'}`,
      body: text.slice(0, 80),
      link: '/seller/chats',
    });
    // ⚡ بث لحظي للبائع — تظهر الرسالة فوراً دون انتظار الاستطلاع
    this.realtime.toUser('seller', store.sellerId, 'chat:message', {
      conversationId: conv.id, from: 'customer', message: msg,
    });
    return msg;
  }

  // ── العميل: قائمة محادثاته ──
  async customerList(customerId: string) {
    const convs = await this.prisma.conversation.findMany({
      where: { customerId },
      include: {
        store: { select: { name: true, slug: true, logo: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const unread = await Promise.all(convs.map((c) =>
      this.prisma.chatMessage.count({ where: { conversationId: c.id, fromType: 'seller', readAt: null } })));
    return convs.map((c, i) => ({
      id: c.id, store: c.store, lastMessage: c.messages[0] || null,
      unread: unread[i], updatedAt: c.updatedAt,
    }));
  }

  // ── البائع: قائمة محادثات متجره ──
  async sellerList(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId }, select: { id: true } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    const convs = await this.prisma.conversation.findMany({
      where: { storeId: store.id },
      include: {
        customer: { select: { name: true, phone: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const unread = await Promise.all(convs.map((c) =>
      this.prisma.chatMessage.count({ where: { conversationId: c.id, fromType: 'customer', readAt: null } })));
    return convs.map((c, i) => ({
      id: c.id, customer: c.customer, lastMessage: c.messages[0] || null,
      unread: unread[i], updatedAt: c.updatedAt,
    }));
  }

  // ── البائع: فتح محادثة + تعليم رسائل العميل كمقروءة ──
  async sellerMessages(sellerId: string, convId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId }, select: { id: true } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    const conv = await this.prisma.conversation.findUnique({ where: { id: convId }, include: { customer: { select: { name: true, phone: true } } } });
    if (!conv || conv.storeId !== store.id) throw new ForbiddenException('هذه المحادثة ليست لمتجرك');
    await this.prisma.chatMessage.updateMany({
      where: { conversationId: convId, fromType: 'customer', readAt: null },
      data: { readAt: new Date() },
    });
    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId: convId }, orderBy: { createdAt: 'asc' }, take: 100,
    });
    return { customer: conv.customer, messages };
  }

  // ── البائع: رد ──
  async sellerReply(sellerId: string, convId: string, body: string) {
    const text = this.clean(body);
    const store = await this.prisma.store.findFirst({ where: { sellerId }, select: { id: true, name: true } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    const conv = await this.prisma.conversation.findUnique({ where: { id: convId } });
    if (!conv || conv.storeId !== store.id) throw new ForbiddenException('هذه المحادثة ليست لمتجرك');

    const msg = await this.prisma.chatMessage.create({
      data: { conversationId: convId, fromType: 'seller', body: text },
    });

    // 🔔 تنبيه العميل فوراً — الرابط يفتح المحادثة مباشرة
    const st = await this.prisma.store.findUnique({ where: { id: store.id }, select: { slug: true } });
    await this.notifications.push('customer', conv.customerId, {
      icon: '💬',
      title: `ردّ عليك متجر ${store.name}`,
      body: text.slice(0, 80),
      link: `/customer/chat/${st!.slug}`,
    });
    // ⚡ بث لحظي للعميل
    this.realtime.toUser('customer', conv.customerId, 'chat:message', {
      conversationId: convId, from: 'seller', message: msg,
    });
    return msg;
  }

  // 🔔 عدّاد رسائل غير مقروءة للبائع (لشارة القائمة)
  async sellerUnread(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId }, select: { id: true } });
    if (!store) return { count: 0 };
    const convs = await this.prisma.conversation.findMany({ where: { storeId: store.id }, select: { id: true } });
    if (!convs.length) return { count: 0 };
    const count = await this.prisma.chatMessage.count({
      where: { conversationId: { in: convs.map((c) => c.id) }, fromType: 'customer', readAt: null },
    });
    return { count };
  }
}
