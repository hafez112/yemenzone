'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';

// 💼 المكتب المحاسبي — قيود يومية آلية + ميزان مراجعة + تسوية + كشوفات + تقارير
const TABS = [
  { id: 'journal', icon: '📔', label: 'القيود اليومية' },
  { id: 'recon', icon: '🔄', label: 'التسوية الآلية' },
  { id: 'statement', icon: '🧾', label: 'كشف حساب متجر' },
  { id: 'commissions', icon: '📤', label: 'تقرير العمولات' },
];

const fmt = (n: number) => Math.round(n).toLocaleString();
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export default function AdminAccountingPage() {
  const router = useRouter();
  const [tab, setTab] = useState('journal');

  // 📔 القيود
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(today());
  const [journal, setJournal] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  // 🔄 التسوية
  const [recon, setRecon] = useState<any>(null);
  const [reconBusy, setReconBusy] = useState(false);

  // 🧾 كشف متجر
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState('');
  const [stFrom, setStFrom] = useState(daysAgo(29));
  const [stTo, setStTo] = useState(today());
  const [statement, setStatement] = useState<any>(null);

  // 📤 العمولات
  const [month, setMonth] = useState(today().slice(0, 7));
  const [comm, setComm] = useState<any>(null);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    loadJournal();
    api('/admin/stores').then((d) => setStores(Array.isArray(d) ? d : d.stores || [])).catch(() => {});
  }, []);

  const loadJournal = () => {
    setBusy(true);
    api(`/admin/accounting/journal?from=${from}&to=${to}`)
      .then(setJournal)
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setBusy(false));
  };

  const loadRecon = () => {
    setReconBusy(true); setRecon(null);
    api('/admin/accounting/reconciliation')
      .then((d) => { setRecon(d); toast(d.ok ? '✅ التسوية نظيفة — لا فروقات' : '⚠️ وُجدت فروقات تحتاج مراجعة'); })
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setReconBusy(false));
  };

  const loadStatement = () => {
    if (!storeId) return toast('⚠️ اختر متجراً أولاً', 'error');
    api(`/admin/accounting/store-statement?storeId=${storeId}&from=${stFrom}&to=${stTo}`)
      .then(setStatement)
      .catch((e) => toast(e.message, 'error'));
  };

  const loadComm = () => {
    api(`/admin/accounting/commissions?month=${month}`)
      .then(setComm)
      .catch((e) => toast(e.message, 'error'));
  };

  // 📥 تصدير CSV (يفتح في Excel مباشرة — مع دعم العربية)
  const exportCsv = () => {
    if (!comm) return;
    const head = 'المتجر,النطاق,المبيعات الكلية,المبيعات الإلكترونية,عدد الطلبات,نسبة العمولة %,العمولة المستحقة\n';
    const body = comm.rows.map((r: any) =>
      [r.store, r.slug, r.sales, r.electronic, r.orders, comm.commission, r.commissionDue].join(',')).join('\n');
    const total = `\nالإجمالي,,${comm.totals.sales},${comm.totals.electronic},,${comm.commission},${comm.totals.commissionDue}`;
    const blob = new Blob(['\uFEFF' + head + body + total], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `عمولات-${comm.month}.csv`;
    a.click();
    toast('📥 تم تصدير التقرير — يفتح مباشرة في Excel');
  };

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">💼 المكتب المحاسبي</h1>
          <p className="text-sm text-gray-500 mb-4">قيود آلية متوازنة من البيانات الفعلية — ميزان مراجعة وتسوية وكشوفات وتقارير</p>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={'btn whitespace-nowrap ' + (tab === t.id ? 'primary' : 'ghost')}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ═══ 📔 القيود اليومية ═══ */}
          {tab === 'journal' && (
            <>
              <section className="card">
                <div className="row" style={{ gap: '.5rem', flexWrap: 'wrap' }}>
                  <label className="small muted">من <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 'auto', display: 'inline-block', marginBottom: 0 }} /></label>
                  <label className="small muted">إلى <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 'auto', display: 'inline-block', marginBottom: 0 }} /></label>
                  <button className="btn primary small" disabled={busy} onClick={loadJournal}>{busy ? '⏳…' : '📔 عرض القيود'}</button>
                  {journal && (
                    <span className={'badge ' + (journal.balanced ? 'active' : 'cancelled')}>
                      {journal.balanced ? '⚖️ متوازن' : '⚠️ غير متوازن'} · عمولة {journal.commission}%
                    </span>
                  )}
                </div>
              </section>

              {busy ? <div className="skeleton h-64 rounded-3xl" /> : journal && (
                <>
                  {/* ميزان المراجعة */}
                  <section className="card">
                    <h2>⚖️ ميزان المراجعة</h2>
                    <div className="overflow-x-auto">
                      <table style={{ width: '100%', fontSize: '.85rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid rgba(127,127,127,.25)' }}>
                            <th style={{ textAlign: 'right', padding: '.4rem' }}>الحساب</th>
                            <th style={{ padding: '.4rem' }}>مدين</th>
                            <th style={{ padding: '.4rem' }}>دائن</th>
                            <th style={{ padding: '.4rem' }}>الرصيد</th>
                          </tr>
                        </thead>
                        <tbody>
                          {journal.trial.map((t: any) => (
                            <tr key={t.account} style={{ borderBottom: '1px solid rgba(127,127,127,.12)' }}>
                              <td style={{ padding: '.45rem' }}>{t.accountAr}</td>
                              <td style={{ textAlign: 'center', color: '#059669', fontWeight: 800 }}>{fmt(t.debit)}</td>
                              <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 800 }}>{fmt(t.credit)}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800 }} dir="ltr">{fmt(t.balance)}</td>
                            </tr>
                          ))}
                          <tr style={{ background: 'rgba(108,61,245,.08)', fontWeight: 900 }}>
                            <td style={{ padding: '.5rem' }}>الإجمالي</td>
                            <td style={{ textAlign: 'center', color: '#059669' }}>{fmt(journal.totals.debit)}</td>
                            <td style={{ textAlign: 'center', color: '#dc2626' }}>{fmt(journal.totals.credit)}</td>
                            <td style={{ textAlign: 'center' }}>{journal.balanced ? '✅' : '⚠️'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* القيود */}
                  <section className="card">
                    <h2>📔 القيود اليومية ({journal.entries.length})</h2>
                    <div className="overflow-x-auto">
                      <table style={{ width: '100%', fontSize: '.8rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid rgba(127,127,127,.25)' }}>
                            <th style={{ textAlign: 'right', padding: '.35rem' }}>التاريخ</th>
                            <th style={{ textAlign: 'right', padding: '.35rem' }}>الحساب</th>
                            <th style={{ textAlign: 'right', padding: '.35rem' }}>البيان</th>
                            <th style={{ padding: '.35rem' }}>مدين</th>
                            <th style={{ padding: '.35rem' }}>دائن</th>
                          </tr>
                        </thead>
                        <tbody>
                          {journal.entries.map((e: any, i: number) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(127,127,127,.1)' }}>
                              <td style={{ padding: '.35rem', whiteSpace: 'nowrap' }} dir="ltr">{e.date}</td>
                              <td style={{ padding: '.35rem', fontWeight: 700, paddingRight: e.type === 'credit' ? '1.2rem' : '.35rem' }}>{e.accountAr}</td>
                              <td className="muted" style={{ padding: '.35rem' }}>{e.note}</td>
                              <td style={{ textAlign: 'center', color: '#059669', fontWeight: 800 }}>{e.type === 'debit' ? fmt(e.amount) : ''}</td>
                              <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 800 }}>{e.type === 'credit' ? fmt(e.amount) : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!journal.entries.length && <p className="text-center muted py-8">لا قيود في هذه الفترة</p>}
                  </section>
                </>
              )}
            </>
          )}

          {/* ═══ 🔄 التسوية ═══ */}
          {tab === 'recon' && (
            <>
              <section className="card">
                <h2>🔄 التسوية الآلية</h2>
                <p className="muted small" style={{ marginBottom: '.7rem' }}>
                  مطابقة ثلاثية: أرصدة المحافظ ↔ حركاتها · المدفوعات المعتمدة ↔ قيود المحافظ · مبالغ المدفوعات ↔ إجمالي الطلبات
                </p>
                <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={reconBusy} onClick={loadRecon}>
                  {reconBusy ? '⏳ جاري المطابقة...' : '🔄 تشغيل التسوية الآن'}
                </button>
              </section>
              {recon && (
                <section className="card anim-bounce-in">
                  <p className="small muted" style={{ marginBottom: '.6rem' }}>
                    فُحصت {recon.checkedWallets} محفظة و {recon.checkedPayments} عملية دفع — {new Date(recon.at).toLocaleString('ar-YE')}
                  </p>
                  {[
                    { label: '💰 أرصدة المحافظ', rows: recon.walletMismatches, render: (r: any) => `${r.seller}: مسجّل ${fmt(r.balance)} ↔ محسوب ${fmt(r.calculated)} (فرق ${fmt(r.diff)})` },
                    { label: '💳 مدفوعات بلا قيد محفظة', rows: recon.missingCredits, render: (r: any) => `${r.payment} — ${fmt(r.amount)} لم تُقيد في أي محفظة` },
                    { label: '🧮 مبالغ لا تطابق طلباتها', rows: recon.amountMismatches, render: (r: any) => `${r.payment}: دُفع ${fmt(r.paid)} ↔ الطلب ${r.order} بإجمالي ${fmt(r.orderTotal)}` },
                  ].map((sec) => (
                    <div key={sec.label} style={{ marginBottom: '.8rem' }}>
                      <p className="small" style={{ fontWeight: 800 }}>
                        {sec.label} {sec.rows.length
                          ? <span className="badge cancelled">{sec.rows.length} فرق</span>
                          : <span className="badge active">✅ سليم</span>}
                      </p>
                      {sec.rows.slice(0, 10).map((r: any, i: number) => (
                        <p key={i} className="small" style={{ color: '#b91c1c', margin: '.2rem 0' }}>• {sec.render(r)}</p>
                      ))}
                    </div>
                  ))}
                  {recon.ok && <p className="text-center py-4" style={{ color: '#059669', fontWeight: 900 }}>🎉 كل شيء متطابق — الحسابات نظيفة تماماً</p>}
                </section>
              )}
            </>
          )}

          {/* ═══ 🧾 كشف متجر ═══ */}
          {tab === 'statement' && (
            <>
              <section className="card">
                <h2>🧾 كشف حساب متجر</h2>
                <div className="row" style={{ gap: '.5rem', flexWrap: 'wrap' }}>
                  <select value={storeId} onChange={(e) => setStoreId(e.target.value)} style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
                    <option value="">اختر المتجر…</option>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="date" value={stFrom} onChange={(e) => setStFrom(e.target.value)} style={{ width: 'auto', marginBottom: 0 }} />
                  <input type="date" value={stTo} onChange={(e) => setStTo(e.target.value)} style={{ width: 'auto', marginBottom: 0 }} />
                  <button className="btn primary small" onClick={loadStatement}>عرض الكشف</button>
                </div>
              </section>
              {statement && (
                <section className="card anim-bounce-in">
                  <h2>🏪 {statement.store.name} <span className="muted small">— {statement.store.seller}</span></h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {[
                      { l: 'المبيعات', v: statement.sales, c: '#059669' },
                      { l: 'الطلبات', v: statement.ordersCount, c: '#6C3DF5' },
                      { l: `عمولة ${statement.commission}%`, v: statement.commissionDue, c: '#d97706' },
                      { l: 'رصيد المحفظة', v: statement.balance, c: '#0d9488' },
                    ].map((k) => (
                      <div key={k.l} className="text-center p-2.5 rounded-xl" style={{ background: 'rgba(127,127,127,.06)' }}>
                        <div className="font-black text-lg" style={{ color: k.c }}>{fmt(k.v)}</div>
                        <div className="text-[11px] muted">{k.l}</div>
                      </div>
                    ))}
                  </div>
                  <h2 style={{ fontSize: '.95rem' }}>حركات المحفظة في الفترة</h2>
                  {statement.transactions.map((t: any, i: number) => (
                    <p key={i} className="row between small" style={{ padding: '.3rem 0', borderBottom: '1px dashed rgba(127,127,127,.15)' }}>
                      <span>{t.type === 'credit' ? '➕' : '➖'} {t.note || '—'}</span>
                      <strong style={{ color: t.type === 'credit' ? '#059669' : '#dc2626' }}>{fmt(t.amount)}</strong>
                    </p>
                  ))}
                  {!statement.transactions.length && <p className="text-center muted py-4">لا حركات في هذه الفترة</p>}
                </section>
              )}
            </>
          )}

          {/* ═══ 📤 تقرير العمولات ═══ */}
          {tab === 'commissions' && (
            <>
              <section className="card">
                <h2>📤 تقرير العمولات الشهري</h2>
                <div className="row" style={{ gap: '.5rem', flexWrap: 'wrap' }}>
                  <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 'auto', marginBottom: 0 }} />
                  <button className="btn primary small" onClick={loadComm}>📊 عرض التقرير</button>
                  {comm && <button className="btn success small" onClick={exportCsv}>📥 تصدير Excel (CSV)</button>}
                </div>
              </section>
              {comm && (
                <section className="card anim-bounce-in">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2.5 rounded-xl" style={{ background: 'rgba(127,127,127,.06)' }}>
                      <div className="font-black text-lg">{fmt(comm.totals.sales)}</div><div className="text-[11px] muted">إجمالي المبيعات</div>
                    </div>
                    <div className="text-center p-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,.1)' }}>
                      <div className="font-black text-lg" style={{ color: '#d97706' }}>{fmt(comm.totals.commissionDue)}</div><div className="text-[11px] muted">عمولات مستحقة ({comm.commission}%)</div>
                    </div>
                    <div className="text-center p-2.5 rounded-xl" style={{ background: 'rgba(127,127,127,.06)' }}>
                      <div className="font-black text-lg">{comm.totals.stores}</div><div className="text-[11px] muted">متجر نشط</div>
                    </div>
                  </div>
                  {comm.rows.map((r: any, i: number) => (
                    <p key={i} className="row between small" style={{ padding: '.4rem 0', borderBottom: '1px dashed rgba(127,127,127,.15)' }}>
                      <span><b>{r.store}</b> <span className="muted">· {r.orders} طلب · إلكتروني {fmt(r.electronic)}</span></span>
                      <strong style={{ color: '#d97706' }}>{fmt(r.commissionDue)}</strong>
                    </p>
                  ))}
                  {!comm.rows.length && <p className="text-center muted py-6">لا مبيعات في هذا الشهر</p>}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
