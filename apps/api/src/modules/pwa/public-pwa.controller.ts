import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { UPLOADS_DIR } from '../../common/upload';

// 🖼️ مولّد أيقونات تطبيق المتجر — يحوّل شعار المتجر إلى PNG مربعة دقيقة المقاس
// تُستخدم في manifest المتجر ليظهر التطبيق باسم المتجر وشعاره على جوال الزائر
@Controller('v1/pwa')
export class PublicPwaController {
  constructor(private prisma: PrismaService) {}

  @Get('store-icon/:slug/:size')
  async storeIcon(@Param('slug') slug: string, @Param('size') sizeRaw: string, @Res() res: Response) {
    const size = [192, 512].includes(Number(sizeRaw)) ? Number(sizeRaw) : 512;
    const store = await this.prisma.store.findUnique({
      where: { slug },
      select: { logo: true, themeJson: true, status: true },
    });
    if (!store || store.status !== 'active') throw new NotFoundException('المتجر غير موجود');

    // بلون هوية المتجر خلفيةً للأيقونة (منطقة الأمان للقص الدائري)
    const primary = (store.themeJson as any)?.primary || '#6C3DF5';
    const logoPath = store.logo?.startsWith('/uploads/')
      ? path.join(UPLOADS_DIR, store.logo.replace('/uploads/', ''))
      : null;

    const padding = Math.round(size * 0.12); // حواف آمنة حول الشعار
    let img: Buffer;
    if (logoPath && fs.existsSync(logoPath)) {
      img = await sharp(logoPath)
        .resize(size - padding * 2, size - padding * 2, { fit: 'contain', background: primary })
        .flatten({ background: primary })
        .extend({ top: padding, bottom: padding, left: padding, right: padding, background: primary })
        .png()
        .toBuffer();
    } else {
      // بلا شعار: مربع بلون المتجر مع أول حرف من اسمه لا يمكن رسمه بـ sharp — لون صلب أنيق
      img = await sharp({
        create: { width: size, height: size, channels: 3, background: primary },
      }).png().toBuffer();
    }

    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
    res.send(img);
  }
}
