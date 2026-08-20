import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ReferralsModule } from '../referrals/referrals.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ReferralsModule, NotificationsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
