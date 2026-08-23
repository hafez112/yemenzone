import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformAiService } from './platform-ai.service';
import { ReferralsService } from '../referrals/referrals.service';

// تطهير HTML القادم من المحرر الغني — إزالة السكربتات ومعالجات الأحداث وأي javascript:
export function sanitizeHtml(html: string): string {
  if (!html) return html;
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<(iframe|object|embed|form)[\s\S]*?>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, '');
}

@Injectable()
export class PlatformService {
  constructor(
    private prisma: PrismaService,
    private ai: PlatformAiService,
    private referrals: ReferralsService,
  ) {}

  // ═══ التصميم الديناميكي ═══
  async getDesign() {
    const [settings, slides, pages, backups] = await Promise.all([
      this.prisma.setting.findMany(),
      this.prisma.slide.findMany({ orderBy: { sort: 'asc' } }),
      this.prisma.customPage.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.themeBackup.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, name: true, createdAt: true } }),
    ]);
    const map: Record<string, any> = {};
    for (const s of settings) map[s.key] = s.value;
    return { settings: map, slides, pages, backups, tips: this.ai.designTips(map, slides, pages) };
  }

  async saveSettings(entries: { key: string; value: any; group?: string }[]) {
    if (!Array.isArray(entries) || !entries.length) throw new BadRequestException('لا بيانات للحفظ');
    for (const e of entries) {
      if (!e.key) continue;
      await this.prisma.setting.upsert({
        where: { key: e.key },
        update: { value: e.value },
        create: { key: e.key, value: e.value, group: e.group || 'theme' },
      });
    }
    return { ok: true };
  }

  // السلايدر
  async saveSlide(body: any) {
    if (body.id) {
      const s = await this.prisma.slide.findUnique({ where: { id: body.id } });
      if (!s) throw new NotFoundException('الشريحة غير موجودة');
      return this.prisma.slide.update({
        where: { id: body.id },
        data: {
          title: body.title ?? s.title, subtitle: body.subtitle ?? s.subtitle,
          image: body.image ?? s.image, link: body.link ?? s.link,
          sort: body.sort !== undefined ? Number(body.sort) : s.sort,
          isActive: body.isActive ?? s.isActive,
        },
      });
    }
    if (!body.image) throw new BadRequestException('صورة الشريحة مطلوبة');
    return this.prisma.slide.create({
      data: { title: body.title, subtitle: body.subtitle, image: body.image, link: body.link, sort: Number(body.sort) || 0 },
    });
  }

  async deleteSlide(id: string) {
    await this.prisma.slide.delete({ where: { id } });
    return { ok: true };
  }

  // نسخ التصميم الاحتياطية
  async createBackup(name: string) {
    if (!name?.trim()) throw new BadRequestException('اسم النسخة مطلوب');
    const [settings, slides] = await Promise.all([
      this.prisma.setting.findMany(),
      this.prisma.slide.findMany({ orderBy: { sort: 'asc' } }),
    ]);
    return this.prisma.themeBackup.create({
      data: { name: name.trim(), snapshot: { settings, slides } },
    });
  }

  async restoreBackup(id: string) {
    const b = await this.prisma.themeBackup.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('النسخة غير موجودة');
    const snap = b.snapshot as any;
    for (const s of snap.settings || []) {
      await this.prisma.setting.upsert({
        where: { key: s.key }, update: { value: s.value, group: s.group }, create: { key: s.key, value: s.value, group: s.group },
      });
    }
    // الشرائح: حذف الحالية وإعادة إنشاء المصورة
    await this.prisma.slide.deleteMany({});
    for (const sl of snap.slides || []) {
      await this.prisma.slide.create({
        data: { title: sl.title, subtitle: sl.subtitle, image: sl.image, link: sl.link, sort: sl.sort, isActive: sl.isActive },
      });
    }
    return { ok: true };
  }

  // ═══ الصفحات المخصصة ═══
  async savePage(body: any) {
    const slugOk = /^[a-z0-9-]+$/.test(body.slug || '');
    if (body.id) {
      const page = await this.prisma.customPage.findUnique({ where: { id: body.id } });
      if (!page) throw new NotFoundException('الصفحة غير موجودة');
      return this.prisma.customPage.update({
        where: { id: body.id },
        data: {
          title: body.title ?? page.title,
          content: body.content !== undefined ? sanitizeHtml(body.content) : page.content,
          showInMenu: body.showInMenu ?? page.showInMenu, showInFooter: body.showInFooter ?? page.showInFooter,
          isActive: body.isActive ?? page.isActive, sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : page.sortOrder,
          metaTitle: body.metaTitle ?? page.metaTitle, metaDesc: body.metaDesc ?? page.metaDesc,
        },
      });
    }
    if (!body.title?.trim() || !body.slug) throw new BadRequestException('العنوان والرابط مطلوبان');
    if (!slugOk) throw new BadRequestException('الرابط: أحرف إنجليزية صغيرة وأرقام وشرطات فقط');
    const dup = await this.prisma.customPage.findUnique({ where: { slug: body.slug } });
    if (dup) throw new BadRequestException('هذا الرابط مستخدم مسبقاً');
    return this.prisma.customPage.create({
      data: {
        title: body.title.trim(), slug: body.slug, content: sanitizeHtml(body.content || ''),
        showInMenu: !!body.showInMenu, showInFooter: body.showInFooter !== false,
        sortOrder: Number(body.sortOrder) || 0, metaTitle: body.metaTitle, metaDesc: body.metaDesc,
      },
    });
  }

  async deletePage(id: string) {
    await this.prisma.customPage.delete({ where: { id } });
    return { ok: true };
  }

  // عام
  async publicPages(kind: 'menu' | 'footer') {
    return this.prisma.customPage.findMany({
      where: { isActive: true, ...(kind === 'menu' ? { showInMenu: true } : { showInFooter: true }) },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, title: true },
    });
  }

  async publicPage(slug: string) {
    const page = await this.prisma.customPage.findUnique({ where: { slug } });
    if (!page || !page.isActive) throw new NotFoundException('الصفحة غير موجودة');
    await this.prisma.customPage.update({ where: { slug }, data: { views: { increment: 1 } } }).catch(() => {});
    return page;
  }

  // ═══ خدمات المنصة ═══
  async adminServices() {
    const services = await this.prisma.platformService.findMany({
      orderBy: { sort: 'asc' },
      include: { _count: { select: { orders: true } } },
    });
    return services;
  }

  async saveService(body: any) {
    if (body.id) {
      const s = await this.prisma.platformService.findUnique({ where: { id: body.id } });
      if (!s) throw new NotFoundException('الخدمة غير موجودة');
      return this.prisma.platformService.update({
        where: { id: body.id },
        data: {
          title: body.title ?? s.title,
          description: body.description !== undefined ? sanitizeHtml(body.description) : s.description,
          price: body.price !== undefined ? Number(body.price) : s.price,
          image: body.image ?? s.image,
          videoUrl: body.videoUrl !== undefined ? (body.videoUrl || null) : s.videoUrl,
          sort: body.sort !== undefined ? Number(body.sort) : s.sort,
          isActive: body.isActive ?? s.isActive,
        },
      });
    }
    if (!body.title?.trim()) throw new BadRequestException('اسم الخدمة مطلوب');
    if (!(Number(body.price) >= 0)) throw new BadRequestException('السعر غير صالح');
    return this.prisma.platformService.create({
      data: {
        title: body.title.trim(), description: sanitizeHtml(body.description || ''),
        price: Number(body.price), image: body.image, videoUrl: body.videoUrl || null,
        sort: Number(body.sort) || 0,
      },
    });
  }

  async deleteService(id: string) {
    const orders = await this.prisma.platformServiceOrder.count({ where: { serviceId: id } });
    if (orders > 0) {
      // خدمة عليها طلبات → تعطيل بدل الحذف
      await this.prisma.platformService.update({ where: { id }, data: { isActive: false } });
      return { ok: true, disabled: true };
    }
    await this.prisma.platformService.delete({ where: { id } });
    return { ok: true };
  }

  async adminServiceOrders() {
    const [orders, services] = await Promise.all([
      this.prisma.platformServiceOrder.findMany({
        orderBy: { createdAt: 'desc' },
        include: { service: { select: { title: true, price: true, currency: true } } },
      }),
      this.prisma.platformService.findMany(),
    ]);
    return { orders, insights: this.ai.serviceInsights(services, orders) };
  }

  async reviewServiceOrder(id: string, approve: boolean) {
    const order = await this.prisma.platformServiceOrder.findUnique({
      where: { id }, include: { service: true },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.status !== 'pending') throw new BadRequestException('هذا الطلب مُراجع مسبقاً');
    const updated = await this.prisma.platformServiceOrder.update({
      where: { id },
      data: { status: approve ? 'approved' : 'rejected', reviewedAt: new Date() },
    });
    // 🎁 رفض الطلب يعيد النقاط المخصومة للعميل تلقائياً
    if (!approve && order.pointsUsed > 0) {
      await this.referrals.refundForServiceOrder(order.id, order.pointsUsed, order.phone).catch(() => {});
    }
    // تسجيل الإيراد في المركز المالي عند الاعتماد
    if (approve) {
      const seller = await this.prisma.seller.findUnique({ where: { phone: order.phone } });
      await this.prisma.payment.create({
        data: {
          number: 'INV-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
          payerType: seller ? 'seller' : 'customer',
          payerId: seller?.id || order.phone,
          purpose: 'pservice', amount: order.service.price, currency: order.service.currency,
          method: 'gateway', proofImage: order.proofImage, status: 'approved',
          referenceId: order.id, reviewedAt: new Date(),
        },
      }).catch(() => {});
    }
    return updated;
  }

  // عام
  async publicServices() {
    return this.prisma.platformService.findMany({
      where: { isActive: true }, orderBy: { sort: 'asc' },
    });
  }

  // خدمة مفردة لصفحة العرض — مع عدّاد مشاهدات
  async publicService(id: string) {
    const s = await this.prisma.platformService.findUnique({ where: { id } });
    if (!s || !s.isActive) throw new NotFoundException('الخدمة غير متوفرة');
    await this.prisma.platformService.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});
    return s;
  }

  // ═══ 📰 المدونة ═══
  // توليد رابط لطيف — يدعم العربية ويضمن التفرد
  private async blogSlug(title: string, wanted?: string, excludeId?: string) {
    const base = (wanted || title)
      .trim().toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'post';
    let slug = base;
    for (let i = 2; ; i++) {
      const clash = await this.prisma.blogPost.findUnique({ where: { slug } });
      if (!clash || clash.id === excludeId) return slug;
      slug = `${base}-${i}`;
    }
  }

  async adminBlog() {
    return this.prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async saveBlogPost(body: any) {
    const data: any = {};
    if (body.title !== undefined) {
      if (!String(body.title).trim()) throw new BadRequestException('عنوان المقال مطلوب');
      data.title = String(body.title).trim().slice(0, 200);
    }
    if (body.excerpt !== undefined) data.excerpt = body.excerpt ? String(body.excerpt).slice(0, 400) : null;
    if (body.content !== undefined) data.content = sanitizeHtml(body.content || '');
    if (body.cover !== undefined) data.cover = body.cover || null;
    if (body.videoUrl !== undefined) data.videoUrl = body.videoUrl || null;
    if (body.category !== undefined) data.category = body.category ? String(body.category).trim().slice(0, 60) : null;
    if (body.tags !== undefined) data.tags = body.tags ? String(body.tags).trim().slice(0, 200) : null;
    if (body.metaDesc !== undefined) data.metaDesc = body.metaDesc ? String(body.metaDesc).slice(0, 160) : null;

    if (body.id) {
      const post = await this.prisma.blogPost.findUnique({ where: { id: body.id } });
      if (!post) throw new NotFoundException('المقال غير موجود');
      if (body.slug !== undefined || (data.title && !post.slug)) {
        data.slug = await this.blogSlug(data.title || post.title, body.slug, post.id);
      }
      // النشر لأول مرة → تثبيت تاريخ النشر
      if (body.isPublished !== undefined) {
        data.isPublished = !!body.isPublished;
        if (data.isPublished && !post.publishedAt) data.publishedAt = new Date();
        if (!data.isPublished) data.publishedAt = null;
      }
      return this.prisma.blogPost.update({ where: { id: post.id }, data });
    }

    if (!data.title) throw new BadRequestException('عنوان المقال مطلوب');
    const slug = await this.blogSlug(data.title, body.slug);
    const publish = !!body.isPublished;
    return this.prisma.blogPost.create({
      data: {
        ...data,
        slug,
        content: data.content || '',
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
      },
    });
  }

  async deleteBlogPost(id: string) {
    await this.prisma.blogPost.delete({ where: { id } });
    return { ok: true };
  }

  // عام — قائمة المقالات المنشورة (بدون المحتوى الكامل)
  async publicBlog() {
    return this.prisma.blogPost.findMany({
      where: { isPublished: true },
      select: {
        id: true, slug: true, title: true, excerpt: true, cover: true,
        category: true, tags: true, views: true, publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 30,
    });
  }

  // عام — مقال مفرد + مقالات ذات صلة من نفس التصنيف
  async publicBlogPost(slug: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (!post || !post.isPublished) throw new NotFoundException('المقال غير موجود');
    await this.prisma.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } }).catch(() => {});
    const related = post.category
      ? await this.prisma.blogPost.findMany({
          where: { isPublished: true, category: post.category, id: { not: post.id } },
          select: { slug: true, title: true, cover: true, publishedAt: true },
          orderBy: { publishedAt: 'desc' },
          take: 3,
        })
      : [];
    return { ...post, related };
  }

  async orderService(body: any) {
    if (!body.serviceId) throw new BadRequestException('الخدمة مطلوبة');
    const service = await this.prisma.platformService.findUnique({ where: { id: body.serviceId } });
    if (!service || !service.isActive) throw new NotFoundException('الخدمة غير متوفرة');
    if (!body.name?.trim() || !body.phone?.trim()) throw new BadRequestException('الاسم ورقم الجوال مطلوبان');
    // منع تكرار طلب معلّق لنفس الجوال والخدمة
    const dup = await this.prisma.platformServiceOrder.findFirst({
      where: { serviceId: body.serviceId, phone: body.phone.trim(), status: 'pending' },
    });
    if (dup) throw new BadRequestException('لديك طلب معلّق لنفس الخدمة — سنراجعه قريباً');

    const order = await this.prisma.platformServiceOrder.create({
      data: {
        serviceId: body.serviceId, name: body.name.trim(), phone: body.phone.trim(),
        details: body.details, proofImage: body.proofImage,
      },
    });

    // 🎁 استبدال النقاط بخصم — عند الفشل يُلغى الطلب حتى لا يفقد العميل إثبات دفع خاطئ
    if (body.usePoints) {
      try {
        const { pointsUsed, discount } = await this.referrals.redeemForServiceOrder(
          order.phone, Number(service.price), order.id,
        );
        return await this.prisma.platformServiceOrder.update({
          where: { id: order.id },
          data: {
            pointsUsed,
            discount,
            finalAmount: Math.max(0, Number(service.price) - discount),
          },
        });
      } catch (e) {
        await this.prisma.platformServiceOrder.delete({ where: { id: order.id } }).catch(() => {});
        throw e;
      }
    }
    return order;
  }

  // 🎁 رصيد نقاط رقم جوال (لصفحة طلب الخدمة العامة — يعرض الرصيد فقط)
  async pointsBalance(phone: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { phone: phone.trim() },
      select: { points: true },
    });
    const cfg = await this.referrals.config();
    return {
      points: customer?.points || 0,
      pointValueYER: cfg.pointValueYER,
      maxDiscountPct: cfg.maxDiscountPct,
      active: cfg.active,
    };
  }

  // 🔎 إعدادات الظهور في محركات البحث — قيم افتراضية آمنة إن لم تُضبط بعد
  async publicSeo() {
    const row = await this.prisma.setting.findUnique({ where: { key: 'seo' } });
    const saved = (row?.value as any) || {};
    return {
      metaTitle: saved.metaTitle || 'يمن زون — منصة التجارة اليمنية',
      metaDesc: saved.metaDesc || 'تسوّق من متاجر يمنية موثوقة: منتجات، عقارات، فنادق وخدمات — كل ما تحتاجه في منصة واحدة.',
      keywords: saved.keywords || 'يمن زون, yemen zone, متجر إلكتروني يمني, التجارة الإلكترونية في اليمن, إنشاء متجر إلكتروني في اليمن, انشئ متجرك الإلكتروني, بيع أونلاين اليمن, تسوق أونلاين اليمن, تسوق إلكتروني, متاجر يمنية, منتجات يمنية, سوق يمني, السوق اليمني الإلكتروني, سوق المستعمل اليمن, مستعمل للبيع, عقارات اليمن, إيجارات, شقق للإيجار, فنادق اليمن, حجز فنادق, مطاعم يمنية, طلب طعام أونلاين, خدمات يمنية, الدليل التجاري اليمني, دليل الشركات اليمنية, توصيل طلبات, دفع إلكتروني يمني, محافظ إلكترونية, بيع برابط, متجر مجاني, منصة بيع يمنية, عروض وتخفيضات اليمن, صنعاء, عدن, تعز, الحديدة, إب, حضرموت, ذمار',
      ogImage: saved.ogImage || '',
      googleVerification: saved.googleVerification || '',
      gaId: saved.gaId || '',
      indexing: saved.indexing !== false,
    };
  }
}
