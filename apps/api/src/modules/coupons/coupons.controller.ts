import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';

// ── البائع: إدارة كوبونات متجره ──
@Controller('seller/coupons')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerCouponsController {
  constructor(private coupons: CouponsService) {}

  @Get()
  list(@CurrentUser() u: any) { return this.coupons.list(u.sub); }

  @Post()
  create(@CurrentUser() u: any, @Body() body: any) { return this.coupons.create(u.sub, body); }

  @Patch(':id/toggle')
  toggle(@CurrentUser() u: any, @Param('id') id: string) { return this.coupons.toggle(u.sub, id); }

  @Delete(':id')
  remove(@CurrentUser() u: any, @Param('id') id: string) { return this.coupons.remove(u.sub, id); }
}

// ── العام: التحقق من الكوبون في السلة ──
@Controller('v1/coupons')
export class PublicCouponsController {
  constructor(private coupons: CouponsService) {}

  @Post('validate')
  validate(@Body() body: { code: string; storeSlug: string; total: number }) {
    return this.coupons.validate(body);
  }
}
