// عنوان الـ API للجلب من داخل الخادم (SSR/Server Components)
// في Docker: اسم الخدمة الداخلي api:4000 — محلياً: localhost:4000
export const SERVER_API =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000';

// 🖼️ رابط صورة للعرض في المتصفح من داخل مكوّنات الخادم (SSR)
// SERVER_API داخل Docker = http://api:4000 — عنوان داخلي لا يفهمه متصفح الزائر!
// لذلك نُرجع المسار النسبي كما هو — يمر عبر بروكسي /uploads في Caddy إلى الـ API
export function pubImg(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

// 💱 جلب عملات المنصة من الخادم وحلّ رمز العملة — لمكوّنات الخادم (SSR)
export async function serverCurSymbol(code?: string | null): Promise<string> {
  const c = String(code || 'YER').toUpperCase();
  try {
    const r = await fetch(`${SERVER_API}/api/v1/currencies`, { next: { revalidate: 300 } });
    if (r.ok) {
      const list: { code: string; symbol: string }[] = await r.json();
      const hit = list.find((x) => x.code === c);
      if (hit) return hit.symbol;
    }
  } catch { /* تجاهل — نرجع الكود */ }
  return c === 'YER' ? 'ر.ي' : c;
}

// 💱 خريطة كود→رمز لكل عملات المنصة — للحلقات داخل مكوّنات الخادم
export async function serverCurSymbols(): Promise<Record<string, string>> {
  try {
    const r = await fetch(`${SERVER_API}/api/v1/currencies`, { next: { revalidate: 300 } });
    if (r.ok) {
      const list: { code: string; symbol: string }[] = await r.json();
      return Object.fromEntries(list.map((x) => [x.code, x.symbol]));
    }
  } catch { /* تجاهل */ }
  return { YER: 'ر.ي' };
}
