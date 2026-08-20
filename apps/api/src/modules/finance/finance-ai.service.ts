import { Injectable } from '@nestjs/common';
import { analyzeSeries } from '../../libs/ai';

// 🤖 الذكاء المالي المحلي: تحليل النمو + التنبؤ + النصائح
//    أوامر التحليل تُستدعى من مكتبة libs/ai (محرك الرؤى)
@Injectable()
export class FinanceAiService {
  // تحليل سلسلة شهرية: نمو + تنبؤ الشهر القادم + أفضل شهر
  analyzeMonthly(series: { label: string; total: number }[]) {
    return analyzeSeries(series);
  }

  // نصائح مالية للمنصة
  platformTips(data: { commission: number; walletsLiability: number; cardsLiability: number; pendingPayments: number; staleCurrencies: string[] }) {
    const tips: { icon: string; text: string }[] = [];
    if (data.pendingPayments > 5) tips.push({ icon: '⏰', text: `${data.pendingPayments} دفعات معلقة — كل تأخير يجمّد أرباح التجار` });
    if (data.staleCurrencies.length) tips.push({ icon: '💱', text: `أسعار صرف قديمة (>30 يوم): ${data.staleCurrencies.join('، ')} — حدّثها لتقارير دقيقة` });
    if (data.commission === 0) tips.push({ icon: '📉', text: 'العمولة 0% — المنصة لا تربح من المبيعات. فكّر بعمولة 3-5%' });
    if (data.walletsLiability + data.cardsLiability > 0)
      tips.push({ icon: '🏦', text: `التزامات المنصة: ${(data.walletsLiability + data.cardsLiability).toLocaleString()} ر.ي (محافظ + بطاقات) — احتفظ بسيولة مقابلة` });
    if (tips.length === 0) tips.push({ icon: '✅', text: 'الوضع المالي للمنصة سليم' });
    return tips;
  }

  // نصائح مالية للتاجر
  sellerTips(data: { growth: number | null; avgOrder: number; ordersThisMonth: number; walletBalance: number }) {
    const tips: { icon: string; text: string }[] = [];
    if (data.growth != null) {
      if (data.growth > 15) tips.push({ icon: '🚀', text: `نمو مبيعاتك ${data.growth}% هذا الشهر — حافظ على الزخم بكوبونات للعملاء الجدد` });
      else if (data.growth < -15) tips.push({ icon: '📉', text: `انخفاض ${Math.abs(data.growth)}% — جرّب كوبون خصم أو منتجات جديدة لإنعاش المبيعات` });
      else tips.push({ icon: '📊', text: 'مبيعاتك مستقرة — فرصة للتوسع بأصناف جديدة' });
    }
    if (data.avgOrder > 0 && data.avgOrder < 5000) tips.push({ icon: '🛒', text: `متوسط طلبك ${Math.round(data.avgOrder).toLocaleString()} ر.ي — ارفعه بعروض "اشترِ 2 واحصل على خصم"` });
    if (data.walletBalance > 50000) tips.push({ icon: '💸', text: 'لديك رصيد كبير بالمحفظة — اسحبه لتأمين أرباحك' });
    if (data.ordersThisMonth === 0) tips.push({ icon: '📣', text: 'لا طلبات هذا الشهر — شارك رابط متجرك في مجموعات واتساب' });
    return tips;
  }
}
