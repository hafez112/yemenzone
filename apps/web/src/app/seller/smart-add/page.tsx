'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SellerSidebar from '@/components/SellerSidebar';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';

// 🤖 الإضافة الذكية للمنتجات — خدمة مدفوعة: صنف ← اقتراحات كاملة ← مراجعة ← إضافة مباشرة
interface Suggestion {
  name: string; price: number; salePrice: number | null;
  description: string; features: string[]; imagePrompt: string; imageUrl: string;
  added?: boolean; editing?: boolean;
}

export default function SmartAddPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [count, setCount] = useState(5);
  const [hint, setHint] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  // 🔑 إعدادات الذكاء الخارجي (مفتاح التاجر نفسه)
  const [showAi, setShowAi] = useState(false);
  const [aiCfg, setAiCfg] = useState<any>(null);
  const [aiForm, setAiForm] = useState({ baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' });
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    api('/seller/categories').then((c) => { if (Array.isArray(c)) setCategories(c); }).catch(() => {});
    api('/seller/ai/smart-add/settings').then((d) => {
      setAiCfg(d);
      setAiForm({ baseUrl: d.baseUrl, apiKey: '', model: d.model });
    }).catch(() => {});
  }, []);

  const saveAi = async () => {
    setAiBusy(true);
    try {
      const r = await api('/seller/ai/smart-add/settings', { method: 'POST', body: JSON.stringify(aiForm) });
      toast(r.hasKey ? '✅ حُفظ مفتاحك — الاقتراحات القادمة عبر ذكائك الخارجي' : '🏠 أُزيل المفتاح — الاقتراحات بالذكاء المحلي المجاني');
      setAiCfg({ ...aiCfg, hasKey: r.hasKey });
      setAiForm({ ...aiForm, apiKey: '' });
    } catch (e: any) { toast(e.message, 'error'); }
    setAiBusy(false);
  };

  const suggest = async () => {
    if (!categoryId) return toast('⚠️ اختر الصنف أولاً', 'error');
    setBusy(true); setItems([]);
    try {
      const r = await api('/seller/ai/smart-add/suggest', {
        method: 'POST', body: JSON.stringify({ categoryId, count, hint }),
      });
      setItems(r.items || []);
      setSource(r.source);
      toast(r.source === 'external'
        ? `🌐 ولّد ذكاؤك الخارجي ${r.items.length} منتجات — راجعها وعدّلها ثم أضفها`
        : `🏠 ولّد الذكاء المحلي ${r.items.length} منتجات — راجعها وعدّلها ثم أضفها`);
    } catch (e: any) {
      if (e?.locked || /رقِّ|ترقية|خطة/.test(e.message || '')) setLocked(true);
      toast(e.message, 'error');
    }
    setBusy(false);
  };

  const upd = (i: number, patch: Partial<Suggestion>) =>
    setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const addOne = async (i: number) => {
    const it = items[i];
    if (!it.name.trim() || !(it.price > 0)) return toast('⚠️ الاسم والسعر مطلوبان', 'error');
    setAdding(i);
    try {
      const r = await api('/seller/ai/smart-add/add', {
        method: 'POST',
        body: JSON.stringify({
          categoryId, name: it.name, price: it.price, salePrice: it.salePrice,
          description: it.description, features: it.features, imageUrl: it.imageUrl, stock: 10,
        }),
      });
      upd(i, { added: true });
      toast(r.product.hasImage ? `✅ أُضيف «${it.name}» بصورته إلى متجرك` : `✅ أُضيف «${it.name}» (أضف صورته لاحقاً من منتجاتي)`);
    } catch (e: any) { toast(e.message, 'error'); }
    setAdding(null);
  };

  if (!store) return null;

  // 🔒 شاشة القفل — الخدمة مدفوعة
  if (locked || (aiCfg && !aiCfg.featureOn)) return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1 flex items-center justify-center">
          <div className="glass rounded-3xl p-10 text-center max-w-md anim-bounce-in">
            <div className="text-6xl mb-4">🤖</div>
            <h1 className="text-xl font-black mb-2">الإضافة الذكية للمنتجات — خدمة مدفوعة 💎</h1>
            <p className="text-gray-500 text-sm mb-5 leading-relaxed">
              اختر الصنف ويولّد الذكاء منتجات كاملة: اسم، سعر، وصف، مميزات، وصورة احترافية —
              تراجعها وتضيفها لمتجرك بضغطة واحدة. تعمل بالذكاء المحلي أو بمفتاح ذكائك الخارجي الخاص.
            </p>
            <Link href="/seller/subscription"
              className="btn-primary inline-block text-white font-extrabold px-8 py-3.5 rounded-full">
              💎 رقِّ خطتك لتفعيلها
            </Link>
          </div>
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1 min-w-0 space-y-4">

          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-black">🤖 الإضافة الذكية للمنتجات</h1>
            <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-full bg-purple-100 text-purple-700">💎 خدمة مدفوعة مرتبطة بمتجرك</span>
          </div>

          {/* 🔑 إعدادات الذكاء الخارجي — التاجر يضيف مفتاحه بنفسه */}
          <div className="glass rounded-3xl p-4">
            <button onClick={() => setShowAi(!showAi)} className="w-full flex items-center justify-between">
              <span className="font-extrabold text-sm">
                {aiCfg?.hasKey ? '🌐 الذكاء الخارجي: مفعّل بمفتاحك الخاص' : '🏠 الذكاء المحلي: مفعّل (مجاني)'}
              </span>
              <span className="text-xs font-bold text-purple-600">{showAi ? '▲ إخفاء' : '🔑 أضف مفتاح ذكاء خارجي'}</span>
            </button>
            {showAi && (
              <div className="mt-3 space-y-2 anim-fade-up">
                <p className="text-[11px] text-gray-500 font-bold leading-relaxed">
                  لديك اشتراك OpenAI أو أي مزود متوافق؟ أضف مفتاحك هنا وستُولَّد اقتراحاتك عبره —
                  يُحفظ مشفّراً في متجرك ولا يستخدمه غيرك. بدون مفتاح يعمل الذكاء المحلي مجاناً.
                </p>
                <input dir="ltr" value={aiForm.baseUrl} onChange={(e) => setAiForm({ ...aiForm, baseUrl: e.target.value })}
                  placeholder="Base URL — https://api.openai.com/v1"
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-xs font-bold bg-white outline-none focus:border-purple-400" />
                <input dir="ltr" type="password" value={aiForm.apiKey} onChange={(e) => setAiForm({ ...aiForm, apiKey: e.target.value })}
                  placeholder={aiCfg?.hasKey ? `المفتاح الحالي: ${aiCfg.maskedKey} — اكتب مفتاحاً جديداً للتبديل` : 'sk-... مفتاح API الخاص بك'}
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-xs font-bold bg-white outline-none focus:border-purple-400" />
                <div className="flex gap-2">
                  <input dir="ltr" value={aiForm.model} onChange={(e) => setAiForm({ ...aiForm, model: e.target.value })}
                    placeholder="النموذج — gpt-4o-mini"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-purple-200 text-xs font-bold bg-white outline-none focus:border-purple-400" />
                  <button onClick={saveAi} disabled={aiBusy}
                    className="btn-primary px-5 py-2.5 rounded-xl text-white text-xs font-extrabold disabled:opacity-40">
                    {aiBusy ? '⏳' : aiForm.apiKey ? '💾 حفظ المفتاح' : '🗑️ إزالة المفتاح'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 🗂️ اختيار الصنف والتوليد */}
          <div className="glass rounded-3xl p-4 space-y-3">
            <div className="grid md:grid-cols-[1fr_120px] gap-2">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-purple-200 text-sm font-bold bg-white outline-none focus:border-purple-400">
                <option value="">🗂️ اختر الصنف الذي تريد منتجات له...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.parentId ? '— ' : ''}{c.name}</option>)}
              </select>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))}
                className="px-4 py-3 rounded-2xl border border-purple-200 text-sm font-bold bg-white outline-none">
                {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n} منتجات</option>)}
              </select>
            </div>
            <input value={hint} onChange={(e) => setHint(e.target.value)}
              placeholder="💡 توجيه اختياري: «أسعار اقتصادية»، «منتجات فاخرة»، «للشباب»..."
              className="w-full px-4 py-3 rounded-2xl border border-purple-200 text-sm font-bold bg-white outline-none focus:border-purple-400" />
            <button onClick={suggest} disabled={busy || !categoryId}
              className="btn-primary w-full py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40">
              {busy ? '🧠 الذكاء يفكر ويولّد...' : `✨ ولّد ${count} منتجات كاملة لهذا الصنف`}
            </button>
          </div>

          {/* 📦 الاقتراحات — مراجعة وتعديل ثم إضافة */}
          {items.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-extrabold text-gray-500">
                {source === 'external' ? '🌐 ولّدها ذكاؤك الخارجي' : '🏠 ولّدها الذكاء المحلي'} — راجع وعدّل أي حقل ثم أضف المنتج لمتجرك:
              </p>
              <div className="grid md:grid-cols-2 gap-3 stagger">
                {items.map((it, i) => (
                  <div key={i} className={`glass rounded-3xl overflow-hidden transition-all ${it.added ? 'ring-2 ring-emerald-400' : ''}`}>
                    {/* الصورة الذكية */}
                    <div className="h-44 relative bg-gradient-to-br from-purple-100 to-teal-100">
                      <img src={it.imageUrl} alt={it.name} loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      {it.added && (
                        <span className="absolute inset-0 bg-emerald-500/80 text-white font-black flex items-center justify-center text-lg">✅ أُضيف لمتجرك</span>
                      )}
                      {it.salePrice && !it.added && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">عرض 🏷️</span>
                      )}
                    </div>

                    <div className="p-3.5 space-y-2">
                      {it.editing ? (
                        <>
                          <input value={it.name} onChange={(e) => upd(i, { name: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-purple-200 text-sm font-bold bg-white outline-none" />
                          <div className="flex gap-2">
                            <input inputMode="numeric" value={it.price || ''} onChange={(e) => upd(i, { price: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                              placeholder="السعر" className="flex-1 px-3 py-2 rounded-xl border border-purple-200 text-xs font-bold bg-white outline-none" />
                            <input inputMode="numeric" value={it.salePrice || ''} onChange={(e) => upd(i, { salePrice: Number(e.target.value.replace(/[^0-9]/g, '')) || null })}
                              placeholder="سعر العرض" className="flex-1 px-3 py-2 rounded-xl border border-purple-200 text-xs font-bold bg-white outline-none" />
                          </div>
                          <textarea value={it.description} onChange={(e) => upd(i, { description: e.target.value })} rows={3}
                            className="w-full px-3 py-2 rounded-xl border border-purple-200 text-xs bg-white outline-none" />
                          <input value={it.features.join('، ')} onChange={(e) => upd(i, { features: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })}
                            placeholder="المميزات — افصل بفاصلة"
                            className="w-full px-3 py-2 rounded-xl border border-purple-200 text-xs bg-white outline-none" />
                        </>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <b className="text-sm leading-snug">{it.name}</b>
                            <button onClick={() => upd(i, { editing: true })} className="text-[10px] font-extrabold text-purple-600 shrink-0">✏️ تعديل</button>
                          </div>
                          <div className="flex items-center gap-2">
                            <b className="text-purple-700">{Number(it.price).toLocaleString()} ر.ي</b>
                            {it.salePrice && <s className="text-[11px] text-gray-400">{Number(it.salePrice).toLocaleString()}</s>}
                          </div>
                          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{it.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {it.features.slice(0, 4).map((f, k) => (
                              <span key={k} className="text-[9px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">✓ {f}</span>
                            ))}
                          </div>
                        </>
                      )}

                      {!it.added && (
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => addOne(i)} disabled={adding === i}
                            className="btn-primary flex-1 py-2.5 rounded-xl text-white text-xs font-extrabold disabled:opacity-40">
                            {adding === i ? '⏳ يُضاف بصورته...' : '✅ أضف إلى متجري'}
                          </button>
                          {it.editing && (
                            <button onClick={() => upd(i, { editing: false })} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-xs font-extrabold">تم</button>
                          )}
                          <button onClick={() => setItems(items.filter((_, j) => j !== i))}
                            className="px-3 py-2.5 rounded-xl bg-red-50 text-red-400 text-xs font-extrabold">✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="glass rounded-3xl p-3 text-center">
                <Link href="/seller/products" className="text-xs font-extrabold text-purple-600">
                  📦 انتقل إلى «منتجاتي» لإدارة ما أضفته ←
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
