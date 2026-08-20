import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';

// اشتراك البائع
@Controller('seller/subscription')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class PlansController {
  constructor(private plans: PlansService) {}

  @Get()
  my(@CurrentUser() u: any) { return this.plans.mySubscription(u.sub); }

  @Post('subscribe')
  subscribe(@CurrentUser() u: any, @Body() b: any) { return this.plans.subscribe(u.sub, b); }
}

// ملاحظة: مسارات الكوبونات تُدار حصرياً من CouponsModule (modules/coupons) — أُزيلت من هنا لمنع التكرار

// إدارة الخطط والاشتراكات (للمدير)
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('plans'))
export class AdminPlansController {
  constructor(private plans: PlansService) {}

  @Get('plans')
  listPlans() { return this.plans.adminPlans(); }

  @Post('plans')
  createPlan(@Body() b: any) { return this.plans.savePlan(null, b); }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() b: any) { return this.plans.savePlan(id, b); }

  @Get('subscriptions')
  subscriptions() { return this.plans.adminSubscriptions(); }

  @Patch('stores/:storeId/plan')
  setPlan(@Param('storeId') storeId: string, @Body() b: { planId: string; months?: number }) {
    return this.plans.adminSetPlan(storeId, b.planId, b.months || 1);
  }

  @Patch('payments/:id/review-subscription')
  review(@Param('id') id: string, @Body() b: { approve: boolean }, @CurrentUser() u: any) {
    return this.plans.reviewSubscriptionPayment(id, b.approve, u.sub);
  }
}
