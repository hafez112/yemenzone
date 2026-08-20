import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// 🤖 ذكاء التوصيل المحلي: اقتراح السائق الأنسب + تقدير زمن الوصول + نصائح
@Injectable()
export class DeliveryAiService {
  constructor(private prisma: PrismaService) {}

  // اقتراح أفضل سائق: نفس المحافظة أولاً ثم الأقل انشغالاً
  async suggestDriver(storeGovernorate?: string | null) {
    const drivers = await this.prisma.driver.findMany({
      where: { isActive: true },
      include: {
        orders: {
          where: { status: { in: ['confirmed', 'processing', 'shipped'] } },
          select: { id: true },
        },
      },
    });

    const scored = drivers.map((d) => {
      let score = 50;
      const busy = d.orders.length;
      if (storeGovernorate && d.governorate === storeGovernorate) score += 30; // نفس المحافظة
      score -= Math.min(busy * 10, 40);                                        // كلما زاد انشغاله قلّت درجته
      if (d.vehicle) score += 5;                                               // لديه وسيلة نقل مسجلة
      return {
        id: d.id,
        name: d.name,
        phone: d.phone,
        vehicle: d.vehicle,
        governorate: d.governorate,
        activeOrders: busy,
        score: Math.max(score, 0),
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return {
      suggested: scored[0] || null,
      drivers: scored,
      reason: scored[0]
        ? this.suggestReason(scored[0], storeGovernorate)
        : 'لا يوجد سائقون متاحون حالياً — أضف سائقين من لوحة الإدارة',
    };
  }

  private suggestReason(d: any, gov?: string | null) {
    const parts: string[] = [];
    if (gov && d.governorate === gov) parts.push('يعمل في نفس محافظة المتجر');
    if (d.activeOrders === 0) parts.push('غير مشغول حالياً');
    else parts.push(`لديه ${d.activeOrders} طلب نشط فقط`);
    return `🤖 رشّحنا ${d.name} لأنه ${parts.join(' و')}`;
  }

  // تقدير زمن التوصيل (قاعدة معرفية محلية)
  estimateDelivery(driverGov?: string | null, storeGov?: string | null) {
    if (!driverGov || !storeGov) return { hours: '24 - 48', note: 'تقدير عام — لم تُحدد المحافظات' };
    if (driverGov === storeGov) return { hours: '2 - 6', note: 'داخل نفس المحافظة' };
    return { hours: '24 - 72', note: 'بين محافظتين — يعتمد على الطريق' };
  }

  // نصائح ذكية للبائع حول التوصيل
  sellerTips(activeDrivers: number, unassignedOrders: number, linkedCompanies: number) {
    const tips: { icon: string; text: string; impact: string }[] = [];
    if (unassignedOrders > 0)
      tips.push({ icon: '🚨', text: `لديك ${unassignedOrders} طلب بدون سائق — عيّن سائقاً الآن لسرعة التسليم`, impact: 'سرعة تسليم أعلى = تقييمات أفضل' });
    if (activeDrivers === 0)
      tips.push({ icon: '🛵', text: 'لا يوجد سائقون نشطون في المنصة — تواصل مع الإدارة أو استخدم شركة توصيل', impact: '+15' });
    if (linkedCompanies === 0)
      tips.push({ icon: '🚚', text: 'اربط متجرك بشركة توصيل لتغطية المحافظات البعيدة', impact: '+10' });
    if (tips.length === 0)
      tips.push({ icon: '✅', text: 'منظومة التوصيل لديك ممتازة — كل الطلبات موزعة', impact: '' });
    return tips;
  }
}
