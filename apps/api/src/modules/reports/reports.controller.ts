import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';

// ═══ تقرير البائع الأسبوعي — يُبنى لحظياً عند فتح الصفحة ═══
@Controller('seller/reports')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerReportsController {
  constructor(private reports: ReportsService) {}

  @Get('weekly')
  weekly(@CurrentUser() u: any) { return this.reports.weeklyForSeller(u.sub); }
}

// ═══ إعدادات التقارير + ملخص المنصة — للإدارة ═══
@Controller('admin/reports')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('finance'))
export class AdminReportsController {
  constructor(private reports: ReportsService) {}

  @Get('config')
  config() { return this.reports.getConfig(); }

  @Post('config')
  saveConfig(@Body() body: { enabled?: boolean; day?: number; hour?: number }) {
    return this.reports.saveConfig(body);
  }

  // ملخص أداء المنصة — آخر 7 أيام
  @Get('platform')
  platform() { return this.reports.platformDigest(); }

  // إرسال التقارير لكل البائعين الآن (تجربة أو إرسال يدوي)
  @Post('send-now')
  async sendNow() {
    const sent = await this.reports.sendWeeklyReports();
    return { ok: true, sent, message: `📊 أُرسل التقرير إلى ${sent} بائعاً` };
  }
}
