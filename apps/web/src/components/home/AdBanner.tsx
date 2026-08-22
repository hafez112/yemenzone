'use client';
import { useEffect, useState } from 'react';
import { imgUrl } from '@/lib/api';

// 📐 نسب الأبعاد حسب حجم الإعلان — يحددها المدير من إدارة الإعلانات
const ASPECT: Record<string, string> = {
  hero: 'aspect-[21/9] sm:aspect-[21/7]',
  wide: 'aspect-[16/7] sm:aspect-[16/6]',
  banner: 'aspect-[3/1]',
  square: 'aspect-square',
};

// ═══ بانر إعلانات الرئيسية السينمائي — يُغذّى من إدارة الإعلانات ═══
// حركة كن-برنز بطيئة + تناوب تلقائي + عنوان متحرك + وميض لمعان
export default function AdBanner({ ads, compact = false }: { ads: any[]; compact?: boolean }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const list = (ads || []).slice(0, compact ? 3 : 5);

  // 🎞️ تناوب تلقائي كل 5 ثوانٍ — يتوقف بلمسة الزائر
  useEffect(() => {
    if (list.length < 2 || paused) return;
    const t = setInterval(() => setActive((i) => (i + 1) % list.length), 5000);
    return () => clearInterval(t);
  }, [list.length, paused]);

  if (!list.length) return null;

  function open(ad: any) {
    // تسجيل النقرة دون حجب الانتقال — قاعدة API نفسها المستخدمة في كل الموقع
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${base}/api/v1/ads/${ad.id}/click`, { method: 'POST' }).catch(() => {});
    if (ad.link) window.open(ad.link, '_blank', 'noopener');
  }

  // إعلان واحد مربّع أو أكثر — شبكة؛ غير ذلك عرض شرائح سينمائي
  const hasSquare = list.some((a) => a.size === 'square');
  if (hasSquare) {
    return (
      <section className="max-w-6xl mx-auto px-3 py-3">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {list.map((ad: any) => (
            <button key={ad.id} onClick={() => open(ad)}
              className="relative rounded-3xl overflow-hidden shadow-lg card-hover text-right w-full group aspect-square">
              <img src={imgUrl(ad.image)} alt={ad.title} loading="lazy" decoding="async"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <span className="absolute bottom-0 right-0 p-3 text-white font-extrabold text-xs drop-shadow">{ad.title}</span>
              <span className="absolute top-2 left-2 text-[9px] font-bold bg-black/40 text-white/80 px-2 py-0.5 rounded-full">إعلان</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const ad = list[active % list.length];

  return (
    <section className="max-w-6xl mx-auto px-3 py-3"
      onPointerDown={() => setPaused(true)}>
      <div className={`relative rounded-3xl overflow-hidden shadow-xl w-full text-right group ${
        compact ? 'aspect-[3/1]' : (ASPECT[ad.size] || ASPECT.wide)
      }`}>
        {/* الشرائح — كلها مركّبة والنشطة تظهر بتلاشٍ + زووم كن-برنز */}
        {list.map((a: any, i: number) => (
          <div key={a.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === active ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
            <img src={imgUrl(a.image)} alt={a.title} loading={i === 0 ? 'eager' : 'lazy'} decoding="async"
              className={`absolute inset-0 w-full h-full object-cover ${i === active ? 'ad-kenburns' : ''}`} />
          </div>
        ))}

        {/* تدرّج قراءة + وميض لمعان يمر كل بضع ثوانٍ */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
          <div className="ad-shine absolute inset-y-0 w-1/3 bg-gradient-to-l from-transparent via-white/15 to-transparent" />
        </div>

        {/* المحتوى — عنوان وسطر ثانٍ ودعوة، تنزلق عند تغيّر الشريحة */}
        <button onClick={() => open(ad)} className="absolute inset-0 z-30 w-full h-full text-right">
          <div key={ad.id} className="absolute bottom-0 right-0 left-0 p-4 sm:p-6">
            <h3 className="ad-slidein text-white font-black text-base sm:text-2xl drop-shadow-lg leading-snug">
              {ad.title}
            </h3>
            {ad.subtitle && !compact && (
              <p className="ad-slidein text-white/85 text-[11px] sm:text-sm font-bold mt-1.5 drop-shadow leading-relaxed"
                style={{ animationDelay: '.15s' }}>
                {ad.subtitle}
              </p>
            )}
            {ad.link && (
              <span className="ad-slidein inline-flex items-center gap-1.5 mt-3 text-[11px] sm:text-xs font-extrabold bg-white text-gray-900 px-4 py-2 rounded-full shadow-lg"
                style={{ animationDelay: '.3s' }}>
                اضغط للتفاصيل <span aria-hidden>←</span>
              </span>
            )}
          </div>
        </button>

        <span className="absolute top-3 left-3 z-30 text-[9px] font-bold bg-black/45 text-white/85 px-2.5 py-1 rounded-full backdrop-blur">
          إعلان
        </span>

        {/* نقاط التنقل */}
        {list.length > 1 && (
          <div className="absolute bottom-3 left-4 z-30 flex items-center gap-1.5">
            {list.map((_: any, i: number) => (
              <button key={i} aria-label={`إعلان ${i + 1}`}
                onClick={(e) => { e.stopPropagation(); setActive(i); }}
                className={`rounded-full transition-all duration-500 ${
                  i === active ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`} />
            ))}
          </div>
        )}
      </div>

      {/* حركات الإعلانات — معرفة هنا لتبقى محلية المكوّن */}
      <style jsx global>{`
        @keyframes adKenburns { from { transform: scale(1) translateX(0); } to { transform: scale(1.12) translateX(-1.5%); } }
        .ad-kenburns { animation: adKenburns 7s ease-out forwards; }
        @keyframes adShine { 0%, 55% { transform: translateX(220%); } 100% { transform: translateX(-220%); } }
        .ad-shine { animation: adShine 5.5s ease-in-out infinite; }
        @keyframes adSlidein { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .ad-slidein { animation: adSlidein .7s cubic-bezier(.2,.7,.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .ad-kenburns, .ad-shine, .ad-slidein { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
