'use client';
import { useState } from 'react';
import { toast } from '@/components/Toast';

// ✍️ كاتب وصف المنتجات — مولّد محلي بقوالب تسويقية مدروسة (بدون خوادم خارجية)
const CATS = ['إلكترونيات 📱', 'أزياء 👗', 'عطور 🌸', 'أجهزة منزلية 🏠', 'مواد غذائية 🛒', 'هدايا 🎁', 'عام ✨'];
const OPENERS = ['اكتشف', 'استمتع بـ', 'احصل على', 'قدّمنا لك', 'تجربة لا تُنسى مع'];
const CLOSERS = [
  'اطلبه الآن قبل نفاد الكمية — الكمية محدودة! 🔥',
  'التوصيل متاح لجميع المحافظات 🚚 اطلبه اليوم.',
  'ضمان الجودة وإمكانية الاستبدال — تسوّق بثقة. ✅',
  'سعر خاص لفترة محدودة — لا تفوّت الفرصة! ⏰',
];
const BENEFITS = ['جودة عالية تدوم', 'سعر منافس في السوق', 'تغليف أنيق يحفظ المنتج', 'اختيار آلاف العملاء السعداء', 'وصول سريع حتى باب البيت'];

export default function WriterTool() {
  const [name, setName] = useState('');
  const [cat, setCat] = useState(CATS[0]);
  const [features, setFeatures] = useState('');
  const [tone, setTone] = useState<'فاخر' | 'حماسي' | 'بسيط'>('حماسي');
  const [out, setOut] = useState<{ long: string; short: string; keywords: string } | null>(null);

  const generate = () => {
    if (!name.trim()) { toast('✍️ اكتب اسم المنتج أولاً', 'error'); return;
    }
    const feats = features.split(/[،,\n]/).map((f) => f.trim()).filter(Boolean).slice(0, 6);
    const catName = cat.replace(/[^ء-ي\s]/g, '').trim();
    const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];
    const closer = CLOSERS[Math.floor(Math.random() * CLOSERS.length)];
    const picked = [...BENEFITS].sort(() => Math.random() - 0.5).slice(0, 3);

    const tonePrefix = tone === 'فاخر' ? '✨ تحفة فاخرة من ' : tone === 'حماسي' ? '🔥 ' : '';
    const featLines = feats.length ? `\n\n✅ أبرز المواصفات:\n${feats.map((f) => `• ${f}`).join('\n')}` : '';
    const benefitLines = `\n\n🌟 لماذا تختاره منا؟\n${picked.map((b) => `• ${b}`).join('\n')}`;

    const long = `${tonePrefix}${opener} «${name.trim()}» — الخيار الأمثل في عالم ${catName}!${featLines}${benefitLines}\n\n${closer}`;
    const short = `${name.trim()} — ${feats[0] || 'جودة ممتازة'} | ${picked[0]} ✨`;
    const keywords = [name.trim(), catName, ...feats, 'عرض', 'توصيل اليمن', 'يمن زون'].filter(Boolean).join('، ');

    setOut({ long, short, keywords });
    toast('✨ جاهز! انسخ ما يعجبك');
  };

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt).then(() => toast(`📋 نُسخ ${label}`)).catch(() => toast('تعذّر النسخ', 'error'));
  };

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-indigo-400 placeholder:text-white/30';

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المنتج — مثال: ساعة ذكية X9 برو" className={inp} />
        <div className="grid grid-cols-2 gap-2">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={inp}>
            {CATS.map((c) => <option key={c} className="bg-slate-900">{c}</option>)}
          </select>
          <select value={tone} onChange={(e) => setTone(e.target.value as any)} className={inp}>
            {['حماسي 🔥', 'فاخر ✨', 'بسيط 🌿'].map((t) => <option key={t} value={t.split(' ')[0]} className="bg-slate-900">{t}</option>)}
          </select>
        </div>
        <textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={3}
          placeholder="المواصفات (افصل بينها بفاصلة) — مثال: شاشة أموليد، بطارية 7 أيام، مقاومة للماء" className={inp} />
        <button onClick={generate}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-indigo-600 to-violet-600 font-extrabold text-sm shadow-lg shadow-indigo-500/30 hover:brightness-110 transition-all">
          ✨ اكتب لي الوصف
        </button>
      </div>

      {out && (
        <div className="space-y-3">
          {[
            { t: '📝 الوصف التسويقي الكامل', v: out.long },
            { t: '⚡ الوصف المختصر (للبطاقات)', v: out.short },
            { t: '🔑 الكلمات المفتاحية لمحركات البحث', v: out.keywords },
          ].map((s) => (
            <div key={s.t} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <b className="text-sm">{s.t}</b>
                <button onClick={() => copy(s.v, s.t)} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold hover:bg-white/20">📋 نسخ</button>
              </div>
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{s.v}</p>
            </div>
          ))}
          <button onClick={generate} className="w-full py-2.5 rounded-xl bg-white/10 text-sm font-bold hover:bg-white/20">🔄 ولّد نسخة أخرى بصياغة مختلفة</button>
        </div>
      )}
    </div>
  );
}
