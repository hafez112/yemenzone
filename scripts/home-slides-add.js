// 🎬 إضافة 5 شرائح ترحيبية لسلايدر الصفحة الرئيسية — بعبارات ترحيب بالمنصة
// يُنفَّذ مرة واحدة داخل حاوية yz-api: docker cp ... yz-api:/app/ ثم node /app/home-slides-add.js
// لا يعدّل أي ملف من ملفات المنصة — يضيف شرائح في قاعدة البيانات فقط (تُدار لاحقاً من /admin/design)
const { PrismaClient } = require('/app/dist/generated/prisma/client.js');
const { PrismaPg } = require('@prisma/adapter-pg');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const SITE = 'https://yemenzone1.com';

const slides = [
  {
    title: 'أهلاً وسهلاً بك في يمن زون',
    subtitle: 'منصة اليمن الأولى للتجارة الإلكترونية — انطلقنا رسمياً بفضل الله',
    image: `${SITE}/ads/welcome-1.jpg`, link: '/explore', sort: 1,
  },
  {
    title: 'تسوّق من كل أنحاء اليمن 🛍️',
    subtitle: 'منتجات · مطاعم · فنادق · خدمات · إيجارات · مولات — كلها في مكان واحد',
    image: `${SITE}/ads/welcome-2.jpg`, link: '/stores', sort: 2,
  },
  {
    title: 'افتح نشاطك التجاري مجاناً 🏪',
    subtitle: 'لوحة تحكم عربية كاملة بلا خبرة برمجية — وابدأ البيع من اليوم الأول',
    image: `${SITE}/ads/welcome-3.jpg`, link: '/auth/seller-register', sort: 3,
  },
  {
    title: 'بطاقة يمن زون 💳',
    subtitle: 'اشحن وادفع بأي عملة — والتحويل يتم تلقائياً بأسعار الصرف المعتمدة',
    image: `${SITE}/ads/welcome-4.jpg`, link: '/customer/card', sort: 4,
  },
  {
    title: '🎉 عرض الافتتاح — الباقة الكاملة بـ 100 ر.س',
    subtitle: 'كل مميزات المنصة مفتوحة 6 أشهر بمناسبة الانطلاق — لفترة محدودة',
    image: `${SITE}/ads/welcome-5.jpg`, link: '/start', sort: 5,
  },
];

async function main() {
  // إخفاء شرائح «قريباً» القديمة — المنصة انطلقت رسمياً ولم تعد قيد التجهيز
  const old = await prisma.slide.updateMany({
    where: { OR: [{ title: { contains: 'قريبا' } }, { subtitle: { contains: 'قريبا' } }] },
    data: { isActive: false },
  });
  if (old.count) console.log(`⏸️ أُخفيت ${old.count} شريحة قديمة تقول «قريباً» — المنصة انطلقت فعلاً`);

  for (const s of slides) {
    const ex = await prisma.slide.findFirst({ where: { image: s.image } });
    if (ex) {
      await prisma.slide.update({
        where: { id: ex.id },
        data: { title: s.title, subtitle: s.subtitle, link: s.link, sort: s.sort, isActive: true },
      });
      console.log('♻️ موجودة — حُدّثت:', s.title);
    } else {
      await prisma.slide.create({ data: s });
      console.log('✅ أُضيفت:', s.title);
    }
  }
  const total = await prisma.slide.count({ where: { isActive: true } });
  console.log(`\n🎬 اكتمل — السلايدر يعرض الآن ${total} شرائح نشطة (5 ترحيبية جديدة)`);
  console.log('ℹ️ تستطيع تعديل أو حذف أي شريحة من: لوحة الأدمن ← التصميم ← الشرائح');
}

main().catch((e) => { console.error('❌ خطأ:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
