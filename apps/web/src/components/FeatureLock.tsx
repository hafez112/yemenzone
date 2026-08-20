'use client';
import Link from 'next/link';

// ═══ شاشة قفل الميزة — تظهر للبائع عندما تتطلب الميزة ترقية أو منحاً من الإدارة ═══
const FEATURE_INFO: Record<string, { icon: string; name: string; desc: string }> = {
  analytics:    { icon: '📊', name: 'الإحصائيات المتقدمة', desc: 'تقارير المبيعات والنمو وأفضل المنتجات مع نصائح ذكية' },
  coupons:      { icon: '🎟️', name: 'الكوبونات',           desc: 'أنشئ أكواد خصم لعملائك وتابع استخدامها' },
  api:          { icon: '🔑', name: 'API للمطورين',         desc: 'اربط متجرك بتطبيقاتك الخارجية عبر مفاتيح آمنة' },
  customDesign: { icon: '🎨', name: 'تخصيص التصميم',        desc: 'غيّر قالب متجرك وألوانه لتميّز علامتك' },
  customDomain: { icon: '🌐', name: 'النطاق الخاص',         desc: 'اربط متجرك بنطاقك الخاص' },
  campaigns:    { icon: '📣', name: 'حملات الزبائن',        desc: 'أرسل عروضك وتنبيهاتك لكل زبائن متجرك بضغطة واحدة' },
  storeAds:     { icon: '🖼️', name: 'بنرات المتجر الإعلانية', desc: 'بانرات متحركة أعلى متجرك — فورية ومجانية مع تتبع المشاهدات والنقرات' },
  pwa:          { icon: '📱', name: 'تطبيق الويب التقدمي',   desc: 'زوّارك يركّبون متجرك كتطبيق مستقل على جوالاتهم باسمه وأيقونته ولونه' },
  finance:      { icon: '💹', name: 'التقرير المالي المتقدم', desc: 'إيراداتك الشهرية، طرق الدفع الأنجح، ومتوسط قيمة الطلب — بتحليل ذكي محلي' },
  inventory:    { icon: '📦', name: 'إدارة المخزون الذكية',   desc: 'تنبيهات النفاد، حدود إعادة الطلب، وملخص حي لحالة كل منتج' },
  crm:          { icon: '👥', name: 'إدارة العملاء',          desc: 'زبائنك الأوفى، قيمة كل عميل، وتحليل تكرار الشراء' },
};

export default function FeatureLock({ feature, inline = false }: { feature: string; inline?: boolean }) {
  const info = FEATURE_INFO[feature] || { icon: '🔒', name: 'هذه الميزة', desc: '' };

  const card = (
    <div className="glass rounded-3xl p-8 text-center relative overflow-hidden">
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-20 anim-blob"
        style={{ background: 'var(--primary)' }} />
      <div className="relative">
        <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl mb-4"
          style={{ background: 'linear-gradient(135deg,#ede9fe,#ccfbf1)' }}>
          🔒
        </div>
        <div className="text-3xl mb-1">{info.icon}</div>
        <h2 className="text-xl font-black mb-2">{info.name}</h2>
        <p className="text-sm text-gray-500 mb-1">{info.desc}</p>
        <p className="text-xs text-gray-400 mb-5">
          هذه الميزة تُفتح بترقية خطتك — وبعد <b>موافقة الإدارة</b> على الاشتراك تُفعّل فوراً
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/seller/subscription"
            className="btn-primary text-white font-extrabold px-8 py-3 rounded-2xl text-sm inline-block">
            💎 ترقية خطتي
          </Link>
          <Link href="/seller"
            className="bg-white/70 text-gray-600 font-extrabold px-8 py-3 rounded-2xl text-sm inline-block border border-gray-200">
            ← العودة للوحة
          </Link>
        </div>
      </div>
    </div>
  );

  if (inline) return card;
  return <div className="max-w-lg mx-auto py-10 px-3">{card}</div>;
}
