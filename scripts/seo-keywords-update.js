// 🔎 تحديث الكلمات المفتاحية SEO في قاعدة البيانات الحية
// يدمج مع الإعدادات الحالية (لا يمس العنوان/الوصف/الأرشفة) ويحدّث حقل الكلمات فقط
// التشغيل داخل حاوية yz-api:
//   docker cp scripts/seo-keywords-update.js yz-api:/app/seo-keywords-update.js
//   docker exec yz-api node /app/seo-keywords-update.js
const { PrismaClient } = require('/app/dist/generated/prisma/client.js');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const KEYWORDS = 'يمن زون, yemen zone, متجر إلكتروني يمني, التجارة الإلكترونية في اليمن, إنشاء متجر إلكتروني في اليمن, انشئ متجرك الإلكتروني, بيع أونلاين اليمن, تسوق أونلاين اليمن, تسوق إلكتروني, متاجر يمنية, منتجات يمنية, سوق يمني, السوق اليمني الإلكتروني, سوق المستعمل اليمن, مستعمل للبيع, عقارات اليمن, إيجارات, شقق للإيجار, فنادق اليمن, حجز فنادق, مطاعم يمنية, طلب طعام أونلاين, خدمات يمنية, الدليل التجاري اليمني, دليل الشركات اليمنية, توصيل طلبات, دفع إلكتروني يمني, محافظ إلكترونية, بيع برابط, متجر مجاني, منصة بيع يمنية, عروض وتخفيضات اليمن, صنعاء, عدن, تعز, الحديدة, إب, حضرموت, ذمار';

async function main() {
  const row = await prisma.setting.findUnique({ where: { key: 'seo' } });
  const current = (row && typeof row.value === 'object' && row.value) || {};

  const merged = { ...current, keywords: KEYWORDS };

  await prisma.setting.upsert({
    where: { key: 'seo' },
    update: { value: merged },
    create: { key: 'seo', group: 'seo', value: merged },
  });

  console.log('✅ تم تحديث الكلمات المفتاحية — الحقول المحفوظة:', Object.keys(merged).join(', '));
}

main()
  .catch((e) => { console.error('❌ خطأ:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
