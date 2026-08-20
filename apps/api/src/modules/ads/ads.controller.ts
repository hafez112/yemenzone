import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdsService, AD_POSITIONS, AD_SIZES } from './ads.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';
import { saveImage, imageFileFilter } from '../../common/upload';

// ═══ المدير: إدارة الإعلانات + رفع الصور من الجهاز ═══
@Controller('admin/ads')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('design'))
export class AdminAdsController {
  constructor(private ads: AdsService) {}

  @Get()
  list() { return this.ads.adminList(); }

  @Get('positions')
  positions() { return AD_POSITIONS; }

  @Get('sizes')
  sizes() { return AD_SIZES; }

  // 💰 تسعير الإعلانات الأسبوعي
  @Get('pricing')
  pricing() { return this.ads.getPricing(); }

  @Patch('pricing')
  savePricing(@Body() body: any) { return this.ads.savePricing(body); }

  // مراجعة دفعة إعلان بائع (موافقة = بث فوري)
  @Patch('review-payment/:id')
  reviewAdPayment(@Param('id') id: string, @Body() b: { approve: boolean }, @CurrentUser() u: any) {
    return this.ads.reviewAdPayment(id, b.approve, u.sub);
  }

  @Post()
  save(@Body() body: any) { return this.ads.save(body); }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) { return this.ads.toggle(id); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.ads.remove(id); }

  // رفع صورة إعلان من الجهاز → WebP محسّمة للبانرات
  @Post('upload')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  }))
  upload(@UploadedFile() file: Express.Multer.File) {
    return saveImage(file, 'ads', 1600).then((url) => ({ url }));
  }
}

// ═══ العام: عرض الإعلانات في الرئيسية + تتبع النقرات ═══
@Controller('v1/ads')
export class PublicAdsController {
  constructor(private ads: AdsService) {}

  @Get()
  list(@Query('position') position = 'home_top') { return this.ads.publicList(position); }

  // 🖼️ بانرات متجر معيّن — تُعرض أعلى صفحته
  @Get('store/:slug')
  storeBanners(@Param('slug') slug: string) { return this.ads.storeBanners(slug); }

  @Post(':id/click')
  click(@Param('id') id: string) { return this.ads.click(id); }
}

// ═══ البائع: إعلاناتي المدفوعة + رفع صورتها من الجهاز ═══
@Controller('seller/ads')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerAdsController {
  constructor(private ads: AdsService) {}

  @Get()
  list(@CurrentUser() u: any) { return this.ads.sellerList(u.sub); }

  @Post()
  create(@CurrentUser() u: any, @Body() body: any) { return this.ads.sellerCreate(u.sub, body); }

  // 🖼️ تحكم البائع ببنرات متجره الداخلية
  @Patch(':id/toggle')
  toggle(@CurrentUser() u: any, @Param('id') id: string) { return this.ads.sellerToggle(u.sub, id); }

  @Delete(':id')
  remove(@CurrentUser() u: any, @Param('id') id: string) { return this.ads.sellerRemove(u.sub, id); }

  // رفع صورة الإعلان من جهاز البائع
  @Post('upload')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  }))
  upload(@UploadedFile() file: Express.Multer.File) {
    return saveImage(file, 'ads', 1600).then((url) => ({ url }));
  }
}
