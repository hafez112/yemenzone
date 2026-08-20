import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { SellerCouponsController, PublicCouponsController } from './coupons.controller';

@Module({
  controllers: [SellerCouponsController, PublicCouponsController],
  providers: [CouponsService],
})
export class CouponsModule {}
