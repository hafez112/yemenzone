import { Injectable } from '@nestjs/common';

// 🤖 ذكاء المراسلة المحلي: قوالب جاهزة + تحقق ذكي + نصائح
@Injectable()
export class MessagingAiService {
  // الأحداث المعروفة وقوالبها المقترحة ومتغيراتها
  readonly EVENT_PRESETS: Record<string, { label: string; icon: string; channel: string; vars: string[]; suggested: string }> = {
    otp: {
      label: 'رمز التحقق OTP', icon: '🔐', channel: 'sms',
      vars: ['code', 'name'],
      suggested: 'يمن زون: رمز التحقق الخاص بك هو {code} — صالح لمدة 10 دقائق. لا تشاركه مع أحد.',
    },
    order_new: {
      label: 'طلب جديد', icon: '🛒', channel: 'whatsapp',
      vars: ['name', 'number', 'store', 'total'],
      suggested: 'مرحباً {name} 👋 تم استلام طلبك {number} من متجر {store} بقيمة {total}. سنؤكد طلبك قريباً — شكراً لثقتك! 🌟',
    },
    order_status: {
      label: 'تحديث حالة الطلب', icon: '📦', channel: 'whatsapp',
      vars: ['name', 'number', 'status', 'store'],
      suggested: 'تحديث طلبك {number} من {store}: الحالة الآن "{status}" 📦',
    },
    booking_status: {
      label: 'تحديث الحجز', icon: '📅', channel: 'whatsapp',
      vars: ['name', 'number', 'status', 'store'],
      suggested: 'مرحباً {name}، حجزك {number} لدى {store} أصبح "{status}" 📅 نتمنى لك تجربة سعيدة!',
    },
    subscription_approved: {
      label: 'تفعيل الاشتراك', icon: '💎', channel: 'sms',
      vars: ['name', 'plan', 'store'],
      suggested: 'مبروك {name}! 🎉 تم تفعيل اشتراك متجرك {store} في باقة {plan} — استمتع بكل المزايا الآن.',
    },
    card_verify: {
      label: 'تأكيد الدفع بالبطاقة', icon: '💳', channel: 'sms',
      vars: ['code', 'name'],
      suggested: 'يمن زون: رمز تأكيد الدفع من بطاقتك هو {code} — لا تشاركه مع أحد أبداً 🔐',
    },
    driver_assigned: {
      label: 'تعيين سائق للطلب', icon: '🛵', channel: 'sms',
      vars: ['name', 'number', 'driver', 'driverPhone'],
      suggested: 'طلبك {number} مع السائق {driver} ({driverPhone}) 🛵 سيتواصل معك قريباً.',
    },
    back_in_stock: {
      label: 'عودة التوفر', icon: '🔔', channel: 'whatsapp',
      vars: ['name', 'product'],
      suggested: 'خبر سار {name}! 🎉 المنتج «{product}» الذي انتظرته توفّر أخيراً — اطلبه الآن قبل النفاد من يمن زون.',
    },
    price_drop: {
      label: 'نزول السعر', icon: '💸', channel: 'whatsapp',
      vars: ['name', 'product', 'price', 'link'],
      suggested: 'نزل السعر! 💸 «{product}» أصبح الآن بـ {price} فقط — اطلبه من هنا: {link}',
    },
  };

  // فحص قالب ذكي: متغيرات ناقصة/زائدة + طول SMS + نصائح
  analyzeTemplate(event: string, body: string, channel: string) {
    const preset = this.EVENT_PRESETS[event];
    const issues: { level: 'warn' | 'ok' | 'info'; text: string }[] = [];
    const usedVars = [...body.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

    if (preset) {
      const missing = preset.vars.filter((v) => !usedVars.includes(v));
      const unknown = usedVars.filter((v) => !preset.vars.includes(v));
      if (missing.length && missing.length === preset.vars.length)
        issues.push({ level: 'warn', text: `لم تستخدم أي متغير — المتاحة: ${preset.vars.map((v) => `{${v}}`).join(' ')}` });
      else if (missing.length)
        issues.push({ level: 'info', text: `يمكنك إضافة: ${missing.map((v) => `{${v}}`).join(' ')}` });
      if (unknown.length)
        issues.push({ level: 'warn', text: `متغيرات غير معروفة لهذا الحدث: ${unknown.map((v) => `{${v}}`).join(' ')} — لن تُعوّض` });
    }

    if (channel === 'sms' && body.length > 160)
      issues.push({ level: 'warn', text: `النص ${body.length} حرفاً — رسائل SMS فوق 160 تُجزأ وقد تكلف أكثر` });
    if (body.length < 15)
      issues.push({ level: 'warn', text: 'النص قصير جداً — أضف تفاصيل مفيدة للعميل' });
    if (!issues.some((i) => i.level === 'warn'))
      issues.push({ level: 'ok', text: '🤖 القالب ممتاز وجاهز للاستخدام' });
    return issues;
  }

  // نصائح عامة حسب الإحصائيات
  statsTips(stats: { total: number; failed: number; simulated: number; activeTemplates: number; providers: number }) {
    const tips: { icon: string; text: string }[] = [];
    if (stats.providers === 0)
      tips.push({ icon: '🔌', text: 'لا يوجد مزود رسائل نشط — الرسائل تُسجل فقط (محاكاة). أضف مزود SMS أو واتساب للإرسال الحقيقي' });
    if (stats.activeTemplates === 0)
      tips.push({ icon: '📝', text: 'كل القوالب معطلة — فعّل قالب "طلب جديد" أولاً لإشعار العملاء تلقائياً' });
    if (stats.total > 10 && stats.failed / stats.total > 0.3)
      tips.push({ icon: '🚨', text: `نسبة فشل مرتفعة (${Math.round((stats.failed / stats.total) * 100)}%) — تحقق من رابط API ومفتاح المزود` });
    if (tips.length === 0)
      tips.push({ icon: '✅', text: 'منظومة المراسلة تعمل بشكل ممتاز' });
    return tips;
  }
}
