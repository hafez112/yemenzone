import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/Reveal';

import { SERVER_API as API } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'مركز المساعدة — يمن زون',
  description: 'مركز مساعدة يمن زون: أدلة سريعة، تتبع الطلبات والشكاوى، وقنوات التواصل المباشر مع فريق المنصة.',
};

async function getPlatform() {
  try {
    const t = await fetch(`${API}/api/v1/theme`, { next: { revalidate: 300 } }).then((r) => r.json());
    return t?.platform || {};
  } catch { return {}; }
}

// 💬 مركز المساعدة — كل الطرق تؤدي للحل
export default async function HelpPage() {
  const platform = await getPlatform();
  const wa = platform.whatsapp ? `https://wa.me/${String(platform.whatsapp).replace(/[^0-9]/g, '')}` : null;

  const CARDS = [
    { href: '/faq', icon: '❓', t: 'الأسئلة الشائعة', d: 'إجابات فورية عن أكثر ما يُسأل', c: 'linear-gradient(135deg,#6C3DF5,#4F46E5)' },
    { href: '/track', icon: '🔍', t: 'تتبع طلبك', d: 'رقم الطلب + جوالك = حالة لحظية', c: 'linear-gradient(135deg,#0d9488,#059669)' },
    { href: '/complaint', icon: '📣', t: 'قدّم شكوى', d: 'واجهتك مشكلة؟ نتابعها حتى الحل', c: 'linear-gradient(135deg,#dc2626,#ea580c)' },
    { href: '/complaint/track', icon: '📩', t: 'تابع شكواك', d: 'حالة شكواك المفتوحة أولاً بأول', c: 'linear-gradient(135deg,#d97706,#f59e0b)' },
    { href: '/start', icon: '🚀', t: 'دليل بدء البيع', d: 'من التسجيل إلى أول طلب في 4 خطوات', c: 'linear-gradient(135deg,#0891b2,#22d3ee)' },
    { href: '/stores', icon: '🛍️', t: 'دليل المتاجر', d: 'تصفح المتاجر الموثوقة بالفلاتر', c: 'linear-gradient(135deg,#db2777,#ec4899)' },
  ];

  return (
    <main className="min-h-screen pb-24">
      <section className="relative overflow-hidden bg-night bg-aurora pt-28 pb-14 px-4 text-center text-white">
        <div className="absolute -top-16 -left-16 w-64 h-64 anim-blob opacity-20" style={{ background: 'var(--secondary)' }} />
        <div className="relative max-w-xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-black mb-3">كيف نقدر نساعدك؟ 💜</h1>
          <p className="text-gray-400">أدلة، تتبع، شكاوى، وتواصل مباشر — كلها هنا</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 -mt-7 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.href} delay={i * 60}>
              <Link href={c.href}
                className="block rounded-3xl p-4 text-white h-full shadow-lg transition-all hover:-translate-y-1"
                style={{ background: c.c }}>
                <div className="text-2xl mb-2">{c.icon}</div>
                <div className="font-black text-sm mb-0.5">{c.t}</div>
                <div className="text-[11px] opacity-85 leading-relaxed">{c.d}</div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* التواصل المباشر — بيانات حقيقية من إعدادات المنصة */}
      <section className="max-w-2xl mx-auto px-4 mt-12">
        <Reveal>
          <div className="glass rounded-3xl p-6 text-center">
            <h2 className="font-black text-lg mb-1">تحتاج بشراً؟ 🙋</h2>
            <p className="text-sm text-gray-500 mb-5">فريق دعم يمن زون يرد عليك بنفسه</p>
            <div className="flex gap-3 justify-center flex-wrap">
              {wa && (
                <a href={wa} target="_blank"
                  className="px-6 py-3 rounded-full text-white font-extrabold shadow-lg flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                  💬 واتساب الدعم
                </a>
              )}
              {platform.email && (
                <a href={`mailto:${platform.email}`}
                  className="px-6 py-3 rounded-full glass-strong font-extrabold text-gray-700 flex items-center gap-2">
                  📧 {platform.email}
                </a>
              )}
              {!wa && !platform.email && (
                <p className="text-sm text-gray-400">قنوات التواصل تُضبط من إدارة المنصة — جرّب الشكاوى حالياً</p>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      {/* أدلة سريعة */}
      <section className="max-w-2xl mx-auto px-4 mt-10">
        <Reveal><h2 className="font-black text-lg mb-4">⚡ أدلة سريعة</h2></Reveal>
        <div className="space-y-3">
          {[
            { icon: '🛒', t: 'أطلب كزائر أو بحساب', d: 'التسوق لا يتطلب حساباً — لكن الحساب يفتح لك التتبع الحي، النقاط، وإعادة الطلب بضغطة.' },
            { icon: '🎁', t: 'اكسب نقاطاً بالدعوة', d: 'شارك رابط دعوتك من حسابك — كل صديق يسجّل يكسبكما نقاط تُستبدل بخصومات.' },
            { icon: '🏪', t: 'بائع جديد؟', d: 'ابدأ من صفحة «كيف تبدأ» ثم فعّل التوثيق لتحصل على شارة ✅ التي ترفع مبيعاتك.' },
          ].map((g, i) => (
            <Reveal key={g.t} delay={i * 70}>
              <div className="glass rounded-2xl p-4 flex gap-3 card-hover">
                <span className="text-2xl shrink-0">{g.icon}</span>
                <div>
                  <div className="font-extrabold text-sm mb-0.5">{g.t}</div>
                  <p className="text-xs text-gray-500 leading-relaxed">{g.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
