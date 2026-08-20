'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

// 🤖 مركز إدارة الذكاء الاصطناعي — محلي + خارجي + مساعد الرئيسية

// روابط مطوري الذكاء الاصطناعي الجاهزة — اختيار أي منها يعبّئ النموذج
const PROVIDER_PRESETS = [
  { name: 'OpenAI (ChatGPT)', baseUrl: 'https://api.openai.com/v1', docs: 'https://platform.openai.com', model: 'gpt-4o-mini', color: '#10a37f' },
  { name: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com', docs: 'https://console.anthropic.com', model: 'claude-sonnet-4-5', color: '#d97706' },
  { name: 'Google (Gemini)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', docs: 'https://aistudio.google.com', model: 'gemini-2.0-flash', color: '#4285f4' },
  { name: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1', docs: 'https://console.x.ai', model: 'grok-3-mini', color: '#000000' },
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', docs: 'https://platform.deepseek.com', model: 'deepseek-chat', color: '#4d6bfe' },
  { name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', docs: 'https://console.mistral.ai', model: 'mistral-small-latest', color: '#ff7000' },
  { name: 'Groq (سريع)', baseUrl: 'https://api.groq.com/openai/v1', docs: 'https://console.groq.com', model: 'llama-3.3-70b-versatile', color: '#f55036' },
  { name: 'OpenRouter (موحّد)', baseUrl: 'https://openrouter.ai/api/v1', docs: 'https://openrouter.ai', model: 'auto', color: '#6366f1' },
  { name: 'واجهة مخصصة', baseUrl: '', docs: '', model: '', color: '#64748b' },
];

const FEATURE_META: { key: string; icon: string; label: string; desc: string }[] = [
  { key: 'description', icon: '✨', label: 'وصف المنتج المفصّل', desc: 'توليد وصف تسويقي احترافي للمنتجات من لوحة البائع' },
  { key: 'whiteBg', icon: '🖼️', label: 'صورة بخلفية بيضاء', desc: 'تحويل صور المنتجات إلى خلفية بيضاء موحدة احترافية' },
  { key: 'priceCheck', icon: '💲', label: 'فحص السعر', desc: 'مقارنة سعر المنتج بأسعار المنتجات المشابهة + رأي الذكاء الخارجي بالسعر العالمي' },
  { key: 'assistant', icon: '💬', label: 'مساعد الرئيسية', desc: 'أيقونة الذكاء الاصطناعي العائمة في الصفحة الرئيسية للمنصة' },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      className={`w-12 h-7 rounded-full relative transition-all shrink-0 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'right-1' : 'right-6'}`} />
    </button>
  );
}

export default function AdminAiPage() {
  const [cfg, setCfg] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [c, p] = await Promise.all([api('/admin/ai/config'), api('/admin/ai/providers')]);
    setCfg(c); setProviders(p);
  }
  useEffect(() => { load().catch((e) => toast(e.message, 'error')); }, []);

  async function saveConfig(patch: any, msg = '✅ تم حفظ إعدادات الذكاء') {
    setSaving(true);
    try {
      const next = await api('/admin/ai/config', { method: 'PUT', body: JSON.stringify(patch) });
      setCfg(next); toast(msg);
    } catch (e: any) { toast(e.message, 'error'); }
    setSaving(false);
  }

  async function saveProvider() {
    if (!form?.name?.trim()) return toast('⚠️ اسم المزود مطلوب', 'error');
    if (!form?.baseUrl?.trim() && !form?.id) return toast('⚠️ رابط الواجهة البرمجية مطلوب', 'error');
    setBusy(true);
    try {
      if (form.id) {
        await api(`/admin/ai/providers/${form.id}`, { method: 'PATCH', body: JSON.stringify(form) });
        toast('✅ تم تحديث المزود');
      } else {
        await api('/admin/ai/providers', { method: 'POST', body: JSON.stringify(form) });
        toast('🎉 تمت إضافة المزود');
      }
      setForm(null); await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  }

  async function removeProvider(id: string, name: string) {
    if (!confirm(`حذف المزود "${name}" نهائياً؟`)) return;
    try { await api(`/admin/ai/providers/${id}`, { method: 'DELETE' }); toast('🗑️ تم الحذف'); await load(); }
    catch (e: any) { toast(e.message, 'error'); }
  }

  async function testProvider(id: string) {
    setTesting(id);
    try {
      const r = await api(`/admin/ai/providers/${id}/test`, { method: 'POST' });
      toast(`✅ الاتصال ناجح${r.modelsCount ? ` — ${r.modelsCount} نموذج متاح` : ''}`);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setTesting('');
  }

  if (!cfg) return <div className="p-8 text-center text-slate-400 font-bold">⏳ جارِ تحميل مركز الذكاء…</div>;

  return (
    <div className="space-y-4 pb-10">
      <div>
        <h1 className="text-xl font-black">🤖 مركز الذكاء الاصطناعي</h1>
        <p className="text-xs text-slate-400 mt-1">إدارة الذكاء المحلي والخارجي وربط المنصة بأي واجهة برمجية — كل التغييرات تسري فوراً</p>
      </div>

      {/* ═══ المحركان: محلي + خارجي ═══ */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="card p-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-extrabold text-sm">🧠 الذكاء الاصطناعي المحلي</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">مكتبة يمن زون الداخلية (قواعد + قاعدة معرفة) — تعمل دائماً بلا إنترنت ولا تكلفة ولا مغادرة للبيانات</p>
          </div>
          <Toggle on={cfg.localEnabled} onChange={(v) => saveConfig({ localEnabled: v })} />
        </div>
        <div className="card p-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-extrabold text-sm">🌐 الذكاء الاصطناعي الخارجي</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">ربط مزود عالمي (OpenAI/Claude/DeepSeek…) — عند فشله يحل المحلي تلقائياً فلا تتوقف الخدمة أبداً</p>
          </div>
          <Toggle on={cfg.externalEnabled} onChange={(v) => {
            if (v && !cfg.providerId) return toast('⚠️ أضف مزوداً واختره أولاً', 'error');
            saveConfig({ externalEnabled: v });
          }} />
        </div>
      </div>

      {/* ═══ الميزات الذكية ═══ */}
      <div className="card p-4">
        <h2 className="font-extrabold text-sm mb-3">✨ الميزات الذكية للبائعين والزوار</h2>
        <div className="grid md:grid-cols-2 gap-2.5">
          {FEATURE_META.map((f) => (
            <div key={f.key} className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <div className="font-bold text-[13px]">{f.icon} {f.label}</div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
              <Toggle on={!!cfg.features[f.key]}
                onChange={(v) => saveConfig({ features: { [f.key]: v } }, v ? `✅ فُعّلت: ${f.label}` : `⏸️ عُطّلت: ${f.label}`)} />
            </div>
          ))}
        </div>
      </div>

      {/* ═══ المزودون الخارجيون ═══ */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-sm">🌐 مزودو الذكاء الخارجي</h2>
          <button onClick={() => setForm({ name: '', baseUrl: '', apiKey: '', model: '', isActive: true })}
            className="btn-primary text-white text-xs font-bold px-4 py-2 rounded-xl">➕ إضافة مزود</button>
        </div>

        {/* المزود النشط */}
        {providers.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-bold text-slate-500 block mb-1">المزود المستخدم للمنصة</label>
            <select value={cfg.providerId || ''} onChange={(e) => saveConfig({ providerId: e.target.value || null }, '✅ تم اختيار المزود النشط')}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold bg-white">
              <option value="">— لا يوجد (الذكاء المحلي فقط) —</option>
              {providers.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name} — {p.model || 'النموذج الافتراضي'}</option>)}
            </select>
          </div>
        )}

        {providers.length === 0 ? (
          <p className="text-center text-slate-400 text-xs py-6">لا مزودين بعد — اختر من روابط المطورين بالأسفل لإضافة أول مزود</p>
        ) : (
          <div className="space-y-2">
            {providers.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-slate-100 bg-white">
                <span className={`w-2.5 h-2.5 rounded-full ${p.lastTestOk === true ? 'bg-emerald-500' : p.lastTestOk === false ? 'bg-red-500' : 'bg-slate-300'}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[13px] flex items-center gap-2">
                    {p.name}
                    {cfg.providerId === p.id && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold">النشط</span>}
                    {!p.isActive && <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">معطّل</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate" dir="ltr">{p.baseUrl} · {p.model || '—'} · 🔑 {p.apiKey || 'بلا مفتاح'}</div>
                </div>
                <button onClick={() => testProvider(p.id)} disabled={testing === p.id}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 disabled:opacity-50">
                  {testing === p.id ? '⏳' : '🔌 فحص'}</button>
                <button onClick={() => setForm({ ...p, apiKey: '' })}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100">✏️ تعديل</button>
                <button onClick={() => removeProvider(p.id, p.name)}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">🗑️</button>
              </div>
            ))}
          </div>
        )}

        {/* نموذج الإضافة/التعديل */}
        {form && (
          <div className="mt-4 p-4 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/40 space-y-3">
            <div className="font-extrabold text-sm">{form.id ? '✏️ تعديل مزود' : '➕ مزود جديد'}</div>

            {/* روابط المطورين الجاهزة */}
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">🔗 روابط مطوري الذكاء الاصطناعي — اختر لتعبئة تلقائية</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PROVIDER_PRESETS.map((pr) => (
                  <button key={pr.name} type="button"
                    onClick={() => setForm({ ...form, name: pr.name, baseUrl: pr.baseUrl, model: pr.model })}
                    className={`p-2.5 rounded-xl border text-right transition-all ${form.name === pr.name ? 'border-purple-400 bg-white shadow' : 'border-slate-200 bg-white hover:border-purple-200'}`}>
                    <div className="text-[11px] font-extrabold">{pr.name}</div>
                    {pr.docs && <div className="text-[9px] text-sky-500 truncate" dir="ltr">{pr.docs.replace('https://', '')}</div>}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">اسم المزود</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white" placeholder="OpenAI" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">النموذج الافتراضي</label>
                <input value={form.model || ''} onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white" dir="ltr" placeholder="gpt-4o-mini" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">رابط الواجهة البرمجية (Base URL)</label>
              <input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white" dir="ltr" placeholder="https://api.openai.com/v1" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">مفتاح API {form.id ? '(اتركه فارغاً للإبقاء على الحالي)' : ''}</label>
              <input value={form.apiKey || ''} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} type="password"
                className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white" dir="ltr" placeholder="sk-..." />
              <p className="text-[10px] text-slate-400 mt-1">🔐 يُشفَّر المفتاح (AES-256) قبل الحفظ ولا يظهر لأي واجهة</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={saveProvider} disabled={busy}
                className="btn-primary text-white text-xs font-bold px-5 py-2.5 rounded-xl disabled:opacity-50">
                {busy ? '⏳ جارِ الحفظ…' : form.id ? '💾 حفظ التعديل' : '🎉 إضافة المزود'}</button>
              <button onClick={() => setForm(null)} className="text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-100 text-slate-500">إلغاء</button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ مساعد الرئيسية ═══ */}
      <div className="card p-4">
        <h2 className="font-extrabold text-sm mb-1">💬 أيقونة الذكاء الاصطناعي في الصفحة الرئيسية</h2>
        <p className="text-[11px] text-slate-400 mb-3">أيقونة عائمة مميزة تظهر لزوار المنصة وتعمل حسب تحديدك هنا (تعطيلها يخفيها فوراً)</p>
        <div className="grid md:grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">اسم المساعد</label>
            <input defaultValue={cfg.assistantName} onBlur={(e) => e.target.value !== cfg.assistantName && saveConfig({ assistantName: e.target.value }, '✅ تم حفظ اسم المساعد')}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">الأيقونة</label>
            <div className="flex gap-1.5">
              {['🤖', '🧠', '✨', '🦾', '💡', '🌟', '👽', '🪄'].map((ic) => (
                <button key={ic} type="button" onClick={() => saveConfig({ assistantIcon: ic }, '✅ تم تغيير الأيقونة')}
                  className={`w-10 h-10 rounded-xl text-lg transition-all ${cfg.assistantIcon === ic ? 'bg-purple-100 ring-2 ring-purple-400 scale-110' : 'bg-slate-50 hover:bg-slate-100'}`}>{ic}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-2.5">
          <label className="text-xs font-bold text-slate-500 block mb-1">رسالة الترحيب</label>
          <textarea defaultValue={cfg.assistantWelcome} rows={2} onBlur={(e) => e.target.value !== cfg.assistantWelcome && saveConfig({ assistantWelcome: e.target.value }, '✅ تم حفظ رسالة الترحيب')}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white" />
        </div>
        {/* معاينة حية */}
        <div className="mt-3 flex items-center gap-3 p-3 rounded-2xl bg-night text-white">
          <span className="w-11 h-11 rounded-full flex items-center justify-center text-xl anim-pulse-glow" style={{ background: 'var(--primary)' }}>{cfg.assistantIcon}</span>
          <div>
            <div className="font-extrabold text-sm">{cfg.assistantName}</div>
            <div className="text-[10px] text-gray-400">يعمل بوضع: {cfg.externalEnabled && cfg.providerId ? '🌐 خارجي + محلي احتياطي' : '🧠 محلي بالكامل'} · {cfg.features.assistant ? 'ظاهر للزوار' : 'مخفي حالياً'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
