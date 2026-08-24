'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, apiUpload, getUser, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';

// 📈 استثمر في يمن زون — شراء أسهم من إسهام المنصة وإصدار صك ملكية فوري
const CERT_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: '📜 نشط', cls: 'bg-emerald-100 text-emerald-700' },
  pending: { label: '⏳ قيد المراجعة', cls: 'bg-amber-100 text-amber-700' },
  cancelled: { label: '🚫 ملغي', cls: 'bg-red-100 text-red-500' },
};

export default function InvestClient() {
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [mine, setMine] = useState<any[]>([]);
  // نموذج الشراء
  const [shares, setShares] = useState(10);
  const [ownerName, setOwnerName] = useState('');   // 🪪 الاسم الرباعي للصك
  const [method, setMethod] = useState<'yz-card' | 'transfer'>('yz-card');
  const [proof, setProof] = useState('');
  const [proofBusy, setProofBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api('/v1/shares/offering').then(setD).catch(() => toast('تعذّر تحميل بيانات الأسهم', 'error'));
    const u = getUser();
    if (u) { if (u.name) setOwnerName(u.name); api('/v1/shares/mine').then((r) => setMine(r.certificates || [])).catch(() => {}); }
  };

  useEffect(() => { load(); }, []);

  const uploadProof = async (f: File) => {
    setProofBusy(true);
    try {
      const r = await apiUpload('/v1/shares/upload-proof', 'file', f);
      setProof(r.url);
      toast('✅ أُرفق إثبات التحويل');
    } catch (e: any) { toast(e.message, 'error'); }
    setProofBusy(false);
  };

  const buy = async () => {
    if (!getUser()) { router.push('/auth/customer-login?next=/invest'); return; }
    if (shares < 1) return toast('⚠️ أدخل عدد الأسهم', 'error');
    const nameOk = ownerName.trim().split(/\s+/).filter(Boolean).length >= 4;
    if (!nameOk) return toast('⚠️ أدخل اسمك الرباعي كاملاً (4 مقاطع على الأقل) — سيُكتب في الصك كما أدخلته', 'error');
    if (method === 'transfer' && !proof) return toast('⚠️ أرفق صورة إثبات التحويل أولاً', 'error');
    setBusy(true);
    try {
      const r = await api('/v1/shares/buy', { method: 'POST', body: JSON.stringify({ shares, method, ownerName: ownerName.trim(), proofImage: proof || undefined }) });
      toast(r.message);
      setProof('');
      load();
      if (r.active) router.push(`/share-certificate/${r.certificate}`);
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  };

  if (!d) return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
    </main>
  );

  const { offering, index: idx } = d;
  const total = offering ? shares * offering.pricePerShare : 0;
  const maxIncome = Math.max(...idx.months.map((m: any) => m.income), 1);

  return (
    <main className="min-h-screen pt-20 pb-24 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="max-w-4xl mx-auto px-3 space-y-5">

        {/* 🏆 الترويسة */}
        <div className="text-center pt-6">
          <h1 className="text-3xl md:text-4xl font-black leading-snug">
            امتلك حصتك في <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-600 to-teal-500">منصة يمن زون</span>
          </h1>
          <p className="text-gray-500 text-sm font-bold mt-3 max-w-xl mx-auto leading-relaxed">
            أسهم حقيقية من إسهام المنصة — صك ملكية رسمي باسمك قابل للطباعة والمشاركة،
            وقيمة استثمارك تنمو مع نمو دخل المنصة الفعلي.
          </p>
        </div>

        {/* 📊 مؤشر يمن زون */}
        <div className="rounded-3xl p-5 text-white relative overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #059669, #0f766e 55%, #134e4a)' }}>
          <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-white/10" />
          <div className="flex items-start justify-between flex-wrap gap-4 relative">
            <div>
              <div className="text-[11px] font-bold opacity-80">📈 مؤشر يمن زون YZX</div>
              <div className="text-4xl font-black mt-1">{idx.yzx.toLocaleString()}</div>
              <div className="text-xs font-extrabold mt-1 text-emerald-200">
                {idx.changePct >= 0 ? '▲' : '▼'} {Math.abs(idx.changePct)}% — السعر الاسترشادي {idx.price.toLocaleString()} ر.ي / سهم
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[{ l: '3 أشهر', v: idx.forecast.m3 }, { l: '6 أشهر', v: idx.forecast.m6 }, { l: 'سنة', v: idx.forecast.m12 }].map((f) => (
                <div key={f.l} className="bg-white/10 rounded-2xl px-3 py-2">
                  <div className="text-[9px] font-bold opacity-75">توقع {f.l}</div>
                  <div className="font-black text-sm mt-0.5">{f.v.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-end gap-1.5 h-16">
            {idx.months.map((m: any) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-white/30" style={{ height: `${Math.max(4, (m.income / maxIncome) * 52)}px` }} />
                <div className="text-[8px] opacity-70 font-bold">{m.month.slice(5)}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] font-bold opacity-85">
            <span>💵 ربح السهم الشهري الاسترشادي: {idx.eps.toLocaleString()} ر.ي</span>
            <span>👥 {idx.holders} مساهم · 📊 {idx.soldShares.toLocaleString()} سهم مُباع</span>
          </div>
        </div>

        {/* 🛒 نموذج شراء الأسهم */}
        {offering ? (
          <div className="glass rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-black text-lg">🛒 {offering.title}</h2>
              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">🟢 البيع مفتوح</span>
            </div>
            {offering.description && <p className="text-xs font-bold text-gray-500 leading-relaxed">{offering.description}</p>}

            <div className="h-3 rounded-full overflow-hidden bg-gray-100">
              <div className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400 transition-all"
                style={{ width: `${Math.min(100, (offering.sold / Math.max(offering.totalShares, 1)) * 100)}%` }} />
            </div>
            <p className="text-[11px] font-bold text-gray-500">
              بِيع {offering.sold.toLocaleString()} من {offering.totalShares.toLocaleString()} — المتبقي <b className="text-emerald-600">{offering.available.toLocaleString()} سهم</b>
              {offering.endsAt && ` · ينتهي ${new Date(offering.endsAt).toLocaleDateString('ar-YE')}`}
            </p>

            {/* 🪪 الاسم الرباعي — يُطبع في الصك */}
            <label className="block">
              <span className="text-xs font-extrabold text-gray-600">🪪 الاسم الرباعي الكامل <b className="text-amber-600">(سيُطبع في الصك كما تكتبه هنا)</b></span>
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                placeholder="مثال: محمد أحمد علي الحميري"
                className="mt-1 w-full px-4 py-3 rounded-2xl border border-amber-200 text-lg font-black bg-white outline-none focus:border-amber-400" />
              <span className="text-[10px] font-bold text-gray-400 mt-1 block">
                {ownerName.trim().split(/\s+/).filter(Boolean).length >= 4
                  ? '✅ اسم رباعي صحيح'
                  : 'أدخل 4 مقاطع على الأقل: الأول + الأب + الجد + اللقب'}
              </span>
            </label>

            <div className="grid md:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-extrabold text-gray-600">عدد الأسهم</span>
                <input inputMode="numeric" value={shares || ''}
                  onChange={(e) => setShares(Math.min(Number(e.target.value.replace(/[^0-9]/g, '')) || 0, offering.available))}
                  className="mt-1 w-full px-4 py-3 rounded-2xl border border-emerald-200 text-lg font-black bg-white outline-none focus:border-emerald-400" />
              </label>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 flex flex-col justify-center">
                <span className="text-[10px] font-extrabold text-emerald-600">الإجمالي ({offering.pricePerShare.toLocaleString()} {offering.currency === 'YER' ? 'ر.ي' : offering.currency} / سهم)</span>
                <span className="text-2xl font-black text-emerald-700">{total.toLocaleString()} <span className="text-sm">{offering.currency === 'YER' ? 'ر.ي' : offering.currency}</span></span>
              </div>
            </div>

            {/* طريقة الدفع */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMethod('yz-card')}
                className={`p-3 rounded-2xl border-2 text-right transition-all ${method === 'yz-card' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-white'}`}>
                <b className="text-sm">💳 بطاقة يمن زون</b>
                <p className="text-[10px] font-bold text-gray-500 mt-0.5">خصم فوري — وصكك يصدر في نفس اللحظة</p>
              </button>
              <button onClick={() => setMethod('transfer')}
                className={`p-3 rounded-2xl border-2 text-right transition-all ${method === 'transfer' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-white'}`}>
                <b className="text-sm">🔄 تحويل مالي</b>
                <p className="text-[10px] font-bold text-gray-500 mt-0.5">حوّل وأرفق الإثبات — يصدر الصك بعد الاعتماد</p>
              </button>
            </div>

            {method === 'transfer' && (
              <div className="rounded-2xl border-2 border-dashed border-emerald-200 p-4 text-center">
                {proof ? (
                  <div className="space-y-2">
                    <img src={imgUrl(proof)} alt="إثبات التحويل" className="h-32 mx-auto rounded-xl" />
                    <button onClick={() => setProof('')} className="text-[11px] font-extrabold text-red-400">✕ إزالة وإرفاق غيرها</button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold text-gray-500 mb-2">📎 أرفق صورة إثبات التحويل (سند/لقطة شاشة)</p>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])} />
                    <button onClick={() => fileRef.current?.click()} disabled={proofBusy}
                      className="px-6 py-2.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-extrabold disabled:opacity-40">
                      {proofBusy ? '⏳ يُرفع...' : '📤 اختر الصورة'}
                    </button>
                  </>
                )}
              </div>
            )}

            <button onClick={buy} disabled={busy || shares < 1}
              className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg active:scale-[0.98] transition-transform disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
              {busy ? '⏳ جارٍ تنفيذ الشراء...'
                : method === 'yz-card' ? `⚡ اشترِ ${shares.toLocaleString()} سهم ببطاقتك — صكك فوري` : '📩 أرسل طلب الشراء مع الإثبات'}
            </button>
            {!getUser() && (
              <p className="text-center text-[11px] font-bold text-gray-400">
                ستحتاج تسجيل الدخول أولاً — <Link href="/auth/customer-login?next=/invest" className="text-emerald-600 underline">دخول</Link> أو <Link href="/auth/customer-register?next=/invest" className="text-emerald-600 underline">حساب جديد مجاناً</Link>
              </p>
            )}
          </div>
        ) : (
          <div className="glass rounded-3xl p-8 text-center">
            <div className="text-5xl mb-3">🔔</div>
            <b className="text-lg">لا توجد جولة بيع مفتوحة حالياً</b>
            <p className="text-gray-500 text-xs font-bold mt-2">تابعنا — الجولة القادمة تُعلن هنا فور طرحها</p>
          </div>
        )}

        {/* 📜 صكوكي */}
        {mine.length > 0 && (
          <div className="glass rounded-3xl p-5">
            <h2 className="font-black mb-3">📜 صكوك أسهمي</h2>
            <div className="space-y-2">
              {mine.map((c: any) => (
                <Link key={c.number} href={`/share-certificate/${c.number}`}
                  className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-white/70 px-4 py-3 hover:border-emerald-300 transition-colors">
                  <div>
                    <b className="text-sm" dir="ltr">{c.number}</b>
                    <span className={`mr-2 text-[9px] font-black px-2 py-0.5 rounded-full ${CERT_STATUS[c.status]?.cls}`}>{CERT_STATUS[c.status]?.label}</span>
                    <p className="text-[11px] font-bold text-gray-500 mt-0.5">{c.shares.toLocaleString()} سهم · {c.totalAmount.toLocaleString()} {c.currency} · {c.offering}</p>
                  </div>
                  <span className="text-emerald-600 text-xs font-extrabold">عرض الصك ←</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 🛡️ لماذا أسهم يمن زون */}
        <div className="grid md:grid-cols-3 gap-3">
          {[
            ['📜', 'صك ملكية رسمي', 'وثيقة موثقة برقم فريد قابلة للطباعة والمشاركة والتحقق منها برابطها'],
            ['📈', 'مؤشر شفاف', 'سعر السهم الاسترشادي يرتبط بدخل المنصة الفعلي — لا أرقام وهمية'],
            ['💵', 'ربح السهم', 'نسبة من دخل المنصة تُحسب لكل سهم — تُعلن وتُوزَّع دورياً على المساهمين'],
          ].map(([icon, t, p]) => (
            <div key={t} className="glass rounded-3xl p-4 text-center">
              <div className="text-3xl mb-2">{icon}</div>
              <b className="text-sm">{t}</b>
              <p className="text-[11px] font-bold text-gray-500 mt-1.5 leading-relaxed">{p}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] font-bold text-gray-400 leading-relaxed max-w-xl mx-auto">
          ⚖️ الأسهم حصص في إسهام منصة يمن زون تُدار داخلياً. المؤشر والتوقعات استرشادية مبنية على دخل المنصة الفعلي وليست تعهداً بعائد.
          الاستثمار يحمل مخاطر — اشترِ بما تتحمل.
        </p>
      </div>
    </main>
  );
}
