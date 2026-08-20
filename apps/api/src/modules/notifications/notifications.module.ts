import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { WebPushService } from './push.service';
import { PushController } from './push.controller';
import {
  SellerNotificationsController,
  CustomerNotificationsController,
  AdminBroadcastController,
  SellerCampaignsController,
} from './notifications.controller';

// وحدة عالمية — خدمة التنبيهات تُحقن في الطلبات والاشتراكات والإعلانات والإدارة
@Global()
@Module({
  controllers: [
    SellerNotificationsController,
    CustomerNotificationsController,
    AdminBroadcastController,
    SellerCampaignsController,
    PushController,
  ],
  providers: [NotificationsService, WebPushService],
  exports: [NotificationsService, WebPushService],
})
export class NotificationsModule {}
