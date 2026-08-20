'use client';
import { imgUrl } from '@/lib/api';

// 📐 نسب الأبعاد حسب حجم الإعلان — يحددها المدير من إدارة الإعلانات
const ASPECT: Record<string, string> = {
  hero: 'aspect-[21/6]',
  wide: 'aspect-[16/6]',
  banner: 'aspect-[3/1]',
  square: 'aspect-square',
};

// ═══ بانر إعلانات الرئيسية — يُغذّى من إدارة الإعلانات في لوحة المدير ═══
// يستقبل الإعلانات جاهزة من SSR ويسجل النقرات عند الضغط
export default function AdBanner({ ads, compact = false }: { ads: any[]; compact?: boolean }) {
  if (!ads?.length) return null;

  function open(ad: any) {
    // تسجيل النقرة دون حجب الانتقال — قاعدة API نفسها المستخدمة في كل الموقع
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${base}/api/v1/ads/${ad.id}/click`, { method: 'POST' }).catch(() => {});
    if (ad.link) window.open(ad.link, '_blank', 'noopener');
  }

  const list = ads.slice(0, compact ? 2 : 4);
  const hasSquare = list.some((a) => a.size === 'square');
  const grid = hasSquare
    ? 'grid-cols-2 sm:grid-cols-4'
    : list.length > 1 ? 'sm:grid-cols-2' : '';

  return (
    <section className="max-w-6xl mx-auto px-3 py-3">
      <div className={`grid gap-3 ${grid}`}>
        {list.map((ad: any) => (
          <button key={ad.id} onClick={() => open(ad)}
            className={`relative rounded-3xl overflow-hidden shadow-lg card-hover text-right w-full group ${
              compact ? 'aspect-[3/1]' : (ASPECT[ad.size] || ASPECT.wide)
            }`}>
            <img src={imgUrl(ad.image)} alt={ad.title} loading="lazy" decoding="async"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-0 right-0 p-4 flex items-center gap-2">
              <span className="text-white font-extrabold text-sm drop-shadow">{ad.title}</span>
              {ad.link && (
                <span className="text-[10px] font-extrabold bg-white/90 text-gray-800 px-2.5 py-1 rounded-full">
                  اضغط للتفاصيل ←
                </span>
              )}
            </div>
            <span className="absolute top-2 left-2 text-[9px] font-bold bg-black/40 text-white/80 px-2 py-0.5 rounded-full">
              إعلان
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
