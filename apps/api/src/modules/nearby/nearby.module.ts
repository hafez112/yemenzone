import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NearbyController } from './nearby.controller';
import { NearbyAiService } from './nearby-ai.service';

@Module({
  controllers: [NearbyController],
  providers: [NearbyAiService, PrismaService],
})
export class NearbyModule {}
