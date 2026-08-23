import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { ClientIp } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators';

// ── دخول السائق (عام) ──
@Controller('driver-auth')
export class DriverAuthController {
  constructor(private svc: DeliveryService) {}

  @Post('login')
  login(@Body() body: { phone: string; password: string }, @ClientIp() ip: string) {
    return this.svc.driverLogin(body.phone, body.password, ip);
  }
}

// ── لوحة السائق (محمية بدور driver) ──
@Controller('driver')
@UseGuards(AuthGuard, RolesGuard('driver'))
export class DriverController {
  constructor(private svc: DeliveryService) {}

  @Get('orders')
  orders(@CurrentUser() u: any, @Query('status') status?: string) {
    return this.svc.driverOrders(u.sub, status);
  }

  @Patch('orders/:id/status')
  updateStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { status: string }) {
    return this.svc.driverUpdateStatus(u.sub, id, body.status);
  }

  // 📍 مشاركة الموقع المباشر أثناء التوصيل
  @Post('location')
  updateLocation(@CurrentUser() u: any, @Body() body: any) {
    return this.svc.driverUpdateLocation(u.sub, body);
  }

  // 💰 محفظة السائق — الرصيد والحركات وطلبات السحب
  @Get('wallet')
  wallet(@CurrentUser() u: any) {
    return this.svc.driverWallet(u.sub);
  }

  @Post('wallet/withdraw')
  withdraw(@CurrentUser() u: any, @Body() body: any) {
    return this.svc.driverWithdraw(u.sub, body);
  }

  @Post('location/stop')
  clearLocation(@CurrentUser() u: any) {
    return this.svc.driverClearLocation(u.sub);
  }
}

// ── البائع: التوصيل ──
@Controller('seller/delivery')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerDeliveryController {
  constructor(private svc: DeliveryService) {}

  @Get('drivers')
  drivers(@CurrentUser() u: any) {
    return this.svc.sellerDrivers(u.sub);
  }

  @Get('orders')
  orders(@CurrentUser() u: any) {
    return this.svc.sellerOrdersToAssign(u.sub);
  }

  @Patch('orders/:id/assign')
  assign(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { driverId: string | null }) {
    return this.svc.assignDriver(u.sub, id, body.driverId);
  }

  @Get('companies')
  companies(@CurrentUser() u: any) {
    return this.svc.sellerCompanies(u.sub);
  }

  @Post('companies/:companyId/link')
  link(@CurrentUser() u: any, @Param('companyId') companyId: string, @Body() body: { link: boolean }) {
    return this.svc.linkCompany(u.sub, companyId, body.link);
  }
}

// ── الإدارة: السائقون وشركات التوصيل ──
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('drivers'))
export class AdminDeliveryController {
  constructor(private svc: DeliveryService) {}

  @Get('drivers')
  drivers(@Query('q') q?: string) {
    return this.svc.adminDrivers(q);
  }

  @Post('drivers')
  saveDriver(@Body() body: any) {
    return this.svc.adminSaveDriver(body);
  }

  @Patch('drivers/:id/toggle')
  toggleDriver(@Param('id') id: string) {
    return this.svc.adminToggleDriver(id);
  }

  @Delete('drivers/:id')
  deleteDriver(@Param('id') id: string) {
    return this.svc.adminDeleteDriver(id);
  }

  @Get('delivery-companies')
  companies() {
    return this.svc.adminCompanies();
  }

  @Post('delivery-companies')
  saveCompany(@Body() body: any) {
    return this.svc.adminSaveCompany(body);
  }

  @Patch('delivery-companies/:id/toggle')
  toggleCompany(@Param('id') id: string) {
    return this.svc.adminToggleCompany(id);
  }

  @Delete('delivery-companies/:id')
  deleteCompany(@Param('id') id: string) {
    return this.svc.adminDeleteCompany(id);
  }

  // 🔗 ربط السائقين وشركات التوصيل بمتاجر البائعين
  // 💸 طلبات سحب السائقين
  @Get('driver-withdrawals')
  driverWithdrawals(@Query('status') status?: string) {
    return this.svc.adminDriverWithdrawals(status);
  }

  @Post('driver-withdrawals/:id/process')
  processDriverWithdrawal(@Param('id') id: string, @Body() body: any) {
    return this.svc.adminProcessDriverWithdrawal(id, body?.approve !== false, body?.note);
  }

  @Get('delivery/links')
  deliveryLinks(@Query('q') q?: string) {
    return this.svc.adminDeliveryLinks(q);
  }

  @Post('delivery/links/:storeId/company')
  linkCompanyToStore(@Param('storeId') storeId: string, @Body() body: { companyId: string; link: boolean }) {
    return this.svc.adminLinkCompany(storeId, body.companyId, !!body.link);
  }

  @Post('delivery/links/:storeId/driver')
  linkDriverToStore(@Param('storeId') storeId: string, @Body() body: { driverId: string; link: boolean }) {
    return this.svc.adminLinkDriver(storeId, body.driverId, !!body.link);
  }
}
