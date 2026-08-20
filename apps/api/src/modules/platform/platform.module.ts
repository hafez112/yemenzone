import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformService } from './platform.service';
import { PlatformAiService } from './platform-ai.service';
import { ReferralsModule } from '../referrals/referrals.module';
import { AdminDesignController, AdminPagesController, AdminPlatformServicesController, AdminBlogController, PublicPlatformController } from './platform.controller';

@Module({
  imports: [ReferralsModule],
  controllers: [AdminDesignController, AdminPagesController, AdminPlatformServicesController, AdminBlogController, PublicPlatformController],
  providers: [PlatformService, PlatformAiService, PrismaService],
})
export class PlatformModule {}
