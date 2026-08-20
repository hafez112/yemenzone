'use client';
import Link from 'next/link';
import { imgUrl } from '@/lib/api';

// ✨ أقسام الرئيسية الديناميكية — كلها من بيانات البيع الفعلية (آخر 14 يوماً)

// بطاقة منتج موحدة — زووم ناعم للصورة + شارات حديثة
function ProductCard({ p, badge }: { p: any; badge?: string }) {
  const price = Number(p.salePrice || p.price);
  return (
    <Link href={`/store/${p.store.slug}/product/${p.id}`}
      className="glass card-glow rounded-3xl p-3 w-44 shrink-0 card-hover block snap-start">
      <div className="relative w-full h-32 rounded-2xl mb-2.5 skeleton flex items-center justify-center text-3xl overflow-hidden">
        <div className="absolute inset-0 zoom-bg"
          style={p.images?.[0] ? { background: `url(${imgUrl(p.images[0])}) center/cover` } : {}} />
        {!p.images?.[0] && <span className="relative">📦</span>}
        {badge && (
          <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold px-2 py-0.5 rounded-full text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#dc2626)' }}>{badge}</span>
        )}
        {p.salePrice && (
          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow">
            -{Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100)}%
          </span>
        )}
      </div>
      <div className="font-extrabold f-sm truncate">{p.name}</div>
      <div className="flex items-center justify-between mt-1">
        <span className="font-black text-sm grad-text">{price.toLocaleString()} <span className="text-[9px]">ر.ي</span></span>
        {p.salePrice && <span className="text-[10px] text-gray-400 line-through">{Number(p.price).toLocaleString()}</span>}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5 truncate">
        🏪 {p.store.name} {p.store.isVerified && <span className="verified-badge">✓</span>}
      </div>
    </Link>
  );
}

// غلاف قسم موحد — أيقونة بشريحة متدرجة + عنوان مرن الحجم
function Section({ icon, title, sub, children, link }: any) {
  return (
    <section className="py-6">
      <div className="flex items-end justify-between mb-5 px-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="section-chip">{icon}</span>
          <div>
            <h2 className="f-2xl font-black">{title}</h2>
            <p className="text-gray-500 f-xs mt-0.5">{sub}</p>
          </div>
        </div>
        {link && (
          <Link href={link}
            className="chip-filter on !py-1.5 shrink-0 hidden sm:inline-block">
            الكل ←
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto px-3 pb-2 max-w-6xl mx-auto snap-x edge-fade" style={{ scrollbarWidth: 'none' }}>
        {children}
      </div>
    </section>
  );
}

// 🔥 يُباع الآن — الأكثر مبيعاً فعلياً
export function TrendingSection({ products }: { products: any[] }) {
  if (!products.length) return null;
  return (
    <Section icon="🔥" title="يُباع الآن" sub="الأكثر طلباً خلال الأسبوعين الماضيين — من بيانات البيع الحقيقية" link="/stores">
      {products.map((p) => <ProductCard key={p.id} p={p} badge={`⚡ ${p.sold} مبيعاً`} />)}
    </Section>
  );
}

// 📈 متاجر صاعدة
export function RisingSection({ stores }: { stores: any[] }) {
  if (!stores.length) return null;
  return (
    <Section icon="📈" title="متاجر صاعدة" sub="نشاط ملحوظ في الطلبات مؤخراً" link="/stores">
      {stores.map((s: any, i: number) => (
        <Link key={s.id} href={`/store/${s.slug}`}
          className="glass card-glow rounded-3xl p-4 w-52 shrink-0 card-hover block snap-start relative overflow-hidden">
          <span className="absolute top-2 left-2 z-10 text-[9px] font-extrabold px-2 py-0.5 rounded-full text-white"
            style={{ background: 'linear-gradient(135deg,#0d9488,#059669)' }}>
            📦 {s.orders} طلب جديد
          </span>
          <div className="relative w-full h-24 rounded-2xl mb-3 skeleton overflow-hidden flex items-center justify-center text-3xl">
            <div className="absolute inset-0 zoom-bg"
              style={s.logo ? { background: `url(${imgUrl(s.logo)}) center/cover` } : {}} />
            {!s.logo && <span className="relative">{s.type?.icon || '🏪'}</span>}
          </div>
          <div className="flex items-center gap-1 font-extrabold text-sm">
            <span className="text-[10px] text-amber-500 font-black">#{i + 1}</span>
            <span className="truncate">{s.name}</span>
            {s.isVerified && <span className="verified-badge">✓</span>}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">{s.type?.nameAr} • {s.governorate || 'اليمن'}</div>
          <div className="text-[11px] mt-1 stars-gold">★ {s.ratingAvg?.toFixed(1) || 'جديد'}</div>
        </Link>
      ))}
    </Section>
  );
}

// 🆕 وصل حديثاً
export function NewestSection({ products }: { products: any[] }) {
  if (!products.length) return null;
  return (
    <Section icon="🆕" title="وصل حديثاً" sub="أحدث المنتجات المضافة إلى المتاجر" link="/stores">
      {products.map((p) => <ProductCard key={p.id} p={p} badge="🆕 جديد" />)}
    </Section>
  );
}
