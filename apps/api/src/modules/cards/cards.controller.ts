import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CardsService } from './cards.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';

// ── العميل: بطاقته والدفع بها ──
@Controller('customer/card')
@UseGuards(AuthGuard, RolesGuard('customer'))
export class CustomerCardController {
  constructor(private svc: CardsService) {}

  @Get()
  myCard(@CurrentUser() u: any) { return this.svc.myCard(u.sub); }

  @Post('redeem')
  redeem(@CurrentUser() u: any, @Body() body: any) { return this.svc.redeem(u.sub, body); }

  @Post('topup-proof')
  topupProof(@CurrentUser() u: any, @Body() body: any) { return this.svc.topupProof(u.sub, body); }

  @Post('pay')
  pay(@CurrentUser() u: any, @Body() body: any) { return this.svc.payWithCard(u.sub, body); }
}

// ── التاجر: محفظته ──
@Controller('seller/wallet')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerWalletController {
  constructor(private svc: CardsService) {}

  @Get()
  myWallet(@CurrentUser() u: any) { return this.svc.myWallet(u.sub); }

  @Post('withdraw')
  withdraw(@CurrentUser() u: any, @Body() body: any) { return this.svc.requestWithdrawal(u.sub, body); }
}

// ── الإدارة ──
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('cards'))
export class AdminCardsController {
  constructor(private svc: CardsService) {}

  @Post('cards/batches')
  createBatch(@Body() body: any) { return this.svc.createBatch(body); }

  @Get('cards/batches')
  batches() { return this.svc.batches(); }

  @Get('cards')
  cards(@Query('batchId') batchId?: string, @Query('status') status?: string) {
    return this.svc.cards({ batchId, status });
  }

  @Patch('cards/:id/toggle')
  toggleCard(@Param('id') id: string) { return this.svc.toggleCard(id); }

  @Get('cards/stats')
  stats() { return this.svc.adminStats(); }

  @Get('topups')
  topups(@Query('status') status?: string) { return this.svc.adminTopups(status); }

  @Patch('topups/:id/review')
  reviewTopup(@Param('id') id: string, @Body() body: { approve: boolean }) {
    return this.svc.reviewTopup(id, body.approve);
  }

  @Get('withdrawals')
  withdrawals(@Query('status') status?: string) { return this.svc.adminWithdrawals(status); }

  @Patch('withdrawals/:id/review')
  reviewWithdrawal(@Param('id') id: string, @Body() body: { approve: boolean; note?: string }) {
    return this.svc.reviewWithdrawal(id, body.approve, body.note);
  }
}
