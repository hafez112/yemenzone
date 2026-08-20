'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';

// 🗂️ إدارة أنواع المتاجر — إضافة/تعديل/تعطيل + توليد ذكي محلي من الاسم
const KIND_META: Record<string, { label: string; cls: string }> = {
  products: { label: '🛍️ منتجات', cls: 'bg-purple-500/20 text-purple-300' },
  rentals:  { label: '🏠 إيجارات', cls: 'bg-teal-500/20 text-teal-300' },
  hotel:    { label: '🏨 فنادق',  cls: 'bg-amber-500/20 text-amber-300' },
  services: { label: '🛠️ خدمات',  cls: 'bg-blue-500/20 text-blue-300' },
  restaurants: { label: '🍽️ مطاعم', cls: 'bg-orange-500/20 text-orange-300' },
  malls:  { label: '🏬 مولات', cls: 'bg-violet-500/20 text-violet-300' },
};

const ICON_PICKS = ['🛍️','🍽️','☕','🥖','🍰','💊','🛒','👗','🧴','📱','💻','🔌','🛋️','🚗','💎','📚','💐','🐾','🏢','🏖️','🏨','🔧','🎨','📷','💼','🎓','🚚','🏋️','💇','🧵','🧹'];

const emptyForm = {
  id: '', nameAr: '', nameEn: '', kind: '', icon: '', color: '', description: '', sort: 0,
};

export default function AdminStoreTypesPage() {
  const router = useRouter();
  const [types, setTypes] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [aiInfo, setAiInfo] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setTypes(await api('/admin/store-types'));
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load().catch(() => router.push('/auth/admin-login'));
  }, []);

  // 🤖 الذكاء المحلي يولّد الإعداد الكامل من الاسم
  async function aiGenerate() {
    if (!form.nameAr.trim()) return toast('⚠️ اكتب اسم النوع أولاً — مثال: مطاعم', 'error');
    setAiBusy(true);
    try {
      const g = await api('/admin/store-types/ai-generate', {
        method: 'POST', body: JSON.stringify({ name: form.nameAr }),
      });
      setForm((f: any) => ({
        ...f, kind: g.kind, icon: g.icon, color: g.color,
        description: g.description, nameAr: g.nameAr,
      }));
      setAiInfo(g);
      toast(g.confidence === 'high'
        ? `🤖 وُلّد النوع: ${g.kindLabel} ${g.icon}`
        : '🤖 وُلّد النوع بنشاط «منتجات» افتراضياً — عدّله إن أردت');
    } catch (e: any) { toast(e.message, 'error'); }
    setAiBusy(false);
  }

  async function save() {
    if (!form.nameAr.trim()) return toast('⚠️ اسم النوع مطلوب', 'error');
    setSaving(true);
    try {
      const body: any = {
        nameAr: form.nameAr, nameEn: form.nameEn, kind: form.kind || undefined,
        icon: form.icon, color: form.color, description: form.description,
        sort: Number(form.sort) || 0,
      };
      if (form.id) {
        await api(`/admin/store-types/${form.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast('✅ تم تحديث النوع');
      } else {
        await api('/admin/store-types', { method: 'POST', body: JSON.stringify(body) });
        toast('🎉 أُضيف النوع — يظهر الآن في معالج إنشاء المتاجر');
      }
      setForm({ ...emptyForm });
      setAiInfo(null);
      setShowForm(false);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSaving(false);
  }

  async function toggle(t: any) {
    try {
      await api(`/admin/store-types/${t.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !t.isActive }) });
      toast(t.isActive ? `⏸️ عُطّل «${t.nameAr}» — لن يظهر للبائعين الجدد` : `▶️ فُعّل «${t.nameAr}»`);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  async function remove(t: any) {
    if (!confirm(`حذف نوع «${t.nameAr}» نهائياً؟`)) return;
    try {
      await api(`/admin/store-types/${t.id}`, { method: 'DELETE' });
      toast(`🗑️ حُذف «${t.nameAr}»`);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  function edit(t: any) {
    setForm({
      id: t.id, nameAr: t.nameAr, nameEn: t.nameEn || '', kind: t.kind,
      icon: t.icon || '', color: t.color || '', description: t.description || '', sort: t.sort,
    });
    setAiInfo(null);
    setShowForm(true);
  }

  return (
    <main className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(180deg, #0A0A14, #141428)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div>
              <h1 className="text-2xl font-black text-white">🗂️ أنواع المتاجر</h1>
              <p className="text-xs text-gray-400 mt-0.5">{types.length} نوع — كل نوع يتبع نشاطاً أساسياً ويرث لوحته وعرضه</p>
            </div>
            <button onClick={() => { setForm({ ...emptyForm }); setAiInfo(null); setShowForm(true); }}
              className="btn-primary text-white text-sm font-extrabold px-5 py-2.5 rounded-2xl shrink-0">
              ➕ نوع جديد
            </button>
          </div>

          {/* نموذج الإضافة/التعديل */}
          {showForm && (
            <div className="glass-dark rounded-3xl p-5 mb-4 border border-purple-400/30 anim-fade-up">
              <h2 className="font-extrabold text-white mb-3">{form.id ? '✏️ تعديل النوع' : '➕ نوع جديد'}</h2>

              <div className="grid md:grid-cols-2 gap-3 mb-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-gray-400 mb-1">اسم النوع (بالعربية)</label>
                  <div className="flex gap-2">
                    <input value={form.nameAr}
                      onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                      placeholder="مثال: مطاعم، صيدليات، شاليهات..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-purple-400" />
                    <button onClick={aiGenerate} disabled={aiBusy}
                      className="bg-gradient-to-l from-purple-600 to-fuchsia-600 text-white text-sm font-extrabold px-4 py-2.5 rounded-xl disabled:opacity-50 shrink-0">
                      {aiBusy ? '⏳...' : '✨ توليد ذكي'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">النشاط الأساسي (يحدد اللوحة والعرض)</label>
                  <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
                    <option value="" className="bg-gray-900">— اختر أو دع الذكاء يحدد —</option>
                    {Object.entries(KIND_META).map(([k, m]) => (
                      <option key={k} value={k} className="bg-gray-900">{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">الترتيب (الأصغر أولاً)</label>
                  <input type="number" value={form.sort}
                    onChange={(e) => setForm({ ...form, sort: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] text-gray-400 mb-1">الأيقونة</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-3xl w-11 h-11 grid place-items-center bg-white/5 rounded-xl border border-white/10">{form.icon || '❔'}</span>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {ICON_PICKS.map((ic) => (
                        <button key={ic} onClick={() => setForm({ ...form, icon: ic })}
                          className={`w-8 h-8 rounded-lg text-lg grid place-items-center transition-all ${
                            form.icon === ic ? 'bg-purple-500/40 scale-110' : 'bg-white/5 hover:bg-white/10'
                          }`}>{ic}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">اللون المميز</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.color || '#6C3DF5'}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-11 h-11 rounded-xl bg-transparent border border-white/10 cursor-pointer" />
                    <span className="text-xs text-gray-400" dir="ltr">{form.color || '—'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">الاسم الإنجليزي (اختياري)</label>
                  <input value={form.nameEn} dir="ltr"
                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                    placeholder="Restaurants"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] text-gray-400 mb-1">الوصف (يظهر للبائع في معالج الإنشاء)</label>
                  <textarea value={form.description} rows={2}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="دع الذكاء يكتبه أو اكتبه بنفسك"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none" />
                </div>
              </div>

              {/* معاينة التوليد الذكي */}
              {aiInfo && !form.id && (
                <div className="rounded-2xl bg-purple-500/10 border border-purple-400/20 p-3 mb-3 text-[11px] text-gray-300 space-y-1">
                  <div>🤖 <b className="text-purple-300">اقتراح الذكاء المحلي:</b> {aiInfo.kindLabel} — القالب «{aiInfo.template}»</div>
                  <div>📦 الوحدات: {aiInfo.modules?.join('، ')}</div>
                  <div>🏷️ المصطلحات: {aiInfo.terms?.item} / {aiInfo.terms?.items} / {aiInfo.terms?.order}</div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={save} disabled={saving}
                  className="btn-primary text-white text-sm font-extrabold px-6 py-2.5 rounded-2xl disabled:opacity-50">
                  {saving ? '⏳ جاري الحفظ...' : form.id ? '💾 حفظ التعديلات' : '💾 حفظ النوع'}
                </button>
                <button onClick={() => { setShowForm(false); setAiInfo(null); }}
                  className="bg-white/10 text-gray-300 text-sm font-bold px-5 py-2.5 rounded-2xl">
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* قائمة الأنواع */}
          <div className="grid sm:grid-cols-2 gap-3 stagger">
            {types.map((t) => (
              <div key={t.id} className={`glass-dark rounded-3xl p-4 border transition-all ${
                t.isActive ? 'border-white/10' : 'border-red-400/20 opacity-60'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl w-12 h-12 grid place-items-center rounded-2xl shrink-0"
                    style={{ background: `${t.color || '#6C3DF5'}22`, border: `1px solid ${t.color || '#6C3DF5'}44` }}>
                    {t.icon || '🏪'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <b className="text-white">{t.nameAr}</b>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${KIND_META[t.kind]?.cls || 'bg-white/10 text-gray-300'}`}>
                        {KIND_META[t.kind]?.label || t.kind}
                      </span>
                      {!t.isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">معطّل</span>}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{t.description || '—'}</p>
                    <div className="text-[10px] text-gray-500 mt-1.5">
                      🏪 {t._count?.stores || 0} متجر · ترتيب {t.sort}
                      {t.nameEn && <span dir="ltr"> · {t.nameEn}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3">
                  <button onClick={() => edit(t)}
                    className="flex-1 bg-white/10 text-gray-200 text-xs font-bold py-2 rounded-xl">✏️ تعديل</button>
                  <button onClick={() => toggle(t)}
                    className="flex-1 bg-white/10 text-gray-200 text-xs font-bold py-2 rounded-xl">
                    {t.isActive ? '⏸️ تعطيل' : '▶️ تفعيل'}
                  </button>
                  <button onClick={() => remove(t)}
                    className="bg-red-500/15 text-red-300 text-xs font-bold px-3 py-2 rounded-xl">🗑️</button>
                </div>
              </div>
            ))}
          </div>

          {types.length === 0 && (
            <div className="glass-dark rounded-3xl p-10 text-center text-gray-400 text-sm">
              لا توجد أنواع بعد — أضف أول نوع بالذكاء المحلي ✨
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
