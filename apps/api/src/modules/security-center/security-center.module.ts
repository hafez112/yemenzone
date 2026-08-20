import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityModule } from '../../common/security.module';
import { SecurityCenterService } from './security-center.service';
import { SecurityCenterController } from './security-center.controller';
import { SecurityAiService } from './security-ai.service';

@Module({
  imports: [SecurityModule],
  controllers: [SecurityCenterController],
  providers: [SecurityCenterService, SecurityAiService, PrismaService],
})
export class SecurityCenterModule {}
