import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ═════════════════════════════════════════════════
//  محرك الدرجة الذكية — ذكاء اصطناعي محلي 100%
//  يحسب درجة المتجر (0-100) ويقترح تحسينات مخصصة
// ═════════════════════════════════════════════════
@Injectable()
export class SmartScoreService {
  constructor(private prisma: PrismaService) {}

  // حساب الدرجة من 6 عوامل مرجحة
  async compute(storeId: string): Promise<number> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        _count: { select: { orders: true, products: true, likes: true } },
      },
    });
    if (!store) return 0;

    const ratings = await this.prisma.review.aggregate({
      where: { storeId, isApproved: true },
      _avg: { rating: true },
      _count: true,
    });

    // العوامل الستة
    const ratingScore = (ratings._avg.rating || 0) * 8;                    // حتى 40 نقطة (5★ = 40)
    const ordersScore = Math.min(store._count.orders * 1.5, 20);           // حتى 20 نقطة
    const reviewsScore = Math.min(ratings._count * 2, 10);                 // حتى 10 نقاط
    const likesScore = Math.min(store._count.likes * 0.5, 10);             // حتى 10 نقاط
    const contentScore = Math.min(store._count.products * 0.5, 10);        // حتى 10 نقاط
    const trustScore = (store.isVerified ? 10 : 0);                        // 10 نقاط للموثق

    const score = Math.min(100, Math.round(
      ratingScore + ordersScore + reviewsScore + likesScore + contentScore + trustScore
    ));

    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        smartScore: score,
        ratingAvg: Math.round((ratings._avg.rating || 0) * 10) / 10,
        ratingCount: ratings._count,
      },
    });

    return score;
  }

  // 🤖 اقتراحات ذكية مخصصة لتحسين الدرجة
  async advice(storeId: string): Promise<{ score: number; tips: { icon: string; text: string; impact: string }[] }> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        _count: { select: { orders: true, products: true, likes: true, reviews: true } },
      },
    });
    if (!store) return { score: 0, tips: [] };

    const tips: { icon: string; text: string; impact: string }[] = [];
    const ratingAvg = store.ratingAvg || 0;

    if (!store.isVerified)
      tips.push({ icon: '✅', text: 'وثّق متجرك لدى الإدارة — التوثيق يضيف 10 نقاط فوراً ويكسب ثقة العملاء', impact: '+10' });
    if (store._count.reviews < 5)
      tips.push({ icon: '⭐', text: `لديك ${store._count.reviews} تقييمات فقط — اطلب من كل عميل تقييماً بعد التسليم`, impact: '+10' });
    if (ratingAvg > 0 && ratingAvg < 4)
      tips.push({ icon: '📈', text: `تقييمك ${ratingAvg} — ركّز على جودة المنتج وسرعة الرد لرفعه فوق 4.5`, impact: '+8' });
    if (store._count.products < 10)
      tips.push({ icon: '📦', text: 'أضف المزيد من المنتجات بالصور — المتاجر الغنية تظهر أولاً', impact: '+5' });
    if (store._count.likes < 10)
      tips.push({ icon: '❤️', text: 'شارك رابط متجرك في مجموعات واتساب لجمع الإعجابات', impact: '+5' });
    if (store._count.orders < 5)
      tips.push({ icon: '🎁', text: 'فعّل عرض تخفيض افتتاحي لتحفيز أول الطلبات', impact: '+7' });
    if (!store.whatsapp)
      tips.push({ icon: '💬', text: 'أضف رقم واتساب في الإعدادات — الطلبات المباشرة تزيد المبيعات', impact: '+4' });
    if (!store.logo)
      tips.push({ icon: '🖼️', text: 'ارفع شعاراً وغلافاً لمتجرك — المظهر الاحترافي يبني الثقة', impact: '+3' });

    if (tips.length === 0)
      tips.push({ icon: '🏆', text: 'متجرك ممتاز! حافظ على الجودة والنشاط اليومي', impact: '🌟' });

    return { score: store.smartScore, tips: tips.slice(0, 5) };
  }
}
