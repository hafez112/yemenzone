import { Injectable } from '@nestjs/common';

// 🤖 ذكاء المدفوعات المحلي: كشف التلاعب + تحليل الإثباتات + نصائح
@Injectable()
export class PaymentAiService {
  // تحليل دفعة معلّقة قبل المراجعة — يعيد تنبيهات للمدير
  analyzePayment(payment: any, context: { orderTotal?: number | null; sameProofCount: number; payerRejected: number }) {
    const alerts: { level: 'danger' | 'warn' | 'ok' | 'info'; text: string }[] = [];

    // مبلغ لا يطابق قيمة الطلب
    if (context.orderTotal != null) {
      const diff = Math.abs(Number(payment.amount) - Number(context.orderTotal));
      if (diff > 1)
        alerts.push({ level: 'danger', text: `⚠️ المبلغ (${payment.amount}) لا يطابق قيمة الطلب (${context.orderTotal}) — فرق ${diff}` });
      else
        alerts.push({ level: 'ok', text: '✅ المبلغ مطابق لقيمة الطلب' });
    }

    // إثبات مستخدم في دفعة أخرى
    if (context.sameProofCount > 0)
      alerts.push({ level: 'danger', text: `🚨 صورة الإثبات نفسها استُخدمت في ${context.sameProofCount} دفعة أخرى — احتمال تلاعب!` });

    // دافع مرفوض سابقاً
    if (context.payerRejected >= 2)
      alerts.push({ level: 'warn', text: `⚠️ هذا الدافع رُفضت له ${context.payerRejected} دفعات سابقاً — راجع بعناية` });

    if (!payment.proofImage)
      alerts.push({ level: 'warn', text: '📎 لا توجد صورة إثبات مرفقة' });

    if (!alerts.some((a) => a.level === 'danger' || a.level === 'warn'))
      alerts.push({ level: 'ok', text: '🤖 الدفعة تبدو سليمة — يمكن الاعتماد' });

    // درجة الثقة
    let score = 100;
    for (const a of alerts) {
      if (a.level === 'danger') score -= 45;
      if (a.level === 'warn') score -= 20;
    }
    return { alerts, trustScore: Math.max(score, 0) };
  }

  // نصائح عامة للمدير
  statsTips(stats: { pending: number; approvedToday: number; rejectedWeek: number; gateways: number }) {
    const tips: { icon: string; text: string }[] = [];
    if (stats.pending > 5)
      tips.push({ icon: '⏰', text: `لديك ${stats.pending} دفعات معلّقة — التأخير في المراجعة يبطئ تسليم الطلبات` });
    if (stats.gateways === 0)
      tips.push({ icon: '🏦', text: 'لا توجد بوابات دفع نشطة — أضف حساباً بنكياً أو محفظة ليتمكن العملاء من الدفع الإلكتروني' });
    if (stats.rejectedWeek > 3)
      tips.push({ icon: '🔍', text: `${stats.rejectedWeek} دفعات مرفوضة هذا الأسبوع — راجع أسباب الرفض المتكررة` });
    if (tips.length === 0)
      tips.push({ icon: '✅', text: 'المدفوعات تحت السيطرة — لا تراكم في المراجعات' });
    return tips;
  }
}
