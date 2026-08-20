import { NextRequest, NextResponse } from 'next/server';

// 🌐 توجيه النطاقات الحقيقية للمتاجر — أي نطاق غير نطاق المنصة يُحوَّل لمتجره المعتمد
const API = process.env.NEXT_PUBLIC_API_URL || '';
const PLATFORM_DOMAIN = (process.env.NEXT_PUBLIC_PLATFORM_HOST || 'yemenzone1.com').toLowerCase();

// ذاكرة مؤقتة قصيرة (60 ثانية) لتفادي سؤال الخادم عن كل طلب
const cache = new Map<string, { slug: string | null; at: number }>();
const CACHE_TTL = 60_000;

function isPlatformHost(host: string): boolean {
  return (
    host === PLATFORM_DOMAIN ||
    host === 'www.' + PLATFORM_DOMAIN ||
    host.endsWith('.' + PLATFORM_DOMAIN) ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) // عنوان IP مباشر
  );
}

async function resolveHost(host: string): Promise<string | null> {
  const hit = cache.get(host);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.slug;
  let slug: string | null = null;
  try {
    const res = await fetch(`${API}/api/v1/resolve-domain?host=${encodeURIComponent(host)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) slug = (await res.json()).slug || null;
  } catch { /* عند التعذر نفشل بأمان: يظهر محتوى المنصة الافتراضي */ }
  cache.set(host, { slug, at: Date.now() });
  return slug;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🛡️ بوابة لوحة تحكم المنصة — رابط خاص محمي برمز سري (ADMIN_GATE في .env)
  // بدون فتح البوابة: أي زيارة لمسارات /admin تُحوَّل لصفحة البوابة
  const ADMIN_GATE = process.env.ADMIN_GATE || '';
  if (ADMIN_GATE && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
    if (req.cookies.get('yz_admin_unlock')?.value !== ADMIN_GATE) {
      const url = req.nextUrl.clone();
      url.pathname = '/gate';
      url.search = `?back=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }

  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase();
  if (!host || isPlatformHost(host)) return NextResponse.next();

  const slug = await resolveHost(host);
  if (!slug) return NextResponse.next();

  // روابط المتجر الداخلية تمر كما هي — نضيف البادئة لباقي المسارات فقط
  if (pathname.startsWith(`/store/`)) return NextResponse.next();

  // صفحات المنصة العامة تُعرض كما هي حتى على النطاقات المخصصة للمتاجر
  const PLATFORM_PATHS = ['/track', '/services', '/stores', '/search', '/nearby', '/blog', '/auth', '/complaint', '/p', '/q', '/r', '/u', '/directory', '/tools', '/offers', '/admin', '/seller', '/customer', '/driver'];
  if (PLATFORM_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/store/${slug}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // استثناء الأصول الثابتة وملفات PWA والرفوعات
  matcher: ['/((?!_next/static|_next/image|_next/data|favicon.ico|icon-|apple-|manifest.json|sw.js|uploads|api).*)'],
};
