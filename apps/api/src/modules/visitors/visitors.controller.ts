import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { VisitorsService } from './visitors.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';

// 📊 وحدة الزوار: نقطة تتبع عامة + إحصائيات للإدارة
@Controller('v1')
export class VisitorsTrackController {
  constructor(private svc: VisitorsService) {}

  // تسجيل زيارة — عام وخفيف (يُستدعى من الواجهة مع كل تنقل)
  @Post('track')
  track(@Body() body: any, @Req() req: any) {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
    const ua = String(req.headers['user-agent'] || '');
    return this.svc.track(body, ip, ua);
  }
}

@Controller('admin/visitors')
@UseGuards(AuthGuard, RolesGuard('admin'))
export class AdminVisitorsController {
  constructor(private svc: VisitorsService) {}

  // 📈 إحصائيات الزوار — كل المديرين يشاهدونها
  @Get()
  stats() { return this.svc.stats(); }
}
