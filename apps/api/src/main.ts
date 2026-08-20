import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 🛡️ رؤوس أمان مشددة: HSTS سنة كاملة + منع التضمين بإطارات + منع تخمين الأنواع + سياسة المُحيل
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // للصور المرفوعة عبر الدومين نفسه
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hidePoweredBy: true,
  }));
  app.enableCors({ origin: true, credentials: true });

  // تقديم الصور المرفوعة — كاش متصفح طويل (30 يوم) لسرعة التحميل
  app.useStaticAssets(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    maxAge: '30d',
    immutable: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api', { exclude: ['uploads/(.*)'] });

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  console.log(`🚀 يمن زون API يعمل على http://localhost:${port}/api`);
}
bootstrap();
