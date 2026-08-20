import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PwaService } from './pwa.service';
import { PwaController, AdminPwaController } from './pwa.controller';
import { PublicPwaController } from './public-pwa.controller';

@Module({
  controllers: [PwaController, AdminPwaController, PublicPwaController],
  providers: [PwaService, PrismaService],
})
export class PwaModule {}
