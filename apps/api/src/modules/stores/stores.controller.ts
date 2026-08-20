import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoresService } from './stores.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';
import { saveImage, imageFileFilter } from '../../common/upload';

@Controller('stores')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class StoresController {
  constructor(private stores: StoresService) {}

  // خيارات الإعداد (أنواع + تصنيفات + قوالب)
  @Get('setup-options')
  options() {
    return this.stores.setupOptions();
  }
  // 🤖 معاينة الذكاء الاصطناعي المحلي قبل الإنشاء
  @Post('ai-preview')
  aiPreview(@Body() body: { kind: string; name: string; category?: string }) {
    return this.stores.aiPreview(body);
  }

  // إنشاء المتجر
  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.stores.create(user.sub, body);
  }

  // 🤝 إحالة التجار — رابط الدعوة وعدد من انضم عبره
  @Get('my/referral')
  myReferral(@CurrentUser() user: any) {
    return this.stores.referralInfo(user.sub);
  }

  // متجري
  @Get('my')
  myStore(@CurrentUser() user: any) {
    return this.stores.myStore(user.sub);
  }

  // تحديث القالب والألوان
  @Patch('my/theme')
  updateTheme(@CurrentUser() user: any, @Body() body: any) {
    return this.stores.updateTheme(user.sub, body);
  }

  // تحديث البيانات
  @Patch('my')
  update(@CurrentUser() user: any, @Body() body: any) {
    return this.stores.update(user.sub, body);
  }

  // ⭐ طلب تمييز المتجر (الموافقة من الإدارة فقط)
  @Post('my/featured-request')
  featuredRequest(@CurrentUser() user: any) {
    return this.stores.requestFeatured(user.sub);
  }

  // 🏅 مستواي وشارات إنجازي
  @Get('my/achievements')
  achievements(@CurrentUser() user: any) {
    return this.stores.achievements(user.sub);
  }

  // 🎖️ حالة التوثيق + سجل الطلبات
  @Get('my/verification')
  myVerification(@CurrentUser() user: any) {
    return this.stores.myVerification(user.sub);
  }

  // 🎖️ تقديم طلب توثيق
  @Post('my/verification')
  requestVerification(@CurrentUser() user: any, @Body() body: any) {
    return this.stores.requestVerification(user.sub, body);
  }

  // 🌐 نطاقي الحقيقي: الحالة + طلب الربط + الإزالة
  // 💳🚚 طرق الدفع والتوصيل الخاصة بالمتجر
  @Get('my/checkout')
  checkoutSettings(@CurrentUser() user: any) {
    return this.stores.checkoutSettings(user.sub);
  }

  @Post('my/payment-methods')
  addPaymentMethod(@CurrentUser() user: any, @Body() body: any) {
    return this.stores.addPaymentMethod(user.sub, body);
  }

  @Patch('my/payment-methods/:id')
  updatePaymentMethod(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.stores.updatePaymentMethod(user.sub, id, body);
  }

  @Delete('my/payment-methods/:id')
  deletePaymentMethod(@CurrentUser() user: any, @Param('id') id: string) {
    return this.stores.deletePaymentMethod(user.sub, id);
  }

  @Post('my/delivery-methods')
  addDeliveryMethod(@CurrentUser() user: any, @Body() body: any) {
    return this.stores.addDeliveryMethod(user.sub, body);
  }

  @Patch('my/delivery-methods/:id')
  updateDeliveryMethod(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.stores.updateDeliveryMethod(user.sub, id, body);
  }

  @Delete('my/delivery-methods/:id')
  deleteDeliveryMethod(@CurrentUser() user: any, @Param('id') id: string) {
    return this.stores.deleteDeliveryMethod(user.sub, id);
  }

  @Get('my/domain')
  myDomain(@CurrentUser() user: any) {
    return this.stores.myDomain(user.sub);
  }

  @Post('my/domain')
  requestDomain(@CurrentUser() user: any, @Body() body: { domain?: string }) {
    return this.stores.requestDomain(user.sub, body.domain);
  }

  @Delete('my/domain')
  removeDomain(@CurrentUser() user: any) {
    return this.stores.removeDomain(user.sub);
  }

  // 🎖️ رفع صورة الوثيقة (بطاقة / سجل تجاري)
  @Post('my/verification/upload')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  }))
  uploadDoc(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('الملف مطلوب');
    return saveImage(file, 'docs', 1600).then((url) => ({ url }));
  }
}
