import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardAiService } from './card-ai.service';
import { AdminCardsController, CustomerCardController, SellerWalletController } from './cards.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CustomerCardController, SellerWalletController, AdminCardsController],
  providers: [CardsService, CardAiService],
})
export class CardsModule {}
