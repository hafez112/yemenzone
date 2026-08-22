// 📰 بذرة مستقلة لمقالات المدونة — تضيف المقالات الناقصة فقط ولا تمس تعديلات الإدارة
// تُشغَّل تلقائياً عند إقلاع API حتى تصل المدونة حتى لو تعثّرت البذرة العامة لأي سبب
const { PrismaClient } = require('../dist/generated/prisma/client.js');
const { PrismaPg } = require('@prisma/adapter-pg');
const posts = require('./blog-posts.js');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  let added = 0;
  for (const p of posts) {
    const exists = await prisma.blogPost.findUnique({
      where: { slug: p.slug },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.blogPost.create({
      data: { ...p, publishedAt: new Date(p.publishedAt), isPublished: true },
    });
    added++;
  }
  console.log(`📰 المدونة جاهزة: ${posts.length} مقالة (أُضيف ${added} جديد)`);
}

main()
  .catch((e) => {
    console.error('⚠️ تعذّر تجهيز مقالات المدونة:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
