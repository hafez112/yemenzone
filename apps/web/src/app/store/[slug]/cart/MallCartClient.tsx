'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCart, updateQty, clearCart, cartTotalConv, cartCount, rememberStoreId, CartItem } from '@/lib/cart';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🛒 سلة المول — صفحة منفصلة بثيم فاخر: عناصر + كميات + مشاركة + إتمام
export default function MallCartClient({ store, primary }: { store: any; primary: string }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { fmt, convert, def: defCur } = useCurrency();

  useEffect(() => {
    rememberStoreId(store.slug, store.id);
    setCart(getCart(store.slug));
    const handler = (e: any) => { if (e.detail.slug === store.slug) setCart(e.detail.items); };
    window.addEventListener('yz-cart', handler);
    return () => window.removeEventListener('yz-cart', handler);
  }, [store.slug, store.id]);

  const count = cartCount(cart);
  // 💱 كل سطر يُحوَّل من عملة صنفه إلى عملة المنصة الافتراضية ثم يُعرض بالمختارة
  const total = cartTotalConv(cart, (a, from) => convert(a, from, defCur?.code));

  return (
    <main className="min-h-screen pb-24 pt-20" style={{ background: `linear-gradient(180deg, ${primary}08, transparent 40%), #faf9ff` }}>
      <div className="max-w-3xl mx-auto px-3">
        <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl"
          style={{ background: `linear-gradient(135deg, ${primary}, #F59E0B)` }}>
          <div className="anim-blob absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <span className="text-4xl">🛒</span>
            <div>
              <h1 className="f-2xl font-black">سلة التسوق</h1>
              <p className="f-xs text-white/85 font-bold">
                {count === 0 ? 'سلتك فارغة' : count === 1 ? 'منتج واحد في سلتك' : count === 2 ? 'منتجان في سلتك' : count <= 10 ? `${count} منتجات في سلتك` : `${count} منتجاً في سلتك`} — {store.name}
              </p>
            </div>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-3">🛒</div>
            <p className="font-black text-lg">سلتك فارغة</p>
            <p className="f-xs font-bold mt-1">تصفح أقسام المول وأضف ما يعجبك</p>
            <Link href={`/store/${store.slug}`} className="inline-block mt-4 px-6 py-3 rounded-2xl text-white font-extrabold text-sm shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primary}, #F59E0B)` }}>
              🏬 تسوّق الآن
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 mt-4">
              {cart.map(i => (
                <div key={i.productId + (i.variantId || '')} className="flex gap-3 items-center bg-white rounded-3xl p-3 border border-gray-100 shadow-sm">
                  <Link href={`/store/${store.slug}/product/${i.productId}`}
                    className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center text-2xl overflow-hidden"
                    style={i.image ? { background: `url(${API}${i.image}) center/cover` } : { background: `linear-gradient(135deg, ${primary}15, ${primary}30)` }}>
                    {!i.image && '📦'}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{i.name}</div>
                    {i.variant && <div className="text-[11px] font-bold" style={{ color: primary }}>🎨 {i.variant}</div>}
                    <div className="text-sm font-black price-grad mt-0.5">{fmt(i.price * i.qty, i.currency)}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setCart(updateQty(store.slug, i.productId, i.qty - 1, i.variantId))}
                      className="w-8 h-8 rounded-full bg-gray-100 shadow-sm font-black transition-all active:scale-90">−</button>
                    <span className="w-8 text-center font-black text-sm">{i.qty}</span>
                    <button onClick={() => setCart(updateQty(store.slug, i.productId, i.qty + 1, i.variantId))}
                      className="w-8 h-8 rounded-full bg-gray-100 shadow-sm font-black transition-all active:scale-90">+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* الإجمالي والإجراءات */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 mt-4 space-y-3">
              <div className="flex justify-between font-black text-lg">
                <span>الإجمالي</span>
                <span className="price-grad">{fmt(total)}</span>
              </div>

              {/* 🔗 مشاركة السلة */}
              <button onClick={async () => {
                const payload = btoa(unescape(encodeURIComponent(JSON.stringify(cart.map(i => ({ i: i.productId, q: i.qty }))))));
                const link = `${window.location.origin}/store/${store.slug}?cart=${payload}`;
                const text = `🛒 سلة جاهزة لك في ${store.name} — أكمل طلبك من الرابط:\n${link}`;
                try {
                  await navigator.clipboard.writeText(text);
                  toast('🔗 نُسخ رابط السلة — أرسله لصديقك ويستلمها جاهزة!');
                } catch { toast('⚠️ انسخ يدوياً', 'error'); }
              }}
                className="w-full py-2.5 rounded-2xl font-extrabold text-sm bg-amber-50 text-amber-700 border border-amber-200 transition-all hover:bg-amber-100">
                🔗 اشترِ مع صديق — شارك السلة برابط
              </button>

              <div className="flex gap-2">
                <button onClick={() => { if (confirm('إفراغ السلة بالكامل؟')) { clearCart(store.slug); setCart([]); toast('🗑️ أُفرغت السلة'); } }}
                  className="px-4 py-4 rounded-2xl font-extrabold text-sm bg-red-50 text-red-500 border border-red-100">
                  🗑️
                </button>
                <Link href={`/store/${store.slug}/checkout`}
                  className="theme-glow flex-1 py-4 rounded-2xl text-white font-extrabold text-lg text-center shadow-xl transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${primary}, #F59E0B)`, '--tp': primary } as any}>
                  إتمام الطلب ←
                </Link>
              </div>
              <Link href={`/store/${store.slug}`} className="block text-center text-sm text-gray-400 font-bold">
                ← متابعة التسوق في المول
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
