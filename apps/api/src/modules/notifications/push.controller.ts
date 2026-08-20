import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { WebPushService } from './push.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';

// 🔔 إدارة اشتراكات إشعارات الويب
@Controller('push')
export class PushController {
  constructor(private push: WebPushService) {}

  // المفتاح العام — مطلوب للمتصفح عند الاشتراك
  @Get('vapid')
  vapid() { return this.push.getPublicKey(); }

  @Post('subscribe')
  @UseGuards(AuthGuard)
  subscribe(@CurrentUser() u: any, @Body() b: any) {
    return this.push.subscribe(u.typ, u.sub, b);
  }

  @Post('unsubscribe')
  @UseGuards(AuthGuard)
  unsubscribe(@Body() b: { endpoint: string }) {
    return this.push.unsubscribe(b?.endpoint || '');
  }
}
