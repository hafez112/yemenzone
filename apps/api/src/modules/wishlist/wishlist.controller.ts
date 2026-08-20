import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';
import { WishlistService } from './wishlist.service';

// ❤️ مفضلة العميل — تتطلب تسجيل دخول العميل
@Controller('v1/wishlist')
@UseGuards(AuthGuard, RolesGuard('customer'))
export class WishlistController {
  constructor(private svc: WishlistService) {}

  @Post('toggle/:productId')
  toggle(@CurrentUser() u: any, @Param('productId') productId: string) {
    return this.svc.toggle(u.sub, productId);
  }

  @Get()
  list(@CurrentUser() u: any) {
    return this.svc.list(u.sub);
  }

  @Get('ids')
  ids(@CurrentUser() u: any) {
    return this.svc.ids(u.sub);
  }

  @Delete(':productId')
  remove(@CurrentUser() u: any, @Param('productId') productId: string) {
    return this.svc.remove(u.sub, productId);
  }
}
