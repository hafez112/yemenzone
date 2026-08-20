import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import { CountUpStat, TestimonialsMarquee } from '@/components/info/InfoWidgets';

import { SERVER_API as API } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'كيف تبدأ متجرك — يمن زون',
  description: 'أنشئ متجرك الإلكتروني في 4 خطوات: سجّل، جهّز متجرك بالذكاء، أضف منتجاتك، وشارك رابطك — مجاناً ومن جوالك.',
};

async function getData() {
  try {
    const [spot, testi] = await Promise.all([
      fetch(`${API}/api/v1/home/spotlight`, { next: { revalidate: 300 } }).then((r) => r.json()),
      fetch(`${API}/api/v1/home/testimonials`, { next: { revalidate: 300 } }).then((r) => r.json()),
    ]);
    return { stats: spot?.stats || null, testimonials: Array.isArray(testi) ? testi : [] };
  } catch { return { stats: null, testimonials: [] }; }
}

const STEPS = [
  { n: '1', icon: '📱', t: 'سجّل حسابك', d: 'برقم جوالك فقط — دقيقة واحدة وتدخل لوحة تحكمك', c: '#6C3DF5' },
  { n: '2', icon: '🤖', t: 'جهّز متجرك بالذكاء', d: 'اختر نوع نشاطك (منتجات/إيجارات/فنادق/خدمات) والمعالج الذكي يبني لوحتك تلقائياً', c: '#0d9488' },
  { n: '3', icon: '📦', t: 'أضف منتجاتك', d: 'صور، أسعار، مخزون — أو استوردها دفعة واحدة من Excel', c: '#f59e0b' },
  { n: '4', icon: '🚀', t: 'شارك رابطك وابدأ البيع', d: 'رابط خاص بمتجرك + QR جاهز — انشره في واتساب واستقبل الطلبات', c: '#dc2626' },
];

const SELLER_FEATURES = [
  { icon: '🛒', t: 'إدارة طلبات كاملة', d: 'من الاستلام حتى التسليم — بضغطة' },
  { icon: '💰', t: 'محفظة وكشوفات', d: 'أرباحك وحركاتك موثّقة لحظياً' },
  { icon: '📊', t: 'تحليلات ومساعد نمو', d: 'ساعات الذروة، راكد المنتجات، تسعير السوق' },
  { icon: '🎭', t: 'ثيمات جاهزة', d: '4 إطلالات مصممة + ترتيب أقسام بالسحب' },
  { icon: '💳', t: 'طرق دفع وتوصيل خاصة', d: 'حدّد حساباتك ورسومك بنفسك' },
  { icon: '👑', t: 'خطة ذهبية', d: 'بنرات داخل متجرك + تطبيق ويب باسمك' },
];

// 🚀 كيف تبدأ متجرك — خطوات بصرية + مزايا + آراء حقيقية
export default async function StartPage() {
  const { stats, testimonials } = await getData();

  return (
    <main className="min-h-screen pb-24">
      {/* البطل */}
      <section className="relative overflow-hidden bg-night pt-28 pb-16 px-4 text-center text-white">
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="absolute -top-20 right-10 w-72 h-72 anim-blob opacity-20" style={{ background: 'var(--primary)' }} />
        <div className="relative max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-black mb-4">من الفكرة إلى أول طلب<br /><span className="grad-text-animated">في يوم واحد</span> ⚡</h1>
          <p className="text-gray-400 text-lg">بلا برمجة، بلا رأس مال تقني — جوالك يكفي</p>
        </div>
      </section>

      {/* الخطوات */}
      <section className="max-w-3xl mx-auto px-4 py-14">
        <div className="relative">
          {/* الخط العمودي */}
          <div className="absolute right-7 top-4 bottom-4 w-1 rounded-full opacity-15" style={{ background: 'var(--primary)' }} />
          <div className="space-y-5">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="flex gap-4 items-start relative">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white font-black shadow-xl shrink-0 relative z-10"
                    style={{ background: `linear-gradient(135deg, ${s.c}, ${s.c}cc)` }}>
                    {s.icon}
                  </div>
                  <div className="glass rounded-3xl p-5 flex-1 card-hover">
                    <div className="text-[10px] font-black mb-0.5" style={{ color: s.c }}>الخطوة {s.n}</div>
                    <h3 className="font-black text-lg mb-1">{s.t}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{s.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* مزايا البائع */}
      <section className="max-w-4xl mx-auto px-4 pb-14">
        <Reveal><h2 className="text-2xl md:text-3xl font-black text-center mb-8">كل ما يحتاجه تجارتك — مدمجاً 🧰</h2></Reveal>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SELLER_FEATURES.map((f, i) => (
            <Reveal key={f.t} delay={i * 60}>
              <div className="glass rounded-3xl p-4 h-full card-hover">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h3 className="font-black text-sm mb-1">{f.t}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* شريط الثقة — أرقام وآراء حقيقية */}
      <section className="py-10 bg-night/95 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4">
          <Reveal>
            <h2 className="text-2xl font-black text-center text-white mb-2">مجتمع يكبر كل يوم 💜</h2>
            <p className="text-center text-gray-400 text-sm mb-6">أرقام وآراء حقيقية — من قاعدة بيانات المنصة مباشرة</p>
          </Reveal>
          {stats && (
            <div className="grid grid-cols-3 gap-3 mb-8">
              <CountUpStat to={stats.stores} icon="🏪" label="متجر" />
              <CountUpStat to={stats.products} icon="📦" label="منتج" />
              <CountUpStat to={stats.orders} icon="🎉" label="طلب ناجح" />
            </div>
          )}
        </div>
        {testimonials.length > 0 && <TestimonialsMarquee items={testimonials} />}
      </section>

      {/* CTA نهائي */}
      <section className="max-w-2xl mx-auto px-4 pt-14 text-center">
        <Reveal>
          <div className="gradient-border rounded-3xl">
            <div className="bg-night rounded-[calc(1.5rem-2px)] p-8 text-white">
              <h2 className="text-2xl font-black mb-2">متجرك القادم يبدأ الآن 🚀</h2>
              <p className="text-gray-400 text-sm mb-6">مجاني للبدء — لا بطاقة ولا التزام</p>
              <Link href="/auth/seller-register"
                className="btn-primary btn-shine inline-block text-white font-extrabold px-10 py-4 rounded-full text-lg anim-pulse-glow">
                🏪 أنشئ متجري مجاناً
              </Link>
              <div className="mt-4 text-xs text-gray-500">
                عندك سؤال؟ <Link href="/faq" className="font-bold text-purple-300 hover:underline">الأسئلة الشائعة</Link> · <Link href="/help" className="font-bold text-purple-300 hover:underline">مركز المساعدة</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
