'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';

// 🚀 مساعد النمو المحلي — تحليلات قاعدية على بيانات المتجر الفعلية (بدون خوادم خارجية)
const VERDICTS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  above: { label: 'أعلى من السوق', color: '#b91c1c', bg: '#fee2e2', icon: '⬆️' },
  below: { label: 'أقل من السوق', color: '#065f46', bg: '#d1fae5', icon: '⬇️' },
  within: { label: 'ضمن السوق', color: '#92400e', bg: '#fef3c7', icon: '✅' },
};
const TONES = ['🎯 تسويقي', '🛡️ ثقة وجودة', '🎁 عاطفي'];

export default function SellerGrowthPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [descName, setDescName] = useState('');
  const [descCat, setDescCat] = useState('');
  const [variants, setVariants] = useState<string[]>([]);
  const [genBusy, setGenBusy] = useState(false);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    api('/seller/growth').then(setData).catch((e) => toast(e.message, 'error'));
  }, []);

  const generate = async () => {
    if (descName.trim().length < 2) return toast('⚠️ أدخل اسم المنتج أولاً', 'error');
    setGenBusy(true);
    try {
      const d = await api('/seller/growth/describe', { method: 'POST', body: JSON.stringify({ name: descName, category: descCat }) });
      setVariants(d.variants);
      toast('✍️ ولّدت لك 3 أوصاف بثلاث نبرات — انسخ الأنسب');
    } catch (e: any) { toast(e.message, 'error'); }
    setGenBusy(false);
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast('📋 نُسخ الوصف — ألصقه في صفحة المنتج'); }
    catch { toast('⚠️ حدد النص وانسخه يدوياً', 'error'); }
  };

  const maxOrders = data ? Math.max(...data.hours.list.map((h: any) => h.orders), 1) : 1;

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🚀 مساعد النمو</h1>
          <p className="text-sm text-gray-500 mb-4">تحليلات محلية على بيانات متجرك الفعلية — لا تغادر شيئاً خارج المنصة</p>

          {!data ? <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-40 rounded-3xl" />)}</div> : (
            <>
              {/* 🕐 ساعات الذروة */}
              <section className="card">
                <h2>🕐 ساعات الذروة للبيع <span className="muted small font-normal">— آخر {data.hours.days} يوماً · {data.hours.totalOrders} طلب</span></h2>
                {data.hours.totalOrders === 0 ? (
                  <p className="muted small text-center py-4">لا طلبات كافية بعد — تظهر الخريطة مع أولى طلباتك</p>
                ) : (
                  <>
                    <div className="flex items-end gap-[3px] h-24 mb-1" dir="ltr">
                      {data.hours.list.map((h: any) => {
                        const isBest = h.h === data.hours.best.h && h.orders > 0;
                        return (
                          <div key={h.h} className="flex-1 rounded-t-md transition-all duration-700"
                            title={`${h.h}:00 — ${h.orders} طلب · ${h.revenue.toLocaleString()}`}
                            style={{
                              height: `${Math.max((h.orders / maxOrders) * 100, 4)}%`,
                              background: isBest
                                ? 'linear-gradient(180deg,#f59e0b,#dc2626)'
                                : h.orders > 0 ? 'linear-gradient(180deg,#a78bfa,#6C3DF5)' : 'rgba(127,127,127,.15)',
                            }} />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[9px] muted" dir="ltr">
                      <span>0</span><span>6</span><span>12</span><span>18</span><span>23</span>
                    </div>
                    {data.hours.best.orders > 0 && (
                      <p className="small mt-2" style={{ color: '#92400e', fontWeight: 700 }}>
                        🔥 ذروتك: الساعة {data.hours.best.h}:00 ({data.hours.best.orders} طلب) — انشر عروضك قبلها بساعة لتصل أكبر عدد
                      </p>
                    )}
                  </>
                )}
              </section>

              <div className="grid-cards">
                {/* 📦 المنتجات الراكدة */}
                <section className="card" style={{ marginBottom: 0 }}>
                  <h2>📦 منتجات راكدة</h2>
                  <p className="muted small" style={{ marginBottom: '.5rem' }}>لم تُبع خلال 30 يوماً رغم المشاهدات</p>
                  {data.stagnant.length === 0 && <p className="small text-center py-3" style={{ color: '#059669', fontWeight: 800 }}>🎉 كل منتجاتك تتحرك — ممتاز!</p>}
                  {data.stagnant.map((p: any) => (
                    <div key={p.id} className="row between small" style={{ padding: '.45rem 0', borderBottom: '1px dashed rgba(127,127,127,.15)' }}>
                      <div className="min-w-0">
                        <b className="block truncate">{p.name}</b>
                        <span className="muted text-[10px]">👁️ {p.viewsCount} مشاهدة · 📦 {p.stock} مخزون</span>
                      </div>
                      <Link href="/seller/products" className="btn small ghost shrink-0">✏️ حرّكه</Link>
                    </div>
                  ))}
                </section>

                {/* 👥 العملاء المتكررون */}
                <section className="card" style={{ marginBottom: 0 }}>
                  <h2>👥 عملاؤك الأوفياء</h2>
                  <p className="muted small" style={{ marginBottom: '.5rem' }}>طلبوا مرتين فأكثر خلال 60 يوماً</p>
                  {data.repeatCustomers.length === 0 && <p className="muted small text-center py-3">لم يتكرر أحد بعد — كافئ أول متكرر بكوبون 🎟️</p>}
                  {data.repeatCustomers.map((c: any, i: number) => (
                    <div key={i} className="row between small" style={{ padding: '.45rem 0', borderBottom: '1px dashed rgba(127,127,127,.15)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                          style={{ background: i === 0 ? '#f59e0b' : 'var(--primary)' }}>{c.name[0]}</span>
                        <div className="min-w-0">
                          <b className="block truncate">{c.name} {c.count >= 3 && <span title="عميل VIP">👑</span>}</b>
                          <span className="muted text-[10px]">{c.count} طلبات</span>
                        </div>
                      </div>
                      <strong style={{ color: '#0d9488' }} className="shrink-0">{c.spent.toLocaleString()}</strong>
                    </div>
                  ))}
                </section>
              </div>

              {/* 💰 اقتراحات التسعير */}
              <section className="card">
                <h2>💰 تسعيرك مقابل السوق</h2>
                <p className="muted small" style={{ marginBottom: '.6rem' }}>مقارنة بمنتجات مشابهة بالاسم في متاجر أخرى داخل المنصة</p>
                {data.pricing.length === 0 && (
                  <p className="muted small text-center py-3">لا مُشابهات كافية في السوق بعد — تظهر المقارنات مع نمو المنصة</p>
                )}
                <div className="grid-cards">
                  {data.pricing.map((p: any) => {
                    const v = VERDICTS[p.verdict];
                    return (
                      <div key={p.id} className="p-3 rounded-2xl" style={{ background: 'rgba(127,127,127,.05)' }}>
                        <b className="text-sm block truncate mb-1.5">{p.name}</b>
                        <div className="row between small">
                          <span className="muted">سعرك</span>
                          <strong>{p.mine.toLocaleString()}</strong>
                        </div>
                        <div className="row between small">
                          <span className="muted">متوسط السوق <span className="text-[9px]">({p.samples} منتج)</span></span>
                          <strong>{p.marketAvg.toLocaleString()}</strong>
                        </div>
                        <div className="text-center mt-2">
                          <span className="badge" style={{ background: v.bg, color: v.color }}>
                            {v.icon} {v.label} {p.diff !== 0 && `(${p.diff > 0 ? '+' : ''}${p.diff}%)`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ✍️ مولّد الأوصاف */}
              <section className="card">
                <h2>✍️ مولّد أوصاف المنتجات</h2>
                <p className="muted small" style={{ marginBottom: '.6rem' }}>قوالب عربية مجرّبة بثلاث نبرات — أدخل الاسم وانسخ الأنسب</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <input value={descName} onChange={(e) => setDescName(e.target.value)} placeholder="اسم المنتج — مثال: عسل سدر عصافير" />
                  <input value={descCat} onChange={(e) => setDescCat(e.target.value)} placeholder="القسم (اختياري) — مثال: غذائية" />
                  <button className="btn primary" disabled={genBusy} onClick={generate} style={{ justifyContent: 'center' }}>
                    {genBusy ? '⏳…' : '✍️ ولّد 3 أوصاف'}
                  </button>
                </div>
                {variants.length > 0 && (
                  <div className="grid-cards anim-bounce-in">
                    {variants.map((v, i) => (
                      <div key={i} className="p-3 rounded-2xl" style={{ background: 'rgba(127,127,127,.05)' }}>
                        <div className="row between mb-2">
                          <b className="text-xs">{TONES[i]}</b>
                          <button className="btn small primary" onClick={() => copy(v)}>📋 نسخ</button>
                        </div>
                        <pre className="text-xs whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'inherit', margin: 0 }}>{v}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
