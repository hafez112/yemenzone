// 🧹 حذف متاجر العرض التجريبي باسم يمن زون — نهائياً وبضغطة واحدة
// يُنفَّذ داخل حاوية yz-api عند انضمام البائعين الحقيقيين
// يحذف: المتاجر الخمسة (yz-demo-*) + كل منتجاتها/وحداتها/خدماتها/أصنافها + إعلاناتها + حساب البائع التجريبي
const { PrismaClient } = require('/app/dist/generated/prisma/client.js');
const { PrismaPg } = require('@prisma/adapter-pg');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const demoStores = await prisma.store.findMany({
    where: { slug: { startsWith: 'yz-demo-' } },
    select: { id: true, name: true },
  });
  if (!demoStores.length) {
    console.log('ℹ️ لا توجد متاجر عرض تجريبي — لا شيء للحذف');
    return;
  }
  const ids = demoStores.map((s) => s.id);

  // طلبات/حجوزات قد تكون أُنشئت على متاجر العرض — تُحذف أولاً حتى لا تعيق الحذف
  try { await prisma.order.deleteMany({ where: { storeId: { in: ids } } }); } catch {}
  // إعلانات متاجر العرض — storeId نصي بلا علاقة تلقائية
  await prisma.ad.deleteMany({ where: { storeId: { in: ids } } });
  // حذف المتاجر — المنتجات والوحدات والغرف والخدمات والأصناف والحجوزات تُحذف تلقائياً (Cascade)
  await prisma.store.deleteMany({ where: { id: { in: ids } } });

  // حساب البائع التجريبي — يُحذف فقط إن لم يعد يملك أي متجر
  const demoSeller = await prisma.seller.findFirst({ where: { phone: '700000000' } });
  if (demoSeller) {
    const remaining = await prisma.store.count({ where: { sellerId: demoSeller.id } });
    if (!remaining) await prisma.seller.delete({ where: { id: demoSeller.id } });
  }

  console.log(`🧹 حُذفت ${demoStores.length} متاجر عرض تجريبي نهائياً:`);
  for (const s of demoStores) console.log('   ✕', s.name);
  console.log('✅ المنصة الآن للبائعين الحقيقيين فقط');
}

main().catch((e) => { console.error('❌ خطأ:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
