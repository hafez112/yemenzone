// ═══════════════════════════════════════════════════════════════
//  🧠 مكتبة يمن زون للذكاء الاصطناعي المحلي — محرك الرؤى
//  تحليل السلاسل الزمنية: نمو + تنبؤ مرجح + اتجاه + ترتيب ذكي
// ═══════════════════════════════════════════════════════════════

export interface SeriesPoint { label: string; total: number }
export type Trend = 'rising' | 'falling' | 'stable' | 'insufficient';

export interface SeriesAnalysis {
  growth: number | null;      // نسبة النمو بين آخر فترتين (%)
  forecast: number | null;    // تنبؤ الفترة القادمة (متوسط مرجح)
  best: SeriesPoint | null;   // أفضل فترة
  trend: Trend;
}

// تحليل سلسلة زمنية (مبيعات/إيرادات شهرية أو أسبوعية)
export function analyzeSeries(series: SeriesPoint[]): SeriesAnalysis {
  const filled = series.filter((m) => m.total > 0);
  if (filled.length < 2) {
    return { growth: null, forecast: null, best: filled[0] || null, trend: 'insufficient' };
  }

  const last = filled[filled.length - 1].total;
  const prev = filled[filled.length - 2].total;
  const growth = prev > 0 ? Math.round(((last - prev) / prev) * 100) : 100;
  const best = filled.reduce((a, b) => (b.total > a.total ? b : a));

  // تنبؤ: متوسط مرجح (الأحدث أثقل) معدّل بنصف زخم النمو
  const weights = filled.map((_, i) => i + 1);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const forecast = Math.round(
    (filled.reduce((sum, m, i) => sum + m.total * weights[i], 0) / wSum) * (1 + growth / 200),
  );

  return { growth, forecast, best, trend: trendOf(growth) };
}

// تسمية الاتجاه من نسبة النمو
export function trendOf(growth: number | null): Trend {
  if (growth === null || growth === undefined) return 'insufficient';
  return growth > 15 ? 'rising' : growth < -15 ? 'falling' : 'stable';
}

// ترتيب ذكي عام: دالة نقاط قابلة للتخصيص (الأعلى أولاً)
export function smartSort<T>(items: T[], score: (item: T) => number): T[] {
  return [...items].sort((a, b) => score(b) - score(a));
}

// نقاط ظهور منتج في الواجهة: مخفض + متوفر + مشاهدات
export function storefrontProductScore(p: {
  salePrice?: number | null; stock?: number; viewsCount?: number;
}): number {
  return (p.salePrice ? 100 : 0) + ((p.stock ?? 0) > 0 ? 50 : 0) + (p.viewsCount || 0);
}

// نصيحة مخزون موحدة حسب الكمية
export function stockLevel(stock: number): { level: string; message: string; color: string } {
  if (stock <= 0) return { level: 'empty', message: '⚠️ نفد المخزون — أضف كمية فوراً', color: '#DC2626' };
  if (stock <= 5) return { level: 'low', message: '🔶 مخزون منخفض — فعّل عرض "كمية محدودة"', color: '#F59E0B' };
  if (stock <= 20) return { level: 'ok', message: '✅ مخزون جيد', color: '#059669' };
  return { level: 'high', message: '💪 مخزون ممتاز — جرّب عرض تخفيض لتحريك المبيعات', color: '#0EA5E9' };
}
