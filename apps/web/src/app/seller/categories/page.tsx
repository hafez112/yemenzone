'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';

// إدارة الأصناف — البائع يضيف أصناف متجره بنفسه + اقتراحات الذكاء المحلي
// 🏬 للمولات: أصناف رئيسية وأصناف فرعية تابعة لها (مستوى واحد)
export default function CategoriesPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api('/seller/categories');
    setCategories(r.categories);
    setSuggestions(r.suggestions);
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    load().catch(e => toast(e.message, 'error'));
  }, []);

  async function add(catName?: string) {
    const n = (catName || name).trim();
    if (!n) return toast('اكتب اسم الصنف أولاً', 'error');
    setSaving(true);
    try {
      await api('/seller/categories', { method: 'POST', body: JSON.stringify({ name: n, parentId: parentId || undefined }) });
      toast(parentId ? `✅ تمت إضافة الصنف الفرعي "${n}"` : `✅ تمت إضافة صنف "${n}"`);
      setName('');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSaving(false);
  }

  async function rename(id: string, old: string) {
    const n = prompt('الاسم الجديد للصنف:', old);
    if (!n?.trim() || n === old) return;
    try {
      await api(`/seller/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ name: n.trim() }) });
      toast('✅ تم التعديل');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  // 🏬 تحويل صنف إلى فرعي لصنف رئيسي / أو إعادته رئيسياً
  async function setParent(id: string, newParent: string) {
    try {
      await api(`/seller/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ parentId: newParent || null }) });
      toast(newParent ? '🗂️ أصبح صنفاً فرعياً' : '🗂️ أصبح صنفاً رئيسياً');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  async function remove(id: string, n: string, kids: number) {
    const warn = kids > 0
      ? `حذف صنف "${n}"؟ (أصنافه الفرعية ${kids} ستصبح رئيسية، ومنتجاته تبقى بلا صنف)`
      : `حذف صنف "${n}"؟ (منتجاته ستبقى بلا صنف)`;
    if (!confirm(warn)) return;
    try {
      await api(`/seller/categories/${id}`, { method: 'DELETE' });
      toast('🗑️ تم الحذف');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  if (!store) return null;

  const isMall = store.type?.kind === 'malls';
  const tops = categories.filter(c => !c.parentId);
  const kidsOf = (pid: string) => categories.filter(c => c.parentId === pid);
  const title = store.type?.kind === 'restaurants' ? '📑 أقسام المنيو' : isMall ? '🗂️ أصناف المول' : '🗂️ أصناف متجري';

  const CatRow = ({ c, child }: { c: any; child?: boolean }) => (
    <div className={`glass rounded-2xl px-4 py-3 flex items-center justify-between card-hover ${child ? 'mr-6 border-r-4' : ''}`}
      style={child ? { borderRightColor: 'var(--primary)' } : {}}>
      <div className="flex items-center gap-3 min-w-0">
        {child && <span className="text-gray-300 shrink-0">↳</span>}
        <span className="font-extrabold truncate">{c.name}</span>
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold shrink-0">
          {c._count.products} منتج
        </span>
        {!child && c._count.children > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold shrink-0">
            {c._count.children} فرعي
          </span>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        {isMall && !child && (
          <select value="" onChange={e => { if (e.target.value) setParent(e.target.value, c.id); }}
            title="انقل صنفاً فرعياً هنا"
            className="h-9 rounded-xl bg-amber-50 text-amber-700 font-bold text-[10px] px-1 border border-amber-100 outline-none max-w-[70px]">
            <option value="">📎 فرع</option>
            {categories.filter(x => !x.parentId && x.id !== c.id && x._count.children === 0)
              .map(x => <option key={x.id} value={x.id}>⤵ {x.name}</option>)}
          </select>
        )}
        {isMall && child && (
          <button onClick={() => setParent(c.id, '')} title="اجعله صنفاً رئيسياً"
            className="h-9 px-2 rounded-xl bg-amber-50 text-amber-700 font-bold text-[10px]">⤴ رئيسي</button>
        )}
        <button onClick={() => rename(c.id, c.name)}
          className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-bold">✏️</button>
        <button onClick={() => remove(c.id, c.name, c._count.children)}
          className="w-9 h-9 rounded-xl bg-red-50 text-red-500 font-bold">🗑️</button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1">
          <h1 className="text-2xl font-black mb-4">{title}</h1>

          {/* إضافة صنف — للمول: اختيار رئيسي أو فرعي */}
          <div className="glass rounded-3xl p-4 mb-4 space-y-2">
            <div className="flex gap-2">
              <input value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && add()}
                placeholder={isMall ? 'اسم الصنف الجديد — مثال: إلكترونيات' : 'اسم الصنف الجديد — مثال: معلبات'}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-purple-400" />
              <button onClick={() => add()} disabled={saving}
                className="btn-primary px-6 py-3 rounded-xl text-white font-extrabold disabled:opacity-40">
                ➕ إضافة
              </button>
            </div>
            {isMall && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-gray-500 shrink-0">🗂️ نوعه:</span>
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <button type="button" onClick={() => setParentId('')}
                    className={`py-2.5 rounded-xl text-xs font-extrabold transition-all ${!parentId ? 'text-white shadow' : 'bg-white text-gray-500 border border-gray-200'}`}
                    style={!parentId ? { background: 'var(--primary)' } : {}}>
                    🏬 صنف رئيسي
                  </button>
                  <select value={parentId} onChange={e => setParentId(e.target.value)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold outline-none transition-all ${parentId ? 'text-white shadow border-0' : 'bg-white text-gray-500 border border-gray-200'}`}
                    style={parentId ? { background: 'linear-gradient(135deg, #F59E0B, #D97706)' } : {}}>
                    <option value="">↳ فرعي لصنف... (اختر الرئيسي)</option>
                    {tops.map(t => <option key={t.id} value={t.id}>↳ فرعي لـ «{t.name}»</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 🤖 اقتراحات الذكاء المحلي */}
          {suggestions.length > 0 && (
            <div className="glass rounded-3xl p-4 mb-4">
              <div className="text-sm font-extrabold mb-2">🤖 الذكاء المحلي يقترح لنشاطك:</div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s: any) => (
                  <button key={s.name} onClick={() => add(s.name)} disabled={saving}
                    className="bg-white/80 hover:bg-white px-3 py-2 rounded-full text-sm font-bold transition-all card-hover">
                    {s.icon} {s.name} <span className="text-purple-500">+</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* قائمة الأصناف — للمول: شجرة رئيسي ← فرعي */}
          <div className="space-y-2 stagger">
            {categories.length === 0 && (
              <div className="glass rounded-3xl p-8 text-center text-gray-400">
                <div className="text-4xl mb-2">🗂️</div>
                {isMall ? 'لا أصناف بعد — أنشئ أول صنف رئيسي لمولك ثم أضف فروعه' : 'لا أصناف بعد — أضف أول صنف لمتجرك'}
              </div>
            )}
            {isMall
              ? tops.map((c: any) => (
                  <div key={c.id} className="space-y-1.5">
                    <CatRow c={c} />
                    {kidsOf(c.id).map((k: any) => <CatRow key={k.id} c={k} child />)}
                  </div>
                ))
              : categories.map((c: any) => <CatRow key={c.id} c={c} />)}
          </div>
        </div>
      </div>
    </main>
  );
}
