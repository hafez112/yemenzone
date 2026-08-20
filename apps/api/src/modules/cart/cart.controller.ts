import { Body, Controller, Get, Headers, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { CartService } from './cart.service';

// 🛒 مزامنة السلة — عامة (عميل مسجل عبر التوكن أو زائر بجلسة)
@Controller('v1/cart')
export class CartPublicController {
  constructor(private svc: CartService) {}

  // 🚦 30 مزامنة/دقيقة — الواجهة تزامن بفاصل زمني مُمهّد (debounce)
  @UseGuards(RateLimit(30, 60_000, 'cart-sync'))
  @Post('sync')
  sync(@Headers('authorization') auth: string, @Body() body: any) {
    return this.svc.sync(auth, body);
  }
}

// 🛒 السلات المهجورة — لوحة الإدارة (صلاحية العملاء)
@Controller('admin/carts')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('customers'))
export class CartAdminController {
  constructor(private svc: CartService) {}

  @Get('abandoned')
  abandoned(@Query('q') q: string) {
    return this.svc.abandoned(q);
  }

  @Post('remind')
  remind(@CurrentUser() u: any, @Body() body: any) {
    return this.svc.remind(body, u.sub);
  }
}
