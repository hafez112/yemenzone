// 🕘 شوهد مؤخراً + ⚖️ قائمة المقارنة — تخزين محلي في متصفح العميل فقط
// لا يُرسل أي شيء للخادم — خصوصية كاملة

const RECENT_KEY = 'yz_recent';
const CMP_KEY = 'yz_compare';

export interface RecentItem {
  id: string; name: string; price: number; salePrice?: number | null;
  image?: string | null; storeSlug: string; storeName: string; at: number;
}

export function recordRecent(item: Omit<RecentItem, 'at'>) {
  if (typeof window === 'undefined') return;
  try {
    const list: RecentItem[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const next = [{ ...item, at: Date.now() }, ...list.filter((r) => r.id !== item.id)].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

export function getRecent(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

// ⚖️ المقارنة — حتى 4 منتجات
export function getCompare(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(CMP_KEY) || '[]'); } catch { return []; }
}

export function toggleCompare(item: Omit<RecentItem, 'at'>): { added: boolean; count: number } {
  const list = getCompare();
  const exists = list.some((r) => r.id === item.id);
  if (exists) {
    const next = list.filter((r) => r.id !== item.id);
    localStorage.setItem(CMP_KEY, JSON.stringify(next));
    return { added: false, count: next.length };
  }
  if (list.length >= 4) return { added: false, count: list.length }; // ممتلئة
  const next = [...list, { ...item, at: Date.now() }];
  localStorage.setItem(CMP_KEY, JSON.stringify(next));
  return { added: true, count: next.length };
}

export function clearCompare() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CMP_KEY);
}

export function isInCompare(id: string): boolean {
  return getCompare().some((r) => r.id === id);
}
