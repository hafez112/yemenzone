import { Module } from '@nestjs/common';
import { OrdersController, CustomerOrdersController, SellerOrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [FinanceModule],
  controllers: [OrdersController, CustomerOrdersController, SellerOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
