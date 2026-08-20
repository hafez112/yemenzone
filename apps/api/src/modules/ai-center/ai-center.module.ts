import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiCenterService } from './ai-center.service';
import { AdminAiController, PublicAiController, SellerAiController } from './ai-center.controller';

// 🤖 مركز الذكاء الاصطناعي: إدارة محلي/خارجي + أدوات البائع + مساعد الرئيسية
@Module({
  controllers: [AdminAiController, SellerAiController, PublicAiController],
  providers: [AiCenterService, PrismaService],
})
export class AiCenterModule {}
