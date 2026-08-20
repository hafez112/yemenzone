import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';

// إنشاء الطلبات + التتبع (عام)
@Controller('v1/orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post(':storeSlug')
  create(@Param('storeSlug') slug: string, @Body() body: any) {
    return this.orders.create(slug, body);
  }

  // تتبع طلب: رقم الطلب + رقم الجوال
  @Get('track')
  track(@Query('number') number: string, @Query('phone') phone: string) {
    return this.orders.track(number, phone);
  }

  // 🧾 فاتورة الطلب — محمية: العميل صاحب الطلب / بائع المتجر / الإدارة
  @Get('invoice/:number')
  @UseGuards(AuthGuard)
  invoice(@Param('number') number: string, @CurrentUser() u: any) {
    return this.orders.invoice(number, u);
  }
}

// طلبات العميل المسجل (محمي)
@Controller('customer/orders')
@UseGuards(AuthGuard, RolesGuard('customer'))
export class CustomerOrdersController {
  constructor(private orders: OrdersService) {}

  @Get()
  list(@CurrentUser() u: any) {
    return this.orders.customerOrders(u.sub);
  }

  @Get(':id')
  detail(@CurrentUser() u: any, @Param('id') id: string) {
    return this.orders.customerOrder(u.sub, id);
  }

  // 🔁 إعادة الطلب بضغطة — نفس الأصناف بأسعار اليوم
  @Post(':id/reorder')
  reorder(@CurrentUser() u: any, @Param('id') id: string) {
    return this.orders.reorder(u.sub, id);
  }
}

// طلبات البائع (محمي)
@Controller('seller/orders')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerOrdersController {
  constructor(private orders: OrdersService) {}

  @Get()
  list(@CurrentUser() u: any, @Query('status') status?: string) {
    return this.orders.sellerOrders(u.sub, status);
  }

  // 🖨️ بوالص الشحن — حتى 20 طلباً دفعة واحدة (قبل :id لثبات المسار)
  @Get('slips')
  slips(@CurrentUser() u: any, @Query('ids') ids?: string) {
    return this.orders.sellerSlips(u.sub, String(ids || '').split(',').filter(Boolean));
  }

  @Post(':id/status')
  updateStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { status: string }) {
    return this.orders.sellerUpdateStatus(u.sub, id, body.status);
  }

  // 💳 مراجعة إثبات دفع الطلب — قبول أو رفض
  @Post(':id/payment')
  reviewPayment(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { approve: boolean }) {
    return this.orders.sellerReviewPayment(u.sub, id, !!body.approve);
  }
}
