import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';
import { SecurityCenterService } from './security-center.service';

@UseGuards(AuthGuard, PermsGuard('security'))
@Controller('admin')
export class SecurityCenterController {
  constructor(private svc: SecurityCenterService) {}

  @Get('security/overview') overview() { return this.svc.overview(); }
  @Get('security/logs') logs(@Query() q: any) { return this.svc.logs(q); }
  @Get('security/logs-export') async exportLogs(@Query() q: any, @Res() res: any) {
    const csv = await this.svc.exportLogs(q);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="security-logs.csv"');
    res.send(csv);
  }
  @Get('security/sessions') sessions() { return this.svc.sessions(); }
  @Post('security/sessions/:id/revoke') revokeSession(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.revokeSession(u.sub, id);
  }
  @Get('security/bans') bans() { return this.svc.bans(); }
  @Post('security/bans') ban(@CurrentUser() u: any, @Body() body: any) { return this.svc.banIp(u.sub, body); }
  @Delete('security/bans/:ip') unban(@CurrentUser() u: any, @Param('ip') ip: string) { return this.svc.unbanIp(u.sub, ip); }
  @Get('security/devices') devices() { return this.svc.devices(); }
  @Post('security/devices/:id/status') deviceStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.setDeviceStatus(u.sub, id, body.status);
  }
  @Get('admins') admins() { return this.svc.admins(); }
  @Post('admins') createAdmin(@CurrentUser() u: any, @Body() body: any) { return this.svc.createAdmin(u, body); }
  @Post('admins/:id') updateAdmin(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.updateAdmin(u, id, body); }
  @Delete('admins/:id') deleteAdmin(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteAdmin(u, id); }
}
