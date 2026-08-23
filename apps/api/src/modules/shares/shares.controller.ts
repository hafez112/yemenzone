import {
  BadRequestException, Body, Controller, Get, Param, Patch, Post, Put,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SharesService } from './shares.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { CurrentUser } from '../../common/decorators';
import { imageFileFilter, saveImage } from '../../common/upload';

// ═══ 🌐 عام: الجولة النشطة + المؤشر + عرض الصكوك ═══
@Controller('v1/shares')
export class PublicSharesController {
  constructor(private shares: SharesService) {}

  @Get('offering')
  offering() { return this.shares.publicOffering(); }

  @Get('index')
  index() { return this.shares.index(); }

  // 📜 عرض/تحقق من صك بالرقم — عام لأن الصك وثيقة تُشارك
  @Get('certificate/:number')
  certificate(@Param('number') number: string) { return this.shares.certificate(number); }

  // صكوكي — يتطلب دخولاً (عميل أو بائع)
  @Get('mine')
  @UseGuards(AuthGuard)
  mine(@CurrentUser() u: any) { return this.shares.mine(u.typ, u.sub); }

  // 💳 شراء أسهم — بطاقة يمن زون فوري أو تحويل بإثبات
  @Post('buy')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimit(10, 60_000, 'shares-buy'))
  buy(@CurrentUser() u: any, @Body() body: any) { return this.shares.buy(u.typ, u.sub, body); }

  // 🧾 رفع إثبات التحويل → WebP
  @Post('upload-proof')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  }))
  uploadProof(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('أرفق صورة الإثبات');
    return saveImage(file, 'proofs', 1200).then((url) => ({ url }));
  }
}

// ═══ 👑 الإدارة: جولات البيع + الصكوك + الإعدادات — صلاحية المالية ═══
@Controller('admin/shares')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('finance'))
export class AdminSharesController {
  constructor(private shares: SharesService) {}

  @Get()
  overview() { return this.shares.adminOverview(); }

  @Post('offerings')
  createOffering(@Body() body: any) { return this.shares.createOffering(body); }

  @Patch('offerings/:id')
  updateOffering(@Param('id') id: string, @Body() body: any) { return this.shares.updateOffering(id, body); }

  @Post('purchases/:id/review')
  reviewPurchase(@Param('id') id: string, @Body() body: any) {
    return this.shares.reviewPurchase(id, !!body.approve);
  }

  @Post('certificates/:id/cancel')
  cancelCertificate(@Param('id') id: string) { return this.shares.cancelCertificate(id); }

  @Put('settings')
  saveSettings(@Body() body: any) { return this.shares.saveSettings(body); }
}
