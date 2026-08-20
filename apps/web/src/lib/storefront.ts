import { cache } from 'react';
import { SERVER_API as API } from '@/lib/server-api';

// ⚡ جلب موحّد لواجهة المتجر العامة — React cache() يدمج كل الطلبات المتكررة لنفس المتجر
// خلال الطلب الواحد (layout + page + generateMetadata) في جلب شبكة واحد فقط،
// وrevalidate يجعل الصفحة تُخدَّم من كاش Next مع تحديثها في الخلفية كل 30 ثانية
export const getStorefront = cache(async (slug: string) => {
  try {
    const res = await fetch(`${API}/api/v1/storefront/${slug}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
});
