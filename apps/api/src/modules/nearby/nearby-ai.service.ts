import { Injectable } from '@nestjs/common';

// 🤖 ذكاء محلي: ترتيب الترشيح الذكي للمتاجر القريبة + نصائح
@Injectable()
export class NearbyAiService {
  // مسافة هافرساين بالكيلومتر
  distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // درجة الترشيح 0-100: المسافة (50) + التقييم (25) + الدرجة الذكية (15) + التوثيق (10)
  recommendScore(store: any, distKm: number | null): number {
    let score = 0;
    if (distKm !== null) {
      // تحلل أسّي: 50 نقطة عند 0كم، ~25 عند 5كم، ~5 عند 25كم
      score += 50 * Math.exp(-distKm / 8);
    } else {
      score += 20; // بدون موقع — رصيد محايد
    }
    score += Math.min((store.ratingAvg || 0) * 5, 25);
    score += Math.min((store.smartScore || 0) * 0.15, 15);
    if (store.isVerified) score += 10;
    return Math.round(score * 10) / 10;
  }

  // شارة مميزة للمتجر الأفضل
  badges(stores: any[]): Map<string, string> {
    const map = new Map<string, string>();
    if (!stores.length) return map;
    const withDist = stores.filter((s) => s.distanceKm !== null);
    if (withDist.length) {
      const nearest = [...withDist].sort((a, b) => a.distanceKm - b.distanceKm)[0];
      if (nearest.distanceKm < 3) map.set(nearest.id, '📍 الأقرب إليك');
    }
    const bestRated = [...stores].filter((s) => s.ratingCount >= 2).sort((a, b) => b.ratingAvg - a.ratingAvg)[0];
    if (bestRated && bestRated.ratingAvg >= 4.5) map.set(bestRated.id, '⭐ الأعلى تقييماً');
    const best = [...stores].sort((a, b) => b.recScore - a.recScore)[0];
    if (best && !map.has(best.id)) map.set(best.id, '🏆 ترشيحنا الذكي');
    return map;
  }

  tips(stores: any[], hasLocation: boolean, gov?: string): string[] {
    const tips: string[] = [];
    const withGps = stores.filter((s) => s.distanceKm !== null).length;
    if (!hasLocation) tips.push('فعّل تحديد الموقع 📍 لنرتب المتاجر حسب قربها الحقيقي منك');
    if (hasLocation && withGps === 0) tips.push('لا متاجر بإحداثيات GPS بعد — نعرض حسب المحافظة والتقييم');
    if (hasLocation && withGps > 0) {
      const nearest = stores.filter((s) => s.distanceKm !== null).sort((a, b) => a.distanceKm - b.distanceKm)[0];
      if (nearest && nearest.distanceKm > 20) tips.push(`أقرب متجر يبعد ${Math.round(nearest.distanceKm)} كم — وسّع البحث لمحافظات مجاورة`);
      if (nearest && nearest.distanceKm <= 5) tips.push(`${stores.filter((s) => s.distanceKm !== null && s.distanceKm <= 5).length} متجر ضمن 5 كم منك — توصيل أسرع غالباً 🛵`);
    }
    if (gov && stores.length === 0) tips.push(`لا متاجر نشطة في ${gov} حالياً — جرّب محافظة أخرى أو تصفح الكل`);
    const verified = stores.filter((s) => s.isVerified).length;
    if (stores.length > 3 && verified > 0) tips.push(`${verified} متجر موثق ✅ في النتائج — التوثيق يعني مراجعة إدارة المنصة`);
    if (!tips.length) tips.push('نتائج مرتبة بذكاء: القرب + التقييم + الدرجة الذكية + التوثيق');
    return tips;
  }
}
