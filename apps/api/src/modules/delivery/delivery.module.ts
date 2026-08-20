import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryAiService } from './delivery-ai.service';
import { AdminDeliveryController, DriverAuthController, DriverController, SellerDeliveryController } from './delivery.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SecurityModule } from '../../common/security.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [PrismaModule, SecurityModule, FinanceModule],
  controllers: [DriverAuthController, DriverController, SellerDeliveryController, AdminDeliveryController],
  providers: [DeliveryService, DeliveryAiService],
})
export class DeliveryModule {}
