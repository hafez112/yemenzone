import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';

@Controller('admin/messaging')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('messaging'))
export class MessagingController {
  constructor(private svc: MessagingService) {}

  // ── المزودون ──
  @Get('providers')
  providers() { return this.svc.providers(); }

  @Post('providers')
  saveProvider(@Body() body: any) { return this.svc.saveProvider(body); }

  @Patch('providers/:id/toggle')
  toggleProvider(@Param('id') id: string) { return this.svc.toggleProvider(id); }

  @Delete('providers/:id')
  deleteProvider(@Param('id') id: string) { return this.svc.deleteProvider(id); }

  // ── القوالب ──
  @Get('templates')
  templates() { return this.svc.templates(); }

  @Post('templates')
  saveTemplate(@Body() body: any) { return this.svc.saveTemplate(body); }

  @Patch('templates/:id/toggle')
  toggleTemplate(@Param('id') id: string) { return this.svc.toggleTemplate(id); }

  @Post('templates/:event/test')
  test(@Param('event') event: string, @Body() body: { phone: string }) {
    return this.svc.testSend(event, body.phone);
  }

  // 💬 إعداد واتساب السريع — مزود + قوالب جاهزة بضغطة
  @Post('whatsapp-quick-setup')
  whatsappQuickSetup(@Body() body: { token: string; phoneNumberId: string }) {
    return this.svc.whatsappQuickSetup(body);
  }

  // ── السجل والإحصائيات ──
  @Get('logs')
  logs(@Query('event') event?: string, @Query('status') status?: string) {
    return this.svc.logs({ event, status });
  }

  @Get('stats')
  stats() { return this.svc.stats(); }
}
