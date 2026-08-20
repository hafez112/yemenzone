import { Module } from '@nestjs/common';
import { CustomerChatController, SellerChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RealtimeGateway } from './realtime.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CustomerChatController, SellerChatController],
  providers: [ChatService, RealtimeGateway],
  exports: [RealtimeGateway], // ⚡ تستخدمها وحدات أخرى للبث اللحظي
})
export class ChatModule {}
