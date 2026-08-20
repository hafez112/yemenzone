// عنوان الـ API للجلب من داخل الخادم (SSR/Server Components)
// في Docker: اسم الخدمة الداخلي api:4000 — محلياً: localhost:4000
export const SERVER_API =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000';
