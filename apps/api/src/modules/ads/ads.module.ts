import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdsService } from './ads.service';
import { AdminAdsController, PublicAdsController, SellerAdsController } from './ads.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminAdsController, PublicAdsController, SellerAdsController],
  providers: [AdsService],
})
export class AdsModule {}
