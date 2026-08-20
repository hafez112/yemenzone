import { Module } from '@nestjs/common';
import { PlansController, AdminPlansController } from './plans.controller';
import { PlansService } from './plans.service';

// ملاحظة: الكوبونات تُسجَّل حصرياً من CouponsModule
@Module({
  controllers: [PlansController, AdminPlansController],
  providers: [PlansService],
})
export class PlansModule {}
