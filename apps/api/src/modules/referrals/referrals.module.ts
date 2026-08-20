import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReferralsService } from './referrals.service';
import { CustomerReferralsController, AdminReferralsController } from './referrals.controller';

@Module({
  controllers: [CustomerReferralsController, AdminReferralsController],
  providers: [ReferralsService, PrismaService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
