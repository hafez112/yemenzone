'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';
import AdminSidebar from '@/components/AdminSidebar';
import ImageUpload from '@/components/ImageUpload';
import { TOOLS } from '@/lib/tools';

interface ToolRow { key: string; isVisible: boolean; order: number; uses: number; views: number; seoTitle?: string; seoDesc?: string; seoKeys?: string; price?: number | null; currency?: string }
interface AdRow { id: string; title: string; image: string; link?: string; position: string; size: string; isActive: boolean; views: number; clicks: number; positionLabel?: string; sizeLabel?: string }

// 👑 إدارة تكنولوجيا المنصة — خدمات + زيارات + SEO + إعلانات مستهدفة + أسعار صرف
export default function AdminToolsPage() {
  const { list: CURS, def: defCur } = useCurrency();
  const dsym = (code?: string) => CURS.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || defCur?.symbol || 'ر.ي';
  const router = useRouter();
  const [rows, setRows] = useState<ToolRow[]>([]);
  const [fx, setFx] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<{ bios: number; totalUses: number; totalViews: number; hubViews: number }>({ bios: 0, totalUses: 0, totalViews: 0, hubViews: 0 });
  const [loading, setLoading] = useState(true);
  const [newCur, setNewCur] = useState('');
  const [newRate, setNewRate] = useState('');
  const [seoEdit, setSeoEdit] = useState<string | null>(null);
  const [seoForm, setSeoForm] = useState({ seoTitle: '', seoDesc: '', seoKeys: '' });
  // 💰 تسعير الخدمة — فارغ/صفر = مجانية
  const [priceEdit, setPriceEdit] = useState<string | null>(null);
  const [priceVal, setPriceVal] = useState('');
  const [priceCur, setPriceCur] = useState('');
  const [aiImages, setAiImages] = useState(false);
  // 📢 الإعلانات
  const [ads, setAds] = useState<AdRow[]>([]);
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [adForm, setAdForm] = useState({ title: '', image: '', link: '', position: 'tools_all', size: 'wide' });

  const load = useCallback(async () => {
    try {
      const d = await api('/admin/tools');
      setRows(d.tools || []);
      setFx(d.fx || {});
      setAiImages(!!d.aiImages);
      setStats(d.stats || { bios: 0, totalUses: 0, totalViews: 0, hubViews: 0 });
      const [adsList, pos, sz] = await Promise.all([
        api('/admin/ads'), api('/admin/ads/positions'), api('/admin/ads/sizes'),
      ]);
      const arr: AdRow[] = Array.isArray(adsList) ? adsList : (adsList.ads || adsList.items || []);
      setAds(arr.filter((a) => a.position.startsWith('tool')));
      // نعرض فقط مواضع الخدمات في نموذج الإضافة
      const toolPos: Record<string, string> = {};
      for (const [k, v] of Object.entries(pos || {})) if (k.startsWith('tool')) toolPos[k] = v as string;
      setPositions(toolPos);
      setSizes(sz || {});
    } catch (e: any) { toast(e.message || 'تعذّر التحميل', 'error'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load();
  }, []);

  const toggle = async (r: ToolRow) => {
    try {
      await api(`/admin/tools/${r.key}`, { method: 'PATCH', body: JSON.stringify({ isVisible: !r.isVisible }) });
      setRows(rows.map((x) => x.key === r.key ? { ...x, isVisible: !x.isVisible } : x));
      toast(r.isVisible ? '🙈 أُخفيت الخدمة عن الزوار' : '👁️ ظهرت الخدمة للزوار');
    } catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };

  const move = async (r: ToolRow, dir: -1 | 1) => {
    const idx = rows.findIndex((x) => x.key === r.key);
    const swapWith = rows[idx + dir];
    if (!swapWith) return;
    try {
      await Promise.all([
        api(`/admin/tools/${r.key}`, { method: 'PATCH', body: JSON.stringify({ order: swapWith.order }) }),
        api(`/admin/tools/${swapWith.key}`, { method: 'PATCH', body: JSON.stringify({ order: r.order }) }),
      ]);
      toast('↕️ أُعيد الترتيب');
      load();
    } catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };

  // 💰 التسعير — كل خدمة: مجانية أو مدفوعة بسعر تحدده هنا (الدفع ببطاقة يمن زون فقط)
  const openPrice = (r: ToolRow) => {
    setPriceEdit(priceEdit === r.key ? null : r.key);
    setPriceVal(r.price ? String(r.price) : '');
    setPriceCur(r.currency || defCur?.code || '');
  };
  const savePrice = async (key: string, free = false) => {
    const p = free ? null : Number(priceVal);
    if (!free && (!p || p <= 0)) { toast('⚠️ أدخل سعراً صحيحاً أو اختر «مجانية»', 'error'); return; }
    try {
      await api(`/admin/tools/${key}`, { method: 'PATCH', body: JSON.stringify({ price: p, ...(p ? { currency: priceCur || undefined } : {}) }) });
      setRows(rows.map((x) => x.key === key ? { ...x, price: p, currency: p ? (priceCur || x.currency) : x.currency } : x));
      setPriceEdit(null);
      toast(p ? `💰 أصبحت مدفوعة بـ ${p.toLocaleString()} ${dsym(priceCur)} — تُفتح تلقائياً بعد الدفع بالبطاقة` : '🎁 أصبحت مجانية للجميع');
    } catch (e: any) { toast(e.message || 'تعذّر الحفظ', 'error'); }
  };

  // 🔍 SEO
  const openSeo = (r: ToolRow) => {
    setSeoEdit(seoEdit === r.key ? null : r.key);
    setSeoForm({ seoTitle: r.seoTitle || '', seoDesc: r.seoDesc || '', seoKeys: r.seoKeys || '' });
  };
  const saveSeo = async (key: string) => {
    try {
      await api(`/admin/tools/${key}`, { method: 'PATCH', body: JSON.stringify(seoForm) });
      setRows(rows.map((x) => x.key === key ? { ...x, ...seoForm } : x));
      setSeoEdit(null);
      toast('🔍 حُفظت إعدادات SEO — تظهر في جوجل خلال الزحف القادم');
    } catch (e: any) { toast(e.message || 'تعذّر الحفظ', 'error'); }
  };

  // 📢 الإعلانات
  const saveAd = async () => {
    if (!adForm.title.trim() || !adForm.image) { toast('أدخل عنوان الإعلان وارفع صورته', 'error'); return; }
    try {
      await api('/admin/ads', { method: 'POST', body: JSON.stringify(adForm) });
      setAdForm({ title: '', image: '', link: '', position: 'tools_all', size: 'wide' });
      toast('📢 نُشر الإعلان — يظهر فوراً في موضعه');
      load();
    } catch (e: any) { toast(e.message || 'تعذّر النشر', 'error'); }
  };
  const toggleAd = async (a: AdRow) => {
    try { await api(`/admin/ads/${a.id}/toggle`, { method: 'PATCH' }); toast(a.isActive ? '⏸️ أُوقف الإعلان' : '▶️ استؤنف الإعلان'); load(); }
    catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };
  const removeAd = async (a: AdRow) => {
    if (!confirm(`حذف إعلان «${a.title}» نهائياً؟`)) return;
    try { await api(`/admin/ads/${a.id}`, { method: 'DELETE' }); toast('🗑️ حُذف الإعلان'); load(); }
    catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };

  const saveFx = async () => {
    try { await api('/admin/tools-config', { method: 'PATCH', body: JSON.stringify({ fx }) }); toast('💾 حُفظت أسعار الصرف'); }
    catch (e: any) { toast(e.message || 'تعذّر الحفظ', 'error'); }
  };

  // 🤖 تفعيل توليد الشعارات بالذكاء الاصطناعي الخارجي — قرار الإدارة وحدها
  const toggleAi = async () => {
    try {
      await api('/admin/tools-config', { method: 'PATCH', body: JSON.stringify({ aiImages: !aiImages }) });
      setAiImages(!aiImages);
      toast(!aiImages ? '🤖 فُعّل توليد الشعارات بالذكاء الاصطناعي للزوار' : '⏸️ عُطّل التوليد بالذكاء — يبقى المحلي الفوري يعمل');
    } catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };
  const addCur = () => {
    const k = newCur.trim().toUpperCase();
    const v = Number(newRate);
    if (!/^[A-Z]{3,8}$/.test(k) || !(v > 0)) { toast('أدخل رمز عملة وسعراً صحيحاً', 'error'); return; }
    setFx({ ...fx, [k]: v });
    setNewCur(''); setNewRate('');
    toast('➕ أُضيفت — لا تنسَ الحفظ');
  };

  if (loading) return <div className="grid place-items-center py-32"><div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-purple-500 animate-spin" /></div>;

  const visibleCount = rows.filter((r) => r.isVisible).length;
  const inp = 'w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-purple-400';

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0 space-y-6" dir="rtl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-black">🧰 إدارة تكنولوجيا المنصة</h1>
              <p className="text-sm text-gray-500 mt-1">إظهار/إخفاء · 💰 تسعير (مجانية/مدفوعة بالبطاقة) · زيارات · SEO · إعلانات مستهدفة · أسعار الصرف</p>
            </div>
            <a href="/tools" target="_blank" className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500">👁️ معاينة صفحة الخدمات</a>
          </div>

          {/* إحصائيات */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { icon: '🧰', n: rows.length, l: 'خدمة إجمالاً' },
              { icon: '✅', n: visibleCount, l: 'ظاهرة للزوار' },
              { icon: '👥', n: stats.totalViews + stats.hubViews, l: 'زيارة للصفحات' },
              { icon: '📈', n: stats.totalUses, l: 'استخدام فعلي' },
              { icon: '🔗', n: stats.bios, l: 'صفحة روابطي' },
            ].map((s) => (
              <div key={s.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <div className="text-2xl">{s.icon}</div>
                <div className="text-xl font-black text-gray-800">{s.n.toLocaleString()}</div>
                <div className="text-xs font-bold text-gray-500">{s.l}</div>
              </div>
            ))}
          </div>

          {/* قائمة الخدمات */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <b className="font-extrabold">🗂️ الخدمات ({rows.length})</b>
              <span className="text-xs text-gray-400 font-bold">👥 = زيارات · 📈 = استخدامات</span>
            </div>
            <div className="divide-y divide-gray-50">
              {rows.map((r, i) => {
                const meta = TOOLS.find((t) => t.slug === r.key);
                return (
                  <div key={r.key} className={`${!r.isVisible ? 'opacity-50 bg-gray-50' : ''}`}>
                    <div className="p-3.5 flex items-center gap-3">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => move(r, -1)} disabled={i === 0} className="text-gray-400 hover:text-purple-600 disabled:opacity-20 text-xs">▲</button>
                        <button onClick={() => move(r, 1)} disabled={i === rows.length - 1} className="text-gray-400 hover:text-purple-600 disabled:opacity-20 text-xs">▼</button>
                      </div>
                      <span className="text-2xl">{meta?.icon || '🧩'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-sm text-gray-800 truncate">{meta?.title || r.key} {r.seoTitle && <span className="text-[10px] text-emerald-600 font-bold">🔍 SEO مخصص</span>}</p>
                        <p className="text-xs text-gray-400 truncate">{meta?.tagline}</p>
                      </div>
                      <span className="text-xs font-bold text-sky-600 shrink-0" title="زيارات الصفحة">👥 {r.views.toLocaleString()}</span>
                      <span className="text-xs font-bold text-gray-500 shrink-0" title="مرات الاستخدام">📈 {r.uses.toLocaleString()}</span>
                      <button onClick={() => openPrice(r)} title="التسعير — مجانية أو مدفوعة"
                        className={`h-8 px-2 grid place-items-center rounded-lg text-[11px] font-black shrink-0 ${
                          r.price ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}>
                        {r.price ? `💰 ${Number(r.price).toLocaleString()}` : '🎁 مجانية'}
                      </button>
                      <button onClick={() => openSeo(r)} title="إعدادات SEO"
                        className={`w-8 h-8 grid place-items-center rounded-lg text-sm ${seoEdit === r.key ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>🔍</button>
                      <a href={`/tools/${r.key}`} target="_blank" className="w-8 h-8 grid place-items-center rounded-lg bg-gray-100 hover:bg-gray-200 text-sm" title="معاينة">👁️</a>
                      <button onClick={() => toggle(r)}
                        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${r.isVisible ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${r.isVisible ? 'right-1' : 'right-6'}`} />
                      </button>
                    </div>
                    {/* 💰 محرر التسعير */}
                    {priceEdit === r.key && (
                      <div className="mx-4 mb-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
                        <p className="text-xs font-extrabold text-amber-800">💰 تسعير خدمة «{meta?.title}»</p>
                        <p className="text-[11px] text-gray-500">مجانية = متاحة لكل مسجل · مدفوعة = تُشترى ببطاقة يمن زون فقط وتفتح تلقائياً فور الدفع (شراء مرة واحدة = فتح دائم)</p>
                        <div className="flex gap-2 items-center flex-wrap">
                          <input type="number" min="0" value={priceVal} onChange={(e) => setPriceVal(e.target.value)}
                            placeholder="السعر (مثال: 5000)" className={inp} style={{ maxWidth: 200 }} />
                          <select value={priceCur} onChange={(e) => setPriceCur(e.target.value)} className={inp} style={{ maxWidth: 150 }} title="عملة السعر — من عملات المنصة المعتمدة">
                            {CURS.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.symbol}</option>)}
                          </select>
                          <button onClick={() => savePrice(r.key)} className="px-5 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-400">💾 حفظ السعر</button>
                          <button onClick={() => savePrice(r.key, true)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500">🎁 اجعلها مجانية</button>
                          <button onClick={() => setPriceEdit(null)} className="px-4 py-2 rounded-xl bg-gray-200 text-sm font-bold">إلغاء</button>
                        </div>
                      </div>
                    )}
                    {/* 🔍 محرر SEO */}
                    {seoEdit === r.key && (
                      <div className="mx-4 mb-4 rounded-2xl border border-purple-200 bg-purple-50/60 p-4 space-y-2">
                        <p className="text-xs font-extrabold text-purple-800">🔍 تحسين محركات البحث لخدمة «{meta?.title}» <span className="font-normal text-gray-500">— اتركها فارغة لاستخدام الافتراضي الذكي</span></p>
                        <input value={seoForm.seoTitle} onChange={(e) => setSeoForm({ ...seoForm, seoTitle: e.target.value })}
                          placeholder={`عنوان الصفحة في جوجل (الافتراضي: ${meta?.title} — خدمة مجانية | يمن زون)`} className={inp} />
                        <textarea value={seoForm.seoDesc} onChange={(e) => setSeoForm({ ...seoForm, seoDesc: e.target.value })} rows={2}
                          placeholder="وصف ميتا (160 حرفاً — الافتراضي: وصف الخدمة)" className={inp} />
                        <input value={seoForm.seoKeys} onChange={(e) => setSeoForm({ ...seoForm, seoKeys: e.target.value })}
                          placeholder="كلمات مفتاحية مفصولة بفاصلة (مثال: صانع فواتير مجاني، فاتورة PDF، اليمن)" className={inp} />
                        <div className="flex gap-2">
                          <button onClick={() => saveSeo(r.key)} className="px-5 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500">💾 حفظ SEO</button>
                          <button onClick={() => setSeoEdit(null)} className="px-4 py-2 rounded-xl bg-gray-200 text-sm font-bold">إلغاء</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 📢 إعلانات صفحات الخدمات */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <b className="font-extrabold">📢 إعلانات صفحات الخدمات</b>
              <p className="text-xs text-gray-500 mt-0.5">استهدف بوابة الخدمات، أو كل الصفحات، أو خدمة بعينها — بأحجام مختلفة مع تتبع مشاهدات ونقرات</p>
            </div>
            {/* نموذج إضافة */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} placeholder="عنوان الإعلان *" className={inp} />
                <input value={adForm.link} onChange={(e) => setAdForm({ ...adForm, link: e.target.value })} placeholder="رابط عند النقر (https://...)" className={inp} dir="ltr" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs font-bold text-gray-500">📍 مكان الظهور
                  <select value={adForm.position} onChange={(e) => setAdForm({ ...adForm, position: e.target.value })} className={`${inp} mt-1`}>
                    {Object.entries(positions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-gray-500">📐 الحجم
                  <select value={adForm.size} onChange={(e) => setAdForm({ ...adForm, size: e.target.value })} className={`${inp} mt-1`}>
                    {Object.entries(sizes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <ImageUpload endpoint="/admin/ads/upload" field="image" value={adForm.image} onChange={(url) => setAdForm({ ...adForm, image: url })} label="🖼️ صورة الإعلان *" ratio="aspect-[16/6]" />
                <button onClick={saveAd} className="px-6 py-3 rounded-xl bg-gradient-to-l from-purple-600 to-fuchsia-600 text-white text-sm font-extrabold shadow hover:brightness-110">📢 نشر الإعلان</button>
              </div>
            </div>
            {/* القائمة */}
            <div className="divide-y divide-gray-50">
              {ads.map((a) => (
                <div key={a.id} className={`p-3.5 flex items-center gap-3 ${!a.isActive ? 'opacity-50' : ''}`}>
                  <img src={imgUrl(a.image)} className="w-20 h-12 object-cover rounded-lg border border-gray-200" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm text-gray-800 truncate">{a.title}</p>
                    <p className="text-[11px] text-gray-400 truncate">{a.positionLabel || a.position} · {a.sizeLabel || a.size}</p>
                  </div>
                  <span className="text-[11px] font-bold text-sky-600 shrink-0">👁️ {a.views.toLocaleString()}</span>
                  <span className="text-[11px] font-bold text-emerald-600 shrink-0">👆 {a.clicks.toLocaleString()}{a.views > 0 && <span className="text-gray-400"> ({((a.clicks / a.views) * 100).toFixed(1)}%)</span>}</span>
                  <button onClick={() => toggleAd(a)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${a.isActive ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{a.isActive ? '⏸️ إيقاف' : '▶️ تشغيل'}</button>
                  <button onClick={() => removeAd(a)} className="w-8 h-8 grid place-items-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100">🗑️</button>
                </div>
              ))}
              {!ads.length && <p className="p-6 text-center text-sm text-gray-400">لا توجد إعلانات لصفحات الخدمات بعد — أضف أول إعلان بالأعلى 👆</p>}
            </div>
          </div>

          {/* 🤖 توليد الصور بالذكاء الاصطناعي */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 grid place-items-center text-2xl shrink-0">🎨</div>
            <div className="flex-1 min-w-52">
              <h2 className="font-extrabold">🤖 توليد الشعارات والأغلفة بالذكاء الاصطناعي</h2>
              <p className="text-xs text-gray-500 mt-0.5">عند التفعيل يظهر زر «ولّد بالذكاء الاصطناعي» في أداة مصمم الشعارات للزوار. التصميم المحلي الفوري يعمل دائماً بغض النظر.</p>
            </div>
            <button onClick={toggleAi}
              className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${aiImages ? 'bg-fuchsia-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-1.5 w-5 h-5 rounded-full bg-white shadow transition-all ${aiImages ? 'right-1.5' : 'right-7'}`} />
            </button>
          </div>

          {/* 💱 أسعار الصرف */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-extrabold mb-1">💱 أسعار صرف محوّل العملات</h2>
            <p className="text-xs text-gray-500 mb-4">سعر كل عملة مقابل الريال اليمني (مثال: USD = 530) — يظهر فوراً في أداة المحوّل</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {Object.entries(fx).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                  <b className="text-sm w-12 shrink-0" dir="ltr">{k}</b>
                  <input inputMode="decimal" value={v} onChange={(e) => setFx({ ...fx, [k]: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 })}
                    className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-sm font-bold text-center outline-none focus:border-purple-400" />
                  <button onClick={() => { const n = { ...fx }; delete n[k]; setFx(n); }} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <input value={newCur} onChange={(e) => setNewCur(e.target.value.toUpperCase())} placeholder="USD" dir="ltr"
                className="w-24 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold text-center outline-none focus:border-purple-400" />
              <input inputMode="decimal" value={newRate} onChange={(e) => setNewRate(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="السعر مقابل الريال"
                className="flex-1 min-w-40 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-purple-400" />
              <button onClick={addCur} className="px-4 rounded-xl bg-gray-800 text-white text-sm font-bold">➕ إضافة</button>
              <button onClick={saveFx} className="px-6 rounded-xl bg-gradient-to-l from-purple-600 to-fuchsia-600 text-white text-sm font-extrabold shadow">💾 حفظ الأسعار</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
