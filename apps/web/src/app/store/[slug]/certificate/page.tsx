import { notFound } from 'next/navigation';

import { getStorefront as getStore } from '@/lib/storefront';
import PrintButton from './PrintButton';


// 🎖️ الشهادة الرسمية للمتجر الموثق — قابلة للطباعة
// (404 تلقائياً إن لم يكن المتجر موثقاً)
export default async function CertificatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store || !store.isVerified) notFound();

  const primary = (store.themeJson as any)?.primary || '#6C3DF5';
  // 🏷️ تسمية النشاط في الشهادة — «فندق موثق» لا «متجر موثق»
  const kindNoun: Record<string, string> = { products: 'متجر', rentals: 'معرض إيجارات', hotel: 'فندق', services: 'مركز خدمات', restaurants: 'مطعم', malls: 'مول تجاري' };
  const noun = kindNoun[store.type?.kind || 'products'] || 'متجر';

  return (
    <main className="min-h-screen bg-gray-100 pt-20 pb-24 px-3 print:bg-white print:pt-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center gap-2 mb-4 print:hidden">
          <PrintButton />
          <a href={`/store/${store.slug}`}
            className="px-6 py-3 rounded-full font-bold bg-white shadow">→ المتجر</a>
        </div>

        {/* الشهادة — cert-sheet تُجبر الطابعة على إخراجها ملوّنة بالكامل */}
        <div className="cert-sheet bg-white rounded-3xl shadow-2xl overflow-hidden print:shadow-none">
          <div className="h-4" style={{ background: `linear-gradient(90deg, ${primary}, #00E5C7, #FFB800)` }} />
          <div className="p-8 md:p-12 text-center relative"
            style={{ background: `linear-gradient(180deg, ${primary}0d, transparent 35%), linear-gradient(0deg, #00E5C70a, transparent 30%)` }}>
            {/* إطار ذهبي داخلي */}
            <div className="absolute inset-4 border-2 border-amber-300/50 rounded-2xl pointer-events-none" />

            <div className="text-6xl mb-4">🎖️</div>
            <p className="text-sm font-bold text-gray-400 tracking-widest mb-1">منصة يمن زون للتجارة الإلكترونية</p>
            <h1 className="text-3xl md:text-4xl font-black mb-6" style={{ color: primary }}>
              شهادة توثيق {noun}
            </h1>

            <p className="text-gray-500 mb-2">تشهد إدارة منصة يمن زون بأن {noun === 'متجر' ? 'المتجر' : noun === 'فندق' ? 'الفندق' : noun === 'مطعم' ? 'المطعم' : noun === 'معرض إيجارات' ? 'معرض الإيجارات' : 'مركز الخدمات'}</p>
            <h2 className="text-2xl md:text-3xl font-black mb-2">
              {store.name}
            </h2>
            <p className="text-gray-500 mb-6">
              {store.type?.nameAr} — {store.governorate || 'الجمهورية اليمنية'}
            </p>

            <p className="text-gray-600 leading-relaxed max-w-lg mx-auto mb-8">
              قد استوفى جميع متطلبات التوثيق المعتمدة لدى المنصة، وأصبح {noun === 'متجر' ? 'متجراً' : noun === 'فندق' ? 'فندقاً' : noun === 'مطعم' ? 'مطعماً' : noun === 'معرض إيجارات' ? 'معرض إيجارات' : 'مركز خدمات'} موثقاً رسمياً
              يتمتع بشارة الثقة، ويحق له عرض هذه الشهادة لعملائه.
            </p>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
              <div className="border rounded-2xl p-3">
                <div className="font-black text-xl" style={{ color: primary }}>{store.smartScore?.toFixed(0) || 0}</div>
                <div className="text-[10px] text-gray-400 font-bold">الدرجة الذكية</div>
              </div>
              <div className="border rounded-2xl p-3">
                <div className="font-black text-xl text-amber-500">{store.ratingAvg?.toFixed(1) || '—'} ★</div>
                <div className="text-[10px] text-gray-400 font-bold">تقييم العملاء</div>
              </div>
              <div className="border rounded-2xl p-3">
                <div className="font-black text-xl text-rose-500">{store.likesCount} ❤️</div>
                <div className="text-[10px] text-gray-400 font-bold">إعجاب</div>
              </div>
            </div>

            <div className="flex items-end justify-between max-w-lg mx-auto">
              <div className="text-right">
                <div className="text-xs text-gray-400 mb-1">التاريخ</div>
                <div className="font-bold">{new Date().toLocaleDateString('ar-YE')}</div>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl mx-auto"
                  style={{ borderColor: primary, color: primary }}>
                  ✅
                </div>
                <div className="text-[10px] text-gray-400 font-bold mt-1">الختم الرسمي</div>
              </div>
              <div className="text-left">
                <div className="text-xs text-gray-400 mb-1">الرابط</div>
                <div className="font-bold" dir="ltr">{store.slug}.yemenzone.com</div>
              </div>
            </div>
          </div>
          <div className="h-4" style={{ background: `linear-gradient(90deg, #FFB800, #00E5C7, ${primary})` }} />
        </div>
      </div>
    </main>
  );
}
