import { Injectable } from '@nestjs/common';

// 🤖 ذكاء البطاقات والمحافظ المحلي
@Injectable()
export class CardAiService {
  // تحليل محاولة شحن بطاقة (حماية من التخمين)
  redeemRisk(failedAttempts: number, cardDisabled: boolean) {
    if (cardDisabled) return { blocked: true, reason: 'البطاقة موقوفة — تواصل مع الإدارة' };
    if (failedAttempts >= 5) return { blocked: true, reason: 'محاولات خاطئة كثيرة — انتظر 15 دقيقة' };
    if (failedAttempts >= 3) return { blocked: false, warning: `⚠️ ${failedAttempts} محاولات خاطئة — تبقى ${5 - failedAttempts} قبل الإيقاف المؤقت` };
    return { blocked: false };
  }

  // نصائح محفظة التاجر
  sellerWalletTips(balance: number, pendingWithdrawals: number, monthlySales: number) {
    const tips: { icon: string; text: string }[] = [];
    if (balance > 100000 && pendingWithdrawals === 0)
      tips.push({ icon: '💸', text: `رصيدك ${balance.toLocaleString()} ر.ي كبير — اطلب سحباً لتأمين أرباحك` });
    if (pendingWithdrawals > 0)
      tips.push({ icon: '⏳', text: 'لديك طلب سحب قيد المعالجة — ستصلك رسالة عند التحويل' });
    if (monthlySales > 0 && balance === 0)
      tips.push({ icon: '📈', text: 'مبيعاتك نشطة لكن رصيدك صفر — راجع طلبات السحب السابقة' });
    if (tips.length === 0) tips.push({ icon: '✅', text: 'محفظتك بحالة جيدة' });
    return tips;
  }

  // نصائح بطاقة العميل
  customerCardTips(balance: number, topupsCount: number) {
    const tips: { icon: string; text: string }[] = [];
    if (topupsCount === 0) tips.push({ icon: '🎫', text: 'اشحن بطاقتك ببطاقة يمن زون من أي وكيل معتمد وادفع بسرعة وأمان' });
    else if (balance < 1000) tips.push({ icon: '💰', text: 'رصيدك منخفض — اشحن بطاقتك قبل طلبك القادم' });
    else tips.push({ icon: '✨', text: `رصيدك ${balance.toLocaleString()} ر.ي جاهز — ادفع ببطاقتك برمز OTP الآمن` });
    return tips;
  }

  // نصائح الإدارة حول البطاقات
  adminTips(stats: { unusedCards: number; usedCards: number; pendingTopups: number; pendingWithdrawals: number }) {
    const tips: { icon: string; text: string }[] = [];
    if (stats.unusedCards < 10) tips.push({ icon: '🎫', text: 'مخزون البطاقات منخفض — أنشئ دفعة جديدة قبل نفادها لدى الوكلاء' });
    if (stats.pendingTopups > 0) tips.push({ icon: '💰', text: `${stats.pendingTopups} طلبات شحن بانتظار المراجعة` });
    if (stats.pendingWithdrawals > 0) tips.push({ icon: '💸', text: `${stats.pendingWithdrawals} طلبات سحب بانتظار التحويل — التأخير يفقد التجار الثقة` });
    const usage = stats.usedCards + stats.unusedCards;
    if (usage > 0 && stats.usedCards / usage > 0.7) tips.push({ icon: '📊', text: `نسبة استخدام البطاقات ${Math.round((stats.usedCards / usage) * 100)}% — ممتازة!` });
    if (tips.length === 0) tips.push({ icon: '✅', text: 'منظومة البطاقات والمحافظ تعمل بانتظام' });
    return tips;
  }
}
