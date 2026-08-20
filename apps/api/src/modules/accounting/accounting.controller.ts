import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';

// 💼 المكتب المحاسبي — كل المسارات تحت صلاحية المركز المالي
@Controller('admin/accounting')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('finance'))
export class AccountingController {
  constructor(private accounting: AccountingService) {}

  // 📔 القيود اليومية + ميزان المراجعة
  @Get('journal')
  journal(@Query('from') from?: string, @Query('to') to?: string) {
    return this.accounting.journal(from, to);
  }

  // 🔄 التسوية الآلية
  @Get('reconciliation')
  reconciliation() {
    return this.accounting.reconciliation();
  }

  // 🧾 كشف حساب متجر
  @Get('store-statement')
  storeStatement(@Query('storeId') storeId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.accounting.storeStatement(storeId, from, to);
  }

  // 📤 تقرير العمولات الشهري
  @Get('commissions')
  commissions(@Query('month') month?: string) {
    return this.accounting.commissionsReport(month);
  }
}
