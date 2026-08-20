import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';

// إنشاء حجز من واجهة المتجر (عام)
@Controller('v1/bookings')
export class PublicBookingsController {
  constructor(private bookings: BookingsService) {}

  @Post(':storeSlug')
  create(@Param('storeSlug') slug: string, @Body() body: any) {
    return this.bookings.createBooking(slug, body);
  }
}

// لوحة البائع — عناصر + حجوزات كل نوع
@Controller('seller')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerBookingsController {
  constructor(private bookings: BookingsService) {}

  // rentals | hotel | services
  @Get('items/:kind')
  items(@CurrentUser() u: any, @Param('kind') kind: string) {
    return this.bookings.listItems(u.sub, kind);
  }
  @Post('items/:kind')
  createItem(@CurrentUser() u: any, @Param('kind') kind: string, @Body() b: any) {
    return this.bookings.createItem(u.sub, kind, b);
  }
  @Patch('items/:kind/:id')
  updateItem(@CurrentUser() u: any, @Param('kind') kind: string, @Param('id') id: string, @Body() b: any) {
    return this.bookings.updateItem(u.sub, kind, id, b);
  }
  @Delete('items/:kind/:id')
  deleteItem(@CurrentUser() u: any, @Param('kind') kind: string, @Param('id') id: string) {
    return this.bookings.deleteItem(u.sub, kind, id);
  }

  @Get('bookings/:kind')
  listBookings(@CurrentUser() u: any, @Param('kind') kind: string) {
    return this.bookings.listBookings(u.sub, kind);
  }
  @Patch('bookings/:kind/:id')
  updateStatus(@CurrentUser() u: any, @Param('kind') kind: string, @Param('id') id: string, @Body() b: any) {
    return this.bookings.updateBookingStatus(u.sub, kind, id, b.status);
  }
}

// للتوافق مع المسارات
@Controller()
export class BookingsController {}
