import { Injectable } from '@nestjs/common';

// 🤖 ذكاء محلي: تحليل استخدام مفاتيح API وكشف الأنماط الشاذة
@Injectable()
export class ApiAiService {
  // keys: [{id, name, prefix, ratePerMin, totalCalls, lastUsedAt, createdAt}]
  // usage: [{keyId, day, calls, fails}] آخر 14 يوم
  analyze(keys: any[], usage: any[]) {
    const today = new Date().toISOString().slice(0, 10);
    const insights: { keyId: string; icon: string; level: 'info' | 'warn' | 'danger'; text: string }[] = [];
    const tips: string[] = [];

    for (const k of keys) {
      const rows = usage.filter((u) => u.keyId === k.id);
      const callsToday = rows.filter((r) => r.day === today).reduce((s, r) => s + r.calls, 0);
      const prev7 = rows.filter((r) => r.day < today).slice(-7);
      const avg7 = prev7.length ? prev7.reduce((s, r) => s + r.calls, 0) / prev7.length : 0;
      const totalFails = rows.reduce((s, r) => s + r.fails, 0);
      const totalCalls = rows.reduce((s, r) => s + r.calls, 0);

      // ارتفاع مفاجئ: اليوم > ضعف متوسط الأسبوع (واليوم > 20 طلب)
      if (avg7 >= 10 && callsToday > avg7 * 2 && callsToday > 20) {
        insights.push({ keyId: k.id, icon: '📈', level: 'warn', text: `ارتفاع مفاجئ: ${callsToday} طلب اليوم مقابل متوسط ${Math.round(avg7)} — راجع مصدر الاستخدام` });
      }
      // معدل فشل مرتفع
      if (totalCalls >= 20 && totalFails / totalCalls > 0.2) {
        insights.push({ keyId: k.id, icon: '⚠️', level: 'danger', text: `معدل فشل ${Math.round((totalFails / totalCalls) * 100)}% — غالباً تكامل خاطئ أو محاولات تخمين` });
      }
      // مفتاح خامد
      const daysIdle = k.lastUsedAt ? (Date.now() - new Date(k.lastUsedAt).getTime()) / 86400000 : (Date.now() - new Date(k.createdAt).getTime()) / 86400000;
      if (daysIdle >= 14) {
        insights.push({ keyId: k.id, icon: '💤', level: 'info', text: `خامل منذ ${Math.floor(daysIdle)} يوم — فكّر بإيقافه لتقليل المخاطر` });
      }
      // اقتراح رفع الحد
      if (avg7 > 0 && callsToday >= k.ratePerMin * 8) {
        insights.push({ keyId: k.id, icon: '🚀', level: 'info', text: `يقترب من حد ${k.ratePerMin}/دقيقة باستمرار — ارفع الحد إن كان استخداماً موثوقاً` });
      }
    }

    // نصائح عامة
    const activeKeys = keys.filter((k) => k.status === 'active');
    if (activeKeys.length === 0) tips.push('أنشئ مفتاحك الأول وابدأ الربط — المفتاح يظهر مرة واحدة فقط فاحفظه بأمان');
    if (activeKeys.length >= 5) tips.push('لديك 5+ مفاتيح نشطة — استخدم مفتاحاً لكل تطبيق/موقع لتسهيل التتبع والإيقاف');
    if (insights.some((i) => i.level === 'danger')) tips.push('مفتاح بمعدل فشل مرتفع: أوقفه فوراً إن لم تتعرف على مصدره');
    if (keys.some((k) => k.ratePerMin >= 300)) tips.push('حدود 300+/دقيقة مريحة لكنها خطرة عند تسرب المفتاح — اجعلها عند الحاجة فقط');
    if (!tips.length) tips.push('استخدامك صحي ✅ — راجع هذه الصفحة أسبوعياً لمراقبة الأنماط');

    return { insights, tips };
  }

  // اقتراح حد استخدام عند الإنشاء حسب نوع المتجر
  suggestRate(storeType: string): number {
    if (storeType === 'products' || storeType === 'restaurants') return 120;
    if (storeType === 'malls') return 200;
    if (storeType === 'hotel' || storeType === 'rentals') return 60;
    return 90;
  }
}
