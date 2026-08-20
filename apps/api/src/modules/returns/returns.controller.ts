import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';

// ── العميل (عام — برقم الطلب والجوال، كصفحة التتبع) ──
@Controller('v1/returns')
export class PublicReturnsController {
  constructor(private svc: ReturnsService) {}

  @Post()
  create(@Body() body: any) { return this.svc.create(body); }

  @Get()
  forOrder(@Query('number') number: string, @Query('phone') phone: string) {
    return this.svc.forOrder(number, phone);
  }
}

// ── البائع ──
@Controller('seller/returns')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerReturnsController {
  constructor(private svc: ReturnsService) {}

  @Get()
  list(@CurrentUser() u: any, @Query('status') status?: string) { return this.svc.list(u.sub, status); }

  @Post(':id/review')
  review(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.review(u.sub, id, body);
  }
}
