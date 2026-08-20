import { Global, Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingAiService } from './messaging-ai.service';
import { MessagingController } from './messaging.controller';

// وحدة عالمية — تُحقن خدمتها في الطلبات والحجوزات والاشتراكات والمصادقة
@Global()
@Module({
  controllers: [MessagingController],
  providers: [MessagingService, MessagingAiService],
  exports: [MessagingService],
})
export class MessagingModule {}
