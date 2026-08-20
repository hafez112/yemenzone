import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { PaymentsService } from './payments.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';

const UPLOADS = path.join(process.cwd(), 'uploads', 'proofs');

// ── عام: بوابات الدفع + إثبات الطلب ──
@Controller('v1/payments')
export class PublicPaymentsController {
  constructor(private svc: PaymentsService) {}

  @Get('gateways')
  gateways(@Query('scope') scope?: string) {
    return this.svc.publicGateways(scope || 'orders');
  }

  @Post('order/:orderId/proof')
  submitProof(@Param('orderId') orderId: string, @Body() body: any) {
    return this.svc.submitOrderProof(orderId, body);
  }

  @Get('order/:orderId/status')
  orderStatus(@Param('orderId') orderId: string, @Query('phone') phone: string) {
    return this.svc.orderPaymentStatus(orderId, phone);
  }

  // 🧾 سند الدفع — لصاحبه فقط (عميل/بائع) أو الإدارة
  @Get('receipt/:number')
  @UseGuards(AuthGuard)
  receipt(@Param('number') number: string, @CurrentUser() u: any) {
    return this.svc.receipt(number, u);
  }

  // رفع صورة الإثبات (WebP)
  @Post('upload-proof')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('لم تُرسل صورة');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('الملف يجب أن يكون صورة');
    fs.mkdirSync(UPLOADS, { recursive: true });
    const name = `proof-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`;
    await sharp(file.buffer)
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(UPLOADS, name));
    return { url: `/uploads/proofs/${name}` };
  }
}

// ── الإدارة: مركز المدفوعات + البوابات ──
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('payments'))
export class AdminPaymentsController {
  constructor(private svc: PaymentsService) {}

  @Get('payments')
  payments(@Query('status') status?: string, @Query('purpose') purpose?: string) {
    return this.svc.adminPayments({ status, purpose });
  }

  @Get('payments/stats')
  stats() { return this.svc.adminStats(); }

  @Patch('payments/:id/review-order')
  review(@Param('id') id: string, @Body() body: { approve: boolean }, @CurrentUser() u: any) {
    return this.svc.reviewOrderPayment(id, body.approve, u.sub);
  }

  @Get('payment-gateways')
  gateways() { return this.svc.adminGateways(); }

  @Post('payment-gateways')
  saveGateway(@Body() body: any) { return this.svc.saveGateway(body); }

  @Patch('payment-gateways/:id/toggle')
  toggle(@Param('id') id: string) { return this.svc.toggleGateway(id); }

  // 🔌 اختبار اتصال البوابة برابط API المضبوط
  @Post('payment-gateways/:id/test')
  test(@Param('id') id: string) { return this.svc.testGateway(id); }

  @Delete('payment-gateways/:id')
  del(@Param('id') id: string) { return this.svc.deleteGateway(id); }
}
