'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🛍️ توصيات عابرة للمتاجر — «قد يعجبك من متاجر أخرى» (ذكاء محلي قائم على قواعد)
export default function CrossStoreReco({ productId, isDark }: { productId: string; isDark?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const { fmt } = useCurrency();

  useEffect(() => {
    let live = true;
    api(`/v1/reco/related/${productId}?take=8`)
      .then((r: any) => { if (live && Array.isArray(r)) setItems(r); })
      .catch(() => {});
    return () => { live = false; };
  }, [productId]);

  if (!items.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-black text-xl mb-4">🛍️ اكتشف مشابهها في متاجر أخرى</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((p) => (
          <Link key={p.id} href={`/store/${p.store.slug}/product/${p.id}`}
            className={`rounded-2xl overflow-hidden card-hover ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-sm'}`}>
            <div className="h-28 relative"
              style={p.images?.[0]
                ? { background: `url(${API}${p.images[0]}) center/cover` }
                : { background: 'linear-gradient(135deg, #6C3DF520, #6C3DF540)' }}>
              {p.salePrice && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  خصم {Math.round((1 - p.salePrice / p.price) * 100)}%
                </span>
              )}
            </div>
            <div className="p-2.5">
              <p className="font-bold text-xs truncate">{p.name}</p>
              <p className="text-[10px] font-bold text-gray-400 truncate">{p.store.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <b className="text-sm" style={{ color: '#6C3DF5' }}>{fmt(Number(p.salePrice || p.price))}</b>
                {p.salePrice && <s className="text-[10px] text-gray-400">{fmt(Number(p.price))}</s>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
