import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import { CountUpStat, TestimonialsMarquee } from '@/components/info/InfoWidgets';

import { SERVER_API as API, serverCurSymbols } from '@/lib/server-api';
import { offerLeftText } from '@/lib/offer';

export const metadata: Metadata = {
  title: 'كيف تبدأ متجرك — يمن زون',
  description: 'أنشئ متجرك الإلكتروني في 4 خطوات: سجّل، جهّز متجرك بالذكاء، أضف منتجاتك، وشارك رابطك — مجاناً ومن جوالك.',
  keywords: ['متجر إلكتروني اليمن', 'إنشاء متجر مجاني', 'يمن زون', 'تجارة إلكترونية يمنية', 'بيع أونلاين اليمن', 'متجر من الجوال'],
  openGraph: {
    title: 'ابدأ متجرك الإلكتروني في يوم واحد — يمن زون',
    description: 'بلا برمجة وبلا رأس مال تقني: سجّل برقم جوالك، جهّز متجرك بالذكاء، وشارك رابطك — مجاناً.',
    type: 'website',
  },
};

async function getData() {
  try {
    const [spot, testi, plans] = await Promise.all([
      fetch(`${API}/api/v1/home/spotlight`, { next: { revalidate: 300 } }).then((r) => r.json()),
      fetch(`${API}/api/v1/home/testimonials`, { next: { revalidate: 300 } }).then((r) => r.json()),
      fetch(`${API}/api/v1/plans`, { next: { revalidate: 300 } }).then((r) => r.json()),
    ]);
    return {
      stats: spot?.stats || null,
      testimonials: Array.isArray(testi) ? testi : [],
      plans: Array.isArray(plans?.plans) ? plans.plans : [],
    };
  } catch { return { stats: null, testimonials: [], plans: [] }; }
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
  { icon: '📊', t: 'تقرير أسبوعي ذكي', d: 'ملخص مبيعاتك ونموّك ونصيحة تصلك كل أسبوع' },
  { icon: '🎭', t: 'ثيمات جاهزة', d: '4 إطلالات مصممة + ترتيب أقسام بالسحب' },
  { icon: '⏸️', t: 'إغلاق مؤقت بضغطة', d: 'في إجازة؟ أوقف الطلبات مؤقتاً دون أن تفقد متجرك' },
  { icon: '💳', t: 'طرق دفع وتوصيل خاصة', d: 'حدّد حساباتك ورسومك بنفسك' },
  { icon: '⭐', t: 'تقييمات بمشترٍ موثّق', d: 'شارة ✅ للتقييمات المرتبطة بطلبات فعلية' },
  { icon: '🎧', t: 'دعم فني مباشر', d: 'راسل إدارة المنصة من لوحتك ويصلك الرد' },
  { icon: '👑', t: 'خطة ذهبية', d: 'بنرات داخل متجرك + تطبيق ويب باسمك' },
];

const FAQS = [
  { q: 'هل أحتاج خبرة برمجية أو كمبيوتر؟', a: 'أبداً — كل شيء يعمل من جوالك: التسجيل، إضافة المنتجات، استقبال الطلبات، وحتى تخصيص شكل متجرك. المعالج الذكي يجهّز لوحتك تلقائياً حسب نوع نشاطك.' },
  { q: 'كيف يدفع لي العملاء؟', a: 'أنت تحدد طرق الدفع التي تناسبك (حساباتك البنكية أو المحافظ المحلية أو الدفع عند الاستلام)، وتظهر لعملائك عند إتمام الطلب — وتصلك الأرباح في محفظتك داخل المنصة بكشف موثّق.' },
  { q: 'متجري ليس منتجات — فندق أو إيجارات أو خدمات؟', a: 'يمن زون يدعم أنشطة متعددة: متاجر المنتجات، المطاعم، الفنادق (غرف وحجوزات)، معارض الإيجارات، ومراكز الخدمات — كل نشاط له لوحته وأدواته الخاصة.' },
  { q: 'هل أستطيع التوقف مؤقتاً دون إغلاق متجري؟', a: 'نعم — بضغطة واحدة من الإعدادات تفعّل «الإغلاق المؤقت»: يبقى متجرك ظاهراً للزوار مع لافتة توضيحية، ويتوقف استقبال الطلبات حتى تعود.' },
  { q: 'كم يكلفني البدء؟', a: 'البدء مجاني — أنشئ متجرك وأضف منتجاتك واستقبل طلباتك دون أي التزام. وعندما تكبر تجارتك، رقِّ لباقة أوسع بالمزايا التي تحتاجها.' },
];

// 🚀 كيف تبدأ متجرك — خطوات بصرية + مزايا + آراء حقيقية
export default async function StartPage() {
  const SYMS = await serverCurSymbols();
  const dsym = (code?: string) => SYMS[String(code || 'YER').toUpperCase()] || code || 'ر.ي';
  const { stats, testimonials, plans } = await getData();

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

      {/* 💎 الباقات — أسعار حقيقية من إدارة المنصة */}
      {plans.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 pb-14">
          <Reveal><h2 className="text-2xl md:text-3xl font-black text-center mb-2">باقات تنمو معك 💎</h2></Reveal>
          <Reveal><p className="text-center text-gray-500 text-sm mb-8">ابدأ مجاناً ورقِّ متى احتجت — الأسعار من إدارة المنصة مباشرة</p></Reveal>
          <div className="text-center mb-6">
            <Link href="/plans" className="text-xs font-black hover:underline" style={{ color: 'var(--primary)' }}>
              ⚖️ قارن الباقات ميزة بميزة
            </Link>
          </div>
          <div className={`grid gap-3 ${plans.length === 1 ? 'max-w-xs mx-auto' : plans.length === 2 ? 'grid-cols-2 max-w-lg mx-auto' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {plans.map((p: any, i: number) => {
              const monthly = Number(p.priceMonthly);
              const yearly = p.priceYearly !== null && p.priceYearly !== undefined ? Number(p.priceYearly) : null;
              const highlight = i === Math.min(1, plans.length - 1);
              return (
                <Reveal key={p.id} delay={i * 80}>
                  <div className={`rounded-3xl p-5 h-full text-center card-hover ${highlight ? 'gradient-border' : 'glass'}`}>
                    <div className={highlight ? 'bg-night rounded-[calc(1.5rem-2px)] p-5 -m-3 text-white' : ''}>
                      <h3 className="font-black text-lg">{p.name}</h3>
                      {p.offerBadge && Number(p.priceBefore) > monthly && (
                        <div className="mt-2 space-y-1">
                          <span className="inline-block text-[11px] font-black text-amber-950 bg-gradient-to-l from-amber-300 to-amber-400 rounded-full px-3 py-1 anim-soft-pulse">{p.offerBadge}</span>
                          <div className="text-xs font-bold text-gray-400"><s>{Number(p.priceBefore).toLocaleString('en-US')} {dsym(p.currency)}</s></div>
                        </div>
                      )}
                      <div className="mt-2">
                        {monthly === 0 ? (
                          <div className="text-3xl font-black text-emerald-500">مجاناً 🎁</div>
                        ) : (
                          <div className="text-3xl font-black" style={highlight ? {} : { color: 'var(--primary)' }}>
                            {monthly.toLocaleString('en-US')} <span className="text-xs font-bold opacity-70">{dsym(p.currency)}/شهر</span>
                          </div>
                        )}
                        {offerLeftText(p.offerEndsAt) && monthly > 0 && (
                          <div className="text-[11px] font-black text-red-500 mt-1">{offerLeftText(p.offerEndsAt)}</div>
                        )}
                        {yearly !== null && yearly > 0 && (
                          <div className={`text-[11px] font-bold mt-1 ${highlight ? 'text-amber-300' : 'text-amber-600'}`}>
                            أو {yearly.toLocaleString('en-US')} {dsym(p.currency)}/سنة — وفّر {Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100))}% 🔥
                          </div>
                        )}
                      </div>
                      <Link href="/auth/seller-register"
                        className={`mt-4 inline-block w-full py-2.5 rounded-full text-sm font-extrabold ${highlight ? 'btn-primary btn-shine text-white' : 'border-2'}`}
                        style={highlight ? {} : { borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                        {monthly === 0 ? '🚀 ابدأ مجاناً' : '✨ اختر هذه الباقة'}
                      </Link>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* ❓ أسئلة شائعة — إجابات مباشرة تزيل التردد */}
      <section className="max-w-3xl mx-auto px-4 pb-14">
        <Reveal><h2 className="text-2xl md:text-3xl font-black text-center mb-8">أسئلة تدور في ذهنك 🤔</h2></Reveal>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={i} delay={i * 60}>
              <details className="glass rounded-2xl px-5 py-4 group card-hover">
                <summary className="font-extrabold text-sm cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>{f.q}</span>
                  <span className="text-lg transition-transform group-open:rotate-45 shrink-0" style={{ color: 'var(--primary)' }}>+</span>
                </summary>
                <p className="text-xs text-gray-500 leading-6 mt-3">{f.a}</p>
              </details>
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
