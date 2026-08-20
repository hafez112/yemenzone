'use client';
import Link from 'next/link';
import { imgUrl } from '@/lib/api';

// نبذة نصية قصيرة من الوصف الغني
const stripHtml = (html?: string) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// خدمات المنصة — شريط متحرك بنفس عرض المتاجر المميزة
export default function ServicesMarquee({ services }: { services: any[] }) {
  if (!services?.length) return null;
  const list = [...services, ...services]; // تكرار للحركة المستمرة

  return (
    <section className="py-8 overflow-hidden">
      <div className="text-center mb-8 px-3">
        <span className="section-chip mb-3">🧩</span>
        <h2 className="f-2xl font-black mb-2">خدمات <span className="grad-text">المنصة</span></h2>
        <p className="text-gray-500 f-sm">خدمات احترافية من فريق يمن زون لتطوير تجارتك</p>
      </div>
      <div className="edge-fade">
        <div className="marquee-track px-2 py-2">
          {list.map((s, i) => (
            <Link key={`${s.id}-${i}`} href={`/services/${s.id}`}
              className="glass card-glow rounded-3xl p-4 w-56 shrink-0 card-hover block">
              <div className="relative w-full h-28 rounded-2xl mb-3 skeleton overflow-hidden flex items-center justify-center text-4xl">
                <div className="absolute inset-0 zoom-bg"
                  style={s.image ? { background: `url(${imgUrl(s.image)}) center/cover` } : {}} />
                {!s.image && <span className="relative">🧩</span>}
                {s.videoUrl && (
                  <span className="absolute bottom-1.5 right-1.5 z-10 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                    🎬 فيديو
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 font-extrabold text-sm">
                {s.title}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                {stripHtml(s.description).slice(0, 45) || 'خدمة احترافية من فريق المنصة'}
              </div>
              <div className="flex items-center justify-between mt-2">
                <b className="text-sm grad-text">
                  {Number(s.price).toLocaleString('en')} <span className="text-[10px]">{s.currency}</span>
                </b>
                <span className="text-[10px] font-extrabold" style={{ color: 'var(--secondary, #00B3A4)' }}>عرض الخدمة ←</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
