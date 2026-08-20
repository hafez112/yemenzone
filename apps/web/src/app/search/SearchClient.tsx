'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/Toast';
import { imgUrl } from '@/lib/api';

// 🔎 البحث الموحد — متاجر + منتجات من كل المنصة
const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function SearchClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get('q') || '';
  const [q, setQ] = useState(initial);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState('');

  const run = (term: string) => {
    const t = term.trim();
    if (t.length < 2) { setData(null); setSearched(''); return; }
    setLoading(true);
    setSearched(t);
    fetch(`${API}/api/v1/search?q=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast('تعذر البحث', 'error'))
      .finally(() => setLoading(false));
  };

  // بحث تلقائي عند فتح الصفحة بمعامل ?q=
  useEffect(() => { if (initial.trim().length >= 2) run(initial); }, []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    router.replace(`/search?q=${encodeURIComponent(q.trim())}`, { scroll: false });
    run(q);
  };

  const stores: any[] = data?.stores || [];
  const products: any[] = data?.products || [];
  const empty = searched && !loading && stores.length === 0 && products.length === 0;

  return (
    <div className="page">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4"><span className="section-chip">🔎</span><h1 className="f-2xl font-black">البحث في يمن زون</h1></div>

        <form onSubmit={submit} className="card !p-3 flex gap-2 mb-5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="اسم متجر، منتج، مدينة..."
            className="!mb-0 flex-1"
            autoFocus
          />
          <button type="submit" className="btn primary shrink-0">بحث</button>
        </form>

        {loading && <div className="card skeleton h-32" />}

        {empty && (
          <div className="card text-center py-12">
            <div className="text-4xl mb-2">🤷</div>
            <b>لا نتائج لـ «{searched}»</b>
            <p className="text-sm text-gray-500 mt-1">جرّب كلمات أعم، أو تصفح <Link href="/stores" className="font-bold" style={{ color: 'var(--primary)' }}>دليل المتاجر</Link></p>
          </div>
        )}

        {/* المتاجر */}
        {stores.length > 0 && (
          <>
            <h2 className="font-black text-lg mb-2">🏪 متاجر <span className="text-sm text-gray-400">({stores.length})</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
              {stores.map((s) => (
                <Link key={s.id} href={`/store/${s.slug}`} className="card card-hover !mb-0 !p-3 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl shrink-0"
                    style={{ background: s.logo ? `url(${imgUrl(s.logo)}) center/cover` : 'var(--primary)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <b className="text-sm truncate">{s.name}</b>
                      {s.isVerified && <span title="موثق">🎖️</span>}
                      {s.isFeatured && <span title="متميز">⭐</span>}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">
                      {s.type?.icon} {s.type?.nameAr} {s.governorate ? `· 📍${s.governorate}` : ''}
                    </div>
                    {s.description && <div className="text-[11px] text-gray-500 truncate mt-0.5">{s.description}</div>}
                  </div>
                  <span className="text-[11px] font-bold shrink-0" style={{ color: '#b45309' }}>
                    ⭐ {s.ratingAvg > 0 ? s.ratingAvg.toFixed(1) : 'جديد'}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* المنتجات */}
        {products.length > 0 && (
          <>
            <h2 className="font-black text-lg mb-2">📦 منتجات <span className="text-sm text-gray-400">({products.length})</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {products.map((p) => (
                <Link key={p.id} href={`/store/${p.store.slug}/product/${p.id}`}
                  className="card card-hover !mb-0 !p-0 overflow-hidden block">
                  <div className="aspect-square skeleton"
                    style={p.images?.[0] ? { background: `url(${imgUrl(p.images[0])}) center/cover`, animation: 'none' } : {}} />
                  <div className="p-2.5">
                    <b className="text-xs block truncate">{p.name}</b>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-black" style={{ color: 'var(--primary)' }}>
                        {Number(p.salePrice ?? p.price).toLocaleString('en')} {p.currency === 'YER' ? 'ر.ي' : p.currency}
                      </span>
                      {p.salePrice && (
                        <span className="text-[10px] text-gray-400 line-through">{Number(p.price).toLocaleString('en')}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate mt-0.5">
                      {p.store.name} {p.store.isVerified && '🎖️'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
