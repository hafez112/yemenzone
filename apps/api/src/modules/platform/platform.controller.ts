import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { PlatformService } from './platform.service';
import { saveImage, imageFileFilter, saveVideo, videoFileFilter } from '../../common/upload';

// ═══ الإدارة: التصميم الديناميكي ═══
@Controller('admin/design')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('design'))
export class AdminDesignController {
  constructor(private svc: PlatformService) {}

  @Get() design() { return this.svc.getDesign(); }
  @Put('settings') saveSettings(@Body() body: any) { return this.svc.saveSettings(body.entries || []); }
  @Post('slides') saveSlide(@Body() body: any) { return this.svc.saveSlide(body); }
  @Delete('slides/:id') deleteSlide(@Param('id') id: string) { return this.svc.deleteSlide(id); }
  @Post('backups') backup(@Body() body: any) { return this.svc.createBackup(body.name); }
  @Post('backups/:id/restore') restore(@Param('id') id: string) { return this.svc.restoreBackup(id); }

  // رفع صور الشرائح من الجهاز → WebP
  @Post('upload')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  }))
  upload(@UploadedFile() file: Express.Multer.File) {
    return saveImage(file, 'slides', 1600).then((url) => ({ url }));
  }
}

// ═══ الإدارة: الصفحات المخصصة ═══
@Controller('admin/pages')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('design'))
export class AdminPagesController {
  constructor(private svc: PlatformService) {}

  @Post() save(@Body() body: any) { return this.svc.savePage(body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.deletePage(id); }
}

// ═══ الإدارة: خدمات المنصة ═══
@Controller('admin/platform-services')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('design'))
export class AdminPlatformServicesController {
  constructor(private svc: PlatformService) {}

  @Get() services() { return this.svc.adminServices(); }
  @Post() save(@Body() body: any) { return this.svc.saveService(body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.deleteService(id); }
  @Get('orders') orders() { return this.svc.adminServiceOrders(); }
  @Post('orders/:id/review') review(@Param('id') id: string, @Body() body: any) {
    return this.svc.reviewServiceOrder(id, !!body.approve);
  }

  // رفع صورة الخدمة من الجهاز → WebP
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  }))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return saveImage(file, 'services', 1200).then((url) => ({ url }));
  }

  // رفع فيديو توضيحي من الجهاز (حتى 60 ميجابايت)
  @Post('upload-video')
  @UseInterceptors(FileInterceptor('video', {
    limits: { fileSize: 60 * 1024 * 1024 },
    fileFilter: videoFileFilter,
  }))
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    return saveVideo(file).then((url) => ({ url }));
  }
}

// ═══ الإدارة: المدونة (محتوى + SEO) ═══
@Controller('admin/blog')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('design'))
export class AdminBlogController {
  constructor(private svc: PlatformService) {}

  @Get() posts() { return this.svc.adminBlog(); }
  @Post() save(@Body() body: any) { return this.svc.saveBlogPost(body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.deleteBlogPost(id); }

  // رفع صورة الغلاف من الجهاز → WebP
  @Post('upload')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  }))
  upload(@UploadedFile() file: Express.Multer.File) {
    return saveImage(file, 'blog', 1600).then((url) => ({ url }));
  }

  // رفع فيديو توضيحي للمقال (حتى 60 ميجابايت)
  @Post('upload-video')
  @UseInterceptors(FileInterceptor('video', {
    limits: { fileSize: 60 * 1024 * 1024 },
    fileFilter: videoFileFilter,
  }))
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    return saveVideo(file).then((url) => ({ url }));
  }
}

// ═══ عام: الصفحات والخدمات والمدونة ═══
@Controller('v1/platform')
export class PublicPlatformController {
  constructor(private svc: PlatformService) {}

  @Get('pages/menu') menu() { return this.svc.publicPages('menu'); }
  @Get('pages/footer') footer() { return this.svc.publicPages('footer'); }
  @Get('pages/:slug') page(@Param('slug') slug: string) { return this.svc.publicPage(slug); }
  @Get('services') services() { return this.svc.publicServices(); }
  @Get('services/:id') service(@Param('id') id: string) { return this.svc.publicService(id); }
  @Post('services/order') order(@Body() body: any) { return this.svc.orderService(body); }
  @Get('blog') blog() { return this.svc.publicBlog(); }
  @Get('blog/:slug') blogPost(@Param('slug') slug: string) { return this.svc.publicBlogPost(slug); }
  // 🎁 رصيد نقاط رقم جوال — لخصم خدمات المنصة في صفحة الطلب
  @Get('points-balance') pointsBalance(@Query('phone') phone: string) {
    return this.svc.pointsBalance(phone || '');
  }
  // 🔎 إعدادات الظهور في جوجل — يقرؤها الواجهة لبناء الميتا ديناميكياً
  @Get('seo') seo() { return this.svc.publicSeo(); }
}
