import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { SellerReportsController, AdminReportsController } from './reports.controller';

@Module({
  controllers: [SellerReportsController, AdminReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
