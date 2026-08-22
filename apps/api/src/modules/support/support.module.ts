import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupportService } from './support.service';
import { SupportAiService } from './support-ai.service';
import { AdminSupportController, CustomerSupportController, SellerSupportController } from './support.controller';

// 🎧 وحدة الدعم الفني: تذاكر العملاء والبائعين + رد آلي ذكي + لوحة الاقتراحات
@Module({
  controllers: [CustomerSupportController, SellerSupportController, AdminSupportController],
  providers: [SupportService, SupportAiService, PrismaService],
})
export class SupportModule {}
