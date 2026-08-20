'use client';
import { useEffect, useState } from 'react';
import { imgUrl } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Ad { id: string; title: string; image: string; link?: string; size: string }

// 📐 أحجام الإعلانات — نفس نظام إعلانات المنصة
const SIZE_CLS: Record<string, string> = {
  hero: 'aspect-[21/6] w-full',
  wide: 'aspect-[16/6] w-full',
  banner: 'aspect-[3/1] w-full',
  square: 'aspect-square w-full max-w-xs mx-auto',
};

// 📢 إعلانات صفحات الخدمات — تجلب «عام لكل الخدمات» + «المستهدف لهذه الخدمة»
export default function ToolsAds({ tool, slot }: { tool?: string; slot: 'top' | 'bottom' }) {
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    const positions = tool ? [`tool:${tool}`, 'tools_all'] : ['tools_hub'];
    Promise.all(positions.map((p) => fetch(`${API}/api/v1/ads?position=${encodeURIComponent(p)}`).then((r) => r.json()).catch(() => [])))
      .then((lists) => {
        const all: Ad[] = lists.flat().filter((a) => a && a.id);
        const unique = [...new Map(all.map((a) => [a.id, a])).values()];
        // التوزيع: الأحجام الكبيرة أعلى، المربعة/الشرائط أسفل
        const topSizes = ['hero', 'wide'];
        setAds(unique.filter((a) => slot === 'top' ? topSizes.includes(a.size) : !topSizes.includes(a.size)));
      });
  }, [tool, slot]);

  if (!ads.length) return null;

  const click = (ad: Ad) => {
    fetch(`${API}/api/v1/ads/${ad.id}/click`, { method: 'POST' }).catch(() => {});
    if (ad.link) window.open(ad.link, '_blank', 'noopener');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 mt-4 space-y-3">
      {ads.map((ad) => (
        <button key={ad.id} onClick={() => click(ad)}
          className={`relative block overflow-hidden rounded-2xl border border-white/10 shadow-lg group ${SIZE_CLS[ad.size] || SIZE_CLS.wide}`}>
          <img src={imgUrl(ad.image)} alt={ad.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <span className="absolute top-2 left-2 text-[9px] font-bold bg-black/50 backdrop-blur px-2 py-0.5 rounded-full text-white/80">إعلان</span>
          <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-right text-xs font-bold text-white">{ad.title}</span>
        </button>
      ))}
    </div>
  );
}
