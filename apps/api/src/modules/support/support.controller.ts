import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { CurrentUser } from '../../common/decorators';
import { SupportService } from './support.service';

// 🎧 دعم العملاء
@Controller('customer/support')
@UseGuards(AuthGuard, RolesGuard('customer'))
export class CustomerSupportController {
  constructor(private svc: SupportService) {}

  @Post()
  @UseGuards(RateLimit(10, 60_000, 'support-create-c'))
  create(@CurrentUser() u: any, @Body() body: any) { return this.svc.create('customer', u.sub, body); }

  @Get('mine')
  mine(@CurrentUser() u: any) { return this.svc.mine('customer', u.sub); }

  @Post(':id/reply')
  @UseGuards(RateLimit(20, 60_000, 'support-reply-c'))
  reply(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.userReply('customer', u.sub, id, body);
  }
}

// 🎧 دعم البائعين
@Controller('seller/support')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerSupportController {
  constructor(private svc: SupportService) {}

  @Post()
  @UseGuards(RateLimit(10, 60_000, 'support-create-s'))
  create(@CurrentUser() u: any, @Body() body: any) { return this.svc.create('seller', u.sub, body); }

  @Get('mine')
  mine(@CurrentUser() u: any) { return this.svc.mine('seller', u.sub); }

  @Post(':id/reply')
  @UseGuards(RateLimit(20, 60_000, 'support-reply-s'))
  reply(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.userReply('seller', u.sub, id, body);
  }
}

// 🎛️ إدارة الدعم الفني — للمدير الخارق أو من يملك صلاحية support
@Controller('admin/support')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('support'))
export class AdminSupportController {
  constructor(private svc: SupportService) {}

  @Get()
  list(@Query('status') status?: string, @Query('userType') userType?: string, @Query('category') category?: string) {
    return this.svc.adminList({ status, userType, category });
  }

  @Get('ideas')
  ideas() { return this.svc.ideasBoard(); }

  @Get('settings')
  settings() { return this.svc.getSettings(); }

  @Post('settings')
  updateSettings(@Body() body: any) { return this.svc.updateSettings(body); }

  @Post(':id/reply')
  reply(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.adminReply(id, u.sub, body);
  }

  @Post(':id/status')
  status(@Param('id') id: string, @Body() body: any) { return this.svc.adminSetStatus(id, body.status); }

  @Post(':id/idea-status')
  ideaStatus(@Param('id') id: string, @Body() body: any) { return this.svc.adminSetIdeaStatus(id, body.ideaStatus); }

  @Post(':id/ai-draft')
  @UseGuards(RateLimit(20, 60_000, 'support-ai-draft'))
  aiDraft(@Param('id') id: string) { return this.svc.aiDraft(id); }
}
