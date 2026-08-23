import { Module } from '@nestjs/common';
import { PublicSharesController, AdminSharesController } from './shares.controller';
import { SharesService } from './shares.service';
import { CardsModule } from '../cards/cards.module';
import { NotificationsModule } from '../notifications/notifications.module';

// 📈 أسهم المنصة — جولات بيع الإسهام، الشراء ببطاقة يمن زون، صكوك الملكية
@Module({
  imports: [CardsModule, NotificationsModule],
  controllers: [PublicSharesController, AdminSharesController],
  providers: [SharesService],
})
export class SharesModule {}
