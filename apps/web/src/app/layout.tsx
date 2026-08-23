import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';

// ⚡ خط Cairo ذاتي الاستضافة (متغير 200–1000) — لا حجب للعرض ولا اعتماد على جوجل
// خطوط الإدارة البديلة تُحمَّل ديناميكياً من TopBar عند اختيارها فقط
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import NativeApp from '@/components/NativeApp';
import MotionFallback from '@/components/MotionFallback';
import WebStudio from '@/components/WebStudio';
import ToastHost from '@/components/Toast';
import PwaRegister from '@/components/PwaRegister';
import PwaInstaller from '@/components/PwaInstaller';
import GaTracker from '@/components/GaTracker';
import VisitorTracker from '@/components/VisitorTracker';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const API = process.env.NEXT_PUBLIC_API_URL || '';

const DEFAULT_SEO = {
  metaTitle: 'يمن زون — أنشئ متجرك الإلكتروني في دقيقتين',
  metaDesc: 'منصة يمنية متكاملة لإنشاء المتاجر الإلكترونية: منتجات، إيجارات، فنادق، خدمات — بوابات دفع يمنية وتوصيل ومحافظ',
  keywords: 'يمن زون, yemen zone, متجر إلكتروني يمني, التجارة الإلكترونية في اليمن, إنشاء متجر إلكتروني في اليمن, انشئ متجرك الإلكتروني, بيع أونلاين اليمن, تسوق أونلاين اليمن, تسوق إلكتروني, متاجر يمنية, منتجات يمنية, سوق يمني, السوق اليمني الإلكتروني, سوق المستعمل اليمن, مستعمل للبيع, عقارات اليمن, إيجارات, شقق للإيجار, فنادق اليمن, حجز فنادق, مطاعم يمنية, طلب طعام أونلاين, خدمات يمنية, الدليل التجاري اليمني, دليل الشركات اليمنية, توصيل طلبات, دفع إلكتروني يمني, محافظ إلكترونية, بيع برابط, متجر مجاني, منصة بيع يمنية, عروض وتخفيضات اليمن, صنعاء, عدن, تعز, الحديدة, إب, حضرموت, ذمار',
  ogImage: '',
  googleVerification: '',
  gaId: '',
  indexing: true,
};

// 🔎 جلب إعدادات SEO من لوحة التحكم — تُخزّن مؤقتاً 5 دقائق (revalidate)
// بدون NEXT_PUBLIC_API_URL (مرحلة الفحص) نستخدم الافتراضيات مباشرة
export async function fetchSeo() {
  if (!API) return DEFAULT_SEO;
  try {
    const res = await fetch(`${API}/api/v1/platform/seo`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return DEFAULT_SEO;
    const d = await res.json();
    return { ...DEFAULT_SEO, ...d };
  } catch {
    return DEFAULT_SEO;
  }
}

// 🖼️ هوية المنصة (الشعار/الأيقونات) — يغيّرها المدير من الإعدادات
export async function fetchPlatformBrand() {
  if (!API) return {};
  try {
    const res = await fetch(`${API}/api/v1/theme`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    const d = await res.json();
    return d?.platform || {};
  } catch {
    return {};
  }
}

const absIcon = (u: string) => (u.startsWith('http') ? u : u.startsWith('/') ? u : `/${u}`);

// الميتا ديناميكية — يتحكم بها المدير من إعدادات «جوجل والأرشفة»
export async function generateMetadata(): Promise<Metadata> {
  const [seo, brand] = await Promise.all([fetchSeo(), fetchPlatformBrand()]);
  const iconUrl = absIcon(brand.faviconUrl || '/favicon.png');
  const appleUrl = absIcon(brand.appIconUrl || '/apple-touch-icon.png');
  return {
    metadataBase: new URL(SITE),
    title: { default: seo.metaTitle, template: '%s | يمن زون' },
    description: seo.metaDesc,
    keywords: seo.keywords ? seo.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : undefined,
    robots: seo.indexing ? undefined : { index: false, follow: false },
    openGraph: {
      type: 'website', locale: 'ar_YE', siteName: 'يمن زون',
      title: seo.metaTitle, description: seo.metaDesc,
      ...(seo.ogImage ? { images: [{ url: seo.ogImage.startsWith('http') ? seo.ogImage : `${API}${seo.ogImage}` }] } : {}),
    },
    twitter: { card: 'summary_large_image' },
    ...(seo.googleVerification ? { verification: { google: seo.googleVerification } } : {}),
    // 📱 مانيفست المنصة يُربط بالصفحة الرئيسية فقط (app/page.tsx) — لا يظهر تطبيق المنصة في اللوحات ولا المتاجر
    icons: { icon: [{ url: iconUrl }, { url: '/icon-192.png', sizes: '192x192' }], apple: appleUrl },
    appleWebApp: { capable: true, statusBarStyle: 'default', title: 'يمن زون' },
  };
}

// ⚡ أكواد الواجهة المخصصة — يضبطها المدير من /admin/design (CSS + سكربتات)
export async function fetchCustomCode() {
  if (!API) return {};
  try {
    const res = await fetch(`${API}/api/v1/theme`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    const d = await res.json();
    const c = d?.customCode || {};
    return {
      customCss: typeof c.customCss === 'string' ? c.customCss : '',
      headScripts: typeof c.headScripts === 'string' ? c.headScripts : '',
      bodyScripts: typeof c.bodyScripts === 'string' ? c.bodyScripts : '',
    };
  } catch {
    return {};
  }
}

export const viewport: Viewport = {
  themeColor: '#6C3DF5',
  width: 'device-width',
  initialScale: 1,
  // 📱 viewport-fit=cover ضروري لتمتد الواجهة تحت شريط الحالة داخل التطبيق الأصلي (env safe-area)
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [seo, code] = await Promise.all([fetchSeo(), fetchCustomCode()]);
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <head>
        {code.customCss ? <style dangerouslySetInnerHTML={{ __html: code.customCss }} /> : null}
        {code.headScripts ? <div dangerouslySetInnerHTML={{ __html: code.headScripts }} suppressHydrationWarning /> : null}
      </head>
      <body>
        {seo.gaId && <GaTracker gaId={seo.gaId} />}
        <ToastHost />
        <PwaRegister />
        <VisitorTracker />
        <MotionFallback />
        <NativeApp />
        <WebStudio />
        <TopBar />
        <div className="yz-main pb-20 md:pb-0">{children}</div>
        <BottomNav />
        <PwaInstaller />
        {code.bodyScripts ? <div dangerouslySetInnerHTML={{ __html: code.bodyScripts }} suppressHydrationWarning /> : null}
      </body>
    </html>
  );
}
