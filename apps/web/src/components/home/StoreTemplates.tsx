'use client';
import { STORE_TEMPLATES } from '@/lib/themes';

// عرض قوالب المتاجر الأربعة — معاينة حية مصغرة
export default function StoreTemplates() {
  return (
    <section className="max-w-6xl mx-auto px-3 py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-black mb-2">قوالب <span className="grad-text">متجرك</span></h2>
        <p className="text-gray-500">اختر من 4 قوالب احترافية — وخصّص الألوان من لوحتك</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
        {STORE_TEMPLATES.map(t => (
          <div key={t.id} className="card-hover">
            {/* معاينة مصغرة للقالب */}
            <div className={`rounded-3xl overflow-hidden shadow-lg border-2 border-transparent hover:border-purple-300 transition-all ${
              t.dark ? 'bg-gray-900' : 'bg-white'
            }`}>
              <div className={`h-3 ${t.id === 'elegant' ? 'bg-amber-400' : ''}`}
                style={t.id !== 'elegant' ? { background: 'linear-gradient(90deg, var(--primary), var(--secondary))' } : {}} />
              <div className="p-3">
                <div className={`h-16 rounded-xl mb-2 flex items-center justify-center text-2xl ${
                  t.dark ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  {t.id === 'default' ? '🏪' : t.id === 'modern' ? '✨' : t.id === 'dark' ? '🌙' : '👑'}
                </div>
                <div className={`h-2 rounded-full mb-1.5 w-3/4 ${t.dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className={`h-2 rounded-full w-1/2 ${t.dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  <div className={`h-10 ${t.dark ? 'bg-gray-800' : 'bg-gray-100'}`} style={{ borderRadius: t.radius }} />
                  <div className={`h-10 ${t.dark ? 'bg-gray-800' : 'bg-gray-100'}`} style={{ borderRadius: t.radius }} />
                </div>
              </div>
            </div>
            <div className="text-center mt-2">
              <div className="font-extrabold text-sm">{t.name}</div>
              <div className="text-xs text-gray-400">{t.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
