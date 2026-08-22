'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import { addToCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🤍 مفضلة العميل — منتجاته المحفوظة مع شارة انخفاض السعر
export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[] | null>(null);
  const { fmt } = useCurrency();

  const load = () => {
    const u = getUser();
    if (!u || localStorage.getItem('yz_type') !== 'customer') { router.replace('/auth'); return; }
    api('/v1/wishlist').then(setItems).catch((e) => { toast(e.message, 'error'); setItems([]); });
  };
  useEffect(load, []);

  const remove = async (productId: string) => {
    try {
      await api(`/v1/wishlist/${productId}`, { method: 'DELETE' });
      setItems((prev) => (prev || []).filter((i) => i.product.id !== productId));
      toast('أُزيل من المفضلة');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const toCart = (i: any) => {
    const p = i.product;
    addToCart(p.store.slug, {
      productId: p.id, name: p.name,
      price: Number(p.salePrice || p.price), image: p.images?.[0],
      currency: p.currency,
    });
    toast(`🛒 أُضيف ${p.name} لسلة ${p.store.name}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-3xl mx-auto px-3 pt-20">
        <div className="flex items-center gap-2 mb-5">
          <Link href="/customer" className="text-sm font-bold text-gray-400 hover:underline">حسابي</Link>
          <span className="text-gray-300">←</span>
          <h1 className="text-xl font-black">🤍 منتجاتي المحفوظة</h1>
        </div>

        {items === null && <p className="text-center text-sm font-bold text-gray-400 py-16">⏳ جارٍ التحميل…</p>}
        {items !== null && items.length === 0 && (
          <div className="glass rounded-3xl p-10 text-center">
            <div className="text-5xl mb-3">🤍</div>
            <p className="font-black mb-1">لا محفوظات بعد</p>
            <p className="text-xs font-bold text-gray-400 mb-4">اضغط 🤍 على أي منتج لحفظه هنا — وسننبهك عند انخفاض سعره 💸</p>
            <Link href="/explore" className="inline-block text-white font-extrabold text-sm px-5 py-2.5 rounded-2xl shadow" style={{ background: 'var(--primary)' }}>
              🛍️ تصفح المنتجات
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {(items || []).map((i) => {
            const p = i.product;
            const price = Number(p.salePrice || p.price);
            return (
              <div key={i.id} className="glass rounded-3xl p-3 flex gap-3 items-center card-hover">
                <Link href={`/store/${p.store.slug}/product/${p.id}`}
                  className="w-20 h-20 rounded-2xl shrink-0 relative overflow-hidden"
                  style={p.images?.[0] ? { background: `url(${API}${p.images[0]}) center/cover` } : { background: '#e5e7eb' }}>
                  {!p.images?.[0] && <span className="absolute inset-0 flex items-center justify-center text-2xl opacity-40">📦</span>}
                  {i.dropped && (
                    <span className="absolute bottom-1 right-1 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">💸 انخفض</span>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/store/${p.store.slug}/product/${p.id}`} className="font-extrabold text-sm block truncate hover:underline">{p.name}</Link>
                  <p className="text-[11px] font-bold text-gray-400 truncate">🏪 {p.store.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <b className="text-base" style={{ color: 'var(--primary)' }}>{fmt(price, p.currency)}</b>
                    {p.salePrice && <s className="text-[11px] text-gray-400">{fmt(Number(p.price), p.currency)}</s>}
                    {i.dropped && i.priceAtAdd && (
                      <span className="text-[10px] font-extrabold text-red-500">كان {fmt(Number(i.priceAtAdd), p.currency)}</span>
                    )}
                  </div>
                  {!p.isActive && <p className="text-[10px] font-bold text-red-400 mt-0.5">⚠️ لم يعد متاحاً</p>}
                  {p.isActive && p.stock <= 0 && <p className="text-[10px] font-bold text-amber-500 mt-0.5">⏳ نفد مؤقتاً — سنعلمك عند عودته</p>}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {p.isActive && p.stock > 0 && (
                    <button onClick={() => toCart(i)}
                      className="text-[11px] font-extrabold text-white px-3 py-2 rounded-xl shadow"
                      style={{ background: 'var(--primary)' }}>
                      🛒 للسلة
                    </button>
                  )}
                  <button onClick={() => remove(p.id)}
                    className="text-[11px] font-extrabold text-gray-400 bg-gray-100 px-3 py-2 rounded-xl">
                    🗑️ إزالة
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
