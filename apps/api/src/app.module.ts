import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { SecurityModule } from './common/security.module';
import { AuthModule } from './modules/auth/auth.module';
import { PublicModule } from './modules/public/public.module';
import { ThemeModule } from './modules/theme/theme.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlansModule } from './modules/plans/plans.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CardsModule } from './modules/cards/cards.module';
import { FinanceModule } from './modules/finance/finance.module';
import { SecurityCenterModule } from './modules/security-center/security-center.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { PlatformModule } from './modules/platform/platform.module';
import { NearbyModule } from './modules/nearby/nearby.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { BackupModule } from './modules/backup/backup.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { AdsModule } from './modules/ads/ads.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { PwaModule } from './modules/pwa/pwa.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { ChatModule } from './modules/chat/chat.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { FilesModule } from './modules/files/files.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { MyToolsModule } from './modules/mytools/mytools.module';
import { QaModule } from './modules/qa/qa.module';
import { CartModule } from './modules/cart/cart.module';
import { RecoModule } from './modules/reco/reco.module';
import { VisitorsModule } from './modules/visitors/visitors.module';
import { ShieldModule } from './modules/shield/shield.module';
import { ShieldMiddleware } from './modules/shield/shield.middleware';
import { AiCenterModule } from './modules/ai-center/ai-center.module';
import { StoreTypesModule } from './modules/store-types/store-types.module';
import { ToolsModule } from './modules/tools/tools.module';
import { SupportModule } from './modules/support/support.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SharesModule } from './modules/shares/shares.module';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';

@Module({
  imports: [PrismaModule, SecurityModule, ShieldModule, AuthModule, PublicModule, ThemeModule, StoresModule, ProductsModule, OrdersModule, BookingsModule, ReviewsModule, AdminModule, PlansModule, DeliveryModule, MessagingModule, PaymentsModule, CardsModule, FinanceModule, SecurityCenterModule, PublicApiModule, PlatformModule, NearbyModule, ComplaintsModule, BackupModule, CouponsModule, AdsModule, NotificationsModule, ReferralsModule, PwaModule, AccountingModule, ChatModule, ReturnsModule, FilesModule, WishlistModule, QaModule, CartModule, RecoModule, AiCenterModule, StoreTypesModule, ToolsModule, MyToolsModule, SupportModule, ReportsModule, VisitorsModule, SharesModule],
  providers: [{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }], // 📜 تدقيق الإجراءات الإدارية تلقائياً
})
export class AppModule implements NestModule {
  // 🛡️ درع الحماية الأمامي — حظر IP + تحديد معدل + WAF على كل الطلبات
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ShieldMiddleware).forRoutes('*');
  }
}
