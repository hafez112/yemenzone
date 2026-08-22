// بذور البيانات الأولية — تعمل تلقائياً عند أول تشغيل (Docker)
// Prisma 7: العميل المولّد المُترجم من dist + محوّل PostgreSQL
const { PrismaClient } = require('../dist/generated/prisma/client.js');
const { PrismaPg } = require('@prisma/adapter-pg');
const argon2 = require('argon2');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // 1) المدير الرئيسي
  const hash = await argon2.hash('admin123456');
  await prisma.adminUser.upsert({
    where: { email: 'admin@yemenzone.com' },
    update: {},
    create: {
      email: 'admin@yemenzone.com',
      name: 'مدير المنصة',
      passwordHash: hash,
      isSuper: true,
      permissions: ['*'],
    },
  });

  // 2) أنواع المتاجر الأربعة الافتراضية (kind لم يعد فريداً — تُنشأ فقط إن غابت)
  const kinds = [
    { kind: 'products', nameAr: 'متجر منتجات',   icon: '🛍️', color: '#6C3DF5', sort: 1, description: 'إلكترونيات، أغذية، ملابس...' },
    { kind: 'rentals',  nameAr: 'عقارات للإيجار', icon: '🏠', color: '#0E9F8C', sort: 2, description: 'شقق، فلل، محلات للإيجار' },
    { kind: 'hotel',    nameAr: 'فندق',          icon: '🏨', color: '#B45309', sort: 3, description: 'غرف وحجوزات فندقية' },
    { kind: 'services', nameAr: 'مركز خدمات',    icon: '🛠️', color: '#2563EB', sort: 4, description: 'صيانة، تصميم، استشارات...' },
  ];
  for (const k of kinds) {
    const existing = await prisma.storeType.findFirst({ where: { kind: k.kind, nameAr: k.nameAr } });
    if (existing) {
      // حدّث الحقول الفارغة فقط — لا تُسقط تعديلات الإدارة
      await prisma.storeType.update({
        where: { id: existing.id },
        data: {
          icon: existing.icon || k.icon,
          color: existing.color || k.color,
          description: existing.description || k.description,
        },
      });
    } else {
      await prisma.storeType.create({ data: k });
    }
  }

  // 3) الخطط الثلاث — features هي مصدر صلاحيات البائع (المدير يتحكم بها من /admin/plans)
  const plans = [
    { name: 'مجاني',    slug: 'free',  priceMonthly: 0,     sort: 1,
      features: { maxProducts: 20, maxImages: 3, storeKinds: ['products'],
        analytics: false, coupons: false, api: false, customDesign: false, customDomain: false, campaigns: false } },
    { name: 'أساسي',    slug: 'basic', priceMonthly: 5000,  sort: 2,
      features: { maxProducts: 200, maxImages: 6, storeKinds: ['products', 'services'],
        analytics: true, coupons: true, api: false, customDesign: true, customDomain: false, campaigns: true } },
    { name: 'احترافي',  slug: 'pro',   priceMonthly: 12000, sort: 3,
      features: { maxProducts: -1, maxImages: 10, storeKinds: ['products', 'rentals', 'hotel', 'services'],
        analytics: true, coupons: true, api: true, customDesign: true, customDomain: true, campaigns: true,
        finance: true, inventory: true, crm: true } },
    // 👑 الخطة الذهبية — كل الميزات + بنرات المتجر + تطبيق الويب التقدمي
    { name: 'ذهبي 👑',  slug: 'gold',  priceMonthly: 25000, sort: 4,
      features: { maxProducts: -1, maxImages: 15, storeKinds: ['products', 'rentals', 'hotel', 'services'],
        analytics: true, coupons: true, api: true, customDesign: true, customDomain: true, campaigns: true,
        storeAds: true, pwa: true, finance: true, inventory: true, crm: true } },
  ];
  for (const p of plans) {
    // تحديث الميزات دائماً — يضمن وصول مفاتيح الميزات الجديدة للخطط المزروعة سابقاً
    await prisma.plan.upsert({ where: { slug: p.slug }, update: { features: p.features }, create: p });
  }

  // 3ب) باقات متخصصة لكل نشاط تجاري — حدود تناسب طبيعة النشاط (وحدات/غرف/خدمات)
  // الباقات الأربع أعلاه عامة (kind=null) — وهذه مخصصة تظهر لأصحاب النشاط المطابق فقط
  const kindPlans = [
    // 🏠 الإيجارات
    { name: 'إيجارات أساسي', slug: 'rentals-basic', kind: 'rentals', priceMonthly: 6000, sort: 11,
      features: { maxUnits: 10, maxImages: 6, storeKinds: ['rentals'],
        analytics: true, coupons: false, api: false, customDesign: true, customDomain: false, campaigns: false } },
    { name: 'إيجارات احترافي', slug: 'rentals-pro', kind: 'rentals', priceMonthly: 14000, sort: 12,
      features: { maxUnits: -1, maxImages: 12, storeKinds: ['rentals'],
        analytics: true, coupons: true, api: false, customDesign: true, customDomain: true, campaigns: true,
        finance: true, crm: true } },
    // 🛎️ الفنادق
    { name: 'فندقي أساسي', slug: 'hotel-basic', kind: 'hotel', priceMonthly: 8000, sort: 13,
      features: { maxRooms: 8, maxImages: 8, storeKinds: ['hotel'],
        analytics: true, coupons: true, api: false, customDesign: true, customDomain: false, campaigns: false } },
    { name: 'فندقي احترافي', slug: 'hotel-pro', kind: 'hotel', priceMonthly: 18000, sort: 14,
      features: { maxRooms: -1, maxImages: 15, storeKinds: ['hotel'],
        analytics: true, coupons: true, api: true, customDesign: true, customDomain: true, campaigns: true,
        finance: true, crm: true, storeAds: true, pwa: true } },
    // 🛠️ الخدمات
    { name: 'خدمات أساسي', slug: 'services-basic', kind: 'services', priceMonthly: 4000, sort: 15,
      features: { maxServices: 10, maxImages: 4, storeKinds: ['services'],
        analytics: true, coupons: false, api: false, customDesign: true, customDomain: false, campaigns: false } },
    { name: 'خدمات احترافي', slug: 'services-pro', kind: 'services', priceMonthly: 10000, sort: 16,
      features: { maxServices: -1, maxImages: 10, storeKinds: ['services'],
        analytics: true, coupons: true, api: false, customDesign: true, customDomain: true, campaigns: true,
        finance: true, crm: true } },
  ];
  for (const p of kindPlans) {
    await prisma.plan.upsert({ where: { slug: p.slug }, update: { features: p.features, kind: p.kind }, create: p });
  }

  // 4) العملات
  const currencies = [
    { code: 'YER', name: 'ريال يمني',   symbol: 'ر.ي', rateToUsd: 530,  isDefault: true },
    { code: 'SAR', name: 'ريال سعودي',  symbol: 'ر.س', rateToUsd: 3.75 },
    { code: 'USD', name: 'دولار أمريكي', symbol: '$',   rateToUsd: 1 },
  ];
  for (const c of currencies) {
    await prisma.currency.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  // 5) محافظات اليمن
  const govs = ['صنعاء','عدن','تعز','الحديدة','إب','ذمار','حضرموت','مأرب','عمران','حجة','صعدة','المكلا','لحج','أبين','الضالع','شبوة','المهرة','الجوف','ريمة','المحويت','بيضاء','سقطرى'];
  for (let i = 0; i < govs.length; i++) {
    const exists = await prisma.governorate.findFirst({ where: { name: govs[i] } });
    if (!exists) await prisma.governorate.create({ data: { name: govs[i], sort: i } });
  }

  // 6) إعدادات التصميم الافتراضية (نظام إدارة التصميم — الجلسة 18)
  const themeDefaults = [
    { group: 'theme', key: 'colors', value: { primary: '#6C3DF5', secondary: '#00E5C7', accent: '#FFB800', bg: '#F7F7FC', dark: '#0A0A14' } },
    { group: 'theme', key: 'fonts',  value: { family: 'Cairo', headingSize: '2.5rem', bodySize: '1rem' } },
    { group: 'theme', key: 'layout', value: { topBar: true, menuStyle: 'glass', footerStyle: 'dark', darkMode: true } },
    { group: 'general', key: 'platform', value: { name: 'يمن زون', tagline: 'أنشئ متجرك الإلكتروني في دقيقتين', whatsapp: '', email: '' } },
    { group: 'security', key: 'settings', value: { otpEnabled: false, forceApiKey: false, maxLoginAttempts: 5, deviceApproval: true } },
    // 💰 أسعار الإعلانات الأسبوعية — يعدّلها المدير من /admin/ads (لا تُمسح عند إعادة التشغيل)
    { group: 'general', key: 'adPricing', value: { home_top: 5000, home_mid: 3000 } },
  ];
  for (const s of themeDefaults) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  // 7) قوالب الرسائل الافتراضية (معطّلة — يفعّلها المدير من /admin/messaging)
  const tpls = [
    { event: 'otp', channel: 'sms', body: 'يمن زون: رمز التحقق الخاص بك هو {code} — صالح لمدة 10 دقائق. لا تشاركه مع أحد.', isActive: false },
    { event: 'order_new', channel: 'whatsapp', body: 'مرحباً {name} 👋 تم استلام طلبك {number} من متجر {store} بقيمة {total}. سنؤكد طلبك قريباً — شكراً لثقتك! 🌟', isActive: false },
    { event: 'order_status', channel: 'whatsapp', body: 'تحديث طلبك {number} من {store}: الحالة الآن "{status}" 📦', isActive: false },
    { event: 'booking_status', channel: 'whatsapp', body: 'مرحباً {name}، حجزك {number} لدى {store} أصبح "{status}" 📅', isActive: false },
    { event: 'subscription_approved', channel: 'sms', body: 'مبروك {name}! 🎉 تم تفعيل اشتراك متجرك {store} في باقة {plan}.', isActive: false },
    { event: 'driver_assigned', channel: 'sms', body: 'طلبك {number} مع السائق {driver} ({driverPhone}) 🛵 سيتواصل معك قريباً.', isActive: false },
    { event: 'card_verify', channel: 'sms', body: 'يمن زون: رمز تأكيد الدفع من بطاقتك هو {code} — لا تشاركه مع أحد أبداً 🔐', isActive: false },
    { event: 'return_request', channel: 'whatsapp', body: '↩️ طلب استرجاع جديد في متجرك {store}: الطلب {number} من {customer} — السبب: {reason}. راجعه من لوحة التحكم: /seller/returns', isActive: false },
    { event: 'return_status', channel: 'whatsapp', body: 'مرحباً {name} 👋 بخصوص طلبك {number}: {status}', isActive: false },
  ];
  for (const t of tpls) {
    await prisma.messageTemplate.upsert({ where: { event: t.event }, update: {}, create: t });
  }

  // 10) بوابات دفع افتراضية (يمنية)
  const gateways = [
    { name: 'الكريمي — حوالة', provider: 'bank', accountInfo: 'حساب: 123456789 باسم يمن زون', instructions: 'حوّل المبلغ عبر الكريمي جوال أو الفروع ثم ارفع صورة الحوالة', scopes: ['orders', 'subscription', 'topup'] },
    { name: 'محفظة جيب', provider: 'wallet', accountInfo: 'محفظة: 777000000', instructions: 'أرسل المبلغ لمحفظة جيب ثم ارفع لقطة شاشة للتأكيد', scopes: ['orders', 'topup'] },
    { name: 'ون كاش', provider: 'wallet', accountInfo: 'محفظة: 733000000', instructions: 'حوّل عبر ون كاش وأرفق الإشعار', scopes: ['orders'] },
  ];
  for (const g of gateways) {
    const exists = await prisma.paymentGateway.findFirst({ where: { name: g.name } });
    if (!exists) await prisma.paymentGateway.create({ data: g });
  }


  // 11) إعدادات الجلسة 18: هوية موسعة + أقسام الواجهة
  const design18 = [
    { group: 'general', key: 'platform', value: { name: 'يمن زون', tagline: 'أنشئ متجرك الإلكتروني في دقيقتين', whatsapp: '', email: '', announcement: '', announcementActive: false } },
    { group: 'theme', key: 'layout', value: { topBar: true, menuStyle: 'glass', footerStyle: 'dark', darkMode: true, sections: { hero: true, slider: true, features: true, templates: true, pricing: true, stores: true, cta: true } } },
  ];
  for (const s of design18) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  // 12) صفحات مخصصة افتراضية
  const pages18 = [
    { slug: 'about', title: 'من نحن', showInMenu: true, showInFooter: true, sortOrder: 1,
      metaDesc: 'تعرف على منصة يمن زون — منصة يمنية لإنشاء المتاجر الإلكترونية',
      content: '<h2>منصة يمن زون 🇾🇪</h2><p>يمن زون منصة يمنية متكاملة تمكّن أي تاجر من إنشاء متجره الإلكتروني خلال دقائق — منتجات، إيجارات، فنادق، وخدمات.</p><p>نوفر بوابات دفع يمنية، سائقي توصيل، محافظ وبطاقات شحن، ورسائل SMS/واتساب — كل ما تحتاجه لتنجح في التجارة الإلكترونية.</p>' },
    { slug: 'contact', title: 'تواصل معنا', showInMenu: false, showInFooter: true, sortOrder: 2,
      metaDesc: 'تواصل مع فريق منصة يمن زون',
      content: '<h2>تواصل معنا 📞</h2><p>فريقنا جاهز لمساعدتك في أي وقت:</p><ul><li>واتساب: عبر زر التواصل في الصفحة الرئيسية</li><li>الشكاوى: من صفحة تتبع الشكاوى</li></ul>' },
    { slug: 'faq', title: 'الأسئلة الشائعة', showInMenu: false, showInFooter: true, sortOrder: 3,
      metaDesc: 'إجابات عن أكثر الأسئلة شيوعاً حول منصة يمن زون',
      content: '<h2>الأسئلة الشائعة ❓</h2><p><b>كيف أنشئ متجري؟</b> سجّل كتاجر، فعّل حسابك برمز OTP، ثم اتبع معالج الإعداد.</p><p><b>كيف يدفع لي العملاء؟</b> كاش عند الاستلام، بوابات يمنية (الكريمي/جيب/ون كاش)، أو بطاقات الشحن.</p><p><b>كم تكلفة المنصة؟</b> الباقة الأساسية مجانية — راجع قسم الأسعار في الرئيسية.</p>' },
  ];
  for (const pg of pages18) {
    await prisma.customPage.upsert({ where: { slug: pg.slug }, update: {}, create: pg });
  }

  // 13) خدمات منصة افتراضية
  const pservices = [
    { title: '🎨 تصميم شعار احترافي', description: 'شعار مميز لمتجرك بثلاث نماذج للاختيار + ملفات عالية الجودة', price: 15000, sort: 1 },
    { title: '📸 تصوير منتجات', description: 'جلسة تصوير احترافية حتى 20 منتجاً بخلفية بيضاء وإضاءة استوديو', price: 25000, sort: 2 },
    { title: '📣 إدارة حملة إعلانية', description: 'إدارة حملة ممولة على فيسبوك/إنستغرام لمدة شهر مع تقرير أسبوعي', price: 30000, sort: 3 },
    { title: '✅ توثيق متجرك', description: 'مراجعة مستنداتك ومنح شارة التوثيق الزرقاء لمتجرك', price: 10000, sort: 4 },
  ];
  for (const s of pservices) {
    const exists = await prisma.platformService.findFirst({ where: { title: s.title } });
    if (!exists) await prisma.platformService.create({ data: s });
  }

  // 14) ترحيل لمرة واحدة: المتاجر الموجودة قبل ميزة «الظهور بالدليل بموافقة الإدارة» تبقى مدرجة
  // (المتاجر الجديدة تُنشأ مخفية isListed=false حتى توافق الإدارة من لوحة التحكم)
  const migListed = await prisma.setting.findUnique({ where: { key: 'mig_listed_v1' } });
  if (!migListed) {
    const r = await prisma.store.updateMany({ where: { isListed: false }, data: { isListed: true, listedAt: new Date() } });
    await prisma.setting.create({ data: { key: 'mig_listed_v1', value: { done: true, count: r.count, at: new Date().toISOString() } } });
    if (r.count) console.log(`🗂️ أُدرج ${r.count} متجراً قائماً في الدليل (ترحيل لمرة واحدة)`);
  }

  // 15) 📰 مقالات المدونة — محتوى حقيقي يُزرع مرة واحدة ولا يمس تعديلات الإدارة لاحقاً
  const posts = require('./blog-posts.js');
  let seededPosts = 0;
  for (const p of posts) {
    const r = await prisma.blogPost.upsert({
      where: { slug: p.slug },
      update: {}, // لا نفرض المحتوى — تعديلات الإدارة من /admin/blog محفوظة
      create: { ...p, publishedAt: new Date(p.publishedAt), isPublished: true },
    });
    if (r.createdAt.getTime() === r.updatedAt.getTime()) seededPosts++;
  }
  if (seededPosts) console.log(`📰 زُرعت ${seededPosts} مقالة جديدة في المدونة`);

  console.log('✅ تم تهيئة قاعدة البيانات — المدير: admin@yemenzone.com / admin123456');
}

main().catch(console.error).finally(() => prisma.$disconnect());
