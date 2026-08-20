'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🚀 أضفني إلى محركات البحث — نموذج تسجيل محل + المحلات القريبة منك
const BIZ_CATS = ['🍽️ مطاعم وكافيهات', '💊 صيدليات', '🛒 بقالات وسوبرماركت', '📱 جوالات وإلكترونيات', '👕 أزياء وملابس', '🚗 سيارات وخدماتها', '🏥 عيادات وصحة', '📚 تعليم وتدريب', '🔧 خدمات وصيانة', '🏨 فنادق وشقق', '💈 تجميل وحلاقة', '📦 أخرى'];
const GOVS = ['أمانة العاصمة', 'صنعاء', 'عدن', 'تعز', 'الحديدة', 'إب', 'ذمار', 'حضرموت', 'مأرب', 'عمران', 'حجة', 'صعدة', 'المحويت', 'البيضاء', 'الضالع', 'لحج', 'أبين', 'شبوة', 'المهرة', 'الجوف', 'ريمة', 'سقطرى'];

export default function AddMeTool() {
  const [tab, setTab] = useState<'register' | 'nearby'>('register');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [keywords, setKeywords] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  const [gov, setGov] = useState('');
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // القريبون
  const [nearby, setNearby] = useState<any[] | null>(null);
  const [nearLoading, setNearLoading] = useState(false);

  const locate = (cb?: (lat: number, lng: number) => void) => {
    if (!navigator.geolocation) { toast('متصفحك لا يدعم تحديد الموقع', 'error'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) };
        setLoc(pos);
        setLocating(false);
        toast('📍 حُدّد موقعك بنجاح على خرائط جوجل');
        cb?.(pos.lat, pos.lng);
      },
      () => { setLocating(false); toast('تعذّر تحديد الموقع — فعّل GPS واسمح بالوصول', 'error'); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const submit = async () => {
    if (!name.trim() || desc.trim().length < 10 || !phone.trim()) { toast('✍️ أكمل: اسم المحل، ماذا يقدم، ورقم الاتصال', 'error'); return; }
    if (!loc) { toast('📍 اضغط «حدد موقعي تلقائياً» أولاً', 'error'); return; }
    setBusy(true);
    try {
      await api('/v1/tools/biz', {
        method: 'POST',
        body: JSON.stringify({ name, desc, keywords, phone, whatsapp, website, note, category, governorate: gov, lat: loc.lat, lng: loc.lng }),
      });
      setDone(true);
      toast('🎉 أُرسل طلبك للإدارة');
    } catch (e: any) { toast(e.message || 'تعذّر الإرسال', 'error'); }
    setBusy(false);
  };

  const loadNearby = () => {
    setTab('nearby');
    if (nearby) return;
    setNearLoading(true);
    locate(async (lat, lng) => {
      try {
        const r = await fetch(`${API}/api/v1/tools/biz-nearby?lat=${lat}&lng=${lng}`);
        setNearby(await r.json());
      } catch { setNearby([]); }
      setNearLoading(false);
    });
    // إن رفض الإذن
    setTimeout(() => setNearLoading(false), 16000);
  };

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-3 px-3 text-sm outline-none focus:border-orange-400 placeholder:text-white/30';

  if (done) {
    return (
      <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-10 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-black mb-2">استلمنا طلبك بنجاح!</h2>
        <p className="text-white/70 text-sm leading-relaxed max-w-md mx-auto mb-6">
          ستراجع إدارة منصة يمن زون بيانات «{name}» — وبمجرد الموافقة تُنشأ صفحة رسمية فاخرة باسم محلك، مفهرسة في محركات البحث، وظاهرة في «المحلات القريبة منك» لكل زائر قريب منك 📍
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={loadNearby} className="px-6 py-3 rounded-full bg-gradient-to-l from-orange-500 to-red-600 font-extrabold text-sm shadow-lg">📍 تصفّح المحلات القريبة منك</button>
          <button onClick={() => { setDone(false); setName(''); setDesc(''); setKeywords(''); setWebsite(''); setNote(''); setCategory(''); setGov(''); setLoc(null); }} className="px-6 py-3 rounded-full bg-white/10 font-bold text-sm hover:bg-white/20">➕ سجّل محلاً آخر</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* التبويبات */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setTab('register')}
          className={`py-3 rounded-2xl text-sm font-extrabold transition-all ${tab === 'register' ? 'bg-gradient-to-l from-orange-500 to-red-600 shadow-lg shadow-orange-500/30' : 'bg-white/10 text-white/70'}`}>🚀 سجّل محلك</button>
        <button onClick={loadNearby}
          className={`py-3 rounded-2xl text-sm font-extrabold transition-all ${tab === 'nearby' ? 'bg-gradient-to-l from-orange-500 to-red-600 shadow-lg shadow-orange-500/30' : 'bg-white/10 text-white/70'}`}>📍 القريبة منك</button>
      </div>

      {tab === 'register' ? (
        <>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="🏪 اسم المحل التجاري *" className={inp} />
            <div className="grid grid-cols-2 gap-2">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inp}>
                <option value="">🗂️ تصنيف النشاط</option>
                {BIZ_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={gov} onChange={(e) => setGov(e.target.value)} className={inp}>
                <option value="">📍 المحافظة</option>
                {GOVS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              placeholder="📝 ماذا يقدم محلك؟ * (مثال: محل عطور وبخور أصلية — عود ومسك وعطور فرنسية مع توصيل داخل صنعاء)" className={inp} />
            <div>
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)}
                placeholder="🔍 الكلمات الأساسية لمحركات البحث (افصل بفاصلة)" className={inp} />
              <p className="text-[11px] text-white/50 mt-1">💡 اكتب ما يبحث عنه الناس: «عطور صنعاء»، «بخور أصلي»... تظهر صفحتك لمن يبحث بها</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="📞 رقم الاتصال *" className={inp} dir="ltr" />
              <input inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="💬 واتساب (إن اختلف)" className={inp} dir="ltr" />
            </div>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="🌐 رابط إلكتروني (اختياري — موقع/إنستقرام/فيسبوك)" className={inp} dir="ltr" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="📌 ملاحظة للإدارة (اختياري)" className={inp} />
          </div>

          {/* الموقع */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            {loc ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-12 h-12 rounded-2xl bg-emerald-500/20 grid place-items-center text-2xl">📍</span>
                <div className="flex-1">
                  <p className="font-extrabold text-sm text-emerald-300">تم تحديد الموقع بدقة ✅</p>
                  <a href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer" className="text-xs text-sky-300 underline" dir="ltr">{loc.lat}, {loc.lng} — عرض على خرائط جوجل</a>
                </div>
                <button onClick={() => locate()} disabled={locating} className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold hover:bg-white/20">🔄 إعادة</button>
              </div>
            ) : (
              <button onClick={() => locate()} disabled={locating}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-orange-400/40 bg-orange-400/5 font-extrabold text-sm hover:border-orange-400 hover:bg-orange-400/10 transition-all disabled:opacity-50">
                {locating ? '⏳ جارٍ تحديد موقعك...' : '📍 حدد موقعي تلقائياً على خرائط جوجل *'}
              </button>
            )}
            <p className="text-[11px] text-white/50 mt-2">قف أمام محلك واضغط الزر — الموقع الدقيق يجعل زبائن حيّك يجدونك في «القريبة منك»</p>
          </div>

          <button onClick={submit} disabled={busy}
            className="w-full py-4 rounded-2xl bg-gradient-to-l from-orange-500 to-red-600 font-extrabold shadow-lg shadow-orange-500/30 disabled:opacity-40 hover:brightness-110 transition-all">
            {busy ? '⏳ جارٍ الإرسال...' : '🚀 أرسل طلبي للإدارة'}
          </button>
          <p className="text-center text-[11px] text-white/50">تراجع الإدارة الطلب يدوياً — الموافقة تنشئ صفحتك الرسمية فوراً 🔒</p>
        </>
      ) : (
        /* 📍 القريبة منك */
        <div className="space-y-3">
          {nearLoading || !nearby ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-orange-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-orange-300">📍 نحدد موقعك ونبحث عن المحلات القريبة...</p>
            </div>
          ) : nearby.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
              <div className="text-5xl mb-3">🗺️</div>
              <p className="font-extrabold mb-1">لا توجد محلات مسجلة قريبة منك بعد</p>
              <p className="text-sm text-white/60 mb-4">كن أول من يظهر في حيّك — سجّل محلك مجاناً</p>
              <button onClick={() => setTab('register')} className="px-6 py-3 rounded-full bg-gradient-to-l from-orange-500 to-red-600 font-extrabold text-sm">🚀 سجّل محلك الآن</button>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold text-white/60 text-center">📍 {nearby.length} محل قريب منك — مرتبة من الأقرب</p>
              {nearby.map((b) => (
                <Link key={b.slug} href={`/biz/${b.slug}`}
                  className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-orange-400/40 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 grid place-items-center text-xl font-black shrink-0">{b.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold truncate group-hover:text-orange-300 transition-colors">{b.name}</p>
                      <p className="text-xs text-white/60 truncate">{b.desc}</p>
                    </div>
                    <span className="text-xs font-black text-orange-300 shrink-0">📍 {b.km < 1 ? `${Math.round(b.km * 1000)}م` : `${b.km}كم`}</span>
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
