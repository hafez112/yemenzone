'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import CertificateView from './CertificateView';

const CERT_STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: '✅ نشط',        cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  pending:   { label: '⏳ قيد المراجعة', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  cancelled: { label: '🚫 ملغي',        cls: 'bg-red-50 text-red-500 border-red-200' },
};

// 📈 استثماري في المنصة — لوحة كاملة داخل حساب البائع/العميل:
// الأسهم المملوكة، المدفوع، القيمة الحالية، الربح/الخسارة، ربح السهم، المؤشر والتوقعات، والصكوك مع عرضها وطباعتها داخلياً
export default function MyInvestment() {
  const [mine, setMine] = useState<any>(null);
  const [idx, setIdx] = useState<any>(null);
  const [err, setErr] = useState('');
  const [cert, setCert] = useState<any>(null);      // الصك المفتوح حالياً
  const [certBusy, setCertBusy] = useState(false);

  useEffect(() => {
    Promise.all([api('/v1/shares/mine'), api('/v1/shares/index')])
      .then(([m, i]) => { setMine(m); setIdx(i); })
      .catch((e) => setErr(e.message));
  }, []);

  // 📜 فتح الصك داخلياً — بدون مغادرة اللوحة
  const openCert = async (number: string) => {
    setCertBusy(true);
    try {
      const c = await api(`/v1/shares/certificate/${number}`);
      setCert(c);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setCertBusy(false); }
  };

  if (err) return (
    <div className="glass rounded-3xl p-6 text-center text-sm font-bold text-red-500">⚠️ {err}</div>
  );
  if (!mine || !idx) return (
    <div className="grid place-items-center py-16">
      <div className="w-10 h-10 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
    </div>
  );

  const certs: any[] = mine.certificates || [];
  const activeCerts = certs.filter((c) => c.status === 'active');
  const pendingCerts = certs.filter((c) => c.status === 'pending');
  const myShares = activeCerts.reduce((a, c) => a + c.shares, 0);
  const paid = activeCerts.reduce((a, c) => a + c.totalAmount, 0);
  const currentValue = myShares * idx.price;
  const pnl = currentValue - paid;
  const pnlPct = paid > 0 ? Math.round((pnl / paid) * 10000) / 100 : 0;
  const monthlyProfit = Math.round(idx.eps * myShares * 100) / 100;   // 💵 ربحي الشهري التقديري
  const ownershipPct = Math.round((myShares / idx.totalShares) * 1000000) / 10000;

  // ═══ عرض الصك المفتوح ═══
  if (cert) return (
    <div className="space-y-3">
      <button onClick={() => setCert(null)}
        className="px-5 py-2 rounded-full bg-white text-slate-700 text-xs font-extrabold border border-slate-200 print:hidden">
        → العودة لاستثماري
      </button>
      <CertificateView c={cert} />
      {/* 📊 قيمة هذا الصك اليوم */}
      <div className="glass rounded-3xl p-4 print:hidden flex items-center justify-between flex-wrap gap-3 bg-white/90">
        <div>
          <b className="text-sm">📊 قيمة هذا الصك اليوم</b>
          <p className="text-[11px] font-bold text-gray-500 mt-0.5">
            مؤشر YZX {idx.yzx.toLocaleString()} · السعر الاسترشادي {idx.price.toLocaleString()} ر.ي / سهم
          </p>
        </div>
        <div className="text-left">
          <div className="text-2xl font-black text-emerald-600">{cert.currentValue.toLocaleString()} <span className="text-sm">ر.ي</span></div>
          <div className={`text-[10px] font-extrabold ${cert.currentValue >= cert.totalAmount ? 'text-emerald-500' : 'text-red-400'}`}>
            {cert.currentValue >= cert.totalAmount ? '▲ ربح' : '▼'} {Math.abs(cert.currentValue - cert.totalAmount).toLocaleString()} ر.ي عن الشراء
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ═══ ملخص استثماري ═══ */}
      {myShares > 0 ? (
        <div className="rounded-3xl p-5 text-white shadow-xl" style={{ background: 'linear-gradient(135deg, #0f766e, #134e4a 60%, #0f172a)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <b className="text-lg">📈 استثماري في منصة يمن زون</b>
            <span className="text-[10px] font-extrabold bg-white/15 px-3 py-1.5 rounded-full">مساهم مالك {ownershipPct}% من المنصة</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="rounded-2xl bg-white/10 p-3 text-center">
              <div className="text-[10px] font-bold text-teal-100">أسهمي المعتمدة</div>
              <div className="text-xl font-black mt-1">{myShares.toLocaleString()}</div>
              <div className="text-[9px] text-teal-200">من أصل {idx.totalShares.toLocaleString()} سهم</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-center">
              <div className="text-[10px] font-bold text-teal-100">دفعت عند الشراء</div>
              <div className="text-xl font-black mt-1">{paid.toLocaleString()}</div>
              <div className="text-[9px] text-teal-200">ر.ي</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-center">
              <div className="text-[10px] font-bold text-teal-100">قيمتها اليوم</div>
              <div className="text-xl font-black mt-1">{currentValue.toLocaleString()}</div>
              <div className="text-[9px] text-teal-200">ر.ي — بسعر المؤشر الحالي</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-center">
              <div className="text-[10px] font-bold text-teal-100">{pnl >= 0 ? 'ربحي حتى الآن' : 'الفرق عن الشراء'}</div>
              <div className={`text-xl font-black mt-1 ${pnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {pnl >= 0 ? '▲ +' : '▼ '}{pnl.toLocaleString()}
              </div>
              <div className="text-[9px] text-teal-200">{pnlPct >= 0 ? '+' : ''}{pnlPct}%</div>
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-amber-400/15 border border-amber-300/30 p-3 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-extrabold text-amber-100">
              💵 ربحك الشهري التقديري من التوزيعات ({idx.profitSharePct}% من دخل المنصة يُوزَّع على المساهمين)
            </span>
            <b className="text-amber-200 text-lg">{monthlyProfit.toLocaleString()} ر.ي / شهرياً</b>
          </div>
        </div>
      ) : (
        /* لم يستثمر بعد — بطاقة تعريفية */
        <div className="rounded-3xl p-6 text-center text-white shadow-xl" style={{ background: 'linear-gradient(135deg, #0f766e, #134e4a)' }}>
          <div className="text-5xl mb-3">📈</div>
          <b className="text-lg block mb-1">امتلك حصة من منصة يمن زون</b>
          <p className="text-teal-100 text-xs leading-relaxed max-w-md mx-auto mb-4">
            أسهم إسهام حقيقية بصك ملكية موثّق — تربح مع نمو دخل المنصة، وتُوزَّع {idx.profitSharePct}% من الأرباح على المساهمين.
          </p>
          <Link href="/invest" className="inline-block px-8 py-3 rounded-full bg-amber-400 text-slate-900 text-sm font-black shadow-lg">
            📈 اطلع على الجولة واشترِ سهمك
          </Link>
          {pendingCerts.length > 0 && (
            <p className="text-[11px] font-bold text-amber-200 mt-3">⏳ لديك {pendingCerts.length} طلب شراء قيد مراجعة الإدارة</p>
          )}
        </div>
      )}

      {/* ═══ معرفة تامة: المؤشر والأرباح والتوقعات ═══ */}
      <div className="glass rounded-3xl p-4 bg-white/90">
        <b className="text-sm block mb-3">📊 مؤشر أسهم المنصة (YZX) — يتحرك مع دخل المنصة الحقيقي</b>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ['مؤشر YZX', idx.yzx.toLocaleString(), 'الأساس 100'],
            ['سعر السهم الاسترشادي', `${idx.price.toLocaleString()} ر.ي`, `${idx.changePct >= 0 ? '▲ +' : '▼ '}${idx.changePct}% عن التأسيسي ${idx.basePrice.toLocaleString()}`],
            ['ربح السهم الشهري (EPS)', `${idx.eps.toLocaleString()} ر.ي`, `من توزيع ${idx.profitSharePct}% من الدخل`],
            ['متوسط دخل المنصة الشهري', `${idx.avgMonthIncome.toLocaleString()} ر.ي`, 'آخر 3 أشهر — معتمدة'],
          ].map(([k, v, s]) => (
            <div key={k as string} className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
              <div className="text-[10px] font-bold text-slate-500">{k}</div>
              <div className="font-black text-sm mt-1 text-slate-800">{v}</div>
              <div className="text-[9px] font-bold text-teal-600 mt-0.5">{s}</div>
            </div>
          ))}
        </div>
        {/* التوقعات */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[['بعد 3 أشهر', idx.forecast.m3], ['بعد 6 أشهر', idx.forecast.m6], ['بعد سنة', idx.forecast.m12]].map(([k, v]) => (
            <div key={k as string} className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-2.5 text-center">
              <div className="text-[9px] font-bold text-emerald-600">🔮 سعر متوقع {k}</div>
              <div className="font-black text-sm text-emerald-700 mt-0.5">{Number(v).toLocaleString()} ر.ي</div>
            </div>
          ))}
        </div>
        <p className="text-[9px] font-bold text-gray-400 mt-2 leading-relaxed">
          ⚠️ الأسعار استرشادية محسوبة آلياً من دخل المنصة المعتمد فعلياً، والتوقعات إسقاط خطي للاتجاه الحالي — ليست وعداً بالربح.
          المساهمون: {idx.holders.toLocaleString()} · الأسهم المباعة: {idx.soldShares.toLocaleString()} · إجمالي ما جُمع: {idx.raised.toLocaleString()} ر.ي
        </p>
      </div>

      {/* ═══ صكوك أسهمي ═══ */}
      {certs.length > 0 && (
        <div className="glass rounded-3xl p-4 bg-white/90">
          <b className="text-sm block mb-3">📜 صكوك أسهمي ({certs.length})</b>
          <div className="space-y-2">
            {certs.map((c) => {
              const st = CERT_STATUS[c.status] || CERT_STATUS.active;
              return (
                <div key={c.number} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="w-11 h-11 rounded-xl grid place-items-center text-xl shrink-0"
                    style={{ background: 'linear-gradient(135deg,#0f766e15,#b8860b18)' }}>📜</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <b className="text-xs" dir="ltr">{c.number}</b>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 mt-0.5">
                      {c.shares.toLocaleString()} سهم · {c.totalAmount.toLocaleString()} {c.currency === 'YER' ? 'ر.ي' : c.currency} · «{c.offering}» · {new Date(c.createdAt).toLocaleDateString('ar-YE')}
                    </div>
                  </div>
                  <button onClick={() => openCert(c.number)} disabled={certBusy}
                    className="px-4 py-2 rounded-full bg-teal-700 text-white text-[11px] font-extrabold shrink-0 disabled:opacity-50">
                    {certBusy ? '…' : '📜 عرض الصك'}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] font-bold text-gray-400 mt-3">
            💡 افتح الصك ثم اضغط «🖨️ طباعة» لتحصل على نسخة فاخرة جاهزة للتعليق أو الحفظ PDF، أو شاركه واتساب مع من تريد.
          </p>
        </div>
      )}

      {/* شراء المزيد */}
      <div className="text-center">
        <Link href="/invest" className="inline-block px-6 py-2.5 rounded-full bg-emerald-600 text-white text-xs font-extrabold shadow">
          📈 {myShares > 0 ? 'اشترِ المزيد من الأسهم' : 'صفحة الاستثمار الكاملة'}
        </Link>
      </div>
    </div>
  );
}
