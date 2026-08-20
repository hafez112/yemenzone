'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/Toast';
import { imgUrl } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const LS_KEY = 'yz-price-hunt-v1';

// ⚖️ مقارن الأسعار الذكي — ابحث عن منتج وشاهد أسعاره في كل متاجر المنصة
export default function PriceHuntTool() {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(LS_KEY) || '[]')); } catch {}
  }, []);

  const cur = (c: string) => (c === 'SAR' ? 'ر.س' : c === 'USD' ? '$' : 'ر.ي');

  const hunt = async (query = q) => {
    const queryClean = query.trim();
    if (queryClean.length < 2) { toast('✍️ اكتب اسم المنتج — مثال: سامسونج A54', 'error'); return; }
    setBusy(true); setData(null);
    try {
      const r = await fetch(`${API}/api/v1/tools/price-compare?q=${encodeURIComponent(queryClean)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'تعذّر البحث');
      setData(d);
      const h = [queryClean, ...history.filter((x) => x !== queryClean)].slice(0, 8);
      setHistory(h);
      localStorage.setItem(LS_KEY, JSON.stringify(h));
      toast(d.stats ? `⚖️ وُجد ${d.stats.count} عرضاً في ${d.stats.stores} متجر` : '🔍 لا نتائج مطابقة — جرّب كلمة أعم');
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      {/* 🔍 البحث */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-extrabold text-sm mb-2">🔍 عن ماذا تبحث؟</h3>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && hunt()}
            placeholder="اسم المنتج — مثال: جوال سامسونج، بُن عدني، ساعة رجالية"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white placeholder:text-white/30 focus:border-teal-400/60 focus:outline-none transition-colors" />
          <button onClick={() => hunt()} disabled={busy}
            className="px-5 py-3 rounded-xl bg-gradient-to-l from-teal-500 to-cyan-500 text-gray-900 font-black text-sm shrink-0 hover:scale-[1.02] transition-all disabled:opacity-50">
            {busy ? '⏳' : '⚖️ قارن'}
          </button>
        </div>
        {history.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-[10px] text-white/40 font-bold">🕘 بحثت سابقاً:</span>
            {history.map((h) => (
              <button key={h} onClick={() => { setQ(h); hunt(h); }}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                {h}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 📊 شريط الإحصاءات */}
      {data?.stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: '🏷️', label: 'أقل سعر', v: `${data.stats.min.toLocaleString()}` },
            { icon: '📈', label: 'أعلى سعر', v: `${data.stats.max.toLocaleString()}` },
            { icon: '💰', label: 'توفيرك حتى', v: `${data.stats.save.toLocaleString()}` },
            { icon: '🏪', label: 'متجر', v: `${data.stats.stores}` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-teal-400/20 bg-teal-500/10 p-2.5 text-center">
              <div className="text-lg">{s.icon}</div>
              <div className="font-black text-sm text-teal-300">{s.v}</div>
              <div className="text-[10px] text-white/50 font-bold">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* النتائج */}
      {busy && (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}</div>
      )}
      {data && !busy && (
        data.items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-extrabold mb-1">لا نتائج لـ«{data.q}» حالياً</p>
            <p className="text-xs text-white/50 mb-4">جرّب كلمة أعم — أو انشر طلبك وسيرد عليك التجار بعروضهم</p>
            <Link href="/tools/requests" className="inline-block px-5 py-2.5 rounded-full bg-gradient-to-l from-orange-500 to-amber-500 text-gray-900 font-extrabold text-xs">
              📢 اطلبها ونوفرها
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold text-white/50">🏆 مرتبة من الأرخص — أول نتيجة هي أفضل عرض</p>
            {data.items.map((p: any, i: number) => (
              <Link key={p.id} href={`/store/${p.store.slug}/product/${p.id}`}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition-all hover:scale-[1.005] ${i === 0 ? 'border-teal-400/50 bg-teal-500/10 shadow-lg shadow-teal-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 grid place-items-center text-2xl shrink-0">
                  {p.images?.[0] ? <img src={imgUrl(p.images[0])} alt="" className="w-full h-full object-cover" /> : '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm truncate">{p.name}</p>
                  <p className="text-[11px] text-white/50 truncate">
                    🏪 {p.store.name} {p.store.isVerified && '✅'} {p.store.governorate && `· 📍 ${p.store.governorate}`}
                  </p>
                  {p.stock <= 0 && <p className="text-[10px] text-red-400 font-bold">⚠️ نفد المخزون</p>}
                </div>
                <div className="text-left shrink-0">
                  {i === 0 && <span className="block text-[9px] font-black text-teal-300 bg-teal-500/20 rounded-full px-2 py-0.5 mb-1">🏆 الأفضل</span>}
                  <p className="font-black text-teal-300 text-base">{p.effPrice.toLocaleString()} <span className="text-[10px]">{cur(p.currency)}</span></p>
                  {p.salePrice && <p className="text-[10px] text-white/40 line-through">{Number(p.price).toLocaleString()}</p>}
                  {i > 0 && data.stats && p.effPrice > data.stats.min && (
                    <p className="text-[9px] text-red-300/80 font-bold">+{(p.effPrice - data.stats.min).toLocaleString()}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* 💡 نصائح */}
      {!data && !busy && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-extrabold text-sm mb-2">💡 كيف تستفيد؟</h3>
          <ul className="text-xs text-white/70 space-y-1.5 leading-relaxed">
            <li>🏆 اكتب اسم المنتج وشاهد <b>من يبيعه أرخص</b> في كل متاجر المنصة لحظياً.</li>
            <li>💰 شريط الإحصاءات يعرض فرق السعر — كم توفّر إن اشتريت من الأفضل.</li>
            <li>📢 لم تجده؟ انشر طلبك في «اطلبها ونوفرها» والتجار يأتون إليك بعروضهم.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
