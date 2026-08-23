// 🧹 تنظيف قاعدة البيانات الحية من رمز علم اليمن 🇾🇪
// يزيل الرمز من: محتوى الصفحات الثابتة، عناوين الشرائح، عناوين الإعلانات
// التشغيل داخل حاوية yz-api:
//   docker cp scripts/remove-ye-flag.js yz-api:/app/remove-ye-flag.js
//   docker exec yz-api node /app/remove-ye-flag.js
const { PrismaClient } = require('/app/dist/generated/prisma/client.js');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const FLAG = '🇾🇪';
// إزالة الرمز مع أي مسافة ملاصقة له (قبله أو بعده) ثم تنظيف المسافات المزدوجة
function clean(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/ ?🇾🇪 ?/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([—\-،.!؟?])/g, '$1')
    .trim();
}

async function main() {
  let total = 0;

  // 1) الصفحات الثابتة (من نحن، سياسة الخصوصية...)
  const pages = await prisma.page.findMany();
  for (const p of pages) {
    const updates = {};
    if (p.title && p.title.includes(FLAG)) updates.title = clean(p.title);
    if (p.content && p.content.includes(FLAG)) updates.content = clean(p.content);
    if (Object.keys(updates).length) {
      await prisma.page.update({ where: { id: p.id }, data: updates });
      total++;
      console.log(`✅ صفحة: ${p.slug}`);
    }
  }

  // 2) شرائح السلايدر
  const slides = await prisma.slide.findMany();
  for (const s of slides) {
    const updates = {};
    if (s.title && s.title.includes(FLAG)) updates.title = clean(s.title);
    if (s.subtitle && s.subtitle.includes(FLAG)) updates.subtitle = clean(s.subtitle);
    if (Object.keys(updates).length) {
      await prisma.slide.update({ where: { id: s.id }, data: updates });
      total++;
      console.log(`✅ شريحة: ${s.title || s.id}`);
    }
  }

  // 3) الإعلانات
  const ads = await prisma.ad.findMany();
  for (const a of ads) {
    const updates = {};
    if (a.title && a.title.includes(FLAG)) updates.title = clean(a.title);
    if (a.subtitle && a.subtitle.includes(FLAG)) updates.subtitle = clean(a.subtitle);
    if (Object.keys(updates).length) {
      await prisma.ad.update({ where: { id: a.id }, data: updates });
      total++;
      console.log(`✅ إعلان: ${a.title || a.id}`);
    }
  }

  // 4) المتاجر (الاسم والوصف)
  const stores = await prisma.store.findMany();
  for (const st of stores) {
    const updates = {};
    if (st.name && st.name.includes(FLAG)) updates.name = clean(st.name);
    if (st.description && st.description.includes(FLAG)) updates.description = clean(st.description);
    if (Object.keys(updates).length) {
      await prisma.store.update({ where: { id: st.id }, data: updates });
      total++;
      console.log(`✅ متجر: ${st.slug}`);
    }
  }

  // 5) المنتجات (الاسم والوصف)
  const products = await prisma.product.findMany({ where: { OR: [{ name: { contains: FLAG } }, { description: { contains: FLAG } }] } });
  for (const pr of products) {
    await prisma.product.update({
      where: { id: pr.id },
      data: { name: clean(pr.name), description: pr.description ? clean(pr.description) : pr.description },
    });
    total++;
    console.log(`✅ منتج: ${pr.name}`);
  }

  console.log(`\n🎉 انتهى التنظيف — تم تحديث ${total} سجل`);
}

main()
  .catch((e) => { console.error('❌ خطأ:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
