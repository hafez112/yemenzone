import { Module } from '@nestjs/common';
import { BookingsController, SellerBookingsController, PublicBookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [BookingsController, SellerBookingsController, PublicBookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
