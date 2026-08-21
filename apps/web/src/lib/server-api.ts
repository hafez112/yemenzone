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
