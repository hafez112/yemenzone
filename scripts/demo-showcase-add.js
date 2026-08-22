// 🎪 إضافة متاجر العرض التجريبي باسم يمن زون — 5 متاجر فقط (مول + 4 منوّعة) بلا أسعار
// يُنفَّذ مرة واحدة داخل حاوية yz-api — لا يعدّل أي ملف من ملفات المنصة
// الحذف لاحقاً: سكربت «حذف-متاجر-العرض-التجريبي.txt»
const { PrismaClient } = require('/app/dist/generated/prisma/client.js');
const { PrismaPg } = require('@prisma/adapter-pg');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  // بائع العرض التجريبي — حساب واحد يملك المتاجر الخمسة
  const demoSeller = await prisma.seller.upsert({
    where: { phone: '700000000' },
    update: {},
    create: { phone: '700000000', name: 'يمن زون — العرض التجريبي', email: 'showcase@yemenzone1.com', termsAcceptedAt: new Date() },
  });

  const typeByKind = {};
  for (const t of await prisma.storeType.findMany()) typeByKind[t.kind] = t.id;

  const NOTE = '🎪 متجر عرض تجريبي من إدارة منصة يمن زون لاستعراض تجربة التسوق الحقيقية — الأسعار تُتفق مع البائع عند التواصل، وسيُستبدل هذا العرض بمتاجر البائعين الحقيقيين فور انضمامهم.';

  const mkStore = async (kind, slug, name, gov, desc, featured) => {
    if (!typeByKind[kind]) { console.log('⚠️ لا يوجد نوع نشاط:', kind); return null; }
    const ex = await prisma.store.findUnique({ where: { slug } });
    if (ex) { console.log('⏭️ موجود مسبقاً:', name); return ex; }
    const st = await prisma.store.create({
      data: {
        sellerId: demoSeller.id, typeId: typeByKind[kind], name, slug,
        description: `${desc}\n\n${NOTE}`, governorate: gov,
        isListed: true, listedAt: new Date(), isVerified: true,
        isFeatured: !!featured, featuredAt: featured ? new Date() : null,
        status: 'active',
      },
    });
    console.log('✅ أُنشئ:', name);
    return st;
  };

  // المنتجات: سعر 0 (بلا سعر) + مخزون 0 حتى لا يطلبها أحد بسعر صفر — عرض فقط
  const P = (name, description) => ({ name, description, price: 0, currency: 'YER', stock: 0, isActive: true });

  // 🏬 1) المول التجاري — أصناف رئيسية + منتجات موزعة + بانرات إعلانية داخل صفحته
  const mall = await mkStore('malls', 'yz-demo-mall', 'يمن زون | مول اليمن المركزي', 'صنعاء',
    'مول إلكتروني شامل يجمع الإلكترونيات والأزياء ومستلزمات المنزل في مكان واحد.', true);
  if (mall) {
    const hasProducts = await prisma.product.count({ where: { storeId: mall.id } });
    if (!hasProducts) {
      const cats = {};
      for (const [i, cn] of ['إلكترونيات وأجهزة', 'أزياء وعطور', 'المنزل والمطبخ'].entries()) {
        cats[cn] = await prisma.category.create({ data: { storeId: mall.id, name: cn, sort: i } });
      }
      const mallProducts = [
        ['إلكترونيات وأجهزة', 'جوال سامسونج جالاكسي A55', 'شاشة 6.6 بوصة وكاميرا 50MP وبطارية تدوم يوماً كاملاً.'],
        ['إلكترونيات وأجهزة', 'لابتوب HP بمعالج Core i5', 'أداء سلس للأعمال والدراسة مع ذاكرة 16GB وقرص SSD.'],
        ['إلكترونيات وأجهزة', 'سماعات بلوتوث لاسلكية', 'عزل ضوضاء وصوت نقي مع علبة شحن تدوم 24 ساعة.'],
        ['إلكترونيات وأجهزة', 'ساعة ذكية رياضية', 'تتبع نبض القلب والنوم والتمارين مع شاشة أموليد.'],
        ['أزياء وعطور', 'عطر عود ملكي فاخر', 'خلطة شرقية ثابتة تدوم طوال اليوم — 100 مل.'],
        ['أزياء وعطور', 'عباية نسائية مطرزة', 'قماش كريب فاخر وتطريز يدوي أنيق بمقاسات متعددة.'],
        ['أزياء وعطور', 'ثوب يمني تقليدي', 'قصّة مريحة وخامة قطنية عالية الجودة.'],
        ['المنزل والمطبخ', 'طقم قدور ستانلس ستيل', '10 قطع بقاعدة سميكة توزع الحرارة بالتساوي.'],
        ['المنزل والمطبخ', 'ماكينة قهوة منزلية', 'تحضير إسبريسو وقهوة عربية بلمسة واحدة.'],
        ['المنزل والمطبخ', 'سجادة صالون فاخرة', 'نقوش عصرية وخامة سهلة التنظيف — مقاس 2×3 متر.'],
      ];
      for (const [cn, name, description] of mallProducts) {
        await prisma.product.create({ data: { ...P(name, description), storeId: mall.id, categoryId: cats[cn].id } });
      }
      // بانرات المول — تظهر أعلى صفحته وداخل صفحات أقسامه
      await prisma.ad.create({ data: { title: '🏬 تجوّل في أقسام مول اليمن المركزي', subtitle: 'إلكترونيات · أزياء · المنزل والمطبخ', image: '/ads/mall-interior.jpg', link: '/store/yz-demo-mall/categories', position: 'store_top', size: 'wide', sort: 1, storeId: mall.id } });
      await prisma.ad.create({ data: { title: '🎉 عروض الافتتاح في المول', subtitle: 'اكتشف أحدث المعروضات — والسعر عند التواصل', image: '/ads/launch-offer.jpg', link: '/store/yz-demo-mall/mall/offers', position: 'store_top', size: 'wide', sort: 2, storeId: mall.id } });
    }
  }

  // 🛍️ 2) متجر منتجات — إلكترونيات
  const elec = await mkStore('products', 'yz-demo-electronics', 'يمن زون | إلكترونيات العصر', 'عدن',
    'أحدث الأجهزة الذكية والملحقات الأصلية مع ضمان معتمد.', true);
  if (elec && !(await prisma.product.count({ where: { storeId: elec.id } }))) {
    const items = [
      ['جوال آيفون 15', 'شاشة Super Retina وكاميرا 48MP وأداء شريحة A16.'],
      ['شاشة ذكية 43 بوصة', 'دقة 4K مع نظام أندرويد وتطبيقات المشاهدة المدمجة.'],
      ['شاحن متنقل 20000mAh', 'شحن سريع 22.5W يكفي 4 شحنات كاملة لجوالك.'],
      ['كاميرا مراقبة منزلية', 'رؤية ليلية وتنبيهات فورية على جوالك عبر الواي فاي.'],
      ['طابعة ليزر ملونة', 'طباعة سريعة اقتصادية للمنزل والمكتب.'],
      ['راوتر واي فاي 6', 'تغطية واسعة وسرعة مستقرة لكل أجهزة المنزل.'],
      ['تابلت تعليمي للأطفال', 'محتوى تعليمي آمن وتحكم كامل للوالدين.'],
      ['مكبر صوت ذكي', 'صوت محيطي قوي مع مساعد صوتي وبلوتوث 5.3.'],
      ['لوحة مفاتيح ميكانيكية', 'إضاءة RGB ومفاتيح سريعة الاستجابة للاعبين والمكاتب.'],
      ['قرص تخزين SSD بسعة 1TB', 'سرعات قراءة عالية تنقل ملفاتك في ثوانٍ.'],
    ];
    for (const [name, description] of items) {
      await prisma.product.create({ data: { ...P(name, description), storeId: elec.id } });
    }
  }

  // 🍽️ 3) مطعم — منيو يمني حقيقي
  const rest = await mkStore('restaurants', 'yz-demo-restaurant', 'يمن زون | مطعم المندي الملكي', 'صنعاء',
    'أصالة المطبخ اليمني: مندي ومظبي وحنيذ على الطريقة الحضرمية.', true);
  if (rest && !(await prisma.product.count({ where: { storeId: rest.id } }))) {
    const menu = [
      ['مندي لحم ضأن', 'لحم طري مطهو على الجمر مع أرز بسمتي متبل.'],
      ['مندي دجاج', 'دجاجة كاملة متبلة بخلطة المطعم الخاصة.'],
      ['مظبي لحم', 'على الحجارة الساخنة بالطريقة الحضرمية الأصيلة.'],
      ['حنيذ', 'لحم غنم مطهو ببطء حتى الذوبان.'],
      ['زربيان لحم', 'أرز ملون بالزعفران مع لحم وبهارات عدنية.'],
      ['بخاري دجاج', 'أرز بخاري غني بالبهارات مع دجاج مشوي.'],
      ['كبسة لحم', 'الطبق الخليجي الشهير بخلطة يمنية مميزة.'],
      ['سلتة يمنية', 'الطبق الشعبي الأول — حار وغني بالحلبة.'],
      ['فحسة', 'لحم مفروم مغلي بالحلبة يقدم ساخناً.'],
      ['بنت الصحن بالعسل', 'الحلى اليمني الأشهر بعسل سدر صافٍ وسمن بلدي.'],
    ];
    for (const [name, description] of menu) {
      await prisma.product.create({ data: { ...P(name, description), storeId: rest.id } });
    }
  }

  // 🏠 4) إيجارات — وحدات عقارية متنوعة
  const rent = await mkStore('rentals', 'yz-demo-rentals', 'يمن زون | عقارات السلام', 'تعز',
    'شقق وفلل ومحلات تجارية وقاعات بمواصفات موثقة ومواقع مميزة.');
  if (rent && !(await prisma.rentalUnit.count({ where: { storeId: rent.id } }))) {
    const units = [
      ['شقة 3 غرف وصالة بحي راقٍ', 'شقة', 3, 120, 'قريبة من المدارس والخدمات — دور ثالث مع أسانسير.'],
      ['شقة مفروشة بشارع رئيسي', 'شقة', 2, 90, 'مفروشة بالكامل مع مطبخ مجهز — تصلح للسكن الفوري.'],
      ['فيلا بحديقة واسعة', 'فيلا', 5, 350, 'دوران مستقلان ومجلس كبير ومدخل سيارة.'],
      ['محل تجاري بشارع رئيسي', 'محل', null, 60, 'واجهة زجاجية وموقع حيوي مناسب لكل الأنشطة.'],
      ['استوديو للأفراد', 'استوديو', 1, 45, 'مثالي للموظفين والطلاب — فواتير مشمولة.'],
      ['شقة دور أرضي بمدخل مستقل', 'شقة', 3, 110, 'مناسبة لكبار السن وذوي الاحتياجات الخاصة.'],
      ['قاعة مناسبات صغيرة', 'قاعة', null, 200, 'تتسع لـ 150 شخصاً مع نظام صوتي وتكييف مركزي.'],
      ['مكتب أعمال مجهز', 'مكتب', 2, 50, 'استقبال وقاعة اجتماعات صغيرة وإنترنت جاهز.'],
      ['شقة بسطح خاص', 'شقة', 2, 100, 'سطح مستقل بإطلالة مفتوحة على المدينة.'],
      ['مخزن بضائع آمن', 'مخزن', null, 150, 'ارتفاع مناسب وبوابة شحن وحراسة مستمرة.'],
    ];
    for (const [title, type, roomsCount, areaM2, description] of units) {
      await prisma.rentalUnit.create({
        data: {
          storeId: rent.id, title, type, description,
          pricePerDay: 0, pricePerMonth: null, currency: 'YER',
          roomsCount, areaM2, governorate: 'تعز', isActive: true,
        },
      });
    }
  }

  // 🛠️ 5) خدمات — صيانة جوالات
  const serv = await mkStore('services', 'yz-demo-services', 'يمن زون | صيانة الجوالات الذكية', 'الحديدة',
    'صيانة احترافية لكل أنواع الجوالات بقطع أصلية وضمان على الإصلاح.');
  if (serv && !(await prisma.serviceItem.count({ where: { storeId: serv.id } }))) {
    const svcs = [
      ['تغيير شاشة جوال', '30 دقيقة', 'شاشات أصلية الجودة لكل الموديلات الحديثة.'],
      ['استبدال بطارية أصلية', '20 دقيقة', 'بطاريات بسعة كاملة مع فحص صحة الشحن.'],
      ['صيانة منفذ الشحن', '40 دقيقة', 'إصلاح أو استبدال منافذ الشحن التالفة.'],
      ['فك قفل وسوفتوير', 'ساعة', 'حلول برمجية آمنة دون فقدان بياناتك.'],
      ['إصلاح تلف الماء', 'يوم', 'تنظيف بالموجات فوق الصوتية وفحص شامل للوحة.'],
      ['تغيير كاميرا', '30 دقيقة', 'كاميرات أمامية وخلفية بجودة أصلية.'],
      ['صيانة لوحة أم', 'يومان', 'إصلاح احترافي بمجهر ومعدات لحام دقيقة.'],
      ['تركيب حماية شاشة', '10 دقائق', 'زجاج مقوى 9D ضد الخدوش والصدمات.'],
      ['استرجاع بيانات محذوفة', '3 ساعات', 'استعادة الصور والملفات من الذاكرة التالفة.'],
      ['تحديث نظام وتسريع', '45 دقيقة', 'تنظيف كامل وتحديث آمن مع نسخة احتياطية.'],
    ];
    for (const [title, duration, description] of svcs) {
      await prisma.serviceItem.create({
        data: {
          storeId: serv.id, title, description, duration,
          price: 0, currency: 'YER', category: 'صيانة جوالات',
          warrantyText: 'ضمان 30 يوماً على الإصلاح', isActive: true,
        },
      });
    }
  }

  const total = await prisma.store.count({ where: { slug: { startsWith: 'yz-demo-' } } });
  console.log(`\n🎪 اكتمل العرض التجريبي — ${total} متاجر باسم يمن زون (مول + 4 منوّعة) بلا أسعار`);
  console.log('ℹ️ للحذف لاحقاً نفّذ سكربت: حذف-متاجر-العرض-التجريبي');
}

main().catch((e) => { console.error('❌ خطأ:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
