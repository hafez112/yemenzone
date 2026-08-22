'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const GOVS = ['أمانة العاصمة', 'صنعاء', 'عدن', 'تعز', 'الحديدة', 'إب', 'ذمار', 'حضرموت', 'مأرب', 'عمران', 'حجة', 'صعدة', 'المحويت', 'البيضاء', 'الضالع', 'لحج', 'أبين', 'شبوة', 'المهرة', 'الجوف', 'ريمة', 'سقطرى'];

// 📢 اطلبها ونوفرها — سوق الطلبات العكسي: العميل ينشر والتجار يردون بعروضهم
export default function RequestsTool() {
  const { list: CURS, def: defCur } = useCurrency();
  const [tab, setTab] = useState<'browse' | 'post'>('browse');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('');
  const [gov, setGov] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState<{ items: any[]; govs: string[] } | null>(null);
  const [fGov, setFGov] = useState('');
  const [fQ, setFQ] = useState('');

  const cur = (c: string) => CURS.find((x) => x.code === String(c || '').toUpperCase())?.symbol || c || 'ر.ي';
  useEffect(() => { if (!currency && defCur) setCurrency(defCur.code); }, [defCur]);
  const ago = (d: string) => {
    const m = Math.floor((Date.now() - +new Date(d)) / 60000);
    if (m < 60) return m <= 1 ? 'الآن' : `قبل ${m} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return `قبل ${h} ساعة`;
    return `قبل ${Math.floor(h / 24)} يوم`;
  };

  const loadBoard = useCallback(async (g = fGov, query = fQ) => {
    try {
      const r = await fetch(`${API}/api/v1/tools/requests${g ? `?gov=${encodeURIComponent(g)}` : ''}${query ? `${g ? '&' : '?'}q=${encodeURIComponent(query)}` : ''}`);
      setBoard(await r.json());
    } catch { toast('تعذّر تحميل الطلبات', 'error'); }
  }, [fGov, fQ]);

  useEffect(() => { loadBoard(); }, []);

  const post = async () => {
    if (title.trim().length < 5) { toast('✍️ اكتب ما تبحث عنه بوضوح', 'error'); return; }
    if (whatsapp.replace(/[^0-9]/g, '').length < 7) { toast('💬 أدخل رقم واتساب صحيحاً — تصلك عليه الردود', 'error'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/v1/tools/requests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(), details: details.trim() || undefined,
          budget: budget ? Number(budget) : undefined, currency,
          governorate: gov || undefined, whatsapp: whatsapp.trim(),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'تعذّر النشر');
      toast('🎉 ' + (d.message || 'أُرسل طلبك'));
      setTitle(''); setDetails(''); setBudget('');
      setTab('browse');
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  };

  const inp = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-orange-400/60 focus:outline-none transition-colors';

  return (
    <div className="space-y-5">
      {/* التبويبات */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setTab('browse')}
          className={`py-3 rounded-2xl font-extrabold text-sm transition-all ${tab === 'browse' ? 'bg-gradient-to-l from-orange-500 to-amber-500 text-gray-900 shadow-lg shadow-orange-500/25' : 'bg-white/5 border border-white/10 text-white/70'}`}>
          🛍️ تصفح الطلبات
        </button>
        <button onClick={() => setTab('post')}
          className={`py-3 rounded-2xl font-extrabold text-sm transition-all ${tab === 'post' ? 'bg-gradient-to-l from-orange-500 to-amber-500 text-gray-900 shadow-lg shadow-orange-500/25' : 'bg-white/5 border border-white/10 text-white/70'}`}>
          📢 انشر طلبك
        </button>
      </div>

      {tab === 'post' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <h3 className="font-extrabold text-sm">📝 ما الذي تبحث عنه؟</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: جوال آيفون 12 مستعمل نظيف — بسعر مناسب" className={inp} maxLength={120} />
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="تفاصيل تساعد التاجر: اللون، الحالة، الملحقات... (اختياري)" className={inp + ' min-h-20 resize-y'} maxLength={600} />
            <div className="flex gap-2">
              <input value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="ميزانيتك (اختياري)" className={inp + ' flex-1'} />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inp + ' !w-auto shrink-0 bg-night'}>
                {CURS.map((c) => <option key={c.code} value={c.code}>{c.name} — {c.symbol}</option>)}
              </select>
            </div>
            <select value={gov} onChange={(e) => setGov(e.target.value)} className={inp + ' bg-night'}>
              <option value="">📍 المحافظة (اختياري)</option>
              {GOVS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9+]/g, ''))} inputMode="tel" placeholder="واتسابك — تصلك عليه ردود التجار (إلزامي)" className={inp} dir="ltr" style={{ textAlign: 'right' }} />
            <p className="text-[11px] text-white/50">🔒 رقمك لا يظهر علناً — يُستخدم فقط ليتواصل معك التجار · يُنشر طلبك بعد مراجعة الإدارة</p>
          </div>
          <button onClick={post} disabled={busy}
            className="w-full py-4 rounded-2xl bg-gradient-to-l from-orange-500 to-amber-500 text-gray-900 font-black text-base shadow-xl shadow-orange-500/25 hover:scale-[1.01] transition-all disabled:opacity-50">
            {busy ? '⏳ جارٍ النشر...' : '📢 انشر طلبك للتجار'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* فلاتر اللوحة */}
          <div className="flex gap-2">
            <input value={fQ} onChange={(e) => setFQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadBoard(fGov, fQ)}
              placeholder="🔍 ابحث في الطلبات..." className={inp + ' flex-1'} />
            <button onClick={() => loadBoard(fGov, fQ)} className="px-4 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold transition-colors">بحث</button>
          </div>
          {board && board.govs.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => { setFGov(''); loadBoard('', fQ); }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${!fGov ? 'bg-orange-500 text-gray-900 border-orange-500' : 'bg-white/5 border-white/10 text-white/60'}`}>
                الكل
              </button>
              {board.govs.map((g) => (
                <button key={g} onClick={() => { const ng = fGov === g ? '' : g; setFGov(ng!); loadBoard(ng!, fQ); }}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${fGov === g ? 'bg-orange-500 text-gray-900 border-orange-500' : 'bg-white/5 border-white/10 text-white/60'}`}>
                  📍 {g}
                </button>
              ))}
            </div>
          )}

          {!board ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}</div>
          ) : board.items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
              <div className="text-5xl mb-3">📭</div>
              <p className="font-extrabold mb-1">لا طلبات منشورة هنا بعد</p>
              <p className="text-xs text-white/50">كن أول من ينشر — التجار ينتظرون</p>
            </div>
          ) : (
            board.items.map((r: any) => (
              <Link key={r.slug} href={`/r/${r.slug}`}
                className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm leading-relaxed">{r.title}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-white/50 font-bold">
                      {r.governorate && <span>📍 {r.governorate}</span>}
                      <span>🕘 {ago(r.createdAt)}</span>
                      <span>👁️ {r.views}</span>
                    </div>
                  </div>
                  <div className="text-left shrink-0 space-y-1">
                    {r.budget && <p className="text-xs font-black text-orange-300">{Number(r.budget).toLocaleString()} {cur(r.currency)}</p>}
                    <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.replies > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/40'}`}>
                      💬 {r.replies} {r.replies === 0 ? '— كن أول من يرد' : r.replies === 1 ? 'عرض' : 'عروض'}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}

          {/* 🏪 دعوة التجار */}
          <div className="rounded-2xl border border-orange-400/20 p-4 text-center" style={{ background: 'rgba(249,115,22,.08)' }}>
            <p className="font-extrabold text-sm mb-1">🏪 تاجر؟ هذه طلبات زبائن حقيقية تبحث عنك</p>
            <p className="text-[11px] text-white/60 mb-3">افتح أي طلب ورد بعرضك وسعرك — الطالب يتواصل معك واتساب مباشرة</p>
            <Link href="/auth/seller-register" className="inline-block px-5 py-2 rounded-full bg-gradient-to-l from-purple-600 to-amber-500 font-extrabold text-xs">
              🚀 أنشئ متجرك وردّ من مكانك
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
