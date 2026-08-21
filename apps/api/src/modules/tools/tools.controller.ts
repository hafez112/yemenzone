import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ToolsService } from './tools.service';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';
import { imageFileFilter } from '../../common/upload';

// 🧰 تكنولوجيا المنصة — نقاط عامة للخدمات المجانية /api/v1/tools/*
@Controller('v1/tools')
export class ToolsController {
  constructor(private tools: ToolsService) {}

  // 🔓 ما اشتراه المستخدم من الخدمات المدفوعة (عميل أو بائع)
  @Get('my-access')
  @UseGuards(AuthGuard)
  myAccess(@CurrentUser() u: any) { return this.tools.myAccess(u.typ, u.sub); }

  // 💳 شراء خدمة مدفوعة ببطاقة يمن زون — تفتح تلقائياً فور الدفع
  @Post(':key/buy')
  @UseGuards(AuthGuard)
  buy(@CurrentUser() u: any, @Param('key') key: string) { return this.tools.buyTool(u.typ, u.sub, key); }

  // القائمة العامة (الأدوات الظاهرة + أسعار الصرف)
  @Get()
  list() { return this.tools.publicList(); }

  // عداد استخدام صامت — يُستدعى عند فتح أي أداة
  @UseGuards(RateLimit(30, 60_000, 'tool-use'))
  @Post(':key/use')
  use(@Param('key') key: string) { return this.tools.trackUse(key); }

  // 👁️ عداد زيارات صفحات الخدمات والبوابة (hub)
  @UseGuards(RateLimit(60, 60_000, 'tool-view'))
  @Post(':key/view')
  view(@Param('key') key: string) { return this.tools.trackView(key); }

  // 🔍 SEO مخصص لكل خدمة — يُقرأ من SSR لتوليد الميتا
  @Get('seo/:key')
  seo(@Param('key') key: string) { return this.tools.getSeo(key); }

  // 🔗 صفحات روابطي
  @UseGuards(RateLimit(10, 60 * 60_000, 'bio-create'))
  @Post('bio')
  createBio(@Body() body: any) { return this.tools.createBio(body); }

  @Get('bio/:slug')
  getBio(@Param('slug') slug: string) { return this.tools.getBio(slug); }

  @UseGuards(RateLimit(30, 60 * 60_000, 'bio-update'))
  @Patch('bio/:slug')
  updateBio(@Param('slug') slug: string, @Body() body: any) { return this.tools.updateBio(slug, body); }

  // 🌐 فاحص المواقع
  @UseGuards(RateLimit(10, 60 * 60_000, 'site-check'))
  @Post('site-check')
  siteCheck(@Body() body: { url?: string }) { return this.tools.siteCheck(String(body?.url || '')); }

  // 🚀 «أضفني إلى محركات البحث»
  @UseGuards(RateLimit(5, 60 * 60_000, 'biz-submit'))
  @Post('biz')
  submitBiz(@Body() body: any) { return this.tools.submitBiz(body); }

  @Get('biz/:slug')
  getBiz(@Param('slug') slug: string) { return this.tools.getBiz(slug); }

  // 📍 المحلات القريبة منك
  @Get('biz-nearby')
  nearbyBiz(@Query('lat') lat?: string, @Query('lng') lng?: string) { return this.tools.nearbyBiz(lat, lng); }

  // 🎨 توليد شعار/غلاف بالذكاء الاصطناعي (تفعّله الإدارة)
  @UseGuards(RateLimit(6, 60 * 60_000, 'ai-image'))
  @Post('ai-image')
  aiImage(@Body() body: { prompt?: string; kind?: string }) {
    return this.tools.generateImage(String(body?.prompt || ''), String(body?.kind || 'logo'));
  }

  // ═══ 🔗 بع برابط واحد ═══
  // 📤 رفع صورة المنتج — WebP محسّمة حتى 1600px، 5MB كحد أقصى
  @UseGuards(RateLimit(10, 60 * 60_000, 'qs-upload'))
  @Post('quick-sell/upload')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  }))
  quickSellUpload(@UploadedFile() file: Express.Multer.File) {
    return this.tools.uploadQuickSellImage(file);
  }

  @UseGuards(RateLimit(3, 60 * 60_000, 'qs-create'))
  @Post('quick-sell')
  quickSellCreate(@Body() body: any) { return this.tools.createQuickSell(body); }

  @Get('quick-sell/:slug')
  quickSellGet(@Param('slug') slug: string) { return this.tools.getQuickSell(slug); }

  // ═══ ⚖️ مقارن الأسعار الذكي ═══
  @UseGuards(RateLimit(30, 60_000, 'price-hunt'))
  @Get('price-compare')
  priceCompare(@Query('q') q?: string) { return this.tools.priceCompare(String(q || '')); }

  // ═══ 📢 اطلبها ونوفرها ═══
  @UseGuards(RateLimit(3, 60 * 60_000, 'req-create'))
  @Post('requests')
  requestCreate(@Body() body: any) { return this.tools.createRequest(body); }

  @Get('requests')
  requestList(@Query('gov') gov?: string, @Query('q') q?: string) { return this.tools.listRequests(gov, q); }

  @Get('requests/:slug')
  requestGet(@Param('slug') slug: string) { return this.tools.getRequest(slug); }

  @UseGuards(RateLimit(5, 60 * 60_000, 'req-reply'))
  @Post('requests/:slug/reply')
  requestReply(@Param('slug') slug: string, @Body() body: any) { return this.tools.replyRequest(slug, body); }

  // ═══ ♻️ سوق المستعمل ═══
  // 📤 رفع صورة الإعلان — WebP محسّمة حتى 1600px، 5MB كحد أقصى
  @UseGuards(RateLimit(10, 60 * 60_000, 'used-upload'))
  @Post('used/upload')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  }))
  usedUpload(@UploadedFile() file: Express.Multer.File) {
    return this.tools.uploadUsedImage(file);
  }

  @UseGuards(RateLimit(3, 60 * 60_000, 'used-create'))
  @Post('used')
  usedCreate(@Body() body: any) { return this.tools.createUsed(body); }

  @Get('used')
  usedList(@Query('cat') cat?: string, @Query('gov') gov?: string, @Query('q') q?: string) {
    return this.tools.listUsed(cat, gov, q);
  }

  @Get('used/:slug')
  usedGet(@Param('slug') slug: string) { return this.tools.getUsed(slug); }

  // ═══ 🔔 تنبيه نزول السعر ═══
  @UseGuards(RateLimit(5, 60 * 60_000, 'price-alert'))
  @Post('price-alert')
  priceAlert(@Body() body: any) { return this.tools.subscribePriceAlert(body); }

  // ═══ 📖 دليل الأعمال اليمني ═══
  @Get('directory')
  directory(@Query('cat') cat?: string, @Query('gov') gov?: string, @Query('q') q?: string) {
    return this.tools.listDirectory(cat, gov, q);
  }
}
