// سلة المشتريات — محفوظة في الجوال لكل متجر على حدة
export type CartItem = {
  productId: string; name: string; price: number; qty: number; image?: string;
  variantId?: string;  // 🎨 خيار المنتج المختار (لون/مقاس/وزن)
  variant?: string;    // وصفه المعروض: "أحمر — XL"
};

const KEY = (slug: string) => `yz_cart_${slug}`;
// المفتاح الفريد للسطر = المنتج + خياره
const sameLine = (a: CartItem, productId: string, variantId?: string) =>
  a.productId === productId && (a.variantId || '') === (variantId || '');

export function getCart(slug: string): CartItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY(slug)) || '[]'); } catch { return []; }
}

export function saveCart(slug: string, items: CartItem[]) {
  localStorage.setItem(KEY(slug), JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('yz-cart', { detail: { slug, items } }));
  syncToServer(slug, items); // 🛰️ مزامنة صامتة مع السيرفر
}

export function addToCart(slug: string, item: Omit<CartItem, 'qty'>, qty = 1) {
  const cart = getCart(slug);
  const found = cart.find(i => sameLine(i, item.productId, item.variantId));
  if (found) found.qty = Math.min(found.qty + qty, 99);
  else cart.push({ ...item, qty });
  saveCart(slug, cart);
  return cart;
}

export function updateQty(slug: string, productId: string, qty: number, variantId?: string) {
  let cart = getCart(slug);
  if (qty <= 0) cart = cart.filter(i => !sameLine(i, productId, variantId));
  else cart = cart.map(i => sameLine(i, productId, variantId) ? { ...i, qty } : i);
  saveCart(slug, cart);
  return cart;
}

export function clearCart(slug: string) { saveCart(slug, []); }

// ═══ 🛰️ مزامنة السلة مع السيرفر — لكشف السلات المهجورة (صامتة تماماً، لا تحجب الواجهة) ═══
const API = process.env.NEXT_PUBLIC_API_URL || '';
const STORE_KEY = (slug: string) => `yz_store_${slug}`;

// تُستدعى من صفحات المتجر لربط slug بمعرّفه — مطلوب للمزامنة
export function rememberStoreId(slug: string, storeId: string) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORE_KEY(slug), storeId); } catch {}
}

function sessionId(): string {
  let s = localStorage.getItem('yz_sid');
  if (!s) {
    s = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('yz_sid', s);
  }
  return s;
}

let syncTimer: any = null;
function syncToServer(slug: string, items: CartItem[]) {
  if (typeof window === 'undefined') return;
  const storeId = localStorage.getItem(STORE_KEY(slug));
  if (!storeId) return; // لا نعرف المتجر بعد — تتم المزامنة عند أول زيارة لصفحة فيها CartDrawer
  clearTimeout(syncTimer);
  const snapshot = items.map((i) => ({ productId: i.productId, variantId: i.variantId, variant: i.variant, qty: i.qty }));
  syncTimer = setTimeout(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('yz_token');
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`${API}/api/v1/cart/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ storeId, sessionId: sessionId(), items: snapshot }),
    }).catch(() => {});
  }, 1500);
}

export function cartTotal(cart: CartItem[]) {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

export function cartCount(cart: CartItem[]) {
  return cart.reduce((s, i) => s + i.qty, 0);
}
