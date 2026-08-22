import Hero from '@/components/home/Hero';
import Slider from '@/components/home/Slider';
import { TrendingSection, RisingSection, NewestSection } from '@/components/home/Spotlight';
import FlashSaleBanner from '@/components/home/FlashSaleBanner';
import Features from '@/components/home/Features';
import StoresMarquee from '@/components/home/StoresMarquee';
import ServicesMarquee from '@/components/home/ServicesMarquee';
import BlogSection from '@/components/home/BlogSection';
import StoreTemplates from '@/components/home/StoreTemplates';
import Footer from '@/components/home/Footer';
import AdBanner from '@/components/home/AdBanner';
import AppQuickButtons from '@/components/home/AppQuickButtons';
import FreeServicesSection from '@/components/home/FreeServicesSection';
import StyleSwitcher from '@/components/StyleSwitcher';
import Reveal from '@/components/Reveal';
import AiAssistant from '@/components/AiAssistant';
import LaunchSound from '@/components/home/LaunchSound';
import LaunchRibbon from '@/components/home/LaunchRibbon';

import { SERVER_API as API } from '@/lib/server-api';

// ترتيب أقسام الرئيسية الافتراضي — الإدارة تعيد ترتيبها من /admin/design
const DEFAULT_ORDER = [
  'hero', 'slider', 'quickActions', 'flashSale', 'ads_top', 'trending', 'rising',
  'features', 'freeServices', 'newest', 'templates', 'ads_mid', 'stores', 'services', 'blog', 'cta',
];

// جلب البيانات من الخادم (SSR — ممتاز للـ SEO)
async function getData() {
  try {
    const [theme, stores, footerPages, topAds, midAds, bottomAds, services, blog, spotlight] = await Promise.all([
      fetch(`${API}/api/v1/theme`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${API}/api/v1/stores?featured=1`, { next: { revalidate: 120 } }).then(r => r.json()),
      fetch(`${API}/api/v1/platform/pages/footer`, { next: { revalidate: 300 } }).then(r => r.json()),
      fetch(`${API}/api/v1/ads?position=home_top`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${API}/api/v1/ads?position=home_mid`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${API}/api/v1/ads?position=home_bottom`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${API}/api/v1/platform/services`, { next: { revalidate: 120 } }).then(r => r.json()),
      fetch(`${API}/api/v1/platform/blog`, { next: { revalidate: 300 } }).then(r => r.json()),
      fetch(`${API}/api/v1/home/spotlight`, { next: { revalidate: 120 } }).then(r => r.json()),
    ]);
    return {
      theme, stores: Array.isArray(stores) ? stores : [],
      footerPages: Array.isArray(footerPages) ? footerPages : [],
      topAds: Array.isArray(topAds) ? topAds : [], midAds: Array.isArray(midAds) ? midAds : [],
      bottomAds: Array.isArray(bottomAds) ? bottomAds : [],
      services: Array.isArray(services) ? services : [],
      blog: Array.isArray(blog) ? blog : [],
      spotlight: spotlight && spotlight.stats ? spotlight : { stats: null, trending: [], rising: [], newest: [] },
    };
  } catch {
    return { theme: {}, stores: [], footerPages: [], topAds: [], midAds: [], bottomAds: [], services: [], blog: [], spotlight: { stats: null, trending: [], rising: [], newest: [] } };
  }
}

// 📱 تطبيق المنصة التقدمي يظهر هنا فقط — الصفحة الرئيسية وحدها تربط مانيفست المنصة
export const metadata = { manifest: '/manifest.json' };

export default async function Home() {
  const { theme, stores, footerPages, topAds, midAds, bottomAds, services, blog, spotlight } = await getData();
  const platform = theme?.platform || {};
  // أقسام ديناميكية — تُدار من /admin/design
  const sec = theme?.layout?.sections || {};
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // 🎯 بيانات منظمة — نتائج غنية في جوجل (موقع + مؤسسة + بحث داخلي)
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'WebSite',
      name: platform.name || 'يمن زون', url: SITE, inLanguage: 'ar',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/search?q={query}` },
        'query-input': 'required name=query',
      },
    },
    {
      '@context': 'https://schema.org', '@type': 'Organization',
      name: platform.name || 'يمن زون', url: SITE,
      description: platform.tagline || 'منصة التجارة الإلكترونية اليمنية',
      ...(theme?.seo?.ogImage ? { logo: theme.seo.ogImage } : {}),
    },
  ];

  // 🧩 خريطة الأقسام — الترتيب والإظهار من لوحة التحكم
  const sections: Record<string, any> = {
    hero: <><Hero platform={platform} stats={spotlight.stats} /><LaunchRibbon /></>,
    slider: <Slider slides={theme?.slides || []} />,
    // 🔘 أزرار الخدمات السريعة — تظهر داخل تطبيق أندرويد فقط (تُدار من تبويب التطبيق)
    quickActions: <AppQuickButtons buttons={theme?.app?.serviceButtons} />,
    flashSale: theme?.flashSale ? <FlashSaleBanner flash={theme.flashSale} /> : null,
    ads_top: <AdBanner ads={topAds} />,
    trending: <Reveal><TrendingSection products={spotlight.trending} /></Reveal>,
    rising: <Reveal delay={60}><RisingSection stores={spotlight.rising} /></Reveal>,
    features: <Reveal><Features /></Reveal>,
    // 🧰 عرض الخدمات المجانية — موقعه وإظهاره من إدارة التصميم
    freeServices: <Reveal><FreeServicesSection /></Reveal>,
    newest: <Reveal><NewestSection products={spotlight.newest} /></Reveal>,
    templates: <Reveal delay={80}><StoreTemplates /></Reveal>,
    ads_mid: <AdBanner ads={midAds} compact />,
    stores: <Reveal><StoresMarquee stores={stores} /></Reveal>,
    services: <Reveal><ServicesMarquee services={services} /></Reveal>,
    blog: <Reveal><BlogSection posts={blog.slice(0, 3)} /></Reveal>,
    cta: (
      <section className="max-w-4xl mx-auto px-3 py-8">
        <Reveal>
        <div className="bg-night rounded-3xl p-10 text-center text-white relative overflow-hidden border border-white/10 glow-soft">
          <div className="absolute -top-10 -left-10 w-40 h-40 anim-blob opacity-30"
            style={{ background: 'var(--primary)' }} />
          <div className="absolute -bottom-16 -right-10 w-52 h-52 anim-blob opacity-20"
            style={{ background: 'var(--secondary)', animationDelay: '-3s' }} />
          <h2 className="text-3xl font-black mb-3 relative">جاهز تبدأ رحلتك؟ 🚀</h2>
          <p className="text-gray-400 mb-6 relative">انضم لمئات التجار اليمنيين — مجاناً وبدون بطاقة ائتمان</p>
          <a href="/auth/seller-register"
            className="btn-primary btn-shine inline-block text-white font-extrabold px-10 py-4 rounded-full text-lg relative anim-pulse-glow">
            أنشئ متجرك الآن — مجاناً
          </a>
        </div>
        </Reveal>
      </section>
    ),
  };

  // قاعدة الإظهار: ads_top/ads_mid/ads_bottom تتبع مفتاح ads الموحد
  const visible = (key: string) => {
    if (key === 'flashSale') return sec.flashSale !== false;
    if (key.startsWith('ads_')) return sec.ads !== false;
    return sec[key] !== false;
  };

  // الترتيب من لوحة التحكم مع ضمان اكتمال كل الأقسام
  const saved: string[] = Array.isArray(theme?.layout?.sectionOrder) ? theme.layout.sectionOrder : [];
  const order = [...saved.filter((k) => DEFAULT_ORDER.includes(k)), ...DEFAULT_ORDER.filter((k) => !saved.includes(k))];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {order.map((key) => visible(key) && sections[key] ? <div key={key} data-section={key}>{sections[key]}</div> : null)}
      {/* 📢 إعلانات أسفل الرئيسية — قبل التذييل */}
      {sec.ads !== false && <AdBanner ads={bottomAds} />}

      <Footer platform={platform} pages={footerPages} />
      <StyleSwitcher />
      {/* 🤖 أيقونة الذكاء الاصطناعي — تظهر وتعمل حسب تحديد الإدارة */}
      <AiAssistant />
      {/* 🎵 جينجل الافتتاح — يعزف مرة عند أول تفاعل ويُكتم من زره */}
      <LaunchSound />
    </main>
  );
}
