import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import { FaqAccordion } from '@/components/info/InfoWidgets';

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة — يمن زون',
  description: 'إجابات واضحة عن إنشاء المتجر، الطلبات، الدفع، التوصيل، العمولات، والخطط في منصة يمن زون.',
};

// ❓ محتوى حقيقي عن المنصة — بائعون وعملاء
const FAQS: { group: string; icon: string; items: { q: string; a: string }[] }[] = [
  {
    group: 'للتجار', icon: '🏪',
    items: [
      { q: 'كيف أنشئ متجري؟', a: 'سجّل بحساب بائع برقم جوالك، ثم اتبع المعالج الذكي: اختر نوع نشاطك (منتجات، إيجارات، فنادق، خدمات)، اكتب اسم متجرك — وتجهز لوحتك تلقائياً في دقيقتين.' },
      { q: 'هل إنشاء المتجر مجاني؟', a: 'نعم — الخطة المجانية تتيح متجراً كاملاً برابط خاص وإدارة طلبات. الخطط المدفوعة تفتح مزايا إضافية كالإحصائيات المتقدمة والكوبونات والبنرات وتطبيق الويب.' },
      { q: 'كم عمولة المنصة؟', a: 'عمولة رمزية على المبيعات الإلكترونية فقط (تظهر النسبة الحالية في المركز المالي للوحة التحكم). المبيعات النقدية عند الاستلام لا عمولة عليها.' },
      { q: 'كيف أستلم أرباحي؟', a: 'المدفوعات الإلكترونية تُقيد في محفظتك داخل لوحة التحكم، وتطلب سحبها متى شئت — تراجعها الإدارة وتُحوّل لحسابك.' },
      { q: 'هل أستطيع استخدام بنرات إعلانية داخل متجري؟', a: 'نعم — مع الخطة الذهبية تضيف حتى 5 بنرات ترويجية داخل واجهة متجرك تُدار فورياً من لوحة الإعلانات.' },
    ],
  },
  {
    group: 'للزبائن', icon: '🛍️',
    items: [
      { q: 'كيف أتتبع طلبي؟', a: 'من صفحة «تتبع الطلب» أدخل رقم الطلب ورقم جوالك — أو من حسابك في «طلباتي» حيث يظهر مسار الطلب مرحلة بمرحلة حتى التسليم.' },
      { q: 'ما طرق الدفع المتاحة؟', a: 'الدفع عند الاستلام، أو التحويل عبر طرق الدفع التي يحددها كل متجر (محافظ وحسابات بنكية محلية)، أو بطاقة يمن زون المشحونة.' },
      { q: 'كيف أشحن بطاقتي؟', a: 'اشترِ بطاقة شحن من أي نقطة بيع معتمدة، ثم من صفحة «بطاقتي» في حسابك أدخل رقم البطاقة — يُضاف الرصيد فوراً.' },
      { q: 'ماذا لو وصلني منتج مخالف؟', a: 'تواصل مع المتجر مباشرة عبر واتساب من صفحة الطلب، أو قدّم شكوى من صفحة «الشكاوى» — تتابعها إدارة المنصة حتى الحل.' },
      { q: 'هل يمكنني تقييم متجر؟', a: 'نعم — بعد اكتمال طلبك تظهر لك دعوة التقييم في حسابك. التقييمات المرتبطة بطلبات فعلية تحمل شارة «مشترٍ موثّق ✓».' },
    ],
  },
  {
    group: 'عام', icon: '💡',
    items: [
      { q: 'هل المنصة يمنية؟', a: 'نعم — يمن زون صُممت للسوق اليمني: المحافظات، الريال اليمني، واتساب، وبوابات الدفع المحلية.' },
      { q: 'هل بياناتي آمنة؟', a: 'كلمات المرور مشفّرة بتقنية Argon2، وأسرار الدفع مشفّرة بـ AES-256، والمصادقة الثنائية متاحة لحسابات الإدارة. لا نشارك بياناتك مع أي طرف.' },
    ],
  },
];

export default function FaqPage() {
  const all = FAQS.flatMap((g) => g.items);
  // 🎯 بيانات منظمة FAQPage — تظهر كأسئلة غنية في نتائج جوجل
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: all.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <main className="min-h-screen pb-24 pt-24 px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-2xl mx-auto text-center mb-8">
        <span className="inline-block glass px-4 py-1.5 rounded-full text-sm font-bold text-gray-500 mb-3">❓ مركز الإجابات</span>
        <h1 className="text-3xl md:text-4xl font-black mb-2">الأسئلة الشائعة</h1>
        <p className="text-gray-500">كل ما يدور في ذهنك — مجاباً عليه بصراحة</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-8">
        {FAQS.map((g) => (
          <section key={g.group}>
            <Reveal>
              <h2 className="font-black text-lg mb-3 flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: 'rgba(108,61,245,.12)' }}>{g.icon}</span>
                {g.group}
              </h2>
            </Reveal>
            <FaqAccordion items={g.items} />
          </section>
        ))}
      </div>

      <div className="max-w-2xl mx-auto mt-10">
        <Reveal>
          <div className="bg-night rounded-3xl p-6 text-white text-center relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-28 h-28 anim-blob opacity-20" style={{ background: 'var(--primary)' }} />
            <h2 className="font-black text-lg relative mb-2">لم تجد إجابتك؟ 🤔</h2>
            <p className="text-gray-400 text-sm mb-4 relative">فريقنا يسعد بمساعدتك مباشرة</p>
            <Link href="/help" className="btn-primary btn-shine inline-block text-white font-extrabold px-8 py-3 rounded-full relative">
              💬 مركز المساعدة
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
