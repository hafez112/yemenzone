// 🔗 جسر ربط خدمات التاجر ببيانات متجره — كل أداة تقرأ منه مباشرة
import { api } from './api';

export interface StoreExport {
  exportedAt: string;
  store: { name: string; slug: string; type: string; governorate?: string; phone?: string; whatsapp?: string; logo?: string; description?: string };
  categories: { id: string; name: string; parentId?: string | null }[];
  products: { id: string; name: string; shortDesc?: string; price: number; salePrice?: number | null; currency: string; stock: number; sku?: string; barcode?: string; categoryId?: string | null; images?: any; isActive: boolean }[];
  orders: { number: string; customerName: string; customerPhone: string; status: string; subtotal: number; total: number; currency: string; createdAt: string; items: { name: string; qty: number; price: number }[] }[];
  customers: { name: string; phone: string; orders: number; total: number; lastAt: string }[];
}

// هل الحساب الحالي بائع؟
export const isSeller = () => typeof window !== 'undefined' && localStorage.getItem('yz_type') === 'seller';

// 🏬 تصدير كامل لبيانات المتجر من الخادم (متجر + أصناف + منتجات + طلبات + زبائن)
export const storeExport = (): Promise<StoreExport> => api('/v1/my-tools/store-export');

// نسخة مخففة: بيانات المتجر الأساسية فقط (للتعبئة التلقائية في الأدوات)
export const myStoreInfo = (): Promise<any> => api('/stores/my');
