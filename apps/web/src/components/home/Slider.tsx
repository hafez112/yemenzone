'use client';
import { useEffect, useState } from 'react';
import { imgUrl } from '@/lib/api';

// سلايدر الصفحة الرئيسية — ديناميكي من قاعدة البيانات (يُدار من /admin/slides)
export default function Slider({ slides }: { slides: any[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI(p => (p + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <section className="px-3 max-w-6xl mx-auto -mt-6 mb-14">
      <div className="relative rounded-3xl overflow-hidden shadow-2xl h-56 md:h-80">
        {slides.map((s, idx) => (
          <a
            key={s.id}
            href={s.link || '#'}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: idx === i ? 1 : 0, pointerEvents: idx === i ? 'auto' : 'none' }}
          >
            <img src={imgUrl(s.image)} alt={s.title || ''} className="w-full h-full object-cover" loading="lazy" />
            {(s.title || s.subtitle) && (
              <div className="absolute inset-x-0 bottom-0 glass-dark p-4">
                <h3 className="text-white font-extrabold text-lg">{s.title}</h3>
                {s.subtitle && <p className="text-gray-300 text-sm">{s.subtitle}</p>}
              </div>
            )}
          </a>
        ))}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {slides.map((_, idx) => (
              <button key={idx} onClick={() => setI(idx)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ background: idx === i ? 'var(--accent)' : 'rgba(255,255,255,0.5)', width: idx === i ? 20 : 8 }} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
