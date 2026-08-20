import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';
import { ComplaintsService } from './complaints.service';

// عام: تقديم وتتبع
@Controller('v1/complaints')
export class PublicComplaintsController {
  constructor(private svc: ComplaintsService) {}

  @Post()
  submit(@Body() body: any) { return this.svc.submit(body); }

  @Get('track')
  track(@Query('number') number: string, @Query('phone') phone: string) { return this.svc.track(number, phone); }
}

// عميل مسجل: شكواه تُربط بحسابه
@Controller('customer/complaints')
@UseGuards(AuthGuard, RolesGuard('customer'))
export class CustomerComplaintsController {
  constructor(private svc: ComplaintsService) {}

  @Post()
  submit(@CurrentUser() u: any, @Body() body: any) { return this.svc.submit(body, u.sub); }
}

// الإدارة
@Controller('admin/complaints')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('customers'))
export class AdminComplaintsController {
  constructor(private svc: ComplaintsService) {}

  @Get()
  list(@Query('status') status?: string) { return this.svc.adminList(status); }

  @Post(':id/reply')
  reply(@Param('id') id: string, @Body() body: any) { return this.svc.reply(id, body.reply); }

  @Post(':id/status')
  status(@Param('id') id: string, @Body() body: any) { return this.svc.setStatus(id, body.status); }
}
