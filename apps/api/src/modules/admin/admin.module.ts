import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [ToolsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
