'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../../components/AdminSidebar';
import { api, getUser, imgUrl } from '../../../lib/api';
import { toast } from '../../../components/Toast';

// 📈 إدارة أسهم المنصة — جولات بيع الإسهام + الصكوك + المؤشر المرتبط بدخل المنصة
function Stat({ icon, label, value, sub, color }: any) {
  return (
    <div className="rounded-2xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">{icon} {label}</div>
      <div className="text-2xl font-black mt-1" style={{ color }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// 💡 أفكار إدارة بيع الأسهم — مثل الشركات
const IDEAS = [
  { icon: '🎯', title: 'جولات تمويل متدرجة', tip: 'بِع على جولات: الجولة الأولى بسعر تشجيعي، وكل جولة لاحقة بسعر أعلى — المبكر يكسب أكثر والطلب يتصاعد.' },
  { icon: '🐣', title: 'سعر الطير المبكر', tip: 'خصم 10–20% لأول 100 مشترٍ أو لأول أسبوع — الندرة والوقت يصنعان قرار الشراء.' },
  { icon: '🔒', title: 'فترة حظر بيع (Lock-up)', tip: 'اشترط في الإعلان عدم إعادة البيع 6–12 شهراً — يحمي السعر ويمنح ثقة للمستثمرين الجدد.' },
  { icon: '💵', title: 'توزيع أرباح دورية', tip: 'أعلن توزيع ربح السهم (المؤشر يحسبه استرشادياً) كل 3 أشهر على محافظ المساهمين — الانتظام يبني السمعة.' },
  { icon: '🤝', title: 'أسهم مكافأة الإحالة', tip: 'امنح سهماً مجانياً لكل من يجلب مستثمراً جديداً — المساهمون أنفسهم يصبحون فريق مبيعاتك.' },
  { icon: '📊', title: 'تقرير مساهمين شهري', tip: 'انشر ملخص دخل المنصة ونموها شهرياً في صفحة الاستثمار — الشفافية ترفع سعر السهم.' },
  { icon: '👥', title: 'سقف ملكية الفرد', tip: 'حدّد حداً أعلى لكل مشترٍ (مثلاً 2%) — تنويع المساهمين يحمي القرار ويوسع القاعدة.' },
  { icon: '🔄', title: 'سياسة إعادة شراء', tip: 'أعلن استعداد المنصة إعادة شراء الأسهم بسعر المؤشر بعد سنة — يزيل خوف «من يشتري مني لاحقاً؟».' },
  { icon: '🏅', title: 'امتيازات المساهم', tip: 'بطاقة مساهم: عمولة أقل للتاجر المساهم، أولوية دعم، وشارة «شريك مؤسس» على صكوك أول جولة.' },
  { icon: '📈', title: 'اربط السعر بالإنجاز', tip: 'ارفع سعر الجولة القادمة عند كل محطة معلنة (10,000 مستخدم / 1,000 طلب شهري) — السعر يصبح قصة نجاح.' },
];

export default function AdminSharesPage() {
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [tab, setTab] = useState<'overview' | 'pending' | 'certs' | 'ideas'>('overview');
  // نموذج جولة جديدة
  const [form, setForm] = useState({ title: '', totalShares: '', pricePerShare: '', currency: 'YER', description: '' });
  const [busy, setBusy] = useState(false);
  // الإعدادات
  const [cfg, setCfg] = useState({ totalShares: 100000, basePrice: 1000, baseMonthIncome: 0, profitSharePct: 70 });
  const [cfgBusy, setCfgBusy] = useState(false);

  const load = () => api('/admin/shares').then((r) => {
    setD(r);
    setCfg(r.settings);
  }).catch((e) => { toast(e.message, 'error'); router.push('/auth/admin-login'); });

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load();
  }, []);

  const createOffering = async () => {
    setBusy(true);
    try {
      const r = await api('/admin/shares/offerings', { method: 'POST', body: JSON.stringify(form) });
      toast(r.message);
      setForm({ title: '', totalShares: '', pricePerShare: '', currency: 'YER', description: '' });
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  };

  const toggleOffering = async (id: string, isActive: boolean) => {
    try {
      const r = await api(`/admin/shares/offerings/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
      toast(r.message);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const review = async (id: string, approve: boolean) => {
    if (!approve && !confirm('رفض هذا الطلب؟ يُشعر المشتري تلقائياً')) return;
    try {
      const r = await api(`/admin/shares/purchases/${id}/review`, { method: 'POST', body: JSON.stringify({ approve }) });
      toast(r.message);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const cancelCert = async (id: string, number: string) => {
    if (!confirm(`إلغاء الصك «${number}»؟ يعكس قيد الدفع من الإيراد ويشعر المالك`)) return;
    try {
      const r = await api(`/admin/shares/certificates/${id}/cancel`, { method: 'POST' });
      toast(r.message);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const saveCfg = async () => {
    setCfgBusy(true);
    try {
      await api('/admin/shares/settings', { method: 'PUT', body: JSON.stringify(cfg) });
      toast('✅ حُفظت إعدادات الأسهم — تحدّث المؤشر وربح السهم فوراً');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setCfgBusy(false);
  };

  if (!d) return null;
  const { offerings, pending, certificates, index: idx } = d;
  const maxIncome = Math.max(...idx.months.map((m: any) => m.income), 1);

  return (
    <main className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(180deg, #0A0A14, #141428)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1 space-y-4 min-w-0">

          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl font-black text-white">📈 أسهم المنصة</h1>
            <a href="/invest" target="_blank" className="text-[11px] font-extrabold text-teal-300 underline">صفحة الاستثمار العامة ↗</a>
          </div>

          {/* 📊 مؤشر يمن زون YZX */}
          <div className="rounded-3xl p-5 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #059669, #0f766e 55%, #134e4a)' }}>
            <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-white/10" />
            <div className="flex items-start justify-between flex-wrap gap-4 relative">
              <div>
                <div className="text-[11px] font-bold opacity-80">مؤشر يمن زون YZX</div>
                <div className="text-4xl font-black mt-1">{idx.yzx.toLocaleString()}</div>
                <div className={`text-xs font-extrabold mt-1 ${idx.changePct >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                  {idx.changePct >= 0 ? '▲' : '▼'} {Math.abs(idx.changePct)}% عن سعر التأسيس ({idx.basePrice.toLocaleString()} ر.ي)
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[{ l: 'بعد 3 أشهر', v: idx.forecast.m3 }, { l: 'بعد 6 أشهر', v: idx.forecast.m6 }, { l: 'بعد سنة', v: idx.forecast.m12 }].map((f) => (
                  <div key={f.l} className="bg-white/10 rounded-2xl px-3 py-2">
                    <div className="text-[9px] font-bold opacity-75">{f.l}</div>
                    <div className="font-black text-sm mt-0.5">{f.v.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* مخطط دخل المنصة الشهري — أساس المؤشر */}
            <div className="mt-4 flex items-end gap-1.5 h-16">
              {idx.months.map((m: any) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-white/30" style={{ height: `${Math.max(4, (m.income / maxIncome) * 52)}px` }} title={`${m.month}: ${m.income.toLocaleString()}`} />
                  <div className="text-[8px] opacity-70 font-bold">{m.month.slice(5)}</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] opacity-75 font-bold mt-2">السعر الاسترشادي = سعر التأسيس × نمو متوسط دخل آخر 3 أشهر — مؤشر استرشادي داخلي وليس تعهداً استثمارياً</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <Stat icon="💰" label="إجمالي ما جُمع" value={idx.raised} sub="ريال يمني" color="#34d399" />
            <Stat icon="📊" label="أسهم مُباعة" value={idx.soldShares} sub={`من أصل ${idx.totalShares.toLocaleString()}`} color="#60a5fa" />
            <Stat icon="👥" label="مساهمون" value={idx.holders} sub="صك نشط" color="#fbbf24" />
            <Stat icon="💵" label="ربح السهم الشهري" value={idx.eps} sub={`${idx.profitSharePct}% من الدخل ÷ الأسهم`} color="#f472b6" />
          </div>

          {/* التبويبات */}
          <div className="flex gap-2 flex-wrap">
            {[['overview', '📋 الجولات'], ['pending', `⏳ طلبات التحويل ${pending.length ? `(${pending.length})` : ''}`], ['certs', '📜 الصكوك'], ['ideas', '💡 أفكار البيع']].map(([k, l]: any) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all ${tab === k ? 'bg-teal-500 text-white' : 'bg-white/5 text-gray-300 border border-white/10'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* 📋 الجولات + طرح جديد */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 p-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <h2 className="font-black text-white text-sm">➕ طرح أسهم جديدة من إسهام المنصة</h2>
                <div className="grid md:grid-cols-4 gap-2">
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="اسم الجولة — «الجولة الأولى»"
                    className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold outline-none focus:border-teal-400" />
                  <input inputMode="numeric" value={form.totalShares} onChange={(e) => setForm({ ...form, totalShares: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="عدد الأسهم المطروحة"
                    className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold outline-none focus:border-teal-400" />
                  <input inputMode="numeric" value={form.pricePerShare} onChange={(e) => setForm({ ...form, pricePerShare: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="سعر بيع السهم"
                    className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold outline-none focus:border-teal-400" />
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold outline-none">
                    <option value="YER">ريال يمني</option><option value="SAR">ريال سعودي</option><option value="USD">دولار</option>
                  </select>
                </div>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="وصف الجولة (اختياري) — يظهر في صفحة الاستثمار"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold outline-none focus:border-teal-400" />
                <button onClick={createOffering} disabled={busy || !form.title || !form.totalShares || !form.pricePerShare}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-sm font-extrabold disabled:opacity-40 transition-colors">
                  {busy ? '⏳...' : '🚀 اطرح الجولة للبيع — تغلق أي جولة نشطة سابقة'}
                </button>
              </div>

              {offerings.map((o: any) => {
                const pct = Math.min(100, Math.round((o.sold / Math.max(o.totalShares, 1)) * 100));
                return (
                  <div key={o.id} className="rounded-3xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <b className="text-white text-sm">{o.title}</b>
                        {o.isActive && <span className="mr-2 text-[9px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">🟢 نشطة للبيع</span>}
                        <p className="text-[11px] text-gray-400 mt-1 font-bold">
                          {o.pricePerShare.toLocaleString()} {o.currency} / سهم · {o.certs} صك
                          {o.description && ` · ${o.description}`}
                        </p>
                      </div>
                      <button onClick={() => toggleOffering(o.id, !o.isActive)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold ${o.isActive ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                        {o.isActive ? '⏸️ إيقاف البيع' : '▶️ تفعيل البيع'}
                      </button>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full overflow-hidden bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-l from-teal-400 to-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold mt-1.5">بِيع {o.sold.toLocaleString()} من {o.totalShares.toLocaleString()} سهم ({pct}%) — المتاح {(o.totalShares - o.sold).toLocaleString()}</p>
                  </div>
                );
              })}

              {/* ⚙️ إعدادات رأس المال والمؤشر */}
              <div className="rounded-3xl border border-white/10 p-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <h2 className="font-black text-white text-sm">⚙️ رأس المال والمؤشر</h2>
                <div className="grid md:grid-cols-4 gap-2">
                  {[
                    ['totalShares', 'إجمالي أسهم رأس المال'],
                    ['basePrice', 'سعر التأسيس (المؤشر=100)'],
                    ['baseMonthIncome', 'دخل شهر الأساس (0=تلقائي)'],
                    ['profitSharePct', 'نسبة توزيع الربح %'],
                  ].map(([k, l]: any) => (
                    <label key={k} className="block">
                      <span className="text-[10px] text-gray-400 font-bold">{l}</span>
                      <input inputMode="numeric" value={(cfg as any)[k]}
                        onChange={(e) => setCfg({ ...cfg, [k]: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                        className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold outline-none focus:border-teal-400" />
                    </label>
                  ))}
                </div>
                <button onClick={saveCfg} disabled={cfgBusy}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-extrabold disabled:opacity-40">
                  {cfgBusy ? '⏳...' : '💾 حفظ الإعدادات'}
                </button>
              </div>
            </div>
          )}

          {/* ⏳ طلبات التحويل المعلقة */}
          {tab === 'pending' && (
            <div className="space-y-3">
              {!pending.length && <p className="text-center text-gray-500 text-sm font-bold py-10">لا طلبات معلقة ✅</p>}
              {pending.map((c: any) => (
                <div key={c.id} className="rounded-3xl border border-amber-400/20 p-4" style={{ background: 'rgba(251,191,36,0.05)' }}>
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <b className="text-white text-sm">{c.ownerName} <span className="text-gray-400 font-bold text-[11px]">({c.ownerType === 'seller' ? 'تاجر' : 'عميل'} — {c.ownerPhone})</span></b>
                      <p className="text-[11px] text-gray-400 font-bold mt-1">
                        {c.shares.toLocaleString()} سهم × {c.totalAmount.toLocaleString()} {c.currency} — {c.offering}
                      </p>
                      {c.proofImage && (
                        <a href={imgUrl(c.proofImage)} target="_blank" className="inline-block mt-2">
                          <img src={imgUrl(c.proofImage)} alt="إثبات التحويل" className="h-20 rounded-xl border border-white/10" />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => review(c.id, true)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-extrabold">✅ اعتماد وإصدار الصك</button>
                      <button onClick={() => review(c.id, false)}
                        className="px-4 py-2.5 rounded-xl bg-red-500/15 text-red-300 text-xs font-extrabold">✕ رفض</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 📜 الصكوك المصدرة */}
          {tab === 'certs' && (
            <div className="space-y-2">
              {!certificates.length && <p className="text-center text-gray-500 text-sm font-bold py-10">لا صكوك بعد</p>}
              {certificates.map((c: any) => (
                <div key={c.id} className="rounded-2xl border border-white/10 px-4 py-3 flex items-center justify-between flex-wrap gap-2"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div>
                    <b className="text-white text-xs" dir="ltr">{c.number}</b>
                    <span className={`mr-2 text-[9px] font-black px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                      {c.status === 'active' ? '📜 نشط' : '🚫 ملغي'}
                    </span>
                    <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                      {c.ownerName} · {c.shares.toLocaleString()} سهم · {c.totalAmount.toLocaleString()} {c.currency} · {c.method === 'yz-card' ? '💳 بطاقة' : '🔄 تحويل'} · {new Date(c.createdAt).toLocaleDateString('ar-YE')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`/share-certificate/${c.number}`} target="_blank"
                      className="px-3 py-2 rounded-xl bg-white/10 text-white text-[10px] font-extrabold">👁️ عرض</a>
                    {c.status === 'active' && (
                      <button onClick={() => cancelCert(c.id, c.number)}
                        className="px-3 py-2 rounded-xl bg-red-500/15 text-red-300 text-[10px] font-extrabold">🚫 إلغاء</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 💡 أفكار بيع الأسهم مثل الشركات */}
          {tab === 'ideas' && (
            <div className="grid md:grid-cols-2 gap-3">
              {IDEAS.map((i) => (
                <div key={i.title} className="rounded-3xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <b className="text-white text-sm">{i.icon} {i.title}</b>
                  <p className="text-[11px] text-gray-400 font-bold mt-1.5 leading-relaxed">{i.tip}</p>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
