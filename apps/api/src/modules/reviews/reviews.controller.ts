import {
  Controller, Post, Get, Delete, Body, Param, UseGuards, BadRequestException, NotFoundException,
  UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../../prisma/prisma.service';
import { SmartScoreService } from './smart-score.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { normalizePhone } from '../../libs/security';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const UPLOADS = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

// التقييمات والإعجابات — عامة (باسم وجوال) أو لعميل مسجل
@Controller('v1')
export class ReviewsController {
  constructor(
    private prisma: PrismaService,
    private smart: SmartScoreService,
    private notifications: NotificationsService,
  ) {}

  // إضافة تقييم لمتجر أو منتج — وبرقم الطلب يصبح تقييماً موثّقاً بعد شراء فعلي
  // 📸 رفع صور التقييم — صورتان كحد أقصى، WebP تلقائي، 🚦 10/ساعة
  @UseGuards(RateLimit(10, 60 * 60_000, 'review-upload'))
  @Post('reviews/upload')
  @UseInterceptors(FilesInterceptor('images', 2, {
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new BadRequestException('صور فقط'), false);
      cb(null, true);
    },
  }))
  async reviewUpload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('لم تُرسل صور');
    fs.mkdirSync(UPLOADS, { recursive: true });
    const urls: string[] = [];
    for (const file of files) {
      const name = `review-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`;
      await sharp(file.buffer).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(UPLOADS, name));
      urls.push(`/uploads/${name}`);
    }
    return { urls };
  }

  @Post('reviews/:storeSlug')
  async addReview(@Param('storeSlug') slug: string, @Body() body: {
    name: string; phone: string; rating: number; comment?: string; productId?: string; orderNumber?: string; images?: string[];
  }) {
    const store = await this.prisma.store.findUnique({ where: { slug } });
    if (!store || store.status !== 'active') throw new NotFoundException('المتجر غير موجود');
    if (!body.name?.trim() || !body.phone?.trim()) throw new BadRequestException('الاسم والجوال مطلوبان');
    // 🌍 توحيد الرقم بمفتاح الدولة — لمطابقة الطلب وحساب العميل مهما كانت صيغة الإدخال
    body.phone = normalizePhone(body.phone) || body.phone.trim();
    const rating = Math.max(1, Math.min(5, Number(body.rating || 0)));

    // العميل (موجود أو جديد)
    let customer = await this.prisma.customer.findUnique({ where: { phone: body.phone.trim() } });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { phone: body.phone.trim(), name: body.name.trim() },
      });
    }

    // 🧾 وضع "تقييم المشترين فقط" — تفعّله الإدارة فلا يُقبل تقييم بلا طلب مكتمل
    if (!body.orderNumber?.trim()) {
      const cfg = await this.prisma.setting.findUnique({ where: { key: 'reviews.config' } });
      if ((cfg?.value as any)?.onlyBuyers) {
        throw new BadRequestException('التقييم متاح للمشترين فقط — أدخل رقم طلبك المكتمل لتحصل على شارة مشترٍ موثوق ✅');
      }
    }

    // 🧾 تقييم ما بعد الشراء: التحقق من الطلب وربطه (شارة مشترٍ موثّق ✅)
    let orderId: string | null = null;
    let orderNumber: string | null = null;
    if (body.orderNumber?.trim()) {
      const num = body.orderNumber.trim().toUpperCase();
      const order = await this.prisma.order.findFirst({
        where: { number: num, storeId: store.id, customerPhone: body.phone.trim() },
      });
      if (!order) throw new BadRequestException('لم يُعثر على طلب مطابق — تأكد من رقم الطلب والجوال');
      if (!['completed', 'delivered'].includes(order.status)) {
        throw new BadRequestException('يمكنك تقييم الطلب بعد اكتماله أو تسليمه');
      }
      const reviewedOrder = await this.prisma.review.findFirst({ where: { orderId: order.id } });
      if (reviewedOrder) throw new BadRequestException('قيّمت هذا الطلب من قبل — شكراً لك');
      orderId = order.id;
      orderNumber = num;
    } else {
      // منع تكرار التقييم لنفس المتجر من نفس العميل (التقييم العام غير المرتبط بطلب)
      const exists = await this.prisma.review.findFirst({
        where: { storeId: store.id, customerId: customer.id, productId: body.productId || null, orderId: null },
      });
      if (exists) throw new BadRequestException('قيّمت هذا من قبل — شكراً لك');
    }

    // 📸 صور المشتري — مسارات /uploads فقط، حد أقصى صورتان (حماية من الحقن)
    const images = (Array.isArray(body.images) ? body.images : [])
      .filter((u) => typeof u === 'string' && u.startsWith('/uploads/'))
      .slice(0, 2);

    const review = await this.prisma.review.create({
      data: {
        storeId: store.id,
        productId: body.productId || null,
        customerId: customer.id,
        rating,
        comment: body.comment?.trim(),
        orderId,
        orderNumber,
        images,
      },
    });

    // 🤖 إعادة حساب الدرجة الذكية فوراً
    const newScore = await this.smart.compute(store.id);

    // 🔔 تنبيه البائع بالتقييم الجديد — صامت لا يعطّل العملية
    if (store.sellerId) {
      this.notifications.push('seller', store.sellerId, {
        icon: '⭐',
        title: `تقييم جديد ${'★'.repeat(rating)} من ${customer.name}`,
        body: body.comment?.trim() || undefined,
        link: '/seller/reviews',
      });
    }

    return { review, smartScore: newScore };
  }

  // إعجاب / إلغاء إعجاب بمتجر
  @Post('stores/:slug/like')
  async toggleLike(@Param('slug') slug: string, @Body() body: { phone: string }) {
    const store = await this.prisma.store.findUnique({ where: { slug } });
    if (!store || store.status !== 'active') throw new NotFoundException('المتجر غير موجود');
    if (!body.phone?.trim()) throw new BadRequestException('رقم الجوال مطلوب');

    let customer = await this.prisma.customer.findUnique({ where: { phone: body.phone.trim() } });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { phone: body.phone.trim(), name: 'زائر' },
      });
    }

    const existing = await this.prisma.storeLike.findUnique({
      where: { customerId_storeId: { customerId: customer.id, storeId: store.id } },
    });

    let liked: boolean;
    if (existing) {
      await this.prisma.storeLike.delete({ where: { id: existing.id } });
      await this.prisma.store.update({ where: { id: store.id }, data: { likesCount: { decrement: 1 } } });
      liked = false;
    } else {
      await this.prisma.storeLike.create({ data: { customerId: customer.id, storeId: store.id } });
      await this.prisma.store.update({ where: { id: store.id }, data: { likesCount: { increment: 1 } } });
      liked = true;
    }

    const updated = await this.prisma.store.findUnique({ where: { id: store.id }, select: { likesCount: true } });
    return { liked, likesCount: updated!.likesCount };
  }
}

// لوحة العميل الشاملة (محمية)
@Controller('customer')
@UseGuards(AuthGuard, RolesGuard('customer'))
export class CustomerDashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  async dashboard(@CurrentUser() u: any) {
    const [orders, rentalBookings, roomBookings, serviceRequests, reviews, likes] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId: u.sub },
        include: { items: true, store: { select: { name: true, slug: true, whatsapp: true } } },
        orderBy: { createdAt: 'desc' }, take: 20,
      }),
      this.prisma.rentalBooking.findMany({
        where: { customerId: u.sub },
        include: { unit: { include: { store: { select: { name: true, slug: true, whatsapp: true } } } } },
        orderBy: { createdAt: 'desc' }, take: 20,
      }),
      this.prisma.roomBooking.findMany({
        where: { customerId: u.sub },
        include: { room: { include: { store: { select: { name: true, slug: true, whatsapp: true } } } } },
        orderBy: { createdAt: 'desc' }, take: 20,
      }),
      this.prisma.serviceRequest.findMany({
        where: { customerId: u.sub },
        include: { service: { include: { store: { select: { name: true, slug: true, whatsapp: true } } } } },
        orderBy: { createdAt: 'desc' }, take: 20,
      }),
      this.prisma.review.findMany({
        where: { customerId: u.sub },
        include: { store: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.storeLike.findMany({
        where: { customerId: u.sub },
        include: { store: { select: { name: true, slug: true, logo: true } } },
      }),
    ]);

    return { orders, rentalBookings, roomBookings, serviceRequests, reviews, likes };
  }

  // 🏠 اللوحة الموحدة — طلبات نشطة + نقاط + مفضلة + تقييمات معلقة + آخر طلب قابل للإعادة
  @Get('home-hub')
  async homeHub(@CurrentUser() u: any) {
    const [customer, activeOrders, completedOrders, myOrderReviews, favCount] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { id: u.sub },
        select: { points: true, governorate: true, address: true },
      }),
      this.prisma.order.findMany({
        where: { customerId: u.sub, status: { in: ['pending', 'confirmed', 'processing', 'shipped'] } },
        include: { items: { select: { name: true, qty: true } }, store: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' }, take: 5,
      }),
      this.prisma.order.findMany({
        where: { customerId: u.sub, status: { in: ['delivered', 'completed'] } },
        include: { items: { select: { name: true, qty: true } }, store: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' }, take: 10,
      }),
      this.prisma.review.findMany({ where: { customerId: u.sub, orderId: { not: null } }, select: { orderId: true } }),
      this.prisma.storeLike.count({ where: { customerId: u.sub } }),
    ]);

    // ⭐ تقييمات معلقة — طلبات مكتملة لم تُقيَّم بعد
    const reviewedSet = new Set(myOrderReviews.map((r) => r.orderId));
    const pendingReviews = completedOrders
      .filter((o) => !reviewedSet.has(o.id))
      .slice(0, 3)
      .map((o) => ({ orderId: o.id, orderNumber: o.number, store: o.store, at: o.createdAt }));

    // 🔁 آخر طلب مكتمل قابل لإعادة الطلب بضغطة
    const lastCompleted = completedOrders[0]
      ? {
          id: completedOrders[0].id,
          number: completedOrders[0].number,
          total: Number(completedOrders[0].total),
          store: completedOrders[0].store,
          itemsCount: completedOrders[0].items.reduce((s, i) => s + i.qty, 0),
          at: completedOrders[0].createdAt,
        }
      : null;

    return {
      points: customer?.points || 0,
      governorate: customer?.governorate, address: customer?.address,
      activeOrders: activeOrders.map((o) => ({
        id: o.id, number: o.number, status: o.status, total: Number(o.total),
        store: o.store, createdAt: o.createdAt,
        itemsSummary: o.items.map((i) => `${i.name} ×${i.qty}`).join('، ').slice(0, 80),
      })),
      pendingReviews, lastCompleted, favCount,
    };
  }

  // 🏅 إنجازات العميل — شارات قاعدية محسوبة من نشاطه الحقيقي + تقدم النقاط
  @Get('achievements')
  async achievements(@CurrentUser() u: any) {
    const [customer, ordersCount, completedCount, spentAgg, reviewsCount, invitedCount] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: u.sub }, select: { points: true, createdAt: true } }),
      this.prisma.order.count({ where: { customerId: u.sub } }),
      this.prisma.order.count({ where: { customerId: u.sub, status: { in: ['delivered', 'completed'] } } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { customerId: u.sub, status: { notIn: ['cancelled', 'refunded'] } } }),
      this.prisma.review.count({ where: { customerId: u.sub } }),
      this.prisma.referral.count({ where: { referrerId: u.sub } }),
    ]);
    const spent = Math.round(Number(spentAgg._sum.total || 0));
    const points = customer?.points || 0;

    const badge = (icon: string, title: string, desc: string, cur: number, target: number) => ({
      icon, title, desc, cur, target, unlocked: cur >= target,
      progress: Math.min(100, Math.round((cur / target) * 100)),
    });
    const badges = [
      badge('🌱', 'أول خطوة', 'أكمل أول طلب لك', completedCount, 1),
      badge('🛍️', 'متسوق نشط', '5 طلبات مكتملة', completedCount, 5),
      badge('👑', 'زبون ذهبي', '15 طلباً مكتملاً', completedCount, 15),
      badge('⭐', 'الناقد الأول', 'اكتب أول تقييم', reviewsCount, 1),
      badge('🌟', 'خبير التقييمات', '5 تقييمات للمتاجر', reviewsCount, 5),
      badge('🎁', 'الداعي', 'ادعُ صديقاً واحداً', invitedCount, 1),
      badge('📣', 'سفير يمن زون', '5 دعوات ناجحة', invitedCount, 5),
      badge('💎', 'المنفق الكريم', 'أنفق 50,000 ر.ي', spent, 50000),
    ];

    // 🎯 شريط التقدم نحو المكافأة القادمة من النقاط
    const TIERS = [100, 250, 500, 1000, 2500];
    const nextTier = TIERS.find((t) => t > points) || null;
    const prevTier = nextTier ? (TIERS[TIERS.indexOf(nextTier) - 1] || 0) : TIERS[TIERS.length - 1];

    return {
      points,
      nextTier,
      tierProgress: nextTier ? Math.round(((points - prevTier) / (nextTier - prevTier)) * 100) : 100,
      badges,
      unlockedCount: badges.filter((b) => b.unlocked).length,
      stats: { orders: ordersCount, completed: completedCount, spent, reviews: reviewsCount, invited: invitedCount },
    };
  }
}

// 🤖 نصائح الذكاء المحلي للبائع (محمية)
@Controller('seller')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerAdviceController {
  constructor(
    private prisma: PrismaService,
    private smart: SmartScoreService,
  ) {}

  @Get('ai-advice')
  async advice(@CurrentUser() u: any) {
    const store = await this.prisma.store.findFirst({ where: { sellerId: u.sub } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    return this.smart.advice(store.id);
  }
}

// ⭐ تقييمات متجر البائع — عرضها والرد عليها (محمية)
@Controller('seller/reviews')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerReviewsController {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async myStore(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    return store;
  }

  @Get()
  async my(@CurrentUser() u: any) {
    const store = await this.myStore(u.sub);
    const reviews = await this.prisma.review.findMany({
      where: { storeId: store.id },
      include: {
        customer: { select: { name: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const total = reviews.length;
    const unreplied = reviews.filter((r) => !r.reply).length;
    const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const dist = [5, 4, 3, 2, 1].map((n) => ({ stars: n, count: reviews.filter((r) => r.rating === n).length }));
    return { reviews, stats: { total, unreplied, avg: Math.round(avg * 10) / 10, dist } };
  }

  // 💬 رد البائع — يصل تنبيه للعميل
  @Post(':id/reply')
  async reply(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { reply: string }) {
    const store = await this.myStore(u.sub);
    const review = await this.prisma.review.findFirst({ where: { id, storeId: store.id } });
    if (!review) throw new NotFoundException('التقييم غير موجود');
    if (!body.reply?.trim()) throw new BadRequestException('نص الرد مطلوب');
    if (body.reply.trim().length > 500) throw new BadRequestException('الرد طويل — الحد 500 حرف');

    const updated = await this.prisma.review.update({
      where: { id },
      data: { reply: body.reply.trim(), repliedAt: new Date(), replyHidden: false },
    });

    // 🔔 تنبيه العميل برد المتجر
    this.notifications.push('customer', review.customerId, {
      icon: '💬',
      title: `${store.name} ردّ على تقييمك`,
      body: body.reply.trim().slice(0, 120),
      link: `/store/${store.slug}`,
    });

    return updated;
  }

  @Delete(':id/reply')
  async removeReply(@CurrentUser() u: any, @Param('id') id: string) {
    const store = await this.myStore(u.sub);
    const review = await this.prisma.review.findFirst({ where: { id, storeId: store.id } });
    if (!review) throw new NotFoundException('التقييم غير موجود');
    return this.prisma.review.update({
      where: { id },
      data: { reply: null, repliedAt: null },
    });
  }
}
