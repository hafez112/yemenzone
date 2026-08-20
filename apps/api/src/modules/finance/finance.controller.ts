import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';

// ── الإدارة: المالية والعملات ──
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('finance'))
export class AdminFinanceController {
  constructor(private svc: FinanceService) {}

  @Get('finance/overview')
  overview() { return this.svc.overview(); }

  // 📒 دفتر اليومية الموحّد + تصديره
  @Get('finance/journal')
  journal(@Query() q: any) { return this.svc.journal(q); }

  @Get('finance/journal-export')
  async journalExport(@Query() q: any, @Res() res: any) {
    const csv = await this.svc.exportJournal(q);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="journal.csv"');
    res.send(csv);
  }

  // 📊 قائمة الدخل · ⚖️ المركز المالي · 🤝 التسويات · 🧾 التقرير الزكوي
  @Get('finance/income-statement')
  incomeStatement() { return this.svc.incomeStatement(); }

  @Get('finance/balance-sheet')
  balanceSheet() { return this.svc.balanceSheet(); }

  @Get('finance/settlements')
  settlements() { return this.svc.sellerSettlements(); }

  // 📋 كشوف التسوية الفعلية — توليد/قائمة/تفاصيل/تسوية/تصدير
  @Get('finance/settlements/list')
  settlementsList(@Query('q') q?: string) { return this.svc.listSettlements(q); }

  @Post('finance/settlements/generate')
  generateSettlement(@CurrentUser() u: any, @Body() body: { sellerId: string; from?: string; to?: string }) {
    return this.svc.generateSettlement(body.sellerId, body.from, body.to, u.sub);
  }

  @Get('finance/settlements/:id')
  settlementDetail(@Param('id') id: string) { return this.svc.settlementDetail(id); }

  @Patch('finance/settlements/:id/pay')
  paySettlement(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.markSettlementPaid(id, u.sub); }

  @Get('finance/settlements/:id/export')
  async settlementExport(@Param('id') id: string, @Res() res: any) {
    const csv = await this.svc.settlementCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="settlement.csv"');
    res.send(csv);
  }

  // 🤝 تقرير العمولات + نسبة مخصصة لمتجر
  @Get('finance/commission-report')
  commissionReport() { return this.svc.commissionReport(); }

  @Patch('finance/commission/store/:storeId')
  setStoreCommission(@CurrentUser() u: any, @Param('storeId') storeId: string, @Body() body: { percent: number | null }) {
    return this.svc.setStoreCommission(storeId, body.percent ?? null, u.sub);
  }

  @Get('finance/tax-report')
  taxReport() { return this.svc.taxReport(); }

  // 💸 المصروفات
  @Get('finance/expenses')
  expenses(@Query() q: any) { return this.svc.expenses(q); }

  @Post('finance/expenses')
  addExpense(@CurrentUser() u: any, @Body() body: any) { return this.svc.addExpense(u.sub, body); }

  @Delete('finance/expenses/:id')
  deleteExpense(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteExpense(u.sub, id); }

  @Get('finance/commission')
  getCommission() { return this.svc.getCommission().then((c) => ({ commission: c })); }

  @Post('finance/commission')
  setCommission(@Body() body: { percent: number }) { return this.svc.setCommission(body.percent); }

  @Get('currencies')
  currencies() { return this.svc.currencies(); }

  @Post('currencies')
  saveCurrency(@Body() body: any) { return this.svc.saveCurrency(body); }

  @Patch('currencies/:code/rate')
  updateRate(@Param('code') code: string, @Body() body: { rate: number }) {
    return this.svc.updateRate(code, body.rate);
  }

  @Patch('currencies/:code/toggle')
  toggle(@Param('code') code: string) { return this.svc.toggleCurrency(code); }

  @Patch('currencies/:code/default')
  setDefault(@Param('code') code: string) { return this.svc.setDefault(code); }
}

// ── التاجر: تقريره المالي ──
@Controller('seller/finance')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerFinanceController {
  constructor(private svc: FinanceService) {}

  @Get()
  report(@CurrentUser() u: any) { return this.svc.sellerReport(u.sub); }

  // 📋 كشوف تسويتي
  @Get('settlements')
  mySettlements(@CurrentUser() u: any) { return this.svc.sellerSettlementsList(u.sub); }

  @Get('settlements/:id')
  async mySettlement(@CurrentUser() u: any, @Param('id') id: string) {
    const st = await this.svc.settlementDetail(id);
    if (st.sellerId !== u.sub) throw new ForbiddenException('هذا الكشف ليس لك');
    return st;
  }
}
