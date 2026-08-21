import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardAiService } from './card-ai.service';
import { AdminCardsController, CustomerCardController, SellerCardController, SellerWalletController } from './cards.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CustomerCardController, SellerCardController, SellerWalletController, AdminCardsController],
  providers: [CardsService, CardAiService],
  exports: [CardsService], // 💳 يستخدمها شراء الخدمات والاشتراك بالبطاقة
})
export class CardsModule {}
