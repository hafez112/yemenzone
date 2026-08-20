'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/Toast';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 📖 دليل الأعمال اليمني — فلترة وبحث تفاعلي فوق بيانات SSR
interface Biz { slug: string; name: string; desc: string; category?: string; governorate?: string; phone: string; whatsapp: string; website?: string; views: number }

export default function DirectoryClient({ initialItems, initialCats, initialGovs, total }:
  { initialItems: Biz[]; initialCats: { key: string; count: number }[]; initialGovs: { key: string; count: number }[]; total: number }) {
  const [items, setItems] = useState<Biz[]>(initialItems);
  const [cat, setCat] = useState('');
  const [gov, setGov] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (c = cat, g = gov, query = q) => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (c) p.set('cat', c);
      if (g) p.set('gov', g);
      if (query.trim()) p.set('q', query.trim());
      const r = await fetch(`${API}/api/v1/tools/directory?${p.toString()}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'تعذّر التحميل');
      setItems(d.items || []);
    } catch (e: any) { toast(e.message, 'error'); }
    setLoading(false);
  };

  const pickCat = (c: string) => { const v = c === cat ? '' : c; setCat(v); load(v, gov, q); };
  const pickGov = (g: string) => { const v = g === gov ? '' : g; setGov(v); load(cat, v, q); };

  const waNum = (w: string) => {
    const n = w.replace(/[^0-9]/g, '');
    return n.startsWith('967') ? n : '967' + n.replace(/^0/, '');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* 🎯 الترويسة */}
      <div className="rounded-3xl p-6 text-center text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6 55%,#06B6D4)' }}>
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/10 anim-blob" />
        <div className="relative">
          <div className="text-4xl mb-2">📖</div>
          <h1 className="text-2xl font-black mb-1">دليل الأعمال اليمني</h1>
          <p className="text-sm text-white/80">كل المحلات والخدمات في اليمن — مصنّفة وقابلة للبحث وتواصل مباشر مجاناً</p>
          <p className="mt-3 inline-block bg-white/15 backdrop-blur px-4 py-1.5 rounded-full text-xs font-extrabold">🏪 {total.toLocaleString()} نشاطاً مسجلاً ومعتمداً</p>
        </div>
      </div>

      {/* 🔍 البحث */}
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ابحث: صيدلية، مطعم، محل جوالات..."
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-teal-400 focus:outline-none transition-colors" />
        <button type="submit" className="px-5 rounded-xl bg-teal-600 text-white font-extrabold text-sm shrink-0 hover:bg-teal-500 transition-colors">بحث</button>
      </form>

      {/* فلاتر التصنيف */}
      {initialCats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {initialCats.map((c) => (
            <button key={c.key} onClick={() => pickCat(c.key)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${cat === c.key ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-gray-200 text-gray-600 hover:border-teal-400'}`}>
              {c.key} <span className="opacity-60">({c.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* فلاتر المحافظة */}
      {initialGovs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {initialGovs.map((g) => (
            <button key={g.key} onClick={() => pickGov(g.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${gov === g.key ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white border-gray-200 text-gray-500 hover:border-cyan-400'}`}>
              📍 {g.key} ({g.count})
            </button>
          ))}
        </div>
      )}

      {/* النتائج */}
      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">⏳ جارٍ البحث في الدليل...</div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-extrabold text-gray-700 mb-1">لا توجد نتائج مطابقة</p>
          <p className="text-xs text-gray-400 mb-4">جرّب كلمة أعم أو أزل الفلاتر</p>
          {(cat || gov || q) && (
            <button onClick={() => { setCat(''); setGov(''); setQ(''); load('', '', ''); }}
              className="px-5 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-colors">↩️ عرض الكل</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <div key={b.slug} className="rounded-2xl border border-gray-200 bg-white p-4 hover:border-teal-300 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl grid place-items-center text-xl shrink-0 text-white"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  {b.name.trim().charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/biz/${b.slug}`} className="font-extrabold text-sm text-gray-800 hover:text-teal-600 transition-colors">{b.name}</Link>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {b.category && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">{b.category}</span>}
                    {b.governorate && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">📍 {b.governorate}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{b.desc}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <a href={`https://wa.me/${waNum(b.whatsapp)}?text=${encodeURIComponent(`السلام عليكم 🌹\nوجدتكم في دليل الأعمال اليمني`)}`} target="_blank" rel="noreferrer"
                  className="flex-1 py-2 rounded-xl bg-green-500 text-white text-xs font-extrabold text-center hover:bg-green-400 transition-colors">💬 واتساب</a>
                <a href={`tel:${b.phone}`}
                  className="flex-1 py-2 rounded-xl bg-teal-600 text-white text-xs font-extrabold text-center hover:bg-teal-500 transition-colors">📞 اتصال</a>
                <Link href={`/biz/${b.slug}`}
                  className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-extrabold text-center hover:bg-gray-200 transition-colors">🏪 الصفحة</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🚀 دعوة التسجيل */}
      <div className="rounded-3xl border border-teal-200 p-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,.08), rgba(6,182,212,.05))' }}>
        <p className="font-extrabold text-gray-800 mb-1">🏪 محلك غير موجود في الدليل؟</p>
        <p className="text-xs text-gray-500 mb-4">سجّله مجاناً واحصل على صفحة رسمية مفهرسة في جوجل + ظهور في خريطة «المحلات القريبة منك»</p>
        <Link href="/tools/add-me" className="inline-block px-6 py-3 rounded-full bg-gradient-to-l from-teal-600 to-cyan-600 text-white font-extrabold text-sm shadow-lg hover:scale-[1.02] transition-transform">
          🚀 أضف محلك مجاناً
        </Link>
      </div>
    </div>
  );
}
