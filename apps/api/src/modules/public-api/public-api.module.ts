import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersModule } from '../orders/orders.module';
import { PublicApiService } from './public-api.service';
import { ApiAiService } from './api-ai.service';
import { SellerApiController, OpenApiController } from './public-api.controller';

@Module({
  imports: [OrdersModule],
  controllers: [SellerApiController, OpenApiController],
  providers: [PublicApiService, ApiAiService, PrismaService],
})
export class PublicApiModule {}
