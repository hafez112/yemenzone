import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TOOL_KEYS, TOOL_LABELS } from '../tools/tools.service';
import { effectiveFeatures } from '../../common/features';

export const AD_POSITIONS: Record<string, string> = {
  home_top: 'أعلى الرئيسية (بعد السلايدر)',
  home_mid: 'وسط الرئيسية (قبل المتاجر)',
  home_bottom: 'أسفل الرئيسية (قبل التذييل)',
  store_top: '🖼️ داخل متجرك — بانر أعلى الصفحة',
  tools_hub: '🧰 بوابة تكنولوجيا المنصة (صفحة كل الخدمات)',
  tools_all: '🧰 كل صفحات الخدمات الـ21 (عام)',
  // 🧩 مواضع مستقلة لكل خدمة — تُولَّد من سجل الخدمات
  ...Object.fromEntries(TOOL_KEYS.map((k) => [`tool:${k}`, `🧩 خدمة: ${TOOL_LABELS[k] || k}`])),
};

// 📐 أحجام عرض الإعلان — يحددها المدير لكل إعلان
export const AD_SIZES: Record<string, string> = {
  hero: 'بانر ضخم (21:6)',
  wide: 'عريض (16:6)',
  banner: 'شريط نحيف (3:1)',
  square: 'مربع (1:1)',
};

// مواضع مجانية تُبث فوراً داخل متجر البائع (ميزة الخطة الذهبية)
const STORE_POSITIONS = ['store_top'];
const MAX_STORE_BANNERS = 5;

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  // 💰 أسعار الإعلانات الأسبوعية — يضبطها المدير (Setting: adPricing)
  private async pricing(): Promise<Record<string, number>> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'adPricing' } });
    const def = { home_top: 5000, home_mid: 3000, home_bottom: 2000 };
    return { ...def, ...((row?.value as any) || {}) };
  }

  getPricing() { return this.pricing(); }

  async savePricing(body: any) {
    const data = {
      home_top: Math.max(0, Math.round(Number(body.home_top) || 0)),
      home_mid: Math.max(0, Math.round(Number(body.home_mid) || 0)),
      home_bottom: Math.max(0, Math.round(Number(body.home_bottom) || 0)),
    };
    await this.prisma.setting.upsert({
      where: { key: 'adPricing' },
      update: { value: data },
      create: { group: 'general', key: 'adPricing', value: data },
    });
    return data;
  }

  // ═══ المدير: كل الإعلانات مع نسبة النقر الذكية ═══
  async adminList() {
    const ads = await this.prisma.ad.findMany({ orderBy: [{ position: 'asc' }, { sort: 'asc' }] });
    const now = new Date();
    return ads.map((a) => ({
      ...a,
      positionLabel: AD_POSITIONS[a.position] || a.position,
      sizeLabel: AD_SIZES[a.size] || a.size,
      // 🤖 حالة محلية ذكية + نسبة نقر
      smartStatus: !a.isActive ? 'paused'
        : a.endsAt && a.endsAt < now ? 'expired'
        : a.startsAt > now ? 'scheduled' : 'live',
      ctr: a.views > 0 ? Math.round((a.clicks / a.views) * 1000) / 10 : 0,
    }));
  }

  async save(body: any) {
    const data = {
      title: String(body.title || '').trim(),
      subtitle: String(body.subtitle || '').trim() || null,
      image: body.image,
      link: body.link?.trim() || null,
      position: AD_POSITIONS[body.position] ? body.position : 'home_top',
      size: AD_SIZES[body.size] ? body.size : 'wide',
      sort: Number(body.sort || 0),
      startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      isActive: body.isActive ?? true,
    };
    if (!data.title) throw new BadRequestException('عنوان الإعلان مطلوب');
    if (!data.image) throw new BadRequestException('صورة الإعلان مطلوبة — ارفعها من جهازك');
    if (data.endsAt && data.endsAt < data.startsAt) throw new BadRequestException('تاريخ الانتهاء قبل البدء');

    if (body.id) {
      const ad = await this.prisma.ad.findUnique({ where: { id: body.id } });
      if (!ad) throw new NotFoundException('الإعلان غير موجود');
      return this.prisma.ad.update({ where: { id: body.id }, data });
    }
    return this.prisma.ad.create({ data });
  }

  async toggle(id: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id } });
    if (!ad) throw new NotFoundException('الإعلان غير موجود');
    return this.prisma.ad.update({ where: { id }, data: { isActive: !ad.isActive } });
  }

  async remove(id: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id } });
    if (!ad) throw new NotFoundException('الإعلان غير موجود');
    await this.prisma.ad.delete({ where: { id } });
    return { ok: true };
  }

  // ═══ العام: إعلانات موضع نشط ضمن الجدولة + تسجيل مشاهدة ═══
  async publicList(position: string) {
    const now = new Date();
    const ads = await this.prisma.ad.findMany({
      where: {
        position, isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { sort: 'asc' },
      take: 6,
      select: { id: true, title: true, subtitle: true, image: true, link: true, size: true },
    });
    // تسجيل المشاهدات دون حجب الاستجابة
    if (ads.length) {
      this.prisma.ad.updateMany({
        where: { id: { in: ads.map((a) => a.id) } },
        data: { views: { increment: 1 } },
      }).catch(() => {});
    }
    return ads;
  }

  async click(id: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id } });
    if (!ad) throw new NotFoundException('الإعلان غير موجود');
    await this.prisma.ad.update({ where: { id }, data: { clicks: { increment: 1 } } });
    return { link: ad.link };
  }

  // ═══════════════════════════════════════════════════
  // 📢 إعلانات البائع المدفوعة — يطلب، يحوّل، الإدارة توافق
  // ═══════════════════════════════════════════════════

  private async sellerStore(sellerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { sellerId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!store) throw new NotFoundException('أنشئ متجرك أولاً');
    return store;
  }

  // إعلاناتي + الأسعار + طلب معلق + ميزة البنرات الداخلية
  async sellerList(sellerId: string) {
    const store = await this.sellerStore(sellerId);
    const features = effectiveFeatures(store);
    const [ads, pricing, pendingPayment] = await Promise.all([
      this.prisma.ad.findMany({ where: { storeId: store.id }, orderBy: { createdAt: 'desc' } }),
      this.pricing(),
      this.prisma.payment.findFirst({
        where: { payerId: sellerId, purpose: 'ad', status: 'pending' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const now = new Date();
    return {
      store, pricing, positions: AD_POSITIONS, pendingPayment,
      features: { storeAds: !!features.storeAds, pwa: !!features.pwa },
      ads: ads.map((a) => ({
        ...a,
        isStoreBanner: STORE_POSITIONS.includes(a.position),
        positionLabel: AD_POSITIONS[a.position] || a.position,
        smartStatus: !a.isActive ? 'paused'
          : a.endsAt && a.endsAt < now ? 'expired'
          : a.startsAt > now ? 'scheduled' : 'live',
        ctr: a.views > 0 ? Math.round((a.clicks / a.views) * 1000) / 10 : 0,
      })),
    };
  }

  // طلب إعلان جديد — بنرات المتجر فورية مجانية (خطة ذهبية) / إعلانات الرئيسية مدفوعة بمراجعة
  async sellerCreate(sellerId: string, body: any) {
    const store = await this.sellerStore(sellerId);
    const title = String(body.title || '').trim();
    if (!title) throw new BadRequestException('عنوان الإعلان مطلوب');
    if (!body.image) throw new BadRequestException('ارفع صورة الإعلان من جهازك');
    const position = AD_POSITIONS[body.position] ? body.position : 'home_top';

    // 🖼️ بانر داخل متجر البائع — مجاني وفوري لأصحاب ميزة بنرات المتجر (الخطة الذهبية)
    if (STORE_POSITIONS.includes(position)) {
      const features = effectiveFeatures(store);
      if (!features.storeAds) {
        throw new ForbiddenException({
          message: '🔒 بنرات المتجر الإعلانية ميزة الخطة الذهبية 👑 — رقِّ خطتك لتفعيلها',
          featureCode: 'storeAds', locked: true,
        });
      }
      const count = await this.prisma.ad.count({ where: { storeId: store.id, position: { in: STORE_POSITIONS } } });
      if (count >= MAX_STORE_BANNERS) throw new BadRequestException(`الحد الأقصى ${MAX_STORE_BANNERS} بنرات — احذف قديماً لإضافة جديد`);
      const ad = await this.prisma.ad.create({
        data: {
          title, image: body.image,
          link: body.link?.trim() || null,
          position, storeId: store.id, weeks: 0,
          isActive: true, // يُبث فوراً داخل متجره
        },
      });
      return { created: true, ad, instant: true, message: '🖼️ بانرك مباشر الآن داخل متجرك!' };
    }

    const weeks = Math.min(Math.max(Math.round(Number(body.weeks) || 1), 1), 12);

    const pricing = await this.pricing();
    const price = (pricing[position] || 0) * weeks;
    if (price <= 0) throw new BadRequestException('هذا الموضع غير متاح للحجز حالياً');

    const pending = await this.prisma.payment.findFirst({
      where: { payerId: sellerId, purpose: 'ad', status: 'pending' },
    });
    if (pending) throw new ConflictException('لديك طلب إعلان قيد مراجعة الإدارة بالفعل');

    const ad = await this.prisma.ad.create({
      data: {
        title, image: body.image,
        link: body.link?.trim() || `/store/${store.slug}`,
        position, storeId: store.id, weeks,
        isActive: false, // لا يُبث إلا بموافقة الإدارة
      },
    });

    const number = 'AD-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const payment = await this.prisma.payment.create({
      data: {
        number, payerType: 'seller', payerId: sellerId, purpose: 'ad',
        amount: price, method: body.method || 'transfer', referenceId: ad.id,
      },
    });

    return {
      created: true, ad, payment, price, weeks,
      message: `تم استلام طلبك — الفاتورة ${number} بقيمة ${price.toLocaleString()} ر.ي (${weeks} أسبوع). حوّل المبلغ وأرسل الإثبات للإدارة`,
    };
  }

  // البائع يتحكم ببنرات متجره الداخلية فقط (إعلانات الرئيسية للإدارة وحدها)
  private async sellerOwnStoreAd(sellerId: string, adId: string) {
    const store = await this.sellerStore(sellerId);
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad || ad.storeId !== store.id || !STORE_POSITIONS.includes(ad.position)) {
      throw new NotFoundException('البانر غير موجود');
    }
    return ad;
  }

  async sellerToggle(sellerId: string, adId: string) {
    const ad = await this.sellerOwnStoreAd(sellerId, adId);
    return this.prisma.ad.update({ where: { id: ad.id }, data: { isActive: !ad.isActive } });
  }

  async sellerRemove(sellerId: string, adId: string) {
    const ad = await this.sellerOwnStoreAd(sellerId, adId);
    await this.prisma.ad.delete({ where: { id: ad.id } });
    return { ok: true };
  }

  // 🖼️ بانرات متجر معيّن — تظهر أعلى صفحته العامة
  async storeBanners(slug: string) {
    const store = await this.prisma.store.findUnique({ where: { slug }, select: { id: true, status: true } });
    if (!store || store.status !== 'active') return [];
    const now = new Date();
    const ads = await this.prisma.ad.findMany({
      where: {
        storeId: store.id, position: { in: STORE_POSITIONS }, isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { sort: 'asc' }, take: MAX_STORE_BANNERS,
      select: { id: true, title: true, image: true, link: true, size: true },
    });
    if (ads.length) {
      this.prisma.ad.updateMany({ where: { id: { in: ads.map((a) => a.id) } }, data: { views: { increment: 1 } } }).catch(() => {});
    }
    return ads;
  }

  // موافقة/رفض دفعة إعلان — الموافقة تبث الإعلان فوراً لمدته المشتراة
  async reviewAdPayment(paymentId: string, approve: boolean, adminId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.purpose !== 'ad') throw new NotFoundException('الدفعة غير موجودة');
    if (payment.status !== 'pending') throw new BadRequestException('تمت مراجعتها مسبقاً');

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: approve ? 'approved' : 'rejected', reviewedBy: adminId, reviewedAt: new Date() },
    });

    const ad = payment.referenceId
      ? await this.prisma.ad.findUnique({ where: { id: payment.referenceId } })
      : null;

    if (ad) {
      if (approve) {
        const endsAt = new Date(Date.now() + ad.weeks * 7 * 24 * 60 * 60 * 1000);
        await this.prisma.ad.update({
          where: { id: ad.id },
          data: { isActive: true, startsAt: new Date(), endsAt },
        });
        await this.notifications.push('seller', payment.payerId, {
          icon: '📢',
          title: 'إعلانك مباشر الآن في الرئيسية! 🎉',
          body: `يبث حتى ${endsAt.toLocaleDateString('ar-YE')} — تابع مشاهداته ونقراته من صفحة إعلاناتي`,
          link: '/seller/ads',
        });
      } else {
        await this.prisma.ad.update({ where: { id: ad.id }, data: { isActive: false } });
        await this.notifications.push('seller', payment.payerId, {
          icon: '❌',
          title: 'رُفض طلب الإعلان',
          body: `فاتورة ${payment.number} — تواصل مع الإدارة للتفاصيل`,
          link: '/seller/ads',
        });
      }
    }
    return { done: true };
  }
}
