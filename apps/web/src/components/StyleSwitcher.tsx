'use client';
import { useEffect, useState } from 'react';
import { PLATFORM_STYLES, applyStyle, getSavedStyle } from '@/lib/themes';

// مبدّل أنماط الواجهة — زر عائم صغير يفتح لوحة الألوان
export default function StyleSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('neon-purple');

  useEffect(() => {
    const saved = getSavedStyle();
    setCurrent(saved);
    applyStyle(saved);
  }, []);

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 z-50">
      {open && (
        <div className="glass rounded-2xl p-3 mb-2 shadow-xl anim-bounce-in">
          <p className="text-xs font-bold text-gray-500 mb-2">🎨 نمط الواجهة</p>
          <div className="flex flex-col gap-1.5">
            {PLATFORM_STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => { applyStyle(s.id); setCurrent(s.id); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  current === s.id ? 'bg-gray-900 text-white' : 'bg-white/60 hover:bg-white'
                }`}
              >
                <span className="w-4 h-4 rounded-full border-2 border-white shadow"
                  style={{ background: `linear-gradient(135deg, ${s.primary}, ${s.secondary})` }} />
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-11 h-11 rounded-full shadow-xl text-lg anim-pulse-glow"
        style={{ background: 'var(--accent)' }}
        aria-label="تغيير النمط"
      >
        🎨
      </button>
    </div>
  );
}
