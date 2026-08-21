import { Module } from '@nestjs/common';
import { PlansController, AdminPlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { CardsModule } from '../cards/cards.module';

// ملاحظة: الكوبونات تُسجَّل حصرياً من CouponsModule
@Module({
  imports: [CardsModule], // 💳 الاشتراك ببطاقة يمن زون
  controllers: [PlansController, AdminPlansController],
  providers: [PlansService],
})
export class PlansModule {}
