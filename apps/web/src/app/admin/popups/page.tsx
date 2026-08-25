'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';
import ImageUpload from '@/components/ImageUpload';
import { playPopupChime } from '@/components/WelcomePopup';

// 💬 إدارة الرسائل المنبثقة — تظهر للزوار عند دخول المنصة مع صوت تنبيه اختياري
const FREQ_AR: Record<string, string> = {
  once: '🎯 مرة واحدة لكل زائر',
  session: '🔄 مرة كل جلسة تصفح',
  daily: '📅 مرة واحدة يومياً',
  always: '♾️ مع كل زيارة',
};

const emptyPopup = {
  id: '', title: '', body: '', image: '', btnText: '', btnLink: '',
  sound: true, frequency: 'session', isActive: true, startsAt: '', endsAt: '',
};

// حالة الرسالة الزمنية: فعّالة الآن / مجدولة / منتهية / معطّلة
function popupStatus(p: any): { label: string; cls: string } {
  if (!p.isActive) return { label: '⏸️ معطّلة', cls: 'bg-gray-500/20 text-gray-400' };
  const now = Date.now();
  if (p.startsAt && Date.parse(p.startsAt) > now) return { label: '🕐 مجدولة', cls: 'bg-blue-500/20 text-blue-400' };
  if (p.endsAt && Date.parse(p.endsAt) < now) return { label: '⌛ منتهية', cls: 'bg-red-500/20 text-red-400' };
  return { label: '🟢 فعّالة الآن', cls: 'bg-emerald-500/20 text-emerald-400' };
}

// تحويل ISO إلى قيمة datetime-local والعكس
const toLocal = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminPopupsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ ...emptyPopup });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  async function load() {
    const d = await api('/admin/popups');
    setItems(d.items || []);
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load().catch(() => router.push('/auth/admin-login'));
  }, []);

  async function save() {
    if (!form.title.trim()) return toast('⚠️ عنوان الرسالة مطلوب', 'error');
    if (!form.body.trim()) return toast('⚠️ نص الرسالة مطلوب', 'error');
    if (form.btnText && !form.btnLink) return toast('⚠️ أدخل رابط الزر أو احذف نص الزر', 'error');
    if (form.btnLink && !/^(\/|https?:\/\/)/.test(form.btnLink)) return toast('⚠️ رابط الزر يجب أن يبدأ بـ / أو http', 'error');
    setSaving(true);
    try {
      await api('/admin/popups', { method: 'POST', body: JSON.stringify(form) });
      toast(form.id ? '✅ تم تحديث الرسالة المنبثقة' : '💬 أُنشئت الرسالة — ستظهر للزوار فوراً');
      setForm({ ...emptyPopup });
      setShowForm(false);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSaving(false);
  }

  async function toggleActive(p: any) {
    try {
      await api('/admin/popups', { method: 'POST', body: JSON.stringify({ ...p, isActive: !p.isActive }) });
      toast(p.isActive ? '⏸️ عُطّلت الرسالة — لن تظهر للزوار' : '▶️ فُعّلت الرسالة — تظهر للزوار الآن');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  async function remove(p: any) {
    if (!confirm(`حذف رسالة «${p.title}» نهائياً؟`)) return;
    try {
      await api(`/admin/popups/${p.id}`, { method: 'DELETE' });
      toast('🗑️ حُذفت الرسالة المنبثقة');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 outline-none';
  const liveCount = items.filter(p => popupStatus(p).label.includes('فعّالة')).length;

  return (
    <main className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(180deg, #0A0A14, #141428)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h1 className="text-2xl font-black text-white">💬 الرسائل المنبثقة</h1>
            <button onClick={() => { setForm({ ...emptyPopup }); setShowForm(true); }}
              className="btn-primary text-white text-sm font-extrabold px-5 py-2.5 rounded-2xl shrink-0">
              ➕ رسالة جديدة
            </button>
          </div>

          <p className="text-[12px] text-gray-400 -mt-2 mb-4 leading-6">
            تظهر الرسالة للزائر فور دخوله المنصة مع صوت تنبيه اختياري — وعند تفعيل أكثر من رسالة تُعرض الأحدث فقط ضمن نافذتها الزمنية.
          </p>

          {/* إحصائيات */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              [items.length, 'رسالة', '💬'],
              [liveCount, 'فعّالة الآن', '🟢'],
              [items.filter(p => p.sound).length, 'بالصوت', '🔊'],
              [items.filter(p => p.isActive === false).length, 'معطّلة', '⏸️'],
            ].map(([v, l, i]) => (
              <div key={String(l)} className="glass-dark rounded-2xl p-3 text-center">
                <div className="text-lg">{i}</div>
                <div className="text-white font-black text-sm">{v}</div>
                <div className="text-[10px] text-gray-500">{l}</div>
              </div>
            ))}
          </div>

          {/* نموذج إنشاء/تعديل */}
          {showForm && (
            <div className="glass-dark rounded-3xl p-5 mb-4 border border-purple-400/30">
              <h2 className="font-extrabold text-white mb-3">{form.id ? '✏️ تعديل الرسالة' : '💬 رسالة منبثقة جديدة'}</h2>
              <div className="space-y-3">
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="عنوان الرسالة (مثال: عروض الأسبوع وصلت!)" className={inputCls} />
                <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                  placeholder="نص الرسالة الذي يقرأه الزائر..." rows={4} className={inputCls} />
                <ImageUpload endpoint="/admin/ads/upload" field="image" ratio="aspect-[16/8]"
                  value={form.image} onChange={url => setForm({ ...form, image: url })}
                  label="🖼️ صورة للرسالة (اختياري)" hint="تظهر أعلى البطاقة — حتى 5MB" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.btnText} onChange={e => setForm({ ...form, btnText: e.target.value })}
                    placeholder="نص الزر (اختياري)" className={inputCls} />
                  <input value={form.btnLink} onChange={e => setForm({ ...form, btnLink: e.target.value })}
                    placeholder="/offers أو https://..." dir="ltr" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[11px] text-gray-400">🔁 التكرار للزائر الواحد
                    <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}
                      className={`mt-1 ${inputCls}`}>
                      {Object.entries(FREQ_AR).map(([k, label]) => <option key={k} value={k} className="text-gray-900">{label}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px] text-gray-400">🔊 صوت التنبيه عند الظهور
                    <div className="mt-1 flex gap-2">
                      <button type="button" onClick={() => setForm({ ...form, sound: !form.sound })}
                        className={`flex-1 py-3 rounded-xl font-extrabold text-sm transition ${form.sound ? 'text-white' : 'bg-white/10 text-gray-400'}`}
                        style={form.sound ? { background: 'linear-gradient(135deg,#6C3DF5,#8b5cf6)' } : {}}>
                        {form.sound ? '🔊 مفعّل' : '🔇 معطّل'}
                      </button>
                      <button type="button" onClick={() => { playPopupChime(); toast('🔊 هذه النغمة التي سيسمعها الزائر'); }}
                        className="px-4 rounded-xl bg-white/10 text-gray-200 text-sm font-bold active:scale-95 transition">
                        ▶️ تجربة
                      </button>
                    </div>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[11px] text-gray-400">🕐 تبدأ في (اختياري)
                    <input type="datetime-local" value={toLocal(form.startsAt)}
                      onChange={e => setForm({ ...form, startsAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                      className={`mt-1 ${inputCls}`} dir="ltr" />
                  </label>
                  <label className="text-[11px] text-gray-400">⌛ تنتهي في (اختياري)
                    <input type="datetime-local" value={toLocal(form.endsAt)}
                      onChange={e => setForm({ ...form, endsAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                      className={`mt-1 ${inputCls}`} dir="ltr" />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="w-5 h-5 accent-purple-500" />
                  فعّالة — تظهر للزوار فوراً ضمن نافذتها الزمنية
                </label>
                <div className="flex gap-2 pt-1">
                  <button onClick={save} disabled={saving}
                    className="btn-primary flex-1 py-3 rounded-2xl text-white font-extrabold text-sm disabled:opacity-40">
                    {saving ? '⏳ جاري الحفظ...' : form.id ? '💾 حفظ التعديلات' : '💬 نشر الرسالة'}
                  </button>
                  <button onClick={() => setPreview({ ...form, id: form.id || 'preview' })}
                    className="px-5 rounded-2xl bg-white/10 text-gray-200 text-sm font-bold">👁️ معاينة</button>
                  <button onClick={() => { setShowForm(false); setForm({ ...emptyPopup }); }}
                    className="px-5 rounded-2xl bg-white/10 text-gray-400 text-sm font-bold">إلغاء</button>
                </div>
              </div>
            </div>
          )}

          {/* قائمة الرسائل */}
          {items.length === 0 ? (
            <div className="glass-dark rounded-3xl p-10 text-center">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-gray-400 text-sm">لا توجد رسائل منبثقة بعد — أنشئ أول رسالة ترحّب بزوار المنصة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(p => {
                const st = popupStatus(p);
                return (
                  <div key={p.id} className="glass-dark rounded-3xl p-4 flex gap-3 items-start">
                    {p.image ? (
                      <img src={imgUrl(p.image)} alt="" className="w-20 h-14 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-20 h-14 rounded-xl shrink-0 grid place-items-center text-2xl"
                        style={{ background: 'linear-gradient(135deg,#6C3DF5,#22d3ee)' }}>💬</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-white text-sm truncate">{p.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        {p.sound && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">🔊 صوت</span>}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-5">{p.body}</p>
                      <div className="text-[10px] text-gray-500 mt-1.5 flex gap-3 flex-wrap">
                        <span>{FREQ_AR[p.frequency] || p.frequency}</span>
                        {p.startsAt && <span>🕐 {new Date(p.startsAt).toLocaleString('ar')}</span>}
                        {p.endsAt && <span>⌛ {new Date(p.endsAt).toLocaleString('ar')}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => setPreview(p)} className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-200 text-[11px] font-bold">👁️</button>
                      <button onClick={() => { setForm({ ...p, startsAt: p.startsAt || '', endsAt: p.endsAt || '' }); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-200 text-[11px] font-bold">✏️</button>
                      <button onClick={() => toggleActive(p)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${p.isActive ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                        {p.isActive ? '⏸️' : '▶️'}
                      </button>
                      <button onClick={() => remove(p)} className="px-3 py-1.5 rounded-xl bg-red-500/15 text-red-300 text-[11px] font-bold">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 👁️ معاينة حية — نفس ما يراه الزائر تماماً */}
      {preview && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
          onClick={() => setPreview(null)}>
          <div className="w-full max-w-sm rounded-[1.75rem] bg-white shadow-2xl overflow-hidden border border-gray-100 animate-[popIn_.3s_ease]"
            onClick={e => e.stopPropagation()} dir="rtl">
            {preview.image && <img src={imgUrl(preview.image)} alt="" className="w-full aspect-[16/8] object-cover" />}
            <div className="p-5 sm:p-6 text-center">
              {!preview.image && (
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl grid place-items-center text-3xl"
                  style={{ background: 'linear-gradient(135deg,#6C3DF5,#22d3ee)' }}>💬</div>
              )}
              <h3 className="text-lg sm:text-xl font-black text-gray-900 leading-7">{preview.title || 'عنوان الرسالة'}</h3>
              <p className="mt-2 text-sm leading-7 text-gray-600 whitespace-pre-line">{preview.body || 'نص الرسالة...'}</p>
              <div className="mt-4 flex flex-col gap-2">
                {preview.btnText && (
                  <span className="w-full py-3 rounded-2xl text-white text-sm font-extrabold text-center block"
                    style={{ background: 'linear-gradient(135deg,#6C3DF5,#8b5cf6)' }}>{preview.btnText}</span>
                )}
                <button onClick={() => setPreview(null)}
                  className={`w-full py-3 rounded-2xl text-sm font-bold ${preview.btnText ? 'bg-gray-100 text-gray-600' : 'text-white'}`}
                  style={preview.btnText ? undefined : { background: 'linear-gradient(135deg,#6C3DF5,#8b5cf6)' }}>
                  {preview.btnText ? 'إغلاق' : 'حسناً، فهمت'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
