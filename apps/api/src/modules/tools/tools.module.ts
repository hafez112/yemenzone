import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [CardsModule], // 💳 شراء الخدمات يتم ببطاقة يمن زون
  controllers: [ToolsController],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
