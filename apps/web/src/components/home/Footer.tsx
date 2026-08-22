import Link from 'next/link';

// 🇾🇪 الفوتر الموحد — تصميم مبتكر بأعمدة منظمة + شريط دعوة للإنشاء
export default function Footer({ platform, pages = [] }: { platform: any; pages?: { slug: string; title: string }[] }) {
  const year = new Date().getFullYear();

  const columns: { icon: string; title: string; links: { href: string; label: string }[] }[] = [
    {
      icon: '🏠', title: 'المنصة',
      links: [
        { href: '/about', label: 'من نحن' },
        { href: '/#features', label: 'المميزات' },
        { href: '/services', label: 'خدمات المنصة' },
        { href: '/blog', label: 'المدونة' },
        { href: '/stores', label: 'دليل المتاجر' },
      ],
    },
    {
      icon: '🛍️', title: 'للتجار',
      links: [
        { href: '/start', label: 'كيف تبدأ متجرك' },
        { href: '/auth/seller-register', label: 'أنشئ متجرك مجاناً' },
        { href: '/auth/login', label: 'دخول البائعين' },
        { href: '/driver/login', label: '🛵 دخول السائقين' },
        { href: '/seller/invite', label: '🤝 ادعُ التجار واكسب' },
        { href: '/#pricing', label: 'الخطط والأسعار' },
      ],
    },
    {
      icon: '🛒', title: 'للعملاء',
      links: [
        { href: '/explore', label: 'استكشاف المنتجات' },
        { href: '/offers', label: '🔥 عروض اليوم' },
        { href: '/tools/price-hunt', label: '⚖️ قارن الأسعار قبل الشراء' },
        { href: '/tools/requests', label: '📢 اطلبها ونوفرها' },
        { href: '/tools/quick-sell', label: '🔗 بع برابط واحد — مجاناً' },
        { href: '/tools/used-market', label: '♻️ سوق المستعمل — بدون عمولة' },
        { href: '/directory', label: '📖 دليل الأعمال اليمني' },
        { href: '/nearby', label: 'المتاجر القريبة' },
        { href: '/tools', label: '🧰 تكنولوجيا المنصة — خدمات مجانية' },
        { href: '/track', label: 'تتبع طلبك' },
        { href: '/auth/customer-login', label: 'حسابي' },
      ],
    },
    {
      icon: '🛡️', title: 'الدعم والقانون',
      links: [
        { href: '/help', label: 'مركز المساعدة' },
        { href: '/faq', label: 'الأسئلة الشائعة' },
        { href: '/complaint', label: 'قدّم شكوى' },
        { href: '/complaint/track', label: 'تتبع شكوى' },
        { href: '/returns', label: 'شروط الاسترجاع' },
        { href: '/privacy', label: 'سياسة الخصوصية' },
        { href: '/terms', label: 'سياسة الاستخدام' },
      ],
    },
  ];

  return (
    <footer className="mt-16 relative">
      {/* 🚀 شريط الدعوة العائم */}
      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <div className="relative overflow-hidden rounded-[2rem] p-8 md:p-10 text-center text-white shadow-2xl"
          style={{ background: 'linear-gradient(135deg, var(--primary), #4338ca 55%, var(--secondary, #00B3A4))' }}>
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl anim-blob" />
          <div className="absolute -bottom-20 -left-16 w-64 h-64 rounded-full bg-white/10 blur-2xl anim-blob" style={{ animationDelay: '-4s' }} />
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="relative">
            <h3 className="text-2xl md:text-3xl font-black mb-2">جاهز تفتح متجرك؟ 🚀</h3>
            <p className="text-white/80 text-sm md:text-base mb-5 max-w-xl mx-auto">
              انضم لتجار يمن زون — متجرك جاهز في دقيقتين: منتجات، طلبات، محفظة، وكوبونات. بلا برمجة.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/auth/seller-register"
                className="px-7 py-3.5 rounded-2xl bg-white font-extrabold text-sm shadow-xl transition-transform hover:scale-105"
                style={{ color: 'var(--primary)' }}>
                ✨ أنشئ متجرك مجاناً
              </Link>
              <Link href="/stores"
                className="px-7 py-3.5 rounded-2xl font-extrabold text-sm text-white border-2 border-white/40 backdrop-blur transition-colors hover:bg-white/10">
                🛍️ تصفح المتاجر
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* جسم الفوتر */}
      <div className="text-white -mt-14 pt-24" style={{ background: 'linear-gradient(180deg, #0c0718, #150b2e)' }}>
        {/* خط علوي متدرج */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, var(--primary), var(--secondary, #00B3A4), transparent)' }} />

        <div className="max-w-6xl mx-auto px-4 pt-10 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            {/* العلامة */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <img src={platform?.logoUrl || '/logo.png'} alt="يمن زون" className="w-9 h-9 object-contain" />
                <span className="font-black text-xl">يمن <span style={{ color: 'var(--secondary, #00E5C7)' }}>زون</span></span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                {platform?.tagline || 'منصة التجارة الإلكترونية اليمنية — متاجر جاهزة، مدفوعات محلية، وتوصيل ذكي. كل ما يحتاجه التاجر اليمني في مكان واحد.'}
              </p>
              <div className="space-y-2 text-sm">
                {platform?.whatsapp && (
                  <a href={`https://wa.me/${String(platform.whatsapp).replace(/[^0-9]/g, '')}`} target="_blank"
                    className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">📱</span>
                    <span dir="ltr">{platform.whatsapp}</span>
                  </a>
                )}
                {platform?.email && (
                  <a href={`mailto:${platform.email}`} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <span className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">✉️</span>
                    {platform.email}
                  </a>
                )}
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">📍</span>
                  الجمهورية اليمنية
                </div>
              </div>
            </div>

            {/* أعمدة الروابط المنظمة */}
            {columns.map((c) => (
              <div key={c.title} className="col-span-1">
                <h4 className="font-extrabold text-sm mb-4 flex items-center gap-1.5 text-gray-200">
                  <span>{c.icon}</span> {c.title}
                </h4>
                <ul className="space-y-2.5 text-[13px]">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href}
                        className="text-gray-400 hover:text-white transition-all hover:pr-1 inline-block">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* الصفحات المخصصة من الإدارة */}
          {pages.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <h4 className="font-extrabold text-xs mb-3 text-gray-500">📄 صفحات إضافية</h4>
              <div className="flex flex-wrap gap-2">
                {pages.map((p) => (
                  <Link key={p.slug} href={'/p/' + p.slug}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all">
                    {p.title}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* الشريط السفلي */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              © {year} <b className="text-gray-400">يمن زون</b> — جميع الحقوق محفوظة
            </p>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/returns" className="text-gray-400 hover:text-white transition-colors font-bold">↩️ الاسترجاع</Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors font-bold">🔒 الخصوصية</Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors font-bold">📜 الاستخدام</Link>
              <span className="text-gray-600">|</span>
              <span className="text-gray-500">صُنع بـ❤️ في اليمن</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
