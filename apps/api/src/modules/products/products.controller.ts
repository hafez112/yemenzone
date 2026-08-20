import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
  UseInterceptors, UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const UPLOADS = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

@Controller('seller')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class ProductsController {
  constructor(private products: ProductsService) {}

  // ═══ الأصناف ═══
  @Get('categories')
  categories(@CurrentUser() u: any) { return this.products.listCategories(u.sub); }

  @Post('categories')
  createCategory(@CurrentUser() u: any, @Body() b: any) { return this.products.createCategory(u.sub, b); }

  @Patch('categories/:id')
  updateCategory(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.products.updateCategory(u.sub, id, b);
  }

  @Delete('categories/:id')
  deleteCategory(@CurrentUser() u: any, @Param('id') id: string) {
    return this.products.deleteCategory(u.sub, id);
  }

  // ═══ المنتجات ═══
  @Get('products')
  listProducts(@CurrentUser() u: any) { return this.products.listProducts(u.sub); }

  // 📤 تصدير المنتجات (صفوف CSV جاهزة)
  @Get('products/export')
  exportProducts(@CurrentUser() u: any) { return this.products.exportProducts(u.sub); }

  // 📥 استيراد دفعة (حتى 200 صف — إنشاء وتحديث)
  @Post('products/import')
  importProducts(@CurrentUser() u: any, @Body() b: { rows: any[] }) { return this.products.importProducts(u.sub, b.rows || []); }

  // ⚡ تعديل جماعي للأسعار/المخزون
  @Post('products/bulk-adjust')
  bulkAdjust(@CurrentUser() u: any, @Body() b: any) { return this.products.bulkAdjust(u.sub, b); }

  @Post('products')
  createProduct(@CurrentUser() u: any, @Body() b: any) { return this.products.createProduct(u.sub, b); }

  @Patch('products/:id')
  updateProduct(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.products.updateProduct(u.sub, id, b);
  }

  @Delete('products/:id')
  deleteProduct(@CurrentUser() u: any, @Param('id') id: string) {
    return this.products.deleteProduct(u.sub, id);
  }

  // 📦 ملخص المخزون الذكي (نفد/منخفض/متوفر)
  @Get('inventory')
  inventory(@CurrentUser() u: any) { return this.products.inventory(u.sub); }

  // 🏠 رئيسية البائع الذكية — مهام اليوم + النبض المالي + نصيحة اليوم
  @Get('home-insights')
  homeInsights(@CurrentUser() u: any) { return this.products.homeInsights(u.sub); }

  // 🚀 مساعد النمو المحلي — ساعات الذروة + الراكدة + المتكررون + التسعير
  @Get('growth')
  growth(@CurrentUser() u: any) { return this.products.growth(u.sub); }

  // ✍️ مولّد أوصاف المنتجات القاعدي — ثلاث نبرات جاهزة
  @Post('growth/describe')
  describe(@CurrentUser() u: any, @Body() b: any) { return this.products.describeProduct(b); }

  // ═══ 🤖 أدوات الذكاء المحلي ═══
  @Post('ai-tools')
  aiTools(@Body() b: any) { return this.products.aiTools(b); }

  // ═══ رفع الصور → WebP تلقائي عبر Sharp ═══
  @Post('upload')
  @UseInterceptors(FilesInterceptor('images', 6, {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new BadRequestException('صور فقط'), false);
      cb(null, true);
    },
  }))
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('لم تُرسل صور');
    fs.mkdirSync(UPLOADS, { recursive: true });
    const urls: string[] = [];
    for (const file of files) {
      const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`;
      await sharp(file.buffer)
        .resize(900, 900, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(UPLOADS, name));
      urls.push(`/uploads/${name}`);
    }
    return { urls };
  }
}
