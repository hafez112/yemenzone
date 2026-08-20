import { Injectable } from '@nestjs/common';

// 🤖 ذكاء محلي: نصائح التصميم + تحليل خدمات المنصة
@Injectable()
export class PlatformAiService {
  // لمعان اللون 0-255 (معادلة W3C)
  private luminance(hex: string): number {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 128;
    const n = parseInt(m[1], 16);
    return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  }

  designTips(settings: Record<string, any>, slides: any[], pages: any[]) {
    const tips: { icon: string; level: 'info' | 'warn'; text: string }[] = [];
    const colors = settings.colors || {};
    const platform = settings.platform || {};

    // تباين اللون الأساسي مع النص الأبيض
    if (colors.primary) {
      const lum = this.luminance(colors.primary);
      if (lum > 200) tips.push({ icon: '🎨', level: 'warn', text: 'اللون الأساسي فاتح جداً — النصوص البيضاء على الأزرار ستصعب قراءتها، اختر لوناً أغمق' });
      if (lum < 40) tips.push({ icon: '🎨', level: 'warn', text: 'اللون الأساسي داكن جداً وقد يبدو أسود — لون متوسط (مثل البنفسجي الافتراضي) أجذب' });
    }
    if (!platform.whatsapp) tips.push({ icon: '📱', level: 'info', text: 'أضف رقم واتساب المنصة — يظهر في التذييل ويرفع ثقة الزوار' });
    if (platform.announcementActive && (platform.announcement || '').length > 90)
      tips.push({ icon: '📢', level: 'warn', text: 'شريط الإعلان طويل (90+ حرف) — سيأخذ سطرين على الجوال، اختصره' });
    if (platform.announcementActive && !platform.announcement)
      tips.push({ icon: '📢', level: 'warn', text: 'شريط الإعلان مفعّل لكنه فارغ — أضف نصاً أو عطّله' });

    const activeSlides = slides.filter((s) => s.isActive);
    if (activeSlides.length === 0) tips.push({ icon: '🖼️', level: 'warn', text: 'لا شرائح سلايدر نشطة — الواجهة الرئيسية تفقد أبرز عنصر جذب' });
    if (activeSlides.length > 5) tips.push({ icon: '🖼️', level: 'info', text: `${activeSlides.length} شرائح نشطة — 3-5 شرائح هي الأمثل لسرعة التصفح` });

    // صفحات أساسية
    const slugs = pages.filter((p) => p.isActive).map((p) => p.slug);
    if (!slugs.includes('about')) tips.push({ icon: '📄', level: 'info', text: 'أنشئ صفحة "من نحن" (slug: about) — رابطها موجود في القائمة العلوية' });
    const noMeta = pages.filter((p) => p.isActive && !p.metaDesc).length;
    if (noMeta > 0) tips.push({ icon: '🔍', level: 'info', text: `${noMeta} صفحة بلا وصف SEO — الوصف الميتا يحسّن ظهورك في جوجل` });

    if (!tips.length) tips.push({ icon: '✅', level: 'info', text: 'تصميم المنصة مكتمل ومتوازن — عمل رائع!' });
    return tips;
  }

  serviceInsights(services: any[], orders: any[]) {
    const insights: string[] = [];
    const approved = orders.filter((o) => o.status === 'approved');
    const pending = orders.filter((o) => o.status === 'pending');
    const revenue = approved.reduce((s, o) => s + Number(o.service?.price || 0), 0);

    if (pending.length > 0) insights.push(`⏳ ${pending.length} طلب بانتظار المراجعة — الرد السريع يرفع رضا التجار`);
    if (approved.length > 0) insights.push(`💰 إيراد خدمات معتمد: ${revenue.toLocaleString('en')} ريال من ${approved.length} طلب`);

    // الأكثر طلباً
    const count: Record<string, { n: number; title: string }> = {};
    for (const o of orders) {
      const t = o.service?.title || 'خدمة';
      count[o.serviceId] = count[o.serviceId] || { n: 0, title: t };
      count[o.serviceId].n++;
    }
    const top = Object.values(count).sort((a, b) => b.n - a.n)[0];
    if (top && top.n >= 2) insights.push(`⭐ الأكثر طلباً: "${top.title}" (${top.n} طلب) — فكّر بباقات موسعة لها`);

    const zeroOrders = services.filter((s) => s.isActive && !count[s.id]);
    if (zeroOrders.length > 0 && orders.length > 0)
      insights.push(`💤 ${zeroOrders.length} خدمة نشطة بلا أي طلب — راجع أسعارها أو أوصافها`);

    if (!insights.length) insights.push('🚀 أضف خدماتك الأولى (تصميم شعار/تصوير منتجات/إدارة حملات) — دخل إضافي ممتاز للمنصة');
    return insights;
  }
}
