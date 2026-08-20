import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ComplaintsService } from './complaints.service';
import { ComplaintsAiService } from './complaints-ai.service';
import { PublicComplaintsController, CustomerComplaintsController, AdminComplaintsController } from './complaints.controller';

@Module({
  controllers: [PublicComplaintsController, CustomerComplaintsController, AdminComplaintsController],
  providers: [ComplaintsService, ComplaintsAiService, PrismaService],
})
export class ComplaintsModule {}
