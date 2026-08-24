'use client';
import Link from 'next/link';
import { addToCart } from '@/lib/cart';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🏬 بطاقة منتج المول — تصميم راقٍ: صورة بزووم ناعم، شارات (متميز/خصم)،
// وصف مختصر، سعر بتدرّج، وزر إضافة للسلة المنفصلة
export default function MallProductCard({ p, store, primary }: { p: any; store: any; primary: string }) {
  const { fmt } = useCurrency();
  const discount = p.salePrice ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm card-hover card-glow h-full flex flex-col">
      <Link href={`/store/${store.slug}/product/${p.id}`} className="block aspect-square md:aspect-[4/5] relative overflow-hidden shrink-0">
        <div className="zoom-bg absolute inset-0"
          style={p.images?.[0]
            ? { background: `url(${API}${p.images[0]}) center/cover` }
            : { background: `linear-gradient(135deg, ${primary}12, ${primary}28)` }} />
        {!p.images?.[0] && (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-40">{store.type?.icon || '📦'}</div>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {discount > 0 && (
            <span className="sale-badge text-[10px] px-2 py-0.5">خصم {discount}% 🔥</span>
          )}
          {p.isFeatured && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white shadow"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>⭐ متميز</span>
          )}
        </div>
        {p.stock <= 0 && (
          <span className="out-overlay absolute inset-0 flex items-center justify-center text-white text-sm font-bold">نفد المخزون</span>
        )}
      </Link>
      <div className="p-2.5 sm:p-3 flex flex-col flex-1">
        <Link href={`/store/${store.slug}/product/${p.id}`} className="block font-extrabold f-sm leading-snug line-clamp-2 min-h-[2.55em]">{p.name}</Link>
        {p.shortDesc
          ? <div className="hidden sm:block f-xs mt-0.5 line-clamp-1 text-gray-400">{p.shortDesc}</div>
          : p.description && <div className="hidden sm:block f-xs mt-0.5 line-clamp-1 text-gray-400">{p.description}</div>}
        <div className="flex items-center gap-1.5 mt-1.5 min-w-0 flex-wrap">
          {p.salePrice ? (
            <>
              <span className="font-black text-red-500 f-sm">{fmt(Number(p.salePrice), p.currency)}</span>
              <span className="text-[10px] text-gray-400 line-through">{fmt(Number(p.price), p.currency)}</span>
            </>
          ) : (
            <span className="font-black f-sm price-grad">{fmt(Number(p.price), p.currency)}</span>
          )}
        </div>
        {p.stock > 0 && (
          <div className="flex gap-1 mt-auto pt-2">
            {Array.isArray(p.variants) && p.variants.length > 0 ? (
              <Link href={`/store/${store.slug}/product/${p.id}`}
                className="theme-glow flex-1 py-2 sm:py-2.5 rounded-xl text-white text-[11px] sm:text-xs font-extrabold leading-tight text-center transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)` }}>
                🎨 اختر الخيار
              </Link>
            ) : (
              <button
                onClick={() => {
                  addToCart(store.slug, {
                    productId: p.id, name: p.name,
                    price: Number(p.salePrice || p.price), image: p.images?.[0],
                    currency: p.currency,
                  });
                  toast('🛒 أُضيف إلى سلتك');
                }}
                className="theme-glow flex-1 py-2 sm:py-2.5 rounded-xl text-white text-[11px] sm:text-xs font-extrabold leading-tight transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)` }}>
                🛒 أضف للسلة
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
