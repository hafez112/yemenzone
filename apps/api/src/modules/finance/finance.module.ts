import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceAiService } from './finance-ai.service';
import { AdminFinanceController, SellerFinanceController } from './finance.controller';

@Module({
  controllers: [AdminFinanceController, SellerFinanceController],
  providers: [FinanceService, FinanceAiService],
  exports: [FinanceService],
})
export class FinanceModule {}
