import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PwaService } from './pwa.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';

// 📱 طلبات تطبيقات الويب — بائع/سائق/عميل
@Controller('pwa')
@UseGuards(AuthGuard, RolesGuard('seller', 'driver', 'customer'))
export class PwaController {
  constructor(private pwa: PwaService) {}

  @Post('request')
  request(@CurrentUser() user: any) {
    return this.pwa.request(user);
  }

  @Get('my')
  my(@CurrentUser() user: any) {
    return this.pwa.my(user);
  }
}

// 🛡️ إدارة طلبات التطبيقات — الموافقة والرفض بيد الإدارة فقط
@Controller('admin/pwa')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('users'))
export class AdminPwaController {
  constructor(private pwa: PwaService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.pwa.adminList(status);
  }

  @Post(':id/review')
  review(@Param('id') id: string, @CurrentUser() u: any, @Body() body: { approve: boolean; note?: string }) {
    return this.pwa.review(id, u.sub, !!body.approve, body.note);
  }
}
