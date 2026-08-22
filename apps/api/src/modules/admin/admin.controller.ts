import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ToolsService } from '../tools/tools.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard('admin'))
export class AdminController {
  constructor(private admin: AdminService, private tools: ToolsService) {}

  @Get('stats')
  stats() { return this.admin.stats(); }

  // 🔔 تنبيهات الإدارة — عناصر تحتاج إجراءً الآن (كل المديرين يشاهدونها)
  @Get('alerts')
  alerts() { return this.admin.alerts(); }

  // 👤 حساب المدير — أي مدير يطّلع على حسابه ويعدّله (بدون صلاحية خاصة)
  @Get('me')
  me(@CurrentUser() u: any) { return this.admin.getMe(u.sub); }

  @Patch('me')
  updateMe(@CurrentUser() u: any, @Body() body: any) { return this.admin.updateMe(u.sub, body); }

  // 📈 تحليلات المنصة المتقدمة
  @UseGuards(PermsGuard('finance'))
  @Get('analytics')
  analytics() { return this.admin.analytics(); }

  // المتاجر/التجار
  @UseGuards(PermsGuard('stores'))
  @Get('stores')
  stores(@Query('q') q?: string, @Query('status') status?: string, @Query('kind') kind?: string) {
    return this.admin.stores(q, status, kind);
  }

  // 🏬 إدارة المولات التجارية — نظرة شاملة: مولات + إيرادات + منتجات + طلبات
  @UseGuards(PermsGuard('stores'))
  @Get('malls')
  malls(@Query('q') q?: string) {
    return this.admin.mallsOverview(q);
  }

  // 🧰 إدارة تكنولوجيا المنصة — إظهار/إخفاء الخدمات + ترتيبها + عدادات الاستخدام + أسعار الصرف
  @UseGuards(PermsGuard('security'))
  @Get('tools')
  toolsList() { return this.tools.adminList(); }

  @UseGuards(PermsGuard('security'))
  @Patch('tools/:key')
  updateTool(@Param('key') key: string, @Body() body: { isVisible?: boolean; order?: number; seoTitle?: string; seoDesc?: string; seoKeys?: string }) {
    return this.tools.updateTool(key, body);
  }

  @UseGuards(PermsGuard('security'))
  @Patch('tools-config')
  saveToolsConfig(@Body() body: { fx?: Record<string, number>; aiImages?: boolean }) {
    return this.tools.saveConfig(body?.fx, body?.aiImages);
  }

  // 🚀 طلبات «أضفني إلى محركات البحث» — مراجعة واعتماد صفحات المحلات
  @UseGuards(PermsGuard('stores'))
  @Get('biz')
  bizList(@Query('status') status?: string) { return this.tools.adminBiz(status); }

  @UseGuards(PermsGuard('stores'))
  @Patch('biz/:id/status')
  bizStatus(@Param('id') id: string, @Body() body: { status?: string }) {
    return this.tools.setBizStatus(id, String(body?.status || ''));
  }

  @UseGuards(PermsGuard('stores'))
  @Delete('biz/:id')
  bizRemove(@Param('id') id: string) { return this.tools.removeBiz(id); }

  // 🔗 «بع برابط واحد» — إشراف على صفحات المنتجات الفورية
  @UseGuards(PermsGuard('stores'))
  @Get('quick-sells')
  quickSells(@Query('status') status?: string, @Query('q') q?: string) { return this.tools.adminQuickSells(status, q); }

  @UseGuards(PermsGuard('stores'))
  @Patch('quick-sells/:id/status')
  quickSellStatus(@Param('id') id: string, @Body() body: { status?: string }) {
    return this.tools.setQuickSellStatus(id, String(body?.status || ''));
  }

  @UseGuards(PermsGuard('stores'))
  @Delete('quick-sells/:id')
  quickSellRemove(@Param('id') id: string) { return this.tools.removeQuickSell(id); }

  // ♻️ سوق المستعمل — إشراف على الإعلانات
  @UseGuards(PermsGuard('stores'))
  @Get('used')
  usedList(@Query('status') status?: string, @Query('q') q?: string) { return this.tools.adminUsed(status, q); }

  @UseGuards(PermsGuard('stores'))
  @Patch('used/:id/status')
  usedStatus(@Param('id') id: string, @Body() body: { status?: string }) {
    return this.tools.setUsedStatus(id, String(body?.status || ''));
  }

  @UseGuards(PermsGuard('stores'))
  @Delete('used/:id')
  usedRemove(@Param('id') id: string) { return this.tools.removeUsed(id); }

  // 📢 «اطلبها ونوفرها» — مراجعة الطلبات وردود التجار
  @UseGuards(PermsGuard('stores'))
  @Get('requests')
  requestsList(@Query('status') status?: string) { return this.tools.adminRequests(status); }

  @UseGuards(PermsGuard('stores'))
  @Patch('requests/:id/status')
  requestStatus(@Param('id') id: string, @Body() body: { status?: string }) {
    return this.tools.setRequestStatus(id, String(body?.status || ''));
  }

  @UseGuards(PermsGuard('stores'))
  @Delete('requests/:id')
  requestRemove(@Param('id') id: string) { return this.tools.removeRequest(id); }

  @UseGuards(PermsGuard('stores'))
  @Get('request-replies')
  repliesList(@Query('status') status?: string) { return this.tools.adminReplies(status); }

  @UseGuards(PermsGuard('stores'))
  @Patch('request-replies/:id/status')
  replyStatus(@Param('id') id: string, @Body() body: { status?: string }) {
    return this.tools.setReplyStatus(id, String(body?.status || ''));
  }

  @UseGuards(PermsGuard('stores'))
  @Delete('request-replies/:id')
  replyRemove(@Param('id') id: string) { return this.tools.removeReply(id); }
  @UseGuards(PermsGuard('stores'))
  @Patch('stores/:id/status')
  storeStatus(@Param('id') id: string, @Body() b: { status: string }) {
    return this.admin.setStoreStatus(id, b.status);
  }
  @UseGuards(PermsGuard('stores'))
  @Patch('stores/:id/verify')
  verify(@Param('id') id: string) { return this.admin.toggleVerify(id); }
  // ⭐ التمييز — الإدارة وحدها تقرر ظهور المتجر في "المتميزة"
  @UseGuards(PermsGuard('stores'))
  @Patch('stores/:id/featured')
  featured(@Param('id') id: string) { return this.admin.toggleFeatured(id); }
  // رفض طلب تمييز معلق
  @UseGuards(PermsGuard('stores'))
  @Patch('stores/:id/featured-reject')
  featuredReject(@Param('id') id: string) { return this.admin.rejectFeatured(id); }
  // 🗂️ الظهور في دليل المتاجر — الإدارة وحدها توافق
  @UseGuards(PermsGuard('stores'))
  @Patch('stores/:id/listed')
  listed(@Param('id') id: string) { return this.admin.toggleListed(id); }
  // 🔑 منح صلاحيات استثنائية لمتجر محدد (تتجاوز حدود خطته)
  @UseGuards(PermsGuard('stores'))
  @Patch('stores/:id/grants')
  grants(@Param('id') id: string, @Body() b: { grants: any }) {
    return this.admin.setStoreGrants(id, b.grants || {});
  }
  @UseGuards(PermsGuard('stores'))
  @Patch('sellers/:id/status')
  sellerStatus(@Param('id') id: string, @Body() b: { status: string }) {
    return this.admin.setSellerStatus(id, b.status);
  }
  @UseGuards(PermsGuard('stores'))
  @Delete('stores/:id')
  deleteStore(@Param('id') id: string) { return this.admin.deleteStore(id); }

  // 🎖️ طلبات توثيق المتاجر — مراجعة الوثائق ومنح الشارة
  @UseGuards(PermsGuard('stores'))
  @Get('verification')
  verificationRequests(@Query('status') status?: string) {
    return this.admin.verificationRequests(status);
  }
  @UseGuards(PermsGuard('stores'))
  @Post('verification/:id/review')
  reviewVerification(@Param('id') id: string, @Body() b: { approve: boolean; reason?: string }) {
    return this.admin.reviewVerification(id, !!b.approve, b.reason);
  }

  // 🌐 طلبات النطاقات الحقيقية للمتاجر — مراجعة واعتماد
  @UseGuards(PermsGuard('stores'))
  @Get('domains')
  domains(@Query('status') status?: string) { return this.admin.domains(status); }
  @UseGuards(PermsGuard('stores'))
  @Post('domains/:storeId/review')
  reviewDomain(@Param('storeId') storeId: string, @Body() b: { approve: boolean; note?: string }) {
    return this.admin.reviewDomain(storeId, !!b.approve, b.note);
  }

  // العملاء
  @UseGuards(PermsGuard('customers'))
  @Get('customers')
  customers(@Query('q') q?: string, @Query('status') status?: string) {
    return this.admin.customers(q, status);
  }
  @UseGuards(PermsGuard('customers'))
  @Patch('customers/:id/status')
  customerStatus(@Param('id') id: string, @Body() b: { status: string }) {
    return this.admin.setCustomerStatus(id, b.status);
  }
  @UseGuards(PermsGuard('customers'))
  @Delete('customers/:id')
  deleteCustomer(@Param('id') id: string) { return this.admin.deleteCustomer(id); }

  // التقييمات
  @UseGuards(PermsGuard('reviews'))
  @Get('reviews')
  reviews(@Query('approved') approved?: string) { return this.admin.reviews(approved); }
  @UseGuards(PermsGuard('reviews'))
  @Patch('reviews/:id')
  reviewApproval(@Param('id') id: string, @Body() b: { approved: boolean }) {
    return this.admin.setReviewApproval(id, b.approved);
  }
  @UseGuards(PermsGuard('reviews'))
  @Patch('reviews/:id/reply')
  reviewReply(@Param('id') id: string, @Body() b: { hidden: boolean }) {
    return this.admin.setReviewReplyHidden(id, !!b.hidden);
  }
  @UseGuards(PermsGuard('reviews'))
  @Delete('reviews/:id')
  deleteReview(@Param('id') id: string) { return this.admin.deleteReview(id); }
  // 🧾 إعداد التقييم الموثوق — تقييد التقييمات بالمشترين الفعليين فقط
  @UseGuards(PermsGuard('reviews'))
  @Get('reviews-config')
  reviewsConfig() { return this.admin.reviewsConfig(); }
  @UseGuards(PermsGuard('reviews'))
  @Post('reviews-config')
  saveReviewsConfig(@Body() b: { onlyBuyers?: boolean }) { return this.admin.saveReviewsConfig(b); }

  // الإشراف: rentals | hotel | services
  @UseGuards(PermsGuard('supervision'))
  @Get('supervision/:kind/items')
  supItems(@Param('kind') kind: string, @Query('q') q?: string) {
    return this.admin.supervisionItems(kind, q);
  }
  @UseGuards(PermsGuard('supervision'))
  @Get('supervision/:kind/bookings')
  supBookings(@Param('kind') kind: string) {
    return this.admin.supervisionBookings(kind);
  }
  @UseGuards(PermsGuard('supervision'))
  @Patch('supervision/:kind/:id/hide')
  supHide(@Param('kind') kind: string, @Param('id') id: string) {
    return this.admin.toggleHide(kind, id);
  }
  @UseGuards(PermsGuard('supervision'))
  @Delete('supervision/:kind/:id')
  supDelete(@Param('kind') kind: string, @Param('id') id: string) {
    return this.admin.supervisionDelete(kind, id);
  }

  // إعدادات المنصة
  @UseGuards(PermsGuard('security'))
  @Get('settings')
  settings() { return this.admin.getSettings(); }

  @UseGuards(PermsGuard('security'))
  @Patch('settings')
  saveSettings(@Body() body: any) { return this.admin.saveSettings(body); }

  // 🔐 المصادقة الثنائية — كل مدير يدير حمايته بنفسه
  @Post('2fa/setup')
  tfaSetup(@CurrentUser() u: any) { return this.admin.twoFactorSetup(u.sub); }

  @Post('2fa/enable')
  tfaEnable(@CurrentUser() u: any, @Body() b: { code: string }) { return this.admin.twoFactorEnable(u.sub, b?.code || ''); }

  @Post('2fa/disable')
  tfaDisable(@CurrentUser() u: any, @Body() b: { code: string }) { return this.admin.twoFactorDisable(u.sub, b?.code || ''); }

  // 📜 سجل التدقيق الإداري
  @UseGuards(PermsGuard('security'))
  @Get('audit-logs')
  auditLogs(@Query() q: any) { return this.admin.auditLogs(q); }

  // 🧠 غرفة العمليات الذكية — نبض المنصة لحظة بلحظة
  @UseGuards(PermsGuard('finance'))
  @Get('ops-room')
  opsRoom(@Query('range') range?: string) { return this.admin.opsRoom(range || 'week'); }

  // 🗄️ صيانة قاعدة البيانات — إحصاءات + إصلاح ذاتي + إعادة ضبط المصنع
  @UseGuards(PermsGuard('system'))
  @Get('system/db-stats')
  dbStats() { return this.admin.dbStats(); }

  @UseGuards(PermsGuard('system'))
  @Post('system/db-repair')
  dbRepair(@CurrentUser() u: any) { return this.admin.dbRepair(u.sub); }

  @UseGuards(PermsGuard('system'))
  @Post('system/db-reset')
  dbReset(@CurrentUser() u: any, @Body() b: { confirm: string }) { return this.admin.dbReset(u.sub, b?.confirm || ''); }

  // 🎟️ كوبونات المنصة — حملات مركزية بجدولة وقياس أداء
  @UseGuards(PermsGuard('finance'))
  @Get('coupons')
  couponList() { return this.admin.platformCoupons(); }
  @UseGuards(PermsGuard('finance'))
  @Post('coupons')
  couponAdd(@Body() b: any) { return this.admin.createPlatformCoupon(b); }
  @UseGuards(PermsGuard('finance'))
  @Patch('coupons/:id')
  couponUpdate(@Param('id') id: string, @Body() b: any) { return this.admin.updatePlatformCoupon(id, b); }
  @UseGuards(PermsGuard('finance'))
  @Delete('coupons/:id')
  couponDelete(@Param('id') id: string) { return this.admin.deletePlatformCoupon(id); }

  // 🏙️ إدارة المحافظات
  @UseGuards(PermsGuard('stores'))
  @Get('governorates')
  govList() { return this.admin.governorates(); }
  @UseGuards(PermsGuard('stores'))
  @Post('governorates')
  govAdd(@Body() b: any) { return this.admin.addGovernorate(b); }
  @UseGuards(PermsGuard('stores'))
  @Patch('governorates/:id')
  govUpdate(@Param('id') id: string, @Body() b: any) { return this.admin.updateGovernorate(id, b); }
  @UseGuards(PermsGuard('stores'))
  @Delete('governorates/:id')
  govDelete(@Param('id') id: string) { return this.admin.deleteGovernorate(id); }

  // 💱 إدارة العملات
  @UseGuards(PermsGuard('finance'))
  @Get('currencies')
  curList() { return this.admin.currencies(); }
  @UseGuards(PermsGuard('finance'))
  @Post('currencies')
  curAdd(@Body() b: any) { return this.admin.addCurrency(b); }
  @UseGuards(PermsGuard('finance'))
  @Patch('currencies/:id')
  curUpdate(@Param('id') id: string, @Body() b: any) { return this.admin.updateCurrency(id, b); }
  @UseGuards(PermsGuard('finance'))
  @Delete('currencies/:id')
  curDelete(@Param('id') id: string) { return this.admin.deleteCurrency(id); }

  // إدارة المستخدمين (بائعون/عملاء/سائقون)
  @UseGuards(PermsGuard('customers'))
  @Get('users')
  users(@Query('role') role = 'customer', @Query('q') q?: string, @Query('status') status?: string) {
    return this.admin.users(role, q, status);
  }

  @UseGuards(PermsGuard('customers'))
  @Patch('users/:role/:id/status')
  userStatus(@Param('role') role: string, @Param('id') id: string, @Body() b: { status: string }) {
    return this.admin.setUserStatus(role, id, b.status);
  }
}
