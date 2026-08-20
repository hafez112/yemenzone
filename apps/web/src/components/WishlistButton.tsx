'use client';
import { useEffect, useState } from 'react';
import { isCustomer, toggleWishlist, wishlistIds } from '@/lib/wishlist';
import { toast } from '@/components/Toast';

// ❤️ زر المفضلة — قلب يمتلئ عند الحفظ (للعملاء المسجلين)
export default function WishlistButton({ productId, primary = '#6C3DF5' }: { productId: string; primary?: string }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    wishlistIds().then((ids) => { if (live) setOn(ids.includes(productId)); });
    return () => { live = false; };
  }, [productId]);

  const toggle = async () => {
    if (!isCustomer()) return toast('❤️ سجّل دخولك كعميل لحفظ منتجاتك المفضلة ومتابعة عروضها', 'error');
    setBusy(true);
    try {
      const added = await toggleWishlist(productId);
      setOn(added);
      toast(added ? '❤️ أُضيف لمفضلتك — سننبهك عند انخفاض سعره' : 'أُزيل من المفضلة');
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  };

  return (
    <button onClick={toggle} disabled={busy} aria-label="المفضلة"
      className={`py-3 px-4 rounded-2xl font-extrabold text-lg transition-all shadow ${
        on ? 'text-white scale-105' : 'bg-white text-gray-400 hover:text-red-400'
      } disabled:opacity-50`}
      style={on ? { background: 'linear-gradient(135deg, #ef4444, #e11d48)' } : {}}>
      {busy ? '⏳' : on ? '❤️' : '🤍'}
    </button>
  );
}
