import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { PublicReturnsController, SellerReturnsController } from './returns.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [NotificationsModule, FinanceModule],
  controllers: [PublicReturnsController, SellerReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
