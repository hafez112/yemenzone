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
