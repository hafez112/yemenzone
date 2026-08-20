'use client';
import Link from 'next/link';
import { imgUrl } from '@/lib/api';

// المتاجر المميزة — شريط متحرك خفيف يتوقف عند اللمس (المميزة = موافقة الإدارة فقط)
export default function StoresMarquee({ stores }: { stores: any[] }) {
  if (!stores.length) return null;
  const list = [...stores, ...stores]; // تكرار للحركة المستمرة

  return (
    <section className="py-8 overflow-hidden">
      <div className="text-center mb-8 px-3">
        <span className="section-chip mb-3">⭐</span>
        <h2 className="f-2xl font-black mb-2">متاجر <span className="grad-text">مميزة</span></h2>
        <p className="text-gray-500 f-sm">تسوّق من أفضل المتاجر اليمنية الموثقة</p>
      </div>
      <div className="edge-fade">
        <div className="marquee-track px-2 py-2">
          {list.map((s, i) => (
            <Link key={`${s.id}-${i}`} href={`/store/${s.slug}`}
              className="glass card-glow rounded-3xl p-4 w-56 shrink-0 card-hover block">
              <div className="relative w-full h-28 rounded-2xl mb-3 skeleton overflow-hidden flex items-center justify-center text-4xl">
                <div className="absolute inset-0 zoom-bg"
                  style={s.logo ? { background: `url(${imgUrl(s.logo)}) center/cover` } : {}} />
                {!s.logo && <span className="relative">{s.type?.icon || '🏪'}</span>}
              </div>
              <div className="flex items-center gap-1 font-extrabold text-sm">
                {s.name}
                {s.isVerified && <span className="verified-badge" title="موثق">✓</span>}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {s.type?.nameAr} • {s.governorate || 'اليمن'}
              </div>
              {/* 🤖 الشارات الذكية — تُحسب من النشاط الحقيقي */}
              {s.badges?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {s.badges.slice(0, 2).map((b: any) => (
                    <span key={b.label} className="text-[9px] font-extrabold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                      {b.icon} {b.label}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1.5 text-xs">
                <span className="stars-gold font-bold">★ {s.ratingAvg?.toFixed(1) || 'جديد'}</span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-400">❤️ {s.likesCount}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
