import { Injectable } from '@nestjs/common';

// 🤖 ذكاء محلي: تصنيف الشكاوى + أولويتها + ردود مقترحة
@Injectable()
export class ComplaintsAiService {
  private CATS: Record<string, { label: string; keywords: string[]; reply: string }> = {
    delivery: { label: '🚚 التوصيل', keywords: ['توصيل', 'تاخر', 'تأخر', 'سائق', 'مندوب', 'وصل', 'طلبي وين', 'توصيله'],
      reply: 'نعتذر عن تأخر التوصيل 🙏 راجعنا حالة طلبك مع السائق وسيصلك خلال ساعات. سنتابع معك هاتفياً للتأكد.' },
    payment: { label: '💳 الدفع', keywords: ['دفع', 'فلوس', 'مبلغ', 'حوالة', 'تحويل', 'بطاقة', 'شحن', 'رصيد', 'محفظة', 'سحب'],
      reply: 'نعتذر عن الإزعاج 🙏 استلمنا تفاصيل مشكلة الدفع وسيراجعها فريق المالية خلال 24 ساعة، وسيصلك الرد على جوالك.' },
    store: { label: '🏪 متجر/تاجر', keywords: ['متجر', 'تاجر', 'بائع', 'منتج', 'غش', 'نصب', 'رديء', 'مخالف', 'سعر'],
      reply: 'شكراً لبلاغك 🙏 فتحنا تحقيقاً مع المتجر المعني وسنتخذ الإجراء المناسب وفق سياسة المنصة، وسنخطرك بالنتيجة.' },
    technical: { label: '⚙️ تقني', keywords: ['موقع', 'تطبيق', 'خطأ', 'ما يشتغل', 'ما يفتح', 'بطيء', 'دخول', 'حساب', 'كلمة'],
      reply: 'نعتذر عن المشكلة التقنية 🙏 فريقنا التقني يراجعها الآن. جرّب تحديث الصفحة مؤقتاً، وسنحلها بأقرب وقت.' },
  };

  categorize(text: string): { category: string; label: string; suggestedReply: string } {
    const t = (text || '').toLowerCase();
    let best = { category: 'other', label: '📋 عام', score: 0 };
    for (const [key, c] of Object.entries(this.CATS)) {
      const score = c.keywords.filter((k) => t.includes(k)).length;
      if (score > best.score) best = { category: key, label: c.label, score };
    }
    const cat = best.category === 'other' ? null : this.CATS[best.category];
    return {
      category: best.category,
      label: cat?.label || '📋 عام',
      suggestedReply: cat?.reply || 'شكراً لتواصلك معنا 🙏 استلمنا شكواك وسيراجعها الفريق المختص خلال 24-48 ساعة، وسيتم الرد عليك هنا وعلى جوالك.',
    };
  }

  // أولوية: كلمات استعجال/غضب + طول الرسالة
  priority(text: string): 'high' | 'normal' {
    const t = (text || '').toLowerCase();
    const urgent = ['نصب', 'سرقة', 'احتيال', 'فورا', 'فوري', 'مستعجل', 'محامي', 'قضاء', 'أسوأ', 'فضيحة'];
    if (urgent.some((k) => t.includes(k))) return 'high';
    return 'normal';
  }

  // تحليل للإدارة
  insights(complaints: any[]): string[] {
    const tips: string[] = [];
    const open = complaints.filter((c) => c.status === 'open');
    if (open.length > 0) {
      const oldest = open[open.length - 1];
      const ageHours = Math.floor((Date.now() - new Date(oldest.createdAt).getTime()) / 3600000);
      tips.push(`⏳ ${open.length} شكوى مفتوحة — أقدمها منذ ${ageHours} ساعة${ageHours > 24 ? ' (تجاوزت يوماً!)' : ''}`);
    }
    const catCount: Record<string, number> = {};
    for (const c of complaints) {
      const { label } = this.categorize(c.subject + ' ' + c.message);
      catCount[label] = (catCount[label] || 0) + 1;
    }
    const top = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) tips.push(`📊 أكثر التصنيفات تكراراً: ${top[0]} (${top[1]} شكوى) — عالج السبب الجذري`);
    const high = complaints.filter((c) => c.status === 'open' && this.priority(c.subject + ' ' + c.message) === 'high').length;
    if (high > 0) tips.push(`🚨 ${high} شكوى عالية الأولوية مفتوحة — ابدأ بها فوراً`);
    if (!tips.length) tips.push('✅ لا شكاوى مفتوحة — خدمة عملاء ممتازة!');
    return tips;
  }
}
