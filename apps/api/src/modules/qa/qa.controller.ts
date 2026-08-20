import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { QaService } from './qa.service';

// 💬 أسئلة المنتجات — عامة للزوار والعملاء
@Controller('v1/products')
export class QaPublicController {
  constructor(private svc: QaService) {}

  @Get(':id/questions')
  list(@Param('id') id: string) {
    return this.svc.publicList(id);
  }

  // 🚦 10 أسئلة/ساعة لكل IP — حماية من الإغراق
  @UseGuards(RateLimit(10, 60 * 60_000, 'qa-ask'))
  @Post(':id/questions')
  ask(@Param('id') id: string, @Body() body: any) {
    return this.svc.ask(id, body);
  }
}

// 💬 إدارة الأسئلة — لوحة البائع
@Controller('v1/seller/questions')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class QaSellerController {
  constructor(private svc: QaService) {}

  @Get()
  list(@CurrentUser() u: any, @Query('filter') filter: string) {
    return this.svc.sellerList(u.sub, filter || 'all');
  }

  @Post(':id/answer')
  answer(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.answer(u.sub, id, body);
  }

  @Patch(':id/visibility')
  visibility(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.setVisibility(u.sub, id, !!body.isPublic);
  }
}
