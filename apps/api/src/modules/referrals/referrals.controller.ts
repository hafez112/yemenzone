import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';

// 🎁 العميل: نقاطي ورمز إحالتي
@Controller('customer/referrals')
@UseGuards(AuthGuard, RolesGuard('customer'))
export class CustomerReferralsController {
  constructor(private svc: ReferralsService) {}

  @Get('my')
  my(@CurrentUser() u: any) {
    return this.svc.my(u.sub);
  }
}

// 🎁 الإدارة: إعدادات النظام + نظرة عامة
@Controller('admin/referrals')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('customers'))
export class AdminReferralsController {
  constructor(private svc: ReferralsService) {}

  @Get()
  overview() {
    return this.svc.adminOverview();
  }

  @Post('settings')
  saveSettings(@Body() body: any) {
    return this.svc.saveConfig(body);
  }
}
