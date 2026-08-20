import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BackupService } from './backup.service';
import { BackupAiService } from './backup-ai.service';
import { BackupController } from './backup.controller';

@Module({
  controllers: [BackupController],
  providers: [BackupService, BackupAiService, PrismaService],
})
export class BackupModule {}
