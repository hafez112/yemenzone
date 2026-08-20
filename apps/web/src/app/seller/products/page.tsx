'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';
import BulkTools from '@/components/seller/BulkTools';
import RichTextEditor from '@/components/RichTextEditor';
import { PRODUCT_KINDS, productKindInfo } from '@/lib/activity';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// إدارة المنتجات — مع الذكاء المحلي في كل خطوة
export default function ProductsPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: '', categoryId: '', productKind: '', specs: {}, price: '', salePrice: '', stock: 10, lowStockAt: 5, description: '', shortDesc: '', keywords: '', metaTitle: '', metaDesc: '', isFeatured: false, sku: '', barcode: '', features: [], variants: [], images: [] });
  const [showVariants, setShowVariants] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState('');
  const [priceReport, setPriceReport] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const wbRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [cats, prods] = await Promise.all([
      api('/seller/categories'),
      api('/seller/products'),
    ]);
    setCategories(cats.categories);
    setProducts(prods);
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    load().catch(e => toast(e.message, 'error'));
  }, []);

  // 🤖 توليد وصف بالذكاء المحلي
  async function aiDescribe() {
    if (!form.name) return toast(isRestaurant ? 'اكتب اسم الصنف أولاً' : 'اكتب اسم المنتج أولاً', 'error');
    try {
      const catName = categories.find(c => c.id === form.categoryId)?.name;
      const r = await api('/seller/ai-tools', {
        method: 'POST',
        body: JSON.stringify({ action: 'describe', name: form.name, categoryName: catName }),
      });
      setForm({ ...form, description: r.result });
      toast('🤖 تم توليد الوصف');
    } catch (e: any) { toast(e.message, 'error'); }
  }

  // 🤖 اقتراح سعر تخفيض
  async function aiSalePrice() {
    if (!form.price) return toast('أدخل السعر أولاً', 'error');
    const r = await api('/seller/ai-tools', {
      method: 'POST',
      body: JSON.stringify({ action: 'sale-price', price: form.price }),
    });
    if (r.result) setForm({ ...form, salePrice: r.result });
  }

  // ✨ وصف مفصّل بالذكاء (خارجي عند تفعيل الإدارة له — وإلا محلي مفصّل)
  async function aiDetailedDesc() {
    if (!form.name) return toast(isRestaurant ? 'اكتب اسم الصنف أولاً' : 'اكتب اسم المنتج أولاً', 'error');
    setAiBusy('desc');
    try {
      const catName = categories.find(c => c.id === form.categoryId)?.name;
      const details = [
        ...(form.features || []).filter((f: any) => f.key && f.value).map((f: any) => `${f.key}: ${f.value}`),
        ...Object.entries(form.specs || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
      ].join('، ');
      const r = await api('/seller/ai/description', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, categoryName: catName, details }),
      });
      setForm({ ...form, description: r.text.replace(/\n/g, '<br/>') });
      toast(r.source === 'external' ? '🌐 تم توليد الوصف بالذكاء الخارجي' : '🧠 تم توليد الوصف بالذكاء المحلي');
    } catch (e: any) { toast(e.message, 'error'); }
    setAiBusy('');
  }

  // 💲 فحص السعر مقابل أسعار المنصة (+ رأي الذكاء الخارجي إن فُعّل)
  async function aiPriceCheck() {
    if (!form.name) return toast(isRestaurant ? 'اكتب اسم الصنف أولاً' : 'اكتب اسم المنتج أولاً', 'error');
    if (!form.price) return toast('أدخل السعر أولاً', 'error');
    setAiBusy('price');
    try {
      const r = await api('/seller/ai/price-check', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, price: form.price }),
      });
      setPriceReport(r);
      toast('💲 تم فحص السعر');
    } catch (e: any) { toast(e.message, 'error'); }
    setAiBusy('');
  }

  // 🖼️ رفع صورة وتُحفظ بخلفية بيضاء احترافية
  async function uploadWhiteBg(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files).slice(0, 3)) {
        const fd = new FormData();
        fd.append('file', f);
        const token = localStorage.getItem('yz_token');
        const res = await fetch(`${API}/api/seller/ai/white-bg`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setForm((prev: any) => ({ ...prev, images: [...prev.images, data.url] }));
      }
      toast('🖼️ تمت الإضافة بخلفية بيضاء');
    } catch (e: any) { toast(e.message, 'error'); }
    setUploading(false);
  }

  // رفع الصور → WebP
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).slice(0, 6).forEach(f => fd.append('images', f));
      const token = localStorage.getItem('yz_token');
      const res = await fetch(`${API}/api/seller/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setForm({ ...form, images: [...form.images, ...data.urls] });
      toast(`✅ تم رفع ${data.urls.length} صورة (WebP)`);
    } catch (e: any) { toast(e.message, 'error'); }
    setUploading(false);
  }

  async function save() {
    if (showVariants) {
      const valid = form.variants.filter((v: any) => Number(v.price) > 0 && (v.color?.trim() || v.size?.trim()));
      if (valid.length === 0) return toast('🎨 أضف خياراً واحداً على الأقل بسعر واسم (لون/مقاس/وزن) — أو أطفئ الخيارات', 'error');
      form.variants = valid;
    } else {
      form.variants = [];
    }
    setSaving(true);
    try {
      form.specs = Object.fromEntries(Object.entries(form.specs || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined));
      if (editing) {
        await api(`/seller/products/${editing.id}`, { method: 'PATCH', body: JSON.stringify(form) });
        toast(isRestaurant ? '✅ تم تحديث الصنف' : '✅ تم تحديث المنتج');
      } else {
        await api('/seller/products', { method: 'POST', body: JSON.stringify(form) });
        toast(isRestaurant ? '🎉 أُضيف الصنف إلى المنيو' : '🎉 تمت إضافة المنتج');
      }
      setShowForm(false); setEditing(null);
      setForm({ name: '', categoryId: '', productKind: '', specs: {}, price: '', salePrice: '', stock: 10, lowStockAt: 5, description: '', shortDesc: '', keywords: '', metaTitle: '', metaDesc: '', isFeatured: false, sku: '', barcode: '', features: [], variants: [], images: [] }); setShowVariants(false);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSaving(false);
  }

  async function remove(id: string, n: string) {
    if (!confirm(`حذف "${n}" نهائياً؟`)) return;
    try {
      await api(`/seller/products/${id}`, { method: 'DELETE' });
      toast('🗑️ تم الحذف');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  function startEdit(p: any) {
    setEditing(p);
    setForm({
      name: p.name, categoryId: p.categoryId || '', productKind: p.productKind || '',
      specs: p.specs || {},
      price: p.price, salePrice: p.salePrice || '',
      stock: p.stock, lowStockAt: p.lowStockAt ?? 5, description: p.description || '',
      shortDesc: p.shortDesc || '', keywords: p.keywords || '',
      metaTitle: p.metaTitle || '', metaDesc: p.metaDesc || '', isFeatured: !!p.isFeatured,
      sku: p.sku || '', barcode: p.barcode || '',
      features: Array.isArray(p.features) ? p.features : [],
      variants: Array.isArray(p.variants) ? p.variants : [],
      images: p.images || [],
    });
    setShowVariants(Array.isArray(p.variants) && p.variants.length > 0);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!store) return null;

  // 🍽️🏬 تسميات حسب النشاط — المنيو للمطاعم، والمول للمولات
  const isRestaurant = store.type?.kind === 'restaurants';
  const isMall = store.type?.kind === 'malls';
  const W = isRestaurant
    ? { title: '🍽️ المنيو', add: '➕ صنف جديد', namePh: 'اسم الصنف — مثال: مندي دجاج', kindPh: '🧬 نوع الصنف (يحدد المواصفات المناسبة)', added: '🎉 أُضيف الصنف إلى المنيو', updated: '✅ تم تحديث الصنف', nameReq: 'اكتب اسم الصنف أولاً' }
    : isMall
      ? { title: '🏬 منتجات المول', add: '➕ منتج جديد للمول', namePh: 'اسم المنتج — مثال: سماعة لاسلكية برو', kindPh: '🧬 نوع المنتج (يحدد المواصفات المناسبة)', added: '🎉 أُضيف المنتج إلى المول', updated: '✅ تم تحديث المنتج', nameReq: 'اكتب اسم المنتج أولاً' }
      : { title: '📦 منتجاتي', add: '➕ منتج جديد', namePh: 'اسم المنتج', kindPh: '🧬 نوع المنتج (يحدد المواصفات المناسبة)', added: '🎉 تمت إضافة المنتج', updated: '✅ تم تحديث المنتج', nameReq: 'اكتب اسم المنتج أولاً' };
  const kindOptions = isRestaurant
    ? [...PRODUCT_KINDS.filter(k => ['dishes', 'drinks', 'desserts'].includes(k.id)), ...PRODUCT_KINDS.filter(k => !['dishes', 'drinks', 'desserts'].includes(k.id))]
    : PRODUCT_KINDS;

  // 🗂️ أسماء الأصناف الهرمية (رئيسي › فرعي) للقوائم
  const catName = (c: any) => {
    const parent = c.parentId ? categories.find(p => p.id === c.parentId) : null;
    return parent ? `${parent.name} › ${c.name}` : c.name;
  };
  const sortedCats = [
    ...categories.filter(c => !c.parentId),
    ...categories.filter(c => !!c.parentId),
  ];
  const q = search.trim();
  const shown = products.filter(p => {
    if (filter === 'featured' && !p.isFeatured) return false;
    if (filter === 'none' && p.categoryId) return false;
    if (filter !== 'all' && filter !== 'none' && filter !== 'featured' && p.categoryId !== filter) return false;
    if (!q) return true;
    const catN = p.category?.name || '';
    return `${p.name} ${p.shortDesc || ''} ${p.keywords || ''} ${p.sku || ''} ${p.barcode || ''} ${catN}`.includes(q);
  });

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black">{W.title} ({products.length})</h1>
            <button onClick={() => { setShowForm(!showForm); setEditing(null); }}
              className="btn-primary px-5 py-2.5 rounded-xl text-white font-extrabold">
              {showForm ? '✕ إغلاق' : W.add}
            </button>
          </div>

          {/* 📦 الأدوات الجماعية — تصدير/استيراد/تعديل بالجملة */}
          <BulkTools onDone={load} />

          {/* نموذج المنتج */}
          {showForm && (
            <div className="glass rounded-3xl p-5 mb-4 anim-bounce-in space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder={W.namePh}
                  className="px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-purple-400" />
                <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}
                  className="px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white">
                  <option value="">بدون صنف</option>
                  {sortedCats.map(c => <option key={c.id} value={c.id}>{c.parentId ? '　↳ ' : ''}{catName(c)}</option>)}
                </select>
              </div>
              {/* 🧬 نوع المنتج — يحدد حقول المواصفات المناسبة */}
              <select value={form.productKind} onChange={e => setForm({ ...form, productKind: e.target.value, specs: {} })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white font-bold">
                <option value="">{W.kindPh}</option>
                {kindOptions.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
              </select>
              {form.productKind && (() => {
                const pk = productKindInfo(form.productKind);
                return pk && pk.fields.length > 0 && (
                  <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3">
                    <div className="text-xs font-black text-purple-700 mb-2">{pk.icon} مواصفات {pk.name}</div>
                    <div className="grid md:grid-cols-2 gap-3">
                      {pk.fields.map(f => f.type === 'select' ? (
                        <select key={f.key} value={(form.specs || {})[f.key] || ''}
                          onChange={e => setForm({ ...form, specs: { ...(form.specs || {}), [f.key]: e.target.value } })}
                          className="px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white text-sm">
                          <option value="">{f.label}</option>
                          {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input key={f.key} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                          value={(form.specs || {})[f.key] ?? ''}
                          onChange={e => setForm({ ...form, specs: { ...(form.specs || {}), [f.key]: e.target.value } })}
                          placeholder={f.placeholder || f.label}
                          className="px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm" />
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                  placeholder={showVariants ? 'السعر الأساسي' : 'السعر (ر.ي)'}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 outline-none" />
                <div className="relative min-w-0">
                  <input type="number" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: e.target.value })}
                    placeholder="سعر التخفيض"
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 outline-none" />
                  <button onClick={aiSalePrice} title="اقتراح ذكي"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-lg">🤖</button>
                </div>
                <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                  placeholder="الكمية"
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 outline-none" />
              </div>
              {/* 💲 فحص السعر بالذكاء */}
              <div className="flex items-center gap-2">
                <button onClick={aiPriceCheck} disabled={aiBusy === 'price'}
                  className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-xs font-extrabold hover:bg-emerald-200 transition-colors disabled:opacity-50">
                  {aiBusy === 'price' ? '⏳ يفحص…' : '💲 افحص السعر بالذكاء'}
                </button>
                <span className="text-[10px] text-gray-400">مقارنة بأسعار المنصة والسعر العالمي</span>
              </div>
              {priceReport && (
                <div className="rounded-2xl border p-3.5 space-y-2" style={{ borderColor: priceReport.verdictColor + '55', background: priceReport.verdictColor + '0d' }}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black" style={{ color: priceReport.verdictColor }}>💲 تقرير فحص السعر</div>
                    <button onClick={() => setPriceReport(null)} className="text-gray-400 text-sm">✕</button>
                  </div>
                  <p className="text-[13px] font-bold leading-relaxed">{priceReport.verdict}</p>
                  {priceReport.stats && (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-xl p-2"><div className="text-[10px] text-gray-400">الأدنى</div><div className="font-extrabold text-xs">{priceReport.stats.min.toLocaleString()}</div></div>
                      <div className="bg-white rounded-xl p-2"><div className="text-[10px] text-gray-400">المتوسط ({priceReport.stats.count})</div><div className="font-extrabold text-xs">{priceReport.stats.avg.toLocaleString()}</div></div>
                      <div className="bg-white rounded-xl p-2"><div className="text-[10px] text-gray-400">الأعلى</div><div className="font-extrabold text-xs">{priceReport.stats.max.toLocaleString()}</div></div>
                    </div>
                  )}
                  {priceReport.samples?.length > 0 && (
                    <div className="text-[11px] text-gray-500 space-y-1">
                      {priceReport.samples.map((s: any, i: number) => (
                        <div key={i} className="flex justify-between gap-2"><span className="truncate">▪️ {s.title} <span className="text-gray-400">({s.store})</span></span><span className="font-bold shrink-0">{s.price.toLocaleString()}</span></div>
                      ))}
                    </div>
                  )}
                  {priceReport.aiNote && (
                    <div className="bg-white rounded-xl p-2.5 text-[12px] leading-relaxed border border-purple-100">
                      <span className="font-extrabold text-purple-600">🌐 رأي الذكاء الخارجي: </span>{priceReport.aiNote}
                    </div>
                  )}
                </div>
              )}
              {/* 🏷️ SKU + الباركود (اختياريان) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                  placeholder="SKU — كود المنتج" dir="ltr"
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 outline-none" />
                <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })}
                  placeholder="الباركود (اختياري)" dir="ltr"
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 outline-none" />
              </div>
              {/* 🏬 قسم المول الكبير — وصف مختصر + كلمات مفتاحية + محرك البحث + تمييز */}
              {isMall && (
                <div className="rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50/70 to-amber-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-sm font-black text-purple-800">🏬 تجهيز المول — الظهور والبحث</label>
                    <button type="button" onClick={async () => {
                      if (!form.name) return toast(W.nameReq, 'error');
                      setAiBusy('seo');
                      try {
                        const catN = categories.find(c => c.id === form.categoryId)?.name;
                        const r = await api('/seller/ai-tools', {
                          method: 'POST',
                          body: JSON.stringify({ action: 'seo', name: form.name, categoryName: catN }),
                        });
                        setForm({ ...form, shortDesc: r.result.shortDesc, keywords: r.result.keywords, metaTitle: r.result.metaTitle, metaDesc: r.result.metaDesc });
                        toast('🤖 ولّد الذكاء الوصف المختصر والكلمات وحقول محرك البحث');
                      } catch (e: any) { toast(e.message, 'error'); }
                      setAiBusy('');
                    }} disabled={aiBusy === 'seo'}
                      className="bg-gradient-to-l from-purple-600 to-amber-500 text-white px-4 py-2 rounded-full text-xs font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50">
                      {aiBusy === 'seo' ? '⏳ يولّد…' : '🤖 مقترحات الذكاء — املأ الكل'}
                    </button>
                  </div>
                  <input value={form.shortDesc} onChange={e => setForm({ ...form, shortDesc: e.target.value })}
                    placeholder="✨ الوصف المختصر — سطر واحد يظهر في بطاقة المنتج"
                    className="w-full px-4 py-3 rounded-xl border border-purple-200 outline-none bg-white text-sm" />
                  <input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })}
                    placeholder="🔑 الكلمات المفتاحية — افصل بفاصلة (سماعة، بلوتوث، صوت نقي) — يعتمد عليها بحث المول"
                    className="w-full px-4 py-3 rounded-xl border border-purple-200 outline-none bg-white text-sm" />
                  <div className="grid md:grid-cols-2 gap-2">
                    <input value={form.metaTitle} onChange={e => setForm({ ...form, metaTitle: e.target.value })}
                      placeholder="🔎 عنوان محرك البحث (SEO)"
                      className="w-full px-4 py-3 rounded-xl border border-purple-200 outline-none bg-white text-sm" />
                    <input value={form.metaDesc} onChange={e => setForm({ ...form, metaDesc: e.target.value })}
                      placeholder="🔎 وصف محرك البحث (SEO)"
                      className="w-full px-4 py-3 rounded-xl border border-purple-200 outline-none bg-white text-sm" />
                  </div>
                  <button type="button" onClick={() => setForm({ ...form, isFeatured: !form.isFeatured })}
                    className={`w-full py-3 rounded-2xl font-extrabold text-sm transition-all ${form.isFeatured ? 'text-white shadow-lg' : 'bg-white text-amber-600 border border-amber-200'}`}
                    style={form.isFeatured ? { background: 'linear-gradient(135deg, #F59E0B, #D97706)' } : {}}>
                    {form.isFeatured ? '⭐ منتج متميز — يظهر في واجهة المول الرئيسية' : '⭐ اجعله منتجاً متميزاً في واجهة المول'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                  🔔 نبّهني عند انخفاض المخزون إلى
                  <input type="number" min={0} value={form.lowStockAt ?? 5} onChange={e => setForm({ ...form, lowStockAt: e.target.value })}
                    className="w-20 px-3 py-2 rounded-xl border border-gray-200 outline-none text-center" />
                  قطعة
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="text-xs font-bold text-gray-500">📝 وصف المنتج — محرر غني</label>
                  <div className="flex gap-1.5">
                    <button onClick={aiDescribe}
                      className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-extrabold hover:bg-purple-200 transition-colors">
                      🤖 وصف سريع
                    </button>
                    <button onClick={aiDetailedDesc} disabled={aiBusy === 'desc'}
                      className="bg-gradient-to-l from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50">
                      {aiBusy === 'desc' ? '⏳ يكتب…' : '✨ وصف مفصّل بالذكاء'}
                    </button>
                  </div>
                </div>
                <RichTextEditor value={form.description} onChange={(html) => setForm({ ...form, description: html })} />
              </div>


              {/* 🏷️ مميزات المنتج — حقول يضيفها البائع (خامة/ضمان/بلد صنع...) */}
              <div className="rounded-2xl border border-gray-200 p-3 bg-white/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold text-gray-600">🏷️ مميزات المنتج (تظهر كجدول مواصفات للزائر)</label>
                  <button type="button" onClick={() => setForm({ ...form, features: [...form.features, { key: '', value: '' }] })}
                    className="bg-teal-100 text-teal-700 px-3 py-1.5 rounded-full text-xs font-extrabold hover:bg-teal-200 transition-colors">
                    ➕ أضف ميزة
                  </button>
                </div>
                {form.features.length === 0 && <p className="text-[11px] text-gray-400 font-bold">مثال: الخامة = قطن · الضمان = سنة · الوزن = 250غ</p>}
                <div className="space-y-2">
                  {form.features.map((f: any, i: number) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={f.key} placeholder="الميزة (الخامة)"
                        onChange={e => setForm({ ...form, features: form.features.map((x: any, j: number) => j === i ? { ...x, key: e.target.value } : x) })}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm" />
                      <input value={f.value} placeholder="القيمة (قطن 100%)"
                        onChange={e => setForm({ ...form, features: form.features.map((x: any, j: number) => j === i ? { ...x, value: e.target.value } : x) })}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 outline-none text-sm" />
                      <button type="button" onClick={() => setForm({ ...form, features: form.features.filter((_: any, j: number) => j !== i) })}
                        className="w-9 h-9 rounded-xl bg-red-50 text-red-500 font-black shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🎨 متغيرات المنتج — ألوان/مقاسات/أوزان بأسعار مستقلة */}
              <div className="rounded-2xl border border-purple-200 p-3 bg-purple-50/40">
                <button type="button" onClick={() => {
                    const next = !showVariants;
                    setShowVariants(next);
                    if (next && form.variants.length === 0) {
                      setForm({ ...form, variants: [{ id: Math.random().toString(36).slice(2, 10), color: '', colorHex: '#6C3DF5', size: '', price: form.price || '', salePrice: '', stock: '', sku: '' }] });
                    }
                  }}
                  className={`w-full py-3 rounded-2xl font-extrabold text-sm transition-all ${showVariants ? 'text-white shadow' : 'bg-white text-purple-700 border border-purple-200'}`}
                  style={showVariants ? { background: 'var(--primary)' } : {}}>
                  {showVariants ? '🎨 خيارات متعددة مفعّلة — ألوان/مقاسات بأسعارها' : '🎨 لهذا المنتج خيارات متعددة؟ (لون/مقاس/وزن بسعر مختلف)'}
                </button>

                {showVariants && (
                  <div className="mt-3 space-y-2 anim-fade-up">
                    <p className="text-[11px] text-purple-700 font-bold">
                      💡 ملابس؟ أضف لوناً ومقاساً بسعر لكل مقاس. بهارات؟ اترك اللون فارغاً واكتب الوزن (250غ/500غ) بسعره. المخزون الكلي يُحسب تلقائياً من مجموع الخيارات.
                    </p>
                    {form.variants.map((v: any, i: number) => (
                      <div key={v.id || i} className="bg-white rounded-2xl p-2.5 border border-purple-100 space-y-2">
                        <div className="flex gap-2 items-center">
                          <input type="color" value={v.colorHex || '#6C3DF5'}
                            onChange={e => setForm({ ...form, variants: form.variants.map((x: any, j: number) => j === i ? { ...x, colorHex: e.target.value } : x) })}
                            className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer shrink-0 p-0.5" title="لون العينة" />
                          <input value={v.color || ''} placeholder="اللون (أحمر)"
                            onChange={e => setForm({ ...form, variants: form.variants.map((x: any, j: number) => j === i ? { ...x, color: e.target.value } : x) })}
                            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 outline-none text-xs" />
                          <input value={v.size || ''} placeholder="المقاس/الوزن (XL أو 250غ)"
                            onChange={e => setForm({ ...form, variants: form.variants.map((x: any, j: number) => j === i ? { ...x, size: e.target.value } : x) })}
                            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 outline-none text-xs" />
                          <button type="button" onClick={() => setForm({ ...form, variants: form.variants.filter((_: any, j: number) => j !== i) })}
                            className="w-8 h-8 rounded-xl bg-red-50 text-red-500 font-black shrink-0 text-xs">✕</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <input type="number" value={v.price} placeholder="السعر *"
                            onChange={e => setForm({ ...form, variants: form.variants.map((x: any, j: number) => j === i ? { ...x, price: e.target.value } : x) })}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none text-xs" />
                          <input type="number" value={v.salePrice || ''} placeholder="تخفيض"
                            onChange={e => setForm({ ...form, variants: form.variants.map((x: any, j: number) => j === i ? { ...x, salePrice: e.target.value } : x) })}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none text-xs" />
                          <input type="number" value={v.stock ?? ''} placeholder="المخزون"
                            onChange={e => setForm({ ...form, variants: form.variants.map((x: any, j: number) => j === i ? { ...x, stock: e.target.value } : x) })}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none text-xs" />
                          <input value={v.sku || ''} placeholder="SKU" dir="ltr"
                            onChange={e => setForm({ ...form, variants: form.variants.map((x: any, j: number) => j === i ? { ...x, sku: e.target.value } : x) })}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none text-xs" />
                        </div>
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => setForm({ ...form, variants: [...form.variants, { id: Math.random().toString(36).slice(2, 10), color: '', colorHex: '#0d9488', size: '', price: '', salePrice: '', stock: '', sku: '' }] })}
                      className="w-full py-2.5 rounded-2xl border-2 border-dashed border-purple-300 text-purple-600 font-extrabold text-xs hover:bg-purple-50 transition-colors">
                      ➕ أضف خياراً آخر (لون/مقاس/وزن)
                    </button>
                  </div>
                )}
              </div>

              {/* الصور */}
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.images.map((img: string, i: number) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                      <img src={`${API}${img}`} className="w-full h-full object-cover" />
                      <button onClick={() => setForm({ ...form, images: form.images.filter((_: any, x: number) => x !== i) })}
                        className="absolute top-1 left-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs">✕</button>
                    </div>
                  ))}
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-purple-300 flex items-center justify-center text-2xl text-purple-400 hover:bg-purple-50">
                    {uploading ? '⏳' : '📷'}
                  </button>
                  <button onClick={() => wbRef.current?.click()} disabled={uploading} title="صورة بخلفية بيضاء احترافية"
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-emerald-300 flex flex-col items-center justify-center text-emerald-500 hover:bg-emerald-50">
                    <span className="text-xl">🖼️</span>
                    <span className="text-[8px] font-extrabold">خلفية بيضاء</span>
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => upload(e.target.files)} />
                <input ref={wbRef} type="file" accept="image/*" multiple hidden onChange={e => uploadWhiteBg(e.target.files)} />
              </div>

              <button onClick={save} disabled={saving}
                className="btn-primary w-full py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40">
                {saving ? '⏳...' : editing ? '💾 حفظ التعديلات' : '🎉 إضافة المنتج'}
              </button>
            </div>
          )}

          {/* 🔍 البحث الذكي في لوحة المول — الاسم والكلمات المفتاحية والـ SKU والصنف */}
          {isMall && (
            <div className="relative mb-3">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 بحث ذكي في منتجات المول: اسم، كلمة مفتاحية، SKU، صنف..."
                className="w-full px-4 py-3 rounded-2xl border border-purple-200 outline-none bg-white text-sm font-bold focus:border-purple-400 shadow-sm" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 text-xs font-black">✕</button>
              )}
              {search && (
                <p className="text-[11px] font-bold text-purple-500 mt-1.5">
                  🤖 {shown.length === 1 ? 'نتيجة واحدة' : shown.length === 2 ? 'نتيجتان' : shown.length <= 10 ? `${shown.length} نتائج` : `${shown.length} نتيجة`} مطابقة لـ «{search}»
                </p>
              )}
            </div>
          )}

          {/* فلترة بالأصناف */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            <button onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-bold shrink-0 ${filter === 'all' ? 'text-white' : 'glass'}`}
              style={filter === 'all' ? { background: 'var(--primary)' } : {}}>
              الكل ({products.length})
            </button>
            {isMall && (
              <button onClick={() => setFilter('featured')}
                className={`px-4 py-2 rounded-full text-sm font-bold shrink-0 ${filter === 'featured' ? 'text-white' : 'glass'}`}
                style={filter === 'featured' ? { background: 'linear-gradient(135deg, #F59E0B, #D97706)' } : {}}>
                ⭐ المتميزة ({products.filter(p => p.isFeatured).length})
              </button>
            )}
            {sortedCats.map(c => (
              <button key={c.id} onClick={() => setFilter(c.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold shrink-0 ${filter === c.id ? 'text-white' : 'glass'}`}
                style={filter === c.id ? { background: 'var(--primary)' } : {}}>
                {c.parentId ? '↳ ' : ''}{catName(c)}
              </button>
            ))}
          </div>

          {/* شبكة المنتجات */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger">
            {shown.map((p: any) => (
              <div key={p.id} className="glass rounded-3xl overflow-hidden card-hover">
                <div className="h-32 skeleton relative" style={p.images?.[0] ? { background: `url(${API}${p.images[0]}) center/cover`, animation: 'none' } : {}}>
                  {p.salePrice && <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">خصم 🔥</span>}
                  {p.isFeatured && <span className="absolute top-2 left-2 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>⭐ متميز</span>}
                  {p.stock <= 0 && <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-sm">نفد</span>}
                </div>
                <div className="p-3">
                  <div className="font-extrabold text-sm truncate">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.category?.name || 'بدون صنف'}
                    {p.productKind && productKindInfo(p.productKind) && (
                      <span className="text-teal-600 font-bold"> • {productKindInfo(p.productKind)!.icon} {productKindInfo(p.productKind)!.name}</span>
                    )}
                    {Array.isArray(p.variants) && p.variants.length > 0 && (
                      <span className="text-purple-500 font-bold"> • 🎨 {p.variants.length} خيار</span>
                    )}
                    {p.sku && <span className="font-mono" dir="ltr"> • {p.sku}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {p.salePrice ? (
                      <>
                        <span className="font-black text-red-500">{Number(p.salePrice).toLocaleString()}</span>
                        <span className="text-xs text-gray-400 line-through">{Number(p.price).toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="font-black grad-text">{Number(p.price).toLocaleString()} ر.ي</span>
                    )}
                  </div>
                  {/* 🤖 نصيحة المخزون */}
                  <div className="text-[10px] mt-1 font-bold" style={{ color: p.stockAdvice?.color }}>
                    {p.stockAdvice?.message}
                  </div>
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => startEdit(p)} className="flex-1 bg-blue-50 text-blue-600 rounded-xl py-1.5 text-xs font-bold">✏️ تعديل</button>
                    <button onClick={() => remove(p.id, p.name)} className="flex-1 bg-red-50 text-red-500 rounded-xl py-1.5 text-xs font-bold">🗑️ حذف</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {shown.length === 0 && (
            <div className="glass rounded-3xl p-10 text-center text-gray-400">
              <div className="text-5xl mb-3">📦</div>
              {isMall ? 'لا منتجات هنا — أضف أول منتج لمولك' : isRestaurant ? 'لا أصناف هنا — أضف أول صنف لمنيوك' : 'لا منتجات هنا — أضف أول منتج لمتجرك'}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
