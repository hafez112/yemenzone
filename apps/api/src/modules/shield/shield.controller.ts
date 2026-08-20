import { Body, Controller, ForbiddenException, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ShieldService } from './shield.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';

// ── عام: كابتشا + اعتماد TLS الداخلي ──
@Controller('v1')
export class PublicShieldController {
  constructor(private svc: ShieldService) {}

  // 🤖 كابتشا «لست روبوت» — عملية حسابية SVG، صالحة 5 دقائق وتُستخدم مرة واحدة
  @Get('captcha')
  captcha() { return this.svc.createCaptcha(); }

  // أي نطاقات الكابتشا مفعّلة — تخفي الواجهة الحقل عند التعطيل
  @Get('shield/public')
  publicInfo() { return this.svc.publicInfo(); }

  // 🔐 يسألها Caddy داخلياً عند طلب شهادة لأي دومين — 200 للمعتمد فقط، وإلا رفض صامت
  @Get('shield/tls-ask')
  async tlsAsk(@Query('domain') domain: string) {
    if (!(await this.svc.isDomainAllowed(domain))) throw new ForbiddenException();
    return { ok: true };
  }
}

// ── الإدارة: إعدادات الدرع + الفحص الذاتي ──
@Controller('admin/security')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('security'))
export class AdminShieldController {
  constructor(private svc: ShieldService) {}

  @Get('shield')
  async shield() {
    const [config, check] = await Promise.all([this.svc.getConfig(), this.svc.selfCheck()]);
    return { config, check };
  }

  @Post('shield')
  update(@CurrentUser() u: any, @Body() body: any) { return this.svc.setConfig(u.sub, body); }
}
