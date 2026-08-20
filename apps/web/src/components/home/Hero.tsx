'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { imgUrl } from '@/lib/api';

// 🎬 قسم البطل السينمائي — بحث حي باقتراحات فورية + إحصاءات حقيقية من قاعدة البيانات
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / 1200, 1);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to]);
  return <>{v.toLocaleString()}{suffix}</>;
}

const KINDS = [
  { href: '/stores', icon: '🛍️', label: 'تسوّق المتاجر' },
  { href: '/explore', icon: '🧭', label: 'استكشاف' },
  { href: '/offers', icon: '🔥', label: 'العروض' },
  { href: '/nearby', icon: '📍', label: 'القريب منك' },
  { href: '/tools', icon: '🧰', label: 'خدمات مجانية' },
];

export default function Hero({ platform, stats }: { platform: any; stats: any }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sugg, setSugg] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<any>(null);

  // ⚡ اقتراحات فورية أثناء الكتابة (مهدّدة 250ms)
  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setSugg(null); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/search/suggest?q=${encodeURIComponent(q.trim())}`);
        setSugg(await r.json());
        setOpen(true);
      } catch { setSugg(null); }
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  // إغلاق الاقتراحات عند النقر خارجاً
  useEffect(() => {
    const onDoc = (e: any) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const go = (term?: string) => {
    const t = (term ?? q).trim();
    if (t.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  const statItems = [
    { n: stats?.stores ?? 0, l: 'متجر نشط', suffix: '' },
    { n: stats?.products ?? 0, l: 'منتج معروض', suffix: '' },
    { n: stats?.orders ?? 0, l: 'طلب ناجح', suffix: '' },
  ];

  return (
    <section className="relative min-h-[94vh] flex items-center justify-center overflow-hidden pt-14 bg-night">
      {/* 🌌 طبقات سينمائية */}
      <div className="absolute inset-0 bg-aurora opacity-60" />
      <div className="absolute -top-24 -right-24 w-96 h-96 anim-blob opacity-25"
        style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }} />
      <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] anim-blob opacity-20"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--primary))', animationDelay: '-4s' }} />
      <div className="absolute top-1/3 left-1/4 w-52 h-52 anim-blob opacity-15"
        style={{ background: 'linear-gradient(135deg, #F59E0B, #EC4899)', animationDelay: '-7s' }} />
      <div className="absolute inset-0 bg-grid opacity-[.15] pointer-events-none" />
      {/* ✨ جسيمات عائمة */}
      <div className="absolute inset-0 pointer-events-none">
        {['12%', '28%', '45%', '63%', '78%', '90%'].map((left, i) => (
          <span key={i} className="hero-particle" style={{ left, animationDelay: `${i * 2.3}s`, animationDuration: `${9 + i * 1.7}s` }} />
        ))}
      </div>

      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto w-full">
        <span className="inline-block glass-dark px-4 py-1.5 rounded-full text-sm font-bold text-gray-300 mb-5 anim-bobble">
          ✨ المنصة اليمنية الأولى للتجارة الإلكترونية
        </span>
        <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4 text-white">
          تسوّق من متاجر يمنية
          <br /><span className="grad-text-animated">موثوقة ومحلية</span> 🛍️
        </h1>
        <p className="text-gray-400 text-lg md:text-xl mb-7 max-w-xl mx-auto">
          {platform?.tagline || 'منتجات، إيجارات، فنادق، خدمات — كل ما تحتاجه في مكان واحد'}
        </p>

        {/* 🔍 البحث الحي */}
        <div ref={boxRef} className="relative max-w-xl mx-auto mb-6">
          <div className="glass-dark rounded-2xl flex items-center gap-2 p-2 pr-4 shadow-2xl border border-white/15">
            <span className="text-xl shrink-0">{searching ? '⏳' : '🔍'}</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => sugg && setOpen(true)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
              placeholder="ابحث عن منتج أو متجر… جرّب: عسل، جوالات، فساتين"
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-500 text-sm py-2"
            />
            <button onClick={() => go()}
              className="btn-primary btn-shine text-white font-extrabold px-5 py-2.5 rounded-xl text-sm shrink-0">
              بحث
            </button>
          </div>

          {/* قائمة الاقتراحات */}
          {open && sugg && (sugg.products.length > 0 || sugg.stores.length > 0) && (
            <div className="absolute top-full mt-2 inset-x-0 glass-dark rounded-2xl p-2 text-right shadow-2xl border border-white/15 z-30 anim-bounce-in max-h-80 overflow-y-auto">
              {sugg.stores.map((s: any) => (
                <Link key={s.id} href={`/store/${s.slug}`} onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/10 transition-all">
                  <div className="w-9 h-9 rounded-xl skeleton shrink-0 flex items-center justify-center text-base"
                    style={s.logo ? { background: `url(${imgUrl(s.logo)}) center/cover`, animation: 'none' } : {}}>
                    {!s.logo && (s.type?.icon || '🏪')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{s.name} {s.isVerified && '✅'}</div>
                    <div className="text-[10px] text-gray-400">متجر</div>
                  </div>
                  <span className="text-gray-500 text-xs">←</span>
                </Link>
              ))}
              {sugg.products.map((p: any) => (
                <Link key={p.id} href={`/store/${p.store.slug}/product/${p.id}`} onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/10 transition-all">
                  <div className="w-9 h-9 rounded-xl skeleton shrink-0 flex items-center justify-center text-base"
                    style={p.images?.[0] ? { background: `url(${imgUrl(p.images[0])}) center/cover`, animation: 'none' } : {}}>
                    {!p.images?.[0] && '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{p.name}</div>
                    <div className="text-[10px] text-teal-300 font-bold">
                      {Number(p.salePrice || p.price).toLocaleString()} ر.ي
                      {p.salePrice && <span className="text-gray-500 line-through font-normal mr-1.5">{Number(p.price).toLocaleString()}</span>}
                    </div>
                  </div>
                  <span className="text-gray-500 text-xs">←</span>
                </Link>
              ))}
              <button onClick={() => go()} className="w-full text-center text-xs font-bold text-purple-300 py-2 hover:text-white transition-all">
                عرض كل نتائج «{q}» 🔍
              </button>
            </div>
          )}
        </div>

        {/* تصنيفات سريعة */}
        <div className="flex flex-wrap gap-2 justify-center mb-9">
          {KINDS.map((k) => (
            <Link key={k.label} href={k.href}
              className="glass-dark px-4 py-2 rounded-full text-sm font-bold text-gray-300 hover:text-white hover:border-white/25 border border-white/10 transition-all">
              {k.icon} {k.label}
            </Link>
          ))}
        </div>

        {/* 📊 إحصاءات حقيقية — من قاعدة البيانات مباشرة */}
        <div className="flex justify-center gap-8 md:gap-12">
          {statItems.map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-2xl md:text-3xl font-black grad-text">
                {s.n ? <CountUp to={s.n} suffix={s.suffix} /> : '—'}
              </div>
              <div className="text-xs text-gray-500 font-bold">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link href="/auth/seller-register"
            className="text-gray-400 text-sm font-bold hover:text-white transition-all border-b border-dashed border-gray-600 pb-0.5">
            تاجر؟ أنشئ متجرك مجاناً في دقيقتين ←
          </Link>
        </div>
      </div>
    </section>
  );
}
