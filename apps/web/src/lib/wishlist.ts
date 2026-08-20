// ❤️ مساعد المفضلة — كاش موحد لمعرّفات منتجات العميل + تبديل
import { api, getUser } from './api';

let idsCache: Promise<string[]> | null = null;

export function isCustomer() {
  return typeof window !== 'undefined' && localStorage.getItem('yz_type') === 'customer' && !!getUser();
}

// جلب معرّفات المفضلة مرة واحدة لكل تحميل صفحة (تُبطل بعد كل تبديل)
export function wishlistIds(force = false): Promise<string[]> {
  if (!isCustomer()) return Promise.resolve([]);
  if (!idsCache || force) {
    idsCache = api('/v1/wishlist/ids').catch(() => []).then((r: any) => (Array.isArray(r) ? r : []));
  }
  return idsCache;
}

export async function toggleWishlist(productId: string): Promise<boolean> {
  const r: any = await api(`/v1/wishlist/toggle/${productId}`, { method: 'POST' });
  idsCache = null; // إبطال الكاش
  return !!r.added;
}
