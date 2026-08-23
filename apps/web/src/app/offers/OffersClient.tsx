'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';

// 🔥 عروض اليوم — العرض التفاعلي: عداد منتصف الليل + فلترة بالمحافظة + فرز + مشاركة
export default function OffersClient({ data }: { data: { items: any[]; stats: any } }) {
  const { list } = useCurrency();
  const psym = (code?: string) => list.find((c) => c.code === String(code || 'YER').toUpperCase())?.symbol || code || 'ر.ي';
  const [gov, setGov] = useState('');
  const [sort, setSort] = useState<'discount' | 'price' | 'new'>('discount');
  const [left, setLeft] = useState('');

  // ⏳ عدّاد حتى منتصف الليل — عروض اليوم تتجدد
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const mid = new Date(now); mid.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((mid.getTime() - now.getTime()) / 1000));
      const hh = String(Math.floor(s / 3600)).padStart(2, '0');
      const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      setLeft(`${hh}:${mm}:${ss}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const govs = useMemo(
    () => [...new Set(data.items.map((p: any) => p.store?.governorate).filter(Boolean))] as string[],
    [data],
  );

  const items = useMemo(() => {
    let list = data.items;
    if (gov) list = list.filter((p: any) => p.store?.governorate === gov);
    const arr = [...list];
    if (sort === 'price') arr.sort((a, b) => Number(a.salePrice) - Number(b.salePrice));
    else if (sort === 'new') arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return arr;
  }, [data, gov, sort]);

  const share = () => {
    const url = location.origin + '/offers';
    const text = `🔥 عروض اليوم في يمن زون — ${data.stats.count} منتج مخفّض يصل الخصم إلى ${data.stats.maxDiscount}%`;
    if (navigator.share) navigator.share({ title: 'عروض اليوم', text, url }).then(() => toast('📤 تمت المشاركة')).catch(() => {});
    else navigator.clipboard.writeText(`${text}\n${url}`).then(() => toast('📋 نُسخ رابط العروض — شاركه')).catch(() => toast('تعذّر', 'error'));
  };

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
      <div className="max-w-6xl mx-auto">
        {/* ترويسة العروض + عداد */}
        <div className="rounded-3xl p-6 mb-4 text-white relative overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #dc2626, #f59e0b)' }}>
          <div className="absolute -top-8 -left-8 w-32 h-32 anim-blob opacity-20 bg-white" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-1"><span className="section-chip">🔥</span><h1 className="f-2xl font-black">عروض اليوم</h1></div>
                <p className="text-sm opacity-90">
                  {data.stats.count} منتج مخفّض الآن
                  {data.stats.maxDiscount > 0 && <> — وفّر حتى <b className="text-lg">{data.stats.maxDiscount}%</b></>}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold opacity-80 mb-1">⏳ تتجدد خلال</p>
                <p className="font-black text-2xl tabular-nums bg-black/20 rounded-xl px-3 py-1" dir="ltr">{left || '…'}</p>
              </div>
            </div>
            <button onClick={share} className="mt-3 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-xs font-extrabold transition-colors">
              📤 شارك صفحة العروض
            </button>
          </div>
        </div>

        {/* الفلاتر */}
        {data.items.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4 items-center">
            <button onClick={() => setGov('')}
              className={`px-3.5 py-2 rounded-full text-xs font-extrabold transition-all ${!gov ? 'bg-red-600 text-white shadow' : 'bg-white border border-red-100 text-gray-600'}`}>
              كل المحافظات
            </button>
            {govs.map((g) => (
              <button key={g} onClick={() => { setGov(gov === g ? '' : g); toast(gov === g ? 'كل المحافظات' : `📍 عروض ${g}`); }}
                className={`px-3.5 py-2 rounded-full text-xs font-extrabold transition-all ${gov === g ? 'bg-red-600 text-white shadow' : 'bg-white border border-red-100 text-gray-600'}`}>
                {g}
              </button>
            ))}
            <select value={sort} onChange={(e) => setSort(e.target.value as any)}
              className="mr-auto px-3 py-2 rounded-full text-xs font-extrabold bg-white border border-red-100 text-gray-600">
              <option value="discount">🔥 الأكبر خصماً</option>
              <option value="price">💰 الأقل سعراً</option>
              <option value="new">✨ الأحدث</option>
            </select>
          </div>
        )}

        {items.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center text-gray-400">
            <div className="text-5xl mb-3">🏷️</div>
            {data.items.length === 0 ? 'لا عروض حالياً — تابعنا، التخفيضات تُضاف باستمرار' : 'لا عروض بهذه المحافظة الآن — جرّب محافظة أخرى'}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
            {items.map((p: any) => (
              <Link key={p.id} href={`/store/${p.store.slug}/product/${p.id}`}
                className="glass rounded-3xl overflow-hidden card-hover block relative">
                <div className="h-36 relative skeleton flex items-center justify-center text-3xl"
                  style={p.images?.[0] ? { background: `url(${imgUrl(p.images[0])}) center/cover`, animation: 'none' } : {}}>
                  {!p.images?.[0] && '📦'}
                  <span className="absolute top-2 right-2 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg anim-soft-pulse"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#f59e0b)' }}>
                    -{p.discount}%
                  </span>
                  {p.stock <= 0 && (
                    <span className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-xs font-bold">نفد</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-extrabold text-[13px] truncate">{p.name}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-black text-sm text-red-500">{Number(p.salePrice).toLocaleString()} {psym(p.currency)}</span>
                    <span className="text-[10px] text-gray-400 line-through">{Number(p.price).toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 truncate">🏪 {p.store.name} {p.store.isVerified && '✅'}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-bold text-emerald-600">وفّر {(Number(p.price) - Number(p.salePrice)).toLocaleString()} ✨</span>
                    {p.store.governorate && <span className="text-[9px] text-gray-400 font-bold">📍 {p.store.governorate}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 🏪 دعوة التجار — صفحة العروض تجلب البائعين أيضاً */}
        <div className="mt-6 rounded-3xl p-6 text-center text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #6C3DF5, #a855f7)' }}>
          <p className="font-black text-lg mb-1">🏪 تاجر وتريد ظهور عروضك هنا؟</p>
          <p className="text-sm opacity-85 mb-4">أنشئ متجرك وحدد سعر خصم لأي منتج — سيظهر في هذه الصفحة أمام آلاف الزوار تلقائياً</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/auth/seller-register" className="px-6 py-2.5 rounded-full bg-white text-purple-700 font-extrabold text-sm">🚀 أنشئ متجرك مجاناً</Link>
            <Link href="/tools/quick-sell" className="px-6 py-2.5 rounded-full bg-white/20 font-extrabold text-sm hover:bg-white/30 transition-colors">🔗 أو بِع برابط واحد</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
