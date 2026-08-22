// 🗄️ قاعدة بيانات الخدمات الخاصة بكل مستخدم
// كل خدمة يضيفها المستخدم إلى لوحته لها مخزن بيانات مستقل في حسابه — لا يراه غيره
import { api } from './api';

export interface MyToolRow {
  slug: string;
  addedAt: string;
  updatedAt: string;
  hasData: boolean;
}

// هل يوجد دخول حالي؟ وما نوعه؟
export function sessionType(): 'seller' | 'customer' | 'admin' | null {
  if (typeof window === 'undefined') return null;
  const t = localStorage.getItem('yz_type');
  const tok = localStorage.getItem('yz_token');
  if (!t || !tok) return null;
  return t as any;
}

// 📋 خدماتي المضافة إلى لوحتي
export const myTools = (): Promise<MyToolRow[]> => api('/v1/my-tools');

// ➕ إضافة خدمة إلى لوحتي
export const addMyTool = (slug: string) =>
  api(`/v1/my-tools/${slug}`, { method: 'POST' });

// ✕ إزالة خدمة من لوحتي
export const removeMyTool = (slug: string) =>
  api(`/v1/my-tools/${slug}`, { method: 'DELETE' });

// 📥 قراءة قاعدة بيانات خدمة معينة (null = لا بيانات بعد)
export async function loadToolData<T = any>(slug: string): Promise<T | null> {
  const r = await api(`/v1/my-tools/${slug}/data`);
  return (r?.data ?? null) as T | null;
}

// 📤 حفظ بيانات الخدمة في قاعدتها الخاصة بحسابي
export const saveToolData = (slug: string, data: any) =>
  api(`/v1/my-tools/${slug}/data`, { method: 'PUT', body: JSON.stringify({ data }) });

// 💰 أسعار الخدمات (من القائمة العامة — مؤقتة في الجلسة)
let pricesCache: Record<string, number> | null = null;
export async function toolPrices(): Promise<Record<string, number>> {
  if (pricesCache) return pricesCache;
  try {
    const API = process.env.NEXT_PUBLIC_API_URL || '';
    const r = await fetch(`${API}/api/v1/tools`).then((x) => x.json());
    pricesCache = r?.prices || {};
  } catch { pricesCache = {}; }
  return pricesCache!;
}

// 🔓 الخدمات المدفوعة التي اشتريتها
export const myAccess = (): Promise<{ purchased: string[]; purchases: any[] }> =>
  api('/v1/tools/my-access');

// 💳 شراء خدمة ببطاقة يمن زون — تفتح فوراً بعد الدفع
export const buyTool = (slug: string) =>
  api(`/v1/tools/${slug}/buy`, { method: 'POST' });

// ═══ 📢 المستندات المشتركة — صفحات عامة برابط قصير (منيو/اختبار/استطلاع/فعالية) ═══
export interface SharedDoc {
  slug: string; type: 'menu' | 'quiz' | 'poll' | 'ticket';
  title: string; payload: any; views: number; createdAt: string; updatedAt: string;
}

// إنشاء مستند مشترك (يتطلب دخول) ← يرجع الرابط القصير
export const shareCreate = (type: string, title: string, payload: any): Promise<{ slug: string }> =>
  api('/v1/tools/share', { method: 'POST', body: JSON.stringify({ type, title, payload }) });

// تحديث مستند أملكه
export const shareUpdate = (slug: string, title: string, payload: any) =>
  api(`/v1/tools/share/${slug}`, { method: 'PUT', body: JSON.stringify({ title, payload }) });

// مستنداتي المشتركة (مع النتائج والمشاهدات)
export const shareMine = (): Promise<SharedDoc[]> => api('/v1/tools/share-mine');

// قراءة عامة بدون دخول — لصفحة العرض /s/[slug]
export async function shareGet(slug: string): Promise<SharedDoc | null> {
  try {
    const API = process.env.NEXT_PUBLIC_API_URL || '';
    const r = await fetch(`${API}/api/v1/tools/share/${slug}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

// تصويت عام في استطلاع
export async function shareVote(slug: string, index: number): Promise<any> {
  const API = process.env.NEXT_PUBLIC_API_URL || '';
  const r = await fetch(`${API}/api/v1/tools/share/${slug}/vote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || 'تعذّر التصويت');
  return d;
}
