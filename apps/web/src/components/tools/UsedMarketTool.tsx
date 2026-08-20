'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/Toast';
import { apiUpload } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// ♻️ سوق المستعمل — بع واشترِ مستعملاً بدون عمولة: تصفح بفلاتر أو انشر إعلانك في دقيقة
export const USED_CATS = [
  { id: 'cars', icon: '🚗', label: 'سيارات ومركبات' },
  { id: 'phones', icon: '📱', label: 'جوالات وأجهزة' },
  { id: 'electronics', icon: '💻', label: 'إلكترونيات' },
  { id: 'realestate', icon: '🏠', label: 'عقارات' },
  { id: 'furniture', icon: '🛋️', label: 'أثاث ومنزل' },
  { id: 'clothes', icon: '👕', label: 'ملابس وأزياء' },
  { id: 'other', icon: '📦', label: 'أخرى' },
];
export const USED_CONDS = [
  { id: 'like-new', icon: '✨', label: 'كالجديد' },
  { id: 'used-good', icon: '👍', label: 'مستعمل جيد' },
  { id: 'used-fair', icon: '🔧', label: 'مستعمل مقبول' },
];
const GOVS = ['أمانة العاصمة', 'صنعاء', 'عدن', 'تعز', 'الحديدة', 'إب', 'ذمار', 'حضرموت', 'مأرب', 'عمران', 'حجة', 'صعدة', 'المحويت', 'البيضاء', 'الضالع', 'لحج', 'أبين', 'شبوة', 'المهرة', 'الجوف', 'ريمة', 'سقطرى'];
const CURS = [
  { id: 'YER', label: 'ريال يمني 🇾🇪' },
  { id: 'SAR', label: 'ريال سعودي 🇸🇦' },
  { id: 'USD', label: 'دولار أمريكي 💵' },
];
const LS_KEY = 'yz-my-used-v1';

export const curSym = (c: string) => (c === 'YER' ? 'ر.ي' : c === 'SAR' ? 'ر.س' : '$');
export const catOf = (id: string) => USED_CATS.find((c) => c.id === id) || USED_CATS[6];
export const condOf = (id: string) => USED_CONDS.find((c) => c.id === id) || USED_CONDS[1];

interface Item {
  slug: string; title: string; price: number; currency: string; category: string;
  condition: string; images: string[]; governorate: string | null; views: number; createdAt: string;
}
interface MyAd { slug: string; title: string; price: number; currency: string; at: number }

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `قبل ${Math.max(1, Math.floor(s / 60))} دقيقة`;
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} ساعة`;
  return `قبل ${Math.floor(s / 86400)} يوم`;
}

export default function UsedMarketTool() {
  const [tab, setTab] = useState<'browse' | 'post'>('browse');

  // ─── التصفح ───
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<{ key: string; count: number }[]>([]);
  const [govs, setGovs] = useState<{ key: string; count: number }[]>([]);
  const [cat, setCat] = useState('');
  const [gov, setGov] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (c = cat, g = gov, query = q) => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (c) p.set('cat', c);
      if (g) p.set('gov', g);
      if (query.trim()) p.set('q', query.trim());
      const r = await fetch(`${API}/api/v1/tools/used?${p.toString()}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'تعذّر التحميل');
      setItems(d.items || []);
      setCats(d.cats || []);
      setGovs(d.govs || []);
    } catch (e: any) { toast(e.message, 'error'); }
    setLoading(false);
  }, [cat, gov, q]);

  useEffect(() => { load('', '', ''); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const pickCat = (c: string) => { const v = c === cat ? '' : c; setCat(v); load(v, gov, q); };
  const pickGov = (g: string) => { const v = g === gov ? '' : g; setGov(v); load(cat, v, q); };

  // ─── النشر ───
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [category, setCategory] = useState('phones');
  const [condition, setCondition] = useState('used-good');
  const [whatsapp, setWhatsapp] = useState('');
  const [pgov, setPGov] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState<{ slug: string; title: string } | null>(null);
  const [myAds, setMyAds] = useState<MyAd[]>([]);

  useEffect(() => {
    try { setMyAds(JSON.parse(localStorage.getItem(LS_KEY) || '[]')); } catch {}
  }, []);

  const pageUrl = (slug: string) => `${typeof location !== 'undefined' ? location.origin : ''}/u/${slug}`;

  const addImage = async (file: File | null) => {
    if (!file) return;
    if (images.length >= 5) { toast('5 صور كحد أقصى — الأولى هي الغلاف', 'error'); return; }
    setUploading(true);
    try {
      const r = await apiUpload('/v1/tools/used/upload', 'image', file);
      setImages((im) => [...im, r.url]);
      toast('🖼️ أُضيفت الصورة وضُغطت تلقائياً');
    } catch (e: any) { toast(e.message || 'تعذّر رفع الصورة', 'error'); }
    setUploading(false);
  };

  const create = async () => {
    if (title.trim().length < 3) { toast('✍️ أدخل عنواناً واضحاً للإعلان', 'error'); return; }
    const p = Number(price);
    if (!isFinite(p) || p <= 0) { toast('💰 أدخل سعراً صحيحاً', 'error'); return; }
    if (whatsapp.replace(/[^0-9]/g, '').length < 7) { toast('💬 أدخل رقم واتساب صحيحاً — عليه سيتواصل المشترون', 'error'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/v1/tools/used`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(), desc: desc.trim() || undefined, price: p, currency,
          category, condition, whatsapp: whatsapp.trim(), governorate: pgov || undefined, images,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'تعذّر نشر الإعلان');
      setDone({ slug: d.slug, title: title.trim() });
      const list = [{ slug: d.slug, title: title.trim(), price: p, currency, at: Date.now() }, ...myAds].slice(0, 20);
      setMyAds(list);
      localStorage.setItem(LS_KEY, JSON.stringify(list));
      toast('🎉 إعلانك منشور الآن في سوق المستعمل!');
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  };

  const copy = (slug: string) => {
    navigator.clipboard.writeText(pageUrl(slug))
      .then(() => toast('📋 نُسخ الرابط — شاركه في حالتك وقروباتك'))
      .catch(() => toast('تعذّر النسخ', 'error'));
  };

  const inp = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-lime-400/60 focus:outline-none transition-colors';

  // 🎉 شاشة النجاح بعد النشر
  if (done) {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-lime-400/30 p-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(132,204,22,.15), rgba(16,185,129,.08))' }}>
          <div className="text-6xl mb-3">🎉</div>
          <h2 className="text-xl font-black mb-1">إعلان «{done.title}» منشور ويظهر للجميع!</h2>
          <p className="text-sm text-white/60 mb-4">شارك رابطه لتصلك الرسائل أسرع — وكل زيارة ترفع فرص بيعك</p>
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 mb-4" dir="ltr">
            <span className="flex-1 text-xs text-lime-300 font-mono truncate text-left">{pageUrl(done.slug)}</span>
            <button onClick={() => copy(done.slug)} className="px-3 py-1.5 rounded-lg bg-lime-400 text-gray-900 text-xs font-extrabold shrink-0">📋 نسخ</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a href={pageUrl(done.slug)} target="_blank" className="py-3 rounded-2xl bg-white/10 border border-white/15 font-bold text-sm hover:bg-white/20 transition-colors">👁️ افتح الإعلان</a>
            <a href={`https://wa.me/?text=${encodeURIComponent(`♻️ ${done.title} — مستعمل بحالة ممتازة:\n${pageUrl(done.slug)}`)}`} target="_blank" className="py-3 rounded-2xl bg-green-600 font-bold text-sm hover:bg-green-500 transition-colors">📤 شارك واتساب</a>
            <button onClick={() => { setDone(null); setImages([]); setTitle(''); setDesc(''); setPrice(''); }} className="py-3 rounded-2xl bg-white/10 border border-white/15 font-bold text-sm hover:bg-white/20 transition-colors">➕ انشر إعلاناً آخر</button>
            <button onClick={() => { setDone(null); setTab('browse'); load(); }} className="py-3 rounded-2xl bg-lime-500/20 border border-lime-400/30 font-bold text-sm hover:bg-lime-500/30 transition-colors">🛒 تصفح السوق</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* التبويبات */}
      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-black/30 border border-white/10">
        <button onClick={() => setTab('browse')}
          className={`py-3 rounded-xl font-extrabold text-sm transition-all ${tab === 'browse' ? 'bg-gradient-to-l from-lime-500 to-emerald-500 text-gray-900 shadow-lg' : 'text-white/60 hover:text-white'}`}>
          🛒 تصفح السوق
        </button>
        <button onClick={() => setTab('post')}
          className={`py-3 rounded-xl font-extrabold text-sm transition-all ${tab === 'post' ? 'bg-gradient-to-l from-lime-500 to-emerald-500 text-gray-900 shadow-lg' : 'text-white/60 hover:text-white'}`}>
          📢 انشر إعلانك مجاناً
        </button>
      </div>

      {tab === 'browse' ? (
        <>
          {/* 🔍 البحث */}
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ابحث: آيفون، كامري، ثلاجة..." className={inp + ' flex-1'} />
            <button type="submit" className="px-5 rounded-xl bg-lime-500 text-gray-900 font-extrabold text-sm shrink-0">بحث</button>
          </form>

          {/* فلاتر التصنيف */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {USED_CATS.filter((c) => cats.some((x) => x.key === c.id) || c.id === cat).map((c) => (
              <button key={c.id} onClick={() => pickCat(c.id)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${cat === c.id ? 'bg-lime-500 text-gray-900 border-lime-400' : 'bg-white/5 border-white/10 text-white/70 hover:border-lime-400/40'}`}>
                {c.icon} {c.label} <span className="opacity-60">({cats.find((x) => x.key === c.id)?.count || 0})</span>
              </button>
            ))}
          </div>

          {/* فلاتر المحافظة */}
          {govs.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {govs.map((g) => (
                <button key={g.key} onClick={() => pickGov(g.key!)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${gov === g.key ? 'bg-emerald-500 text-gray-900 border-emerald-400' : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/40'}`}>
                  📍 {g.key} ({g.count})
                </button>
              ))}
            </div>
          )}

          {/* النتائج */}
          {loading ? (
            <div className="text-center py-10 text-white/50 text-sm">⏳ جارٍ تحميل السوق...</div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
              <div className="text-5xl mb-3">🔍</div>
              <p className="font-extrabold mb-1">لا توجد إعلانات مطابقة حالياً</p>
              <p className="text-xs text-white/50 mb-4">جرّب كلمة أعم — أو انشر إعلانك وكن الأول في هذا التصنيف</p>
              <button onClick={() => setTab('post')} className="px-6 py-2.5 rounded-full bg-gradient-to-l from-lime-500 to-emerald-500 text-gray-900 font-extrabold text-sm">📢 انشر إعلاناً الآن</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((it) => {
                const c = catOf(it.category); const cond = condOf(it.condition);
                return (
                  <Link key={it.slug} href={`/u/${it.slug}`}
                    className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-lime-400/40 hover:-translate-y-0.5 transition-all group">
                    <div className="aspect-square bg-black/30 relative overflow-hidden">
                      {it.images[0] ? (
                        <img src={`${API}${it.images[0]}`} alt={it.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-4xl opacity-40">{c.icon}</div>
                      )}
                      <span className="absolute top-2 right-2 text-[9px] font-black bg-black/60 backdrop-blur px-2 py-0.5 rounded-full">{cond.icon} {cond.label}</span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold truncate mb-1">{it.title}</p>
                      <p className="text-sm font-black text-lime-300">{Number(it.price).toLocaleString()} {curSym(it.currency)}</p>
                      <p className="text-[10px] text-white/40 mt-1">{it.governorate ? `📍 ${it.governorate} · ` : ''}{ago(it.createdAt)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* 🖼️ الصور */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="font-extrabold text-sm mb-1">🖼️ صور السلعة <span className="text-white/40 text-xs font-normal">(حتى 5 — الأولى هي الغلاف)</span></h3>
            <p className="text-[11px] text-white/50 mb-3">صوّرها من زوايا مختلفة — الإعلانات بالصور تُباع أسرع بخمس مرات</p>
            <div className="flex gap-2 flex-wrap">
              {images.map((im, i) => (
                <div key={im} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/15">
                  <img src={`${API}${im}`} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute bottom-1 right-1 text-[9px] bg-lime-400 text-gray-900 font-black px-1.5 py-0.5 rounded-full">غلاف</span>}
                  <button onClick={() => { setImages((x) => x.filter((_, j) => j !== i)); toast('🗑️ أُزيلت الصورة'); }}
                    className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] grid place-items-center">✕</button>
                </div>
              ))}
              {images.length < 5 && (
                <label className={`w-20 h-20 rounded-xl border-2 border-dashed border-white/20 grid place-items-center cursor-pointer hover:border-lime-400/60 hover:bg-white/5 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <span className="text-2xl">{uploading ? '⏳' : '📷'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => addImage(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>
          </div>

          {/* ✍️ التفاصيل */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <h3 className="font-extrabold text-sm">✍️ ماذا تبيع؟</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الإعلان — مثال: آيفون 12 بذاكرة 128" className={inp} maxLength={80} />
            <div className="grid grid-cols-2 gap-2">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inp + ' bg-night'}>
                {USED_CATS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} className={inp + ' bg-night'}>
                {USED_CONDS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="تفاصيل الحالة والمواصفات وسبب البيع... (اختياري — يزيد ثقة المشتري)" className={inp + ' min-h-20 resize-y'} maxLength={800} />
            <div className="flex gap-2">
              <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="السعر" className={inp + ' flex-1'} />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inp + ' !w-auto shrink-0 bg-night'}>
                {CURS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <select value={pgov} onChange={(e) => setPGov(e.target.value)} className={inp + ' bg-night'}>
              <option value="">📍 المحافظة (اختياري — يساعد المشترين القريبين)</option>
              {GOVS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9+]/g, ''))} inputMode="tel" placeholder="رقم الواتساب للتواصل — مثال: 77XXXXXXX (إلزامي)" className={inp} dir="ltr" style={{ textAlign: 'right' }} />
            <p className="text-[11px] text-white/50">🔒 رقمك يظهر فقط في صفحة إعلانك — بدون عمولة وبدون وسيط، البيع بينك وبين المشتري مباشرة</p>
          </div>

          <button onClick={create} disabled={busy || uploading}
            className="w-full py-4 rounded-2xl bg-gradient-to-l from-lime-500 to-emerald-500 text-gray-900 font-black text-base shadow-xl shadow-lime-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50">
            {busy ? '⏳ جارٍ النشر...' : '🚀 انشر إعلانك الآن — مجاناً وبدون عمولة'}
          </button>

          {/* 🗂️ إعلاناتي السابقة */}
          {myAds.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-extrabold text-sm mb-3">🗂️ إعلاناتك السابقة <span className="text-white/40 text-xs font-normal">(محفوظة في جهازك فقط)</span></h3>
              <div className="space-y-2">
                {myAds.map((l) => (
                  <div key={l.slug} className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{l.title}</p>
                      <p className="text-[10px] text-white/40">{l.price.toLocaleString()} {curSym(l.currency)} · {new Date(l.at).toLocaleDateString('ar-YE')}</p>
                    </div>
                    <a href={pageUrl(l.slug)} target="_blank" className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors">👁️</a>
                    <button onClick={() => copy(l.slug)} className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors">📋</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 💡 نصائح */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="font-extrabold text-sm mb-2">💡 كيف تبيع أسرع في سوق المستعمل؟</h3>
            <ul className="text-xs text-white/70 space-y-1.5 leading-relaxed">
              <li>📸 صوّر السلعة بإضاءة نهارية ومن كل الزوايا — الصدق يبني الثقة.</li>
              <li>💰 سعّر بواقعية: قارن بإعلانات مشابهة في نفس التصنيف.</li>
              <li>📤 شارك رابط إعلانك في قروبات محافظتك وحالة واتساب.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
