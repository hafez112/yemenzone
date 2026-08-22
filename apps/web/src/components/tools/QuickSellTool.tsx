'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';
import { apiUpload } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🔗 بع برابط واحد — صفحة بيع فورية بلا متجر: صور + سعر + واتساب = رابط يبيع عنك
const GOVS = ['أمانة العاصمة', 'صنعاء', 'عدن', 'تعز', 'الحديدة', 'إب', 'ذمار', 'حضرموت', 'مأرب', 'عمران', 'حجة', 'صعدة', 'المحويت', 'البيضاء', 'الضالع', 'لحج', 'أبين', 'شبوة', 'المهرة', 'الجوف', 'ريمة', 'سقطرى'];
const LS_KEY = 'yz-my-qs-v1';

interface MyLink { slug: string; name: string; price: number; currency: string; at: number }

export default function QuickSellTool() {
  const { list: CURS, def: defCur } = useCurrency();
  useEffect(() => { if (!currency && defCur) setCurrency(defCur.code); }, [defCur]);
  const [images, setImages] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [phone, setPhone] = useState('');
  const [gov, setGov] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState<{ slug: string; name: string } | null>(null);
  const [myLinks, setMyLinks] = useState<MyLink[]>([]);

  useEffect(() => {
    try { setMyLinks(JSON.parse(localStorage.getItem(LS_KEY) || '[]')); } catch {}
  }, []);

  const pageUrl = (slug: string) => `${typeof location !== 'undefined' ? location.origin : ''}/q/${slug}`;

  // 🖼️ رفع صورة → WebP محسّمة من الخادم
  const addImage = async (file: File | null) => {
    if (!file) return;
    if (images.length >= 5) { toast('5 صور كحد أقصى — الأولى هي الغلاف', 'error'); return; }
    setUploading(true);
    try {
      const r = await apiUpload('/v1/tools/quick-sell/upload', 'image', file);
      setImages((im) => [...im, r.url]);
      toast('🖼️ أُضيفت الصورة وضُغطت تلقائياً');
    } catch (e: any) { toast(e.message || 'تعذّر رفع الصورة', 'error'); }
    setUploading(false);
  };

  const removeImage = (i: number) => {
    setImages((im) => im.filter((_, x) => x !== i));
    toast('🗑️ أُزيلت الصورة');
  };

  // 🚀 إنشاء الصفحة
  const create = async () => {
    if (name.trim().length < 2) { toast('✍️ أدخل اسم المنتج', 'error'); return; }
    const p = Number(price);
    if (!isFinite(p) || p <= 0) { toast('💰 أدخل سعراً صحيحاً', 'error'); return; }
    if (whatsapp.replace(/[^0-9]/g, '').length < 7) { toast('💬 أدخل رقم واتساب صحيحاً — عليه تصلك الطلبات', 'error'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/v1/tools/quick-sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), price: p, currency, whatsapp: whatsapp.trim(),
          phone: phone.trim() || undefined, governorate: gov || undefined,
          desc: desc.trim() || undefined, images,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'تعذّر الإنشاء');
      setDone({ slug: d.slug, name: name.trim() });
      const entry: MyLink = { slug: d.slug, name: name.trim(), price: p, currency, at: Date.now() };
      const list = [entry, ...myLinks].slice(0, 20);
      setMyLinks(list);
      localStorage.setItem(LS_KEY, JSON.stringify(list));
      toast('🎉 صفحة بيعك جاهزة — انسخ رابطها وشاركها!');
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  };

  const copy = (slug: string) => {
    navigator.clipboard.writeText(pageUrl(slug))
      .then(() => toast('📋 نُسخ الرابط — الصقه في حالتك وقروباتك'))
      .catch(() => toast('تعذّر النسخ', 'error'));
  };

  const removeLocal = (slug: string) => {
    const list = myLinks.filter((l) => l.slug !== slug);
    setMyLinks(list);
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    toast('🗑️ أُزيل من قائمتك المحلية');
  };

  const inp = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/60 focus:outline-none transition-colors';

  // 🎉 شاشة النجاح
  if (done) {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-emerald-400/30 p-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,.15), rgba(20,184,166,.08))' }}>
          <div className="text-6xl mb-3">🎉</div>
          <h2 className="text-xl font-black mb-1">صفحة «{done.name}» جاهزة وتعمل!</h2>
          <p className="text-sm text-white/60 mb-4">شارك الرابط أينما تريد — كل ضغطة تفتح صفحة بيع فاخرة وزر طلب واتساب يصلك مباشرة</p>
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 mb-4" dir="ltr">
            <span className="flex-1 text-xs text-emerald-300 font-mono truncate text-left">{pageUrl(done.slug)}</span>
            <button onClick={() => copy(done.slug)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-gray-900 text-xs font-extrabold shrink-0">📋 نسخ</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a href={pageUrl(done.slug)} target="_blank" className="py-3 rounded-2xl bg-white/10 border border-white/15 font-bold text-sm hover:bg-white/20 transition-colors">👁️ افتح الصفحة</a>
            <a href={`https://wa.me/?text=${encodeURIComponent(`🛍️ ${done.name} — اطلبه من هنا:\n${pageUrl(done.slug)}`)}`} target="_blank" className="py-3 rounded-2xl bg-green-600 font-bold text-sm hover:bg-green-500 transition-colors">📤 شارك واتساب</a>
            <Link href={`/tools/share-card?url=${encodeURIComponent(pageUrl(done.slug))}`} className="py-3 rounded-2xl bg-indigo-600 font-bold text-sm hover:bg-indigo-500 transition-colors">🖼️ بطاقة مشاركة</Link>
            <button onClick={() => { setDone(null); setImages([]); setName(''); setPrice(''); setDesc(''); }} className="py-3 rounded-2xl bg-white/10 border border-white/15 font-bold text-sm hover:bg-white/20 transition-colors">➕ بع منتجاً آخر</button>
          </div>
        </div>
        {/* 🚀 الترقية لمتجر */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="font-extrabold mb-1">🏬 عندك أكثر من منتج؟</p>
          <p className="text-xs text-white/60 mb-3">أنشئ متجرك الكامل في يمن زون: منتجات لا محدودة، سلة مشتريات، كوبونات، ولوحة تحكم — مجاناً</p>
          <Link href="/auth/seller-register" className="inline-block px-6 py-2.5 rounded-full bg-gradient-to-l from-purple-600 to-amber-500 font-extrabold text-sm">🚀 أنشئ متجرك مجاناً</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 🖼️ صور المنتج */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-extrabold text-sm mb-1">🖼️ صور المنتج <span className="text-white/40 text-xs font-normal">(حتى 5 — الأولى هي الغلاف)</span></h3>
        <p className="text-[11px] text-white/50 mb-3">تُضغط تلقائياً وتُحسَّن للتحميل السريع ⚡</p>
        <div className="flex gap-2 flex-wrap">
          {images.map((im, i) => (
            <div key={im} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/15 group">
              <img src={`${API}${im}`} alt="" className="w-full h-full object-cover" />
              {i === 0 && <span className="absolute bottom-1 right-1 text-[9px] bg-emerald-500 text-gray-900 font-black px-1.5 py-0.5 rounded-full">غلاف</span>}
              <button onClick={() => removeImage(i)} className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] grid place-items-center">✕</button>
            </div>
          ))}
          {images.length < 5 && (
            <label className={`w-20 h-20 rounded-xl border-2 border-dashed border-white/20 grid place-items-center cursor-pointer hover:border-emerald-400/60 hover:bg-white/5 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <span className="text-2xl">{uploading ? '⏳' : '📷'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => addImage(e.target.files?.[0] || null)} />
            </label>
          )}
        </div>
      </div>

      {/* ✍️ بيانات المنتج */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="font-extrabold text-sm">✍️ ماذا تبيع؟</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المنتج — مثال: ساعة رجالية فاخرة" className={inp} maxLength={80} />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف مختصر يقنع الزبون — المواصفات، الحالة، الضمان... (اختياري)" className={inp + ' min-h-20 resize-y'} maxLength={600} />
        <div className="flex gap-2">
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="السعر" className={inp + ' flex-1'} />
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inp + ' !w-auto shrink-0 bg-night'}>
            {CURS.map((c) => <option key={c.code} value={c.code}>{c.name} — {c.symbol}</option>)}
          </select>
        </div>
        <select value={gov} onChange={(e) => setGov(e.target.value)} className={inp + ' bg-night'}>
          <option value="">📍 المحافظة (اختياري)</option>
          {GOVS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* 💬 استلام الطلبات */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="font-extrabold text-sm">💬 كيف تستلم الطلبات؟</h3>
        <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9+]/g, ''))} inputMode="tel" placeholder="رقم الواتساب — مثال: 77XXXXXXX (إلزامي)" className={inp} dir="ltr" style={{ textAlign: 'right' }} />
        <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} inputMode="tel" placeholder="رقم اتصال إضافي (اختياري)" className={inp} dir="ltr" style={{ textAlign: 'right' }} />
        <p className="text-[11px] text-white/50">🔒 أرقامك تظهر فقط في صفحة منتجك — لا نرسل أي رسائل دون طلب الزبون</p>
      </div>

      {/* 🚀 الإنشاء */}
      <button onClick={create} disabled={busy || uploading}
        className="w-full py-4 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 text-gray-900 font-black text-base shadow-xl shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50">
        {busy ? '⏳ جارٍ إنشاء صفحتك...' : '🚀 أنشئ صفحة البيع واحصل على الرابط'}
      </button>

      {/* 🗂️ روابطي السابقة (محفوظة في جهازك) */}
      {myLinks.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-extrabold text-sm mb-3">🗂️ صفحاتك السابقة <span className="text-white/40 text-xs font-normal">(محفوظة في جهازك فقط)</span></h3>
          <div className="space-y-2">
            {myLinks.map((l) => (
              <div key={l.slug} className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{l.name}</p>
                  <p className="text-[10px] text-white/40">{l.price.toLocaleString()} {CURS.find((c) => c.code === l.currency)?.symbol || l.currency} · {new Date(l.at).toLocaleDateString('ar-YE')}</p>
                </div>
                <a href={pageUrl(l.slug)} target="_blank" className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors">👁️</a>
                <button onClick={() => copy(l.slug)} className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors">📋</button>
                <button onClick={() => removeLocal(l.slug)} className="w-8 h-8 grid place-items-center rounded-lg bg-red-500/20 hover:bg-red-500/40 text-sm transition-colors">🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 💡 نصائح */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-extrabold text-sm mb-2">💡 كيف تبيع أسرع؟</h3>
        <ul className="text-xs text-white/70 space-y-1.5 leading-relaxed">
          <li>📸 صورة واضحة بإضاءة جيدة ترفع الطلبات 3 أضعاف.</li>
          <li>📤 شارك الرابط في حالة واتساب + قروبات المحافظة + تعليقات فيسبوك.</li>
          <li>🖼️ بعد الإنشاء اضغط «بطاقة مشاركة» لتحصل على تصميم جاهز للحالات.</li>
        </ul>
      </div>
    </div>
  );
}
