import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';
import { RateLimit } from '../../common/guards/rate-limit.guard';

// 💬 محادثات العميل
@Controller('customer/chats')
@UseGuards(AuthGuard, RolesGuard('customer'))
export class CustomerChatController {
  constructor(private chat: ChatService) {}

  @Get()
  list(@CurrentUser() u: any) { return this.chat.customerList(u.sub); }

  @Get(':slug')
  open(@CurrentUser() u: any, @Param('slug') slug: string) { return this.chat.customerOpen(u.sub, slug); }

  // 🚦 20 رسالة/دقيقة — حماية من الإغراق
  @UseGuards(RateLimit(20, 60_000, 'chat'))
  @Post(':slug')
  send(@CurrentUser() u: any, @Param('slug') slug: string, @Body() b: { body: string }) {
    return this.chat.customerSend(u.sub, slug, b?.body || '');
  }
}

// 💬 محادثات البائع
@Controller('seller/chats')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerChatController {
  constructor(private chat: ChatService) {}

  @Get()
  list(@CurrentUser() u: any) { return this.chat.sellerList(u.sub); }

  @Get('unread')
  unread(@CurrentUser() u: any) { return this.chat.sellerUnread(u.sub); }

  @Get(':id/messages')
  messages(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.sellerMessages(u.sub, id); }

  @UseGuards(RateLimit(20, 60_000, 'chat'))
  @Post(':id/messages')
  reply(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { body: string }) {
    return this.chat.sellerReply(u.sub, id, b?.body || '');
  }
}
