import type { Metadata } from 'next';
import ToolsHub from '@/components/tools/ToolsHub';
import { SERVER_API as API } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'تكنولوجيا المنصة — 21 خدمة مجانية | يمن زون',
  description: 'ترسانة يمن زون المجانية: صانع فواتير، مولد QR وباركود، محول عملات يمني، ماسح بطاقات بالحجم الحقيقي، مزيل خلفيات بالذكاء الاصطناعي، حاسبة زكاة وأقساط وأرباح، والمزيد — كلها مجانية وتعمل من متصفحك.',
  keywords: ['ادوات مجانية', 'صانع فواتير', 'محول عملات يمني', 'مولد QR', 'يمن زون', 'حاسبة زكاة', 'ماسح بطاقات'],
};

// جلب الأدوات الظاهرة من الإدارة (SSR مع كاش دقيقة)
async function getVisible(): Promise<string[]> {
  try {
    const r = await fetch(`${API}/api/v1/tools`, { next: { revalidate: 60 } });
    const d = await r.json();
    return Array.isArray(d.tools) ? d.tools : [];
  } catch { return []; }
}

export default async function ToolsPage() {
  const visible = await getVisible();
  return <ToolsHub visible={visible} />;
}
