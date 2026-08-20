'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';

// معالج إنشاء النشاط — 3 خطوات + مساعد الذكاء الاصطناعي المحلي
// 🏷️ كل نشاط يُسمّى باسمه: متجر / فندق / معرض إيجارات / مركز خدمات
const KIND_NOUN: Record<string, { noun: string; yours: string; placeholder: string }> = {
  products: { noun: 'المتجر', yours: 'متجرك', placeholder: 'مثال: متجر التقنية الحديثة' },
  rentals:  { noun: 'معرض الإيجارات', yours: 'معرض إيجاراتك', placeholder: 'مثال: إيجارات النور للشقق المفروشة' },
  hotel:    { noun: 'الفندق', yours: 'فندقك', placeholder: 'مثال: فندق النجمة الذهبية' },
  services: { noun: 'مركز الخدمات', yours: 'مركز خدماتك', placeholder: 'مثال: مركز الفنيون للصيانة' },
  restaurants: { noun: 'المطعم', yours: 'مطعمك', placeholder: 'مثال: مطعم الذواقة' },
  malls: { noun: 'المول التجاري', yours: 'مولك', placeholder: 'مثال: مول صنعاء سيتي' },
};

export default function StoreSetup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState<any>(null);
  const [form, setForm] = useState({ kind: '', typeId: '', name: '', category: '', governorate: '', whatsapp: '' });
  const [ai, setAi] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/setup-options').then(setOptions).catch(() => {});
  }, []);

  // 🤖 استدعاء الذكاء المحلي عند اكتمال الاسم
  async function runAi() {
    if (!form.name || !form.kind) return;
    setAiLoading(true);
    try {
      const result = await api('/stores/ai-preview', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setAi(result);
      if (result.detectedCategory && !form.category) {
        setForm(f => ({ ...f, category: result.detectedCategory }));
      }
      toast('🤖 الذكاء المحلي جهّز إعداداتك');
    } catch (err: any) { toast(err.message, 'error'); }
    setAiLoading(false);
  }

  async function create() {
    setCreating(true);
    try {
      const r = await api('/stores', { method: 'POST', body: JSON.stringify(form) });
      toast('🎉 مبروك! تم إنشاء حسابك بنجاح');
      router.push('/seller');
    } catch (err: any) { toast(err.message, 'error'); }
    setCreating(false);
  }

  const isProducts = form.kind === 'products' || form.kind === 'restaurants' || form.kind === 'malls';
  const kn = KIND_NOUN[form.kind] || KIND_NOUN.products;

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-2xl mx-auto">
        {/* شريط التقدم */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 h-2 rounded-full transition-all"
              style={{ background: step >= s ? 'var(--primary)' : '#e5e7eb' }} />
          ))}
        </div>

        {/* الخطوة 1: نوع المتجر */}
        {step === 1 && (
          <div className="anim-fade-up">
            <h1 className="text-2xl font-black mb-1">ما نوع نشاطك التجاري؟ 🏪</h1>
            <p className="text-gray-500 text-sm mb-5">كل نوع له لوحة تحكم وعرض خاص به</p>
            <div className="grid grid-cols-2 gap-3 stagger">
              {options?.kinds?.map((k: any) => (
                <button key={k.id}
                  onClick={() => { setForm({ ...form, kind: k.kind || k.id, typeId: k.id, category: '' }); setAi(null); }}
                  className={`glass rounded-3xl p-5 text-right card-hover border-2 transition-all ${
                    form.typeId === k.id ? 'shadow-lg' : 'border-transparent'
                  }`}
                  style={form.typeId === k.id ? { borderColor: k.color || '#a78bfa' } : undefined}>
                  <div className="text-4xl mb-2">{k.icon}</div>
                  <div className="font-extrabold">{k.name}</div>
                  <div className="text-xs text-gray-500">{k.desc}</div>
                </button>
              ))}
            </div>
            <button disabled={!form.typeId} onClick={() => setStep(2)}
              className="btn-primary w-full mt-5 py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40">
              التالي ←
            </button>
          </div>
        )}

        {/* الخطوة 2: بيانات المتجر + التصنيفات */}
        {step === 2 && (
          <div className="anim-fade-up">
            <h1 className="text-2xl font-black mb-1">بيانات {kn.yours} 📝</h1>
            <p className="text-gray-500 text-sm mb-5">اكتب الاسم وسيحلل الذكاء المحلي نشاطك تلقائياً</p>
            <div className="glass rounded-3xl p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">اسم {kn.noun}</label>
                <input value={form.name}
                  onChange={e => { setForm({ ...form, name: e.target.value }); setAi(null); }}
                  onBlur={runAi}
                  placeholder={kn.placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 outline-none" />
              </div>

              {/* تصنيفات المنتجات الستة — تظهر لنوع منتجات فقط */}
              {isProducts && (
                <div>
                  <label className="block text-sm font-bold mb-2">نشاطك التجاري</label>
                  <div className="grid grid-cols-3 gap-2">
                    {options?.productCategories?.map((c: any) => (
                      <button key={c.id}
                        onClick={() => { setForm({ ...form, category: c.id }); runAi(); }}
                        className={`rounded-2xl p-3 text-center border-2 transition-all ${
                          form.category === c.id ? 'shadow-lg scale-105' : 'border-transparent bg-white/60'
                        }`}
                        style={form.category === c.id ? { borderColor: c.color } : {}}>
                        <div className="text-2xl">{c.icon}</div>
                        <div className="text-xs font-bold mt-1">{c.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <input value={form.governorate} onChange={e => setForm({ ...form, governorate: e.target.value })}
                  placeholder="المحافظة"
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 outline-none" />
                <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="واتساب الطلبات" dir="ltr"
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 outline-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setStep(1)} className="px-6 py-3.5 rounded-2xl font-bold text-gray-500">→ رجوع</button>
              <button disabled={!form.name || form.name.length < 2} onClick={() => { runAi(); setStep(3); }}
                className="btn-primary flex-1 py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40">
                🤖 التالي — الإعداد الذكي
              </button>
            </div>
          </div>
        )}

        {/* الخطوة 3: نتيجة الذكاء الاصطناعي المحلي */}
        {step === 3 && (
          <div className="anim-fade-up">
            <h1 className="text-2xl font-black mb-1">🤖 الذكاء المحلي جهّز {kn.yours}</h1>
            <p className="text-gray-500 text-sm mb-5">راجع الإعدادات المقترحة وأنشئ {kn.noun === 'المتجر' ? 'متجرك' : kn.yours}</p>

            {aiLoading || !ai ? (
              <div className="glass rounded-3xl p-8 text-center">
                <div className="text-4xl mb-3 anim-float">🤖</div>
                <p className="font-bold text-gray-500">الذكاء المحلي يحلل نشاطك...</p>
              </div>
            ) : (
              <div className="space-y-3 stagger">
                {/* الوصف المولّد */}
                <div className="glass rounded-3xl p-5">
                  <div className="text-xs font-bold text-gray-400 mb-1">📝 الوصف التسويقي المولّد</div>
                  <p className="font-bold text-sm leading-relaxed">{ai.description}</p>
                </div>

                {/* القالب والألوان المختارة */}
                <div className="glass rounded-3xl p-5">
                  <div className="text-xs font-bold text-gray-400 mb-2">🎨 القالب والألوان المقترحة</div>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full shadow" style={{ background: ai.theme.primary }} />
                    <span className="w-8 h-8 rounded-full shadow" style={{ background: ai.theme.secondary }} />
                    <span className="font-extrabold text-sm">قالب: {ai.theme.template}</span>
                    {ai.categoryInfo && <span className="text-sm">{ai.categoryInfo.icon} {ai.categoryInfo.name}</span>}
                  </div>
                </div>

                {/* لوحة التحكم المجهزة */}
                <div className="glass rounded-3xl p-5">
                  <div className="text-xs font-bold text-gray-400 mb-2">⚡ لوحتك الذكية</div>
                  <div className="flex flex-wrap gap-2">
                    {ai.dashboard.quickActions.map((q: string) => (
                      <span key={q} className="bg-white/70 px-3 py-1.5 rounded-full text-xs font-bold">{q}</span>
                    ))}
                  </div>
                </div>

                {/* نصائح ذكية */}
                <div className="glass rounded-3xl p-5">
                  <div className="text-xs font-bold text-gray-400 mb-2">💡 نصائح لنجاحك</div>
                  {ai.tips.map((t: string) => <p key={t} className="text-sm text-gray-600 mb-1">{t}</p>)}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button onClick={() => setStep(2)} className="px-6 py-3.5 rounded-2xl font-bold text-gray-500">→ رجوع</button>
              <button disabled={creating || !ai} onClick={create}
                className="btn-primary flex-1 py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40">
                {creating ? '⏳ جاري الإنشاء...' : `🚀 أنشئ ${kn.noun === 'المتجر' ? 'متجري' : kn.noun === 'الفندق' ? 'فندقي' : kn.noun === 'معرض الإيجارات' ? 'معرضي' : 'مركزي'} الآن`}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
