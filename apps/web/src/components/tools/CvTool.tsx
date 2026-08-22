'use client';
import { useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { elementToPdf } from './pdfHelper';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, Field, inp } from './shared/ui';

// 💼 صانع السيرة الذاتية — قوالب عربية احترافية تُنزَّل PDF في دقيقة
interface Edu { title: string; place: string; year: string }
interface Exp { title: string; place: string; period: string; desc: string }
interface CV {
  name: string; title: string; phone: string; email: string; city: string; summary: string;
  edu: Edu[]; exp: Exp[]; skills: string; langs: string;
}

const EMPTY: CV = { name: '', title: '', phone: '', email: '', city: '', summary: '', edu: [], exp: [], skills: '', langs: '' };

export default function CvTool() {
  const { data: cv, setData: setCv } = useToolDB<CV>('cv', EMPTY, 'yz-cv-v1');
  const [tab, setTab] = useState<'personal' | 'edu' | 'exp' | 'skills' | 'preview'>('personal');
  const [theme, setTheme] = useState<'emerald' | 'navy'>('emerald');
  const pdfRef = useRef<HTMLDivElement>(null);

  const up = (patch: Partial<CV>) => setCv({ ...cv, ...patch });
  const skills = cv.skills.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean);
  const langs = cv.langs.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean);
  const accent = theme === 'emerald' ? '#047857' : '#1e3a5f';
  const accentBg = theme === 'emerald' ? '#ecfdf5' : '#eff6ff';

  const download = async () => {
    if (!cv.name.trim()) { toast('✍️ أدخل اسمك أولاً', 'error'); setTab('personal'); return; }
    toast('⏳ جاري تجهيز السيرة PDF...');
    try { await elementToPdf(pdfRef.current!, `السيرة-الذاتية-${cv.name}.pdf`); toast('📄 نُزّلت سيرتك الذاتية — بالتوفيق! 🌹'); }
    catch { toast('تعذّر إنشاء PDF', 'error'); }
  };

  const TABS = [
    { id: 'personal' as const, label: '👤 شخصية' },
    { id: 'edu' as const, label: '🎓 تعليم' },
    { id: 'exp' as const, label: '💼 خبرات' },
    { id: 'skills' as const, label: '⚡ مهارات' },
    { id: 'preview' as const, label: '👁️ معاينة' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${tab === t.id ? 'bg-gradient-to-l from-lime-500 to-emerald-600 shadow-lg' : 'bg-white/10 text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'personal' && (
        <div className={card + ' space-y-3'}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="👤 الاسم الكامل"><input value={cv.name} onChange={(e) => up({ name: e.target.value })} placeholder="محمد أحمد الحميري" className={inp} /></Field></div>
            <div className="col-span-2"><Field label="💼 المسمى الوظيفي"><input value={cv.title} onChange={(e) => up({ title: e.target.value })} placeholder="مهندس برمجيات / محاسب / مسوّق..." className={inp} /></Field></div>
            <Field label="📱 الجوال"><input inputMode="tel" value={cv.phone} onChange={(e) => up({ phone: e.target.value.replace(/[^0-9+]/g, '') })} placeholder="777123456" className={inp} dir="ltr" /></Field>
            <Field label="📍 المدينة"><input value={cv.city} onChange={(e) => up({ city: e.target.value })} placeholder="صنعاء" className={inp} /></Field>
            <div className="col-span-2"><Field label="📧 البريد (اختياري)"><input inputMode="email" value={cv.email} onChange={(e) => up({ email: e.target.value })} placeholder="name@mail.com" className={inp} dir="ltr" /></Field></div>
          </div>
          <Field label="📝 نبذة مختصرة عنك"><textarea value={cv.summary} onChange={(e) => up({ summary: e.target.value })} rows={3} placeholder="مهندس بخبرة 5 سنوات في... أتميز بـ..." className={inp + ' leading-relaxed'} /></Field>
        </div>
      )}

      {tab === 'edu' && (
        <div className={card + ' space-y-3'}>
          {cv.edu.map((e, i) => (
            <div key={i} className="rounded-2xl bg-white/5 p-3 space-y-2">
              <div className="flex gap-2">
                <input value={e.title} onChange={(x) => up({ edu: cv.edu.map((y, z) => z === i ? { ...y, title: x.target.value } : y) })} placeholder="بكالوريوس هندسة" className={inp} />
                <button onClick={() => up({ edu: cv.edu.filter((_, z) => z !== i) })} className={btnD}>✕</button>
              </div>
              <div className="flex gap-2">
                <input value={e.place} onChange={(x) => up({ edu: cv.edu.map((y, z) => z === i ? { ...y, place: x.target.value } : y) })} placeholder="جامعة صنعاء" className={inp} />
                <input value={e.year} onChange={(x) => up({ edu: cv.edu.map((y, z) => z === i ? { ...y, year: x.target.value } : y) })} placeholder="2020" className={inp + ' !w-24'} dir="ltr" />
              </div>
            </div>
          ))}
          <button onClick={() => up({ edu: [...cv.edu, { title: '', place: '', year: '' }] })} className={btnS}>➕ مؤهل علمي</button>
        </div>
      )}

      {tab === 'exp' && (
        <div className={card + ' space-y-3'}>
          {cv.exp.map((e, i) => (
            <div key={i} className="rounded-2xl bg-white/5 p-3 space-y-2">
              <div className="flex gap-2">
                <input value={e.title} onChange={(x) => up({ exp: cv.exp.map((y, z) => z === i ? { ...y, title: x.target.value } : y) })} placeholder="مطوّر ويب" className={inp} />
                <button onClick={() => up({ exp: cv.exp.filter((_, z) => z !== i) })} className={btnD}>✕</button>
              </div>
              <div className="flex gap-2">
                <input value={e.place} onChange={(x) => up({ exp: cv.exp.map((y, z) => z === i ? { ...y, place: x.target.value } : y) })} placeholder="شركة كذا" className={inp} />
                <input value={e.period} onChange={(x) => up({ exp: cv.exp.map((y, z) => z === i ? { ...y, period: x.target.value } : y) })} placeholder="2021 - الآن" className={inp + ' !w-28'} dir="ltr" />
              </div>
              <input value={e.desc} onChange={(x) => up({ exp: cv.exp.map((y, z) => z === i ? { ...y, desc: x.target.value } : y) })} placeholder="أبرز إنجازاتك فيها (سطر واحد)" className={inp} />
            </div>
          ))}
          <button onClick={() => up({ exp: [...cv.exp, { title: '', place: '', period: '', desc: '' }] })} className={btnS}>➕ خبرة عملية</button>
        </div>
      )}

      {tab === 'skills' && (
        <div className={card + ' space-y-3'}>
          <Field label="⚡ مهاراتك (افصل بينها بفاصلة)"><textarea value={cv.skills} onChange={(e) => up({ skills: e.target.value })} rows={3} placeholder="إكسل، إدارة فريق، تسويق رقمي، تصميم..." className={inp + ' leading-relaxed'} /></Field>
          <Field label="🗣️ اللغات (افصل بينها بفاصلة)"><input value={cv.langs} onChange={(e) => up({ langs: e.target.value })} placeholder="العربية، الإنجليزية" className={inp} /></Field>
          <Field label="🎨 لون القالب">
            <div className="flex gap-2">
              <button onClick={() => setTheme('emerald')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${theme === 'emerald' ? 'bg-emerald-600 shadow-lg' : 'bg-white/10'}`}>🌿 زمردي</button>
              <button onClick={() => setTheme('navy')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${theme === 'navy' ? 'bg-blue-800 shadow-lg' : 'bg-white/10'}`}>🌊 كحلي</button>
            </div>
          </Field>
        </div>
      )}

      {tab === 'preview' && (
        <div className="space-y-3">
          <div ref={pdfRef} dir="rtl" className="bg-white text-gray-900 rounded-2xl overflow-hidden">
            <div className="p-6 text-white" style={{ background: accent }}>
              <h1 className="text-2xl font-black">{cv.name || 'اسمك الكامل'}</h1>
              {cv.title && <p className="text-sm opacity-90 mt-1">{cv.title}</p>}
              <p className="text-[11px] opacity-80 mt-2" dir="ltr">{[cv.phone, cv.email, cv.city].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="p-6 space-y-4">
              {cv.summary && <div><h3 className="font-black text-sm mb-1" style={{ color: accent }}>📝 نبذة</h3><p className="text-xs leading-relaxed text-gray-600">{cv.summary}</p></div>}
              {cv.exp.length > 0 && (
                <div>
                  <h3 className="font-black text-sm mb-2" style={{ color: accent }}>💼 الخبرات العملية</h3>
                  {cv.exp.map((e, i) => (
                    <div key={i} className="mb-2 pr-3 border-r-2" style={{ borderColor: accent }}>
                      <p className="text-xs font-black">{e.title} <span className="font-normal text-gray-500">— {e.place}</span></p>
                      <p className="text-[10px] text-gray-400" dir="ltr">{e.period}</p>
                      {e.desc && <p className="text-[11px] text-gray-600 mt-0.5">{e.desc}</p>}
                    </div>
                  ))}
                </div>
              )}
              {cv.edu.length > 0 && (
                <div>
                  <h3 className="font-black text-sm mb-2" style={{ color: accent }}>🎓 المؤهلات العلمية</h3>
                  {cv.edu.map((e, i) => (
                    <div key={i} className="mb-1.5 pr-3 border-r-2" style={{ borderColor: accent }}>
                      <p className="text-xs font-black">{e.title} <span className="font-normal text-gray-500">— {e.place}</span> <span className="text-[10px] text-gray-400" dir="ltr">{e.year}</span></p>
                    </div>
                  ))}
                </div>
              )}
              {skills.length > 0 && (
                <div>
                  <h3 className="font-black text-sm mb-2" style={{ color: accent }}>⚡ المهارات</h3>
                  <div className="flex flex-wrap gap-1.5">{skills.map((s, i) => <span key={i} className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: accentBg, color: accent }}>{s}</span>)}</div>
                </div>
              )}
              {langs.length > 0 && (
                <div>
                  <h3 className="font-black text-sm mb-2" style={{ color: accent }}>🗣️ اللغات</h3>
                  <div className="flex flex-wrap gap-1.5">{langs.map((s, i) => <span key={i} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{s}</span>)}</div>
                </div>
              )}
            </div>
          </div>
          <button onClick={download} className={btnP + ' w-full !py-3.5'}>📄 تنزيل السيرة الذاتية PDF</button>
        </div>
      )}

      {tab !== 'preview' && (
        <button onClick={() => setTab('preview')} className={btnS + ' w-full !py-3'}>👁️ معاينة السيرة الذاتية ←</button>
      )}
    </div>
  );
}
