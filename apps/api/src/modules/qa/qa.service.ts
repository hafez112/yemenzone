import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// 💬 أسئلة وأجوبة المنتجات — العميل/الزائر يسأل والبائع يجيب (آلة البيع)
@Injectable()
export class QaService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // عرض عام: الأسئلة الظاهرة لمنتج
  async publicList(productId: string) {
    const rows = await this.prisma.productQuestion.findMany({
      where: { productId, isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, askerName: true, question: true, answer: true, answeredAt: true, createdAt: true },
    });
    return rows;
  }

  // طرح سؤال — مسجل (برقم جوال) أو زائر (بالاسم فقط)
  async ask(productId: string, body: any) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: { select: { id: true, sellerId: true, name: true, status: true } } },
    });
    if (!product || !product.isActive || product.store.status !== 'active') {
      throw new NotFoundException('المنتج غير موجود');
    }
    const question = String(body.question || '').trim();
    if (question.length < 3) throw new BadRequestException('اكتب سؤالاً واضحاً (3 أحرف على الأقل)');
    if (question.length > 500) throw new BadRequestException('السؤال طويل جداً (500 حرف كحد أقصى)');

    // ربط بالعميل إن زوّد جواله — ليصله إشعار الرد (نفس نمط التقييمات)
    let customerId: string | null = null;
    let askerName = String(body.name || '').trim().slice(0, 60) || 'زائر';
    const phone = String(body.phone || '').trim();
    if (phone) {
      let customer = await this.prisma.customer.findUnique({ where: { phone } });
      if (!customer) customer = await this.prisma.customer.create({ data: { phone, name: askerName } });
      customerId = customer.id;
      askerName = customer.name;
    }

    const q = await this.prisma.productQuestion.create({
      data: { productId, customerId, askerName, question },
    });

    // 🔔 تنبيه البائع بسؤال جديد
    await this.notifications.push('seller', product.store.sellerId, {
      icon: '❓',
      title: 'سؤال جديد عن منتجك',
      body: `${product.name}: ${question.slice(0, 60)}`,
      link: '/seller/questions',
    }).catch(() => {});

    return { ok: true, id: q.id, message: 'وصل سؤالك للبائع — سيظهر الرد هنا فور إجابته' };
  }

  // أسئلة متاجر البائع — المعلّقة أولاً
  async sellerList(sellerId: string, filter: string) {
    const rows = await this.prisma.productQuestion.findMany({
      where: { product: { store: { sellerId } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { product: { select: { id: true, name: true, images: true, store: { select: { slug: true } } } } },
    });
    const sorted = rows.sort((a, b) => {
      const ap = a.answer ? 1 : 0;
      const bp = b.answer ? 1 : 0;
      if (ap !== bp) return ap - bp; // غير المجاب أولاً
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const list = filter === 'pending' ? sorted.filter((r) => !r.answer) : sorted;
    return {
      total: rows.length,
      pending: rows.filter((r) => !r.answer).length,
      items: list.slice(0, 100),
    };
  }

  private async ownQuestion(sellerId: string, id: string) {
    const q = await this.prisma.productQuestion.findUnique({
      where: { id },
      include: { product: { include: { store: { select: { sellerId: true, slug: true } } } } },
    });
    if (!q) throw new NotFoundException('السؤال غير موجود');
    if (q.product.store.sellerId !== sellerId) throw new ForbiddenException('هذا السؤال ليس لمتجرك');
    return q;
  }

  // إجابة البائع — وإشعار السائل إن كان مسجلاً
  async answer(sellerId: string, id: string, body: any) {
    const q = await this.ownQuestion(sellerId, id);
    const answer = String(body.answer || '').trim();
    if (answer.length < 2) throw new BadRequestException('اكتب إجابة واضحة');
    if (answer.length > 1000) throw new BadRequestException('الإجابة طويلة جداً');
    await this.prisma.productQuestion.update({
      where: { id },
      data: { answer, answeredAt: new Date(), isPublic: true },
    });
    if (q.customerId) {
      await this.notifications.push('customer', q.customerId, {
        icon: '✅',
        title: 'تم الرد على سؤالك',
        body: `${q.product.name}: ${answer.slice(0, 60)}`,
        link: `/store/${q.product.store.slug}/product/${q.productId}`,
      }).catch(() => {});
    }
    return { ok: true };
  }

  // إظهار/إخفاء سؤال (للأسئلة المسيئة أو المكررة)
  async setVisibility(sellerId: string, id: string, isPublic: boolean) {
    await this.ownQuestion(sellerId, id);
    await this.prisma.productQuestion.update({ where: { id }, data: { isPublic: !!isPublic } });
    return { ok: true };
  }
}
