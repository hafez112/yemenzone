'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';
import ImageUpload from '@/components/ImageUpload';
import { kindInfo } from '@/lib/activity';

const TEMPLATES = [
  { id: 'default', name: 'الافتراضي', icon: '🏪', desc: 'بسيط ونظيف' },
  { id: 'modern',  name: 'العصري',    icon: '✨', desc: 'زجاجي متحرك' },
  { id: 'dark',    name: 'الداكن',    icon: '🌙', desc: 'ليلي فاخر' },
  { id: 'elegant', name: 'الأنيق',    icon: '👑', desc: 'ذهبي راقٍ' },
  { id: 'aurora',  name: 'أورورا',    icon: '🌌', desc: 'شفق متدرج حالم' },
  { id: 'minimal', name: 'المينيمال', icon: '▫️', desc: 'هدوء يركّز المنتج' },
];

// 🎭 الثيمات الجاهزة — إطلالات مكتملة بضغطة واحدة
const PRESETS = [
  { id: 'vibrant', name: 'عصري حيوي', icon: '✨', template: 'aurora', primary: '#6C3DF5', secondary: '#00E5C7', pattern: '', font: '', desc: 'شفق متحرك بألوان نابضة' },
  { id: 'classic', name: 'كلاسيكي فاخر', icon: '🏛️', template: 'elegant', primary: '#78350F', secondary: '#D4AF37', pattern: '', font: 'serif', desc: 'ذهبي وعناوين كلاسيكية' },
  { id: 'midnight', name: 'ليلي أنيق', icon: '🌙', template: 'dark', primary: '#818CF8', secondary: '#22D3EE', pattern: '', font: '', desc: 'ليلي مخملي مريح' },
  { id: 'heritage', name: 'تراثي يمني', icon: '🕌', template: 'modern', primary: '#991B1B', secondary: '#F59E0B', pattern: 'heritage', font: 'serif', desc: 'أصالة يمنية بزخارف هندسية' },
];

// 🧩 الأقسام القابلة لترتيبها في واجهة المتجر
const SECTION_META: Record<string, { icon: string; label: string }> = {
  banners: { icon: '🖼️', label: 'بنرات المتجر الإعلانية' },
  products: { icon: '🛍️', label: 'المنتجات والأصناف' },
  booking: { icon: '📅', label: 'قسم الحجوزات' },
  reviews: { icon: '⭐', label: 'التقييمات' },
};

export default function StoreSettings() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [presetBusy, setPresetBusy] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(s => {
      setStore(s);
      const t = s.themeJson as any;
      setForm({
        name: s.name, description: s.description, governorate: s.governorate,
        whatsapp: s.whatsapp, phone: s.phone, template: s.template,
        logo: s.logo || '', cover: s.cover || '',
        metaTitle: s.metaTitle || '', metaDesc: s.metaDesc || '', keywords: s.keywords || '',
        primary: t?.primary || '#6C3DF5', secondary: t?.secondary || '#00E5C7',
        pattern: t?.pattern || '', font: t?.font || '',
        sectionsOrder: t?.sectionsOrder || ['banners', 'products', 'booking', 'reviews'],
        kind: s.type?.kind || 'products',
        messageTemplates: (s.messageTemplates as any) || {},
        lat: s.lat ?? null, lng: s.lng ?? null, address: s.address || '', city: s.city || '',
      });
    }).catch(() => router.push('/seller/setup'));
  }, []);

  // 🔒 تخصيص التصميم ميزة مدفوعة — تُفتح بترقية الخطة أو منحة من الإدارة
  const designLocked = store?.features && !store.features.customDesign;

  async function save() {
    setSaving(true);
    try {
      await api('/stores/my', { method: 'PATCH', body: JSON.stringify(form) });
      if (!designLocked) {
        await api('/stores/my/theme', {
          method: 'PATCH',
          body: JSON.stringify({
            template: form.template, primary: form.primary, secondary: form.secondary,
            pattern: form.pattern, font: form.font, sectionsOrder: form.sectionsOrder,
          }),
        });
      }
      toast('✅ تم حفظ الإعدادات بنجاح');
    } catch (err: any) { toast(err.message, 'error'); }
    setSaving(false);
  }

  // 🎭 تطبيق ثيم جاهز بضغطة — يُحفظ فوراً
  async function applyPreset(p: any) {
    setPresetBusy(p.id);
    setForm((f: any) => ({ ...f, template: p.template, primary: p.primary, secondary: p.secondary, pattern: p.pattern, font: p.font }));
    try {
      await api('/stores/my/theme', {
        method: 'PATCH',
        body: JSON.stringify({
          template: p.template, primary: p.primary, secondary: p.secondary,
          pattern: p.pattern, font: p.font, sectionsOrder: form.sectionsOrder,
        }),
      });
      toast(`🎭 طُبّق ثيم «${p.name}» على متجرك — جرّبه الآن!`);
    } catch (err: any) { toast(err.message, 'error'); }
    setPresetBusy('');
  }

  // 🧩 تحريك قسم في الترتيب (أسهم + سحب)
  function moveSection(from: number, to: number) {
    setForm((f: any) => {
      const arr = [...(f.sectionsOrder || [])];
      if (to < 0 || to >= arr.length) return f;
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { ...f, sectionsOrder: arr };
    });
  }

  // 📨 قوالب الرسائل الآلية — أحداث الطلبات
  const MSG_EVENTS = [
    { key: 'confirmed', icon: '✅', label: 'عند تأكيد الطلب', hint: 'مثال: شكراً {name}! طلبك {number} أكّدناه وسنجهّزه فوراً' },
    { key: 'processing', icon: '📦', label: 'عند بدء التجهيز', hint: 'مثال: طلبك {number} يُغلّف الآن بعناية 📦' },
    { key: 'shipped', icon: '🛵', label: 'عند الشحن', hint: 'مثال: طلبك {number} في الطريق إليك — توقعه قريباً 🛵' },
    { key: 'delivered', icon: '📬', label: 'عند التسليم', hint: 'مثال: سُلّم طلبك {number} — نتمنى أن ينال إعجابك 🌟' },
  ];
  // 💬 ردود جاهزة للواتساب — تُنسخ بضغطة
  const QUICK_REPLIES = [
    { icon: '✅', label: 'تأكيد استلام', text: 'مرحباً {name} 👋 استلمنا طلبك {number} وسنبدأ تجهيزه الآن — {store}' },
    { icon: '⏳', label: 'اعتذار عن تأخير', text: 'عذراً {name}، تأخر طلبك {number} قليلاً بسبب ضغط الطلبات — سيصلك قريباً جداً 🙏' },
    { icon: '💳', label: 'تذكير بالدفع', text: 'مرحباً {name}، طلبك {number} بانتظار إتمام الدفع — نحتفظ به لك اليوم فقط ⏳' },
    { icon: '🌟', label: 'شكر بعد التسليم', text: 'شكراً لتسوقك من {store} يا {name}! تقييمك ⭐ يدعمنا كثيراً — ونعدك بتجربة أفضل دائماً' },
  ];
  const copyReply = async (t: string) => {
    try { await navigator.clipboard.writeText(t); toast('📋 نُسخ الرد — ألصقه في محادثة العميل'); }
    catch { toast('⚠️ انسخه يدوياً', 'error'); }
  };

  // 📍 تحديد الموقع — جيولوكيشن + تحريك دقيق بأزرار الاتجاهات (~55م لكل نقرة)
  const [locating, setLocating] = useState(false);
  const useMyLocation = () => {
    if (!navigator.geolocation) return toast('⚠️ متصفحك لا يدعم تحديد الموقع', 'error');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f: any) => ({ ...f, lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) }));
        setLocating(false);
        toast('📍 حُدّد موقعك الحالي — راجع الدبوس على الخريطة ثم احفظ');
      },
      () => { setLocating(false); toast('⚠️ تعذر الوصول لموقعك — اسمح بالإذن أو أدخل الإحداثيات يدوياً', 'error'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const nudge = (dLat: number, dLng: number) => {
    if (form.lat == null || form.lng == null) return;
    setForm((f: any) => ({ ...f, lat: +(f.lat + dLat).toFixed(6), lng: +(f.lng + dLng).toFixed(6) }));
  };

  if (!store) return null;
  // 🏷️ تسمية النشاط — الفندق «فندق»، الإيجارات «إيجارات»، الخدمات «خدمات»
  const kn = kindInfo(store);
  const nounLabel = kn.noun === 'متجر' ? 'المتجر' : kn.pageWord;

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1 space-y-4">
          <h1 className="text-2xl font-black">⚙️ إعدادات {nounLabel}</h1>

          {/* 🖼️ شعار وغلاف — رفع من الجهاز */}
          <div className="glass rounded-3xl p-5 space-y-3">
            <h2 className="font-extrabold">🖼️ هوية {nounLabel} البصرية</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs font-bold text-gray-500 mb-1">الشعار</div>
                <ImageUpload endpoint="/seller/upload" field="images" ratio="aspect-square"
                  value={form.logo} onChange={url => setForm({ ...form, logo: url })}
                  label="الشعار" hint="مربعة" />
              </div>
              <div className="col-span-2">
                <div className="text-xs font-bold text-gray-500 mb-1">الغلاف</div>
                <ImageUpload endpoint="/seller/upload" field="images" ratio="aspect-[2/1]"
                  value={form.cover} onChange={url => setForm({ ...form, cover: url })}
                  label="صورة الغلاف" hint="عريضة" />
              </div>
            </div>
          </div>

          {/* 🎭 الثيمات الجاهزة — 🔒 ضمن ميزة تخصيص التصميم */}
          <div className="glass rounded-3xl p-5 relative">
            <h2 className="font-extrabold mb-1">🎭 ثيمات جاهزة — بضغطة واحدة</h2>
            <p className="text-xs text-gray-400 mb-3">إطلالة مكتملة مصممة بعناية: قالب + ألوان + خط + لمسات زخرفية — تُحفظ فوراً</p>
            <div className={designLocked ? 'opacity-40 pointer-events-none select-none' : ''}>
              <div className="grid grid-cols-2 gap-3">
                {PRESETS.map(p => {
                  const active = form.template === p.template && form.primary === p.primary && (form.pattern || '') === p.pattern;
                  return (
                    <button key={p.id} onClick={() => applyPreset(p)} disabled={!!presetBusy}
                      className={`rounded-2xl overflow-hidden border-2 text-right transition-all ${
                        active ? 'border-purple-500 shadow-xl scale-[1.02]' : 'border-transparent hover:scale-[1.01]'
                      }`}>
                      {/* معاينة مصغرة حية */}
                      <div className="h-16 relative" style={{ background: p.template === 'dark' ? '#0A0A14' : `linear-gradient(135deg, ${p.primary}, ${p.secondary})` }}>
                        <div className="absolute bottom-2 right-3 flex gap-1">
                          <span className="w-8 h-2.5 rounded-full" style={{ background: '#fff', opacity: .9 }} />
                          <span className="w-4 h-2.5 rounded-full" style={{ background: '#fff', opacity: .5 }} />
                        </div>
                        {p.pattern === 'heritage' && <div className="heritage-band absolute bottom-0 inset-x-0" style={{ background: p.secondary }} />}
                        <span className="absolute top-2 left-2 text-lg">{p.icon}</span>
                      </div>
                      <div className="p-2.5 bg-white/70">
                        <div className="text-xs font-black flex items-center gap-1.5">
                          {p.name}
                          {active && <span className="text-[9px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">✓ مطبّق</span>}
                          {presetBusy === p.id && <span className="text-[9px] text-gray-400">⏳</span>}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{p.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {designLocked && (
              <div className="absolute inset-0 rounded-3xl bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 text-center p-4">
                <div className="text-3xl">🔒</div>
                <div className="font-extrabold text-sm">الثيمات الجاهزة ضمن ميزة تخصيص التصميم</div>
                <Link href="/seller/subscription" className="btn-primary text-white text-xs font-extrabold px-5 py-2 rounded-full">💎 ترقية خطتي</Link>
              </div>
            )}
          </div>

          {/* 🧩 ترتيب أقسام الواجهة — سحب أو أسهم */}
          {!designLocked && (
            <div className="glass rounded-3xl p-5">
              <h2 className="font-extrabold mb-1">🧩 ترتيب أقسام واجهة {kn.yours}</h2>
              <p className="text-xs text-gray-400 mb-3">اسحب بالماوس أو استخدم الأسهم — احفظ الإعدادات لتطبيق الترتيب</p>
              <div className="space-y-2">
                {(form.sectionsOrder || [])
                  .filter((k: string) => k !== 'booking' || form.kind !== 'products')
                  .filter((k: string) => k !== 'products' || form.kind === 'products')
                  .map((k: string, i: number, arr: any[]) => (
                    <div key={k}
                      draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragIdx !== null && dragIdx !== i) moveSection(dragIdx, i); setDragIdx(null); }}
                      className={`flex items-center gap-2.5 bg-white/70 rounded-2xl px-3.5 py-3 border-2 transition-all cursor-grab active:cursor-grabbing ${
                        dragIdx === i ? 'border-purple-400 shadow-lg opacity-70' : 'border-transparent'
                      }`}>
                      <span className="text-gray-300 text-lg shrink-0" title="اسحب لإعادة الترتيب">⠿</span>
                      <span className="text-lg">{SECTION_META[k]?.icon}</span>
                      <span className="flex-1 text-sm font-bold text-gray-700">{SECTION_META[k]?.label || k}</span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => moveSection(i, i - 1)} disabled={i === 0}
                          className="w-8 h-8 rounded-lg bg-white shadow-sm text-sm disabled:opacity-25">↑</button>
                        <button onClick={() => moveSection(i, i + 1)} disabled={i === arr.length - 1}
                          className="w-8 h-8 rounded-lg bg-white shadow-sm text-sm disabled:opacity-25">↓</button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* القوالب الأربعة — 🔒 ميزة مدفوعة */}
          <div className="glass rounded-3xl p-5 relative">
            <h2 className="font-extrabold mb-3">🎨 قالب {nounLabel}</h2>
            <div className={designLocked ? 'opacity-40 pointer-events-none select-none' : ''}>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setForm({ ...form, template: t.id })}
                    className={`rounded-2xl p-3 text-center border-2 transition-all ${
                      form.template === t.id ? 'border-purple-400 shadow-lg scale-105' : 'border-transparent bg-white/60'
                    }`}>
                    <div className="text-2xl">{t.icon}</div>
                    <div className="text-xs font-bold mt-1">{t.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>

              {/* الألوان */}
              <h2 className="font-extrabold my-3">🌈 ألوان {nounLabel}</h2>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-bold">
                  الأساسي
                  <input type="color" value={form.primary} onChange={e => setForm({ ...form, primary: e.target.value })}
                    className="w-12 h-12 rounded-xl cursor-pointer border-0" />
                </label>
                <label className="flex items-center gap-2 text-sm font-bold">
                  الثانوي
                  <input type="color" value={form.secondary} onChange={e => setForm({ ...form, secondary: e.target.value })}
                    className="w-12 h-12 rounded-xl cursor-pointer border-0" />
                </label>
              </div>
            </div>
            {designLocked && (
              <div className="absolute inset-0 rounded-3xl bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 text-center p-4">
                <div className="text-3xl">🔒</div>
                <div className="font-extrabold text-sm">تخصيص التصميم ميزة مدفوعة</div>
                <p className="text-xs text-gray-500">رقِّ خطتك — تُفتح بعد موافقة الإدارة على اشتراكك</p>
                <Link href="/seller/subscription"
                  className="btn-primary text-white text-xs font-extrabold px-5 py-2 rounded-full">
                  💎 ترقية خطتي
                </Link>
              </div>
            )}
          </div>

          {/* البيانات */}
          <div className="glass rounded-3xl p-5 space-y-3">
            <h2 className="font-extrabold">📝 البيانات الأساسية</h2>
            <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={`اسم ${nounLabel}`} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
            <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder={`وصف ${nounLabel}`} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.governorate || ''} onChange={e => setForm({ ...form, governorate: e.target.value })}
                placeholder="المحافظة" className="px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              <input value={form.whatsapp || ''} onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="واتساب الطلبات" dir="ltr" className="px-4 py-3 rounded-xl border border-gray-200 outline-none" />
            </div>
          </div>

          {/* 📨 الرسائل الآلية للعملاء — تُرسل مع كل تغيير حالة */}
          <div className="glass rounded-3xl p-5 space-y-3">
            <h2 className="font-extrabold">📨 الرسائل الآلية للعملاء</h2>
            <p className="text-xs text-gray-500 !mt-1">
              تُرسل للعميل تنبيهاً داخلياً عند كل تغيير حالة طلبه — اترك الحقل فارغاً لاستخدام رسالة المنصة الافتراضية.
              المتغيرات: <code className="bg-purple-50 px-1 rounded" dir="ltr">{'{name}'}</code> اسم العميل · <code className="bg-purple-50 px-1 rounded" dir="ltr">{'{number}'}</code> رقم الطلب · <code className="bg-purple-50 px-1 rounded" dir="ltr">{'{store}'}</code> اسم متجرك
            </p>
            {MSG_EVENTS.map((ev) => (
              <div key={ev.key}>
                <div className="text-xs font-bold text-gray-500 mb-1">{ev.icon} {ev.label}</div>
                <input
                  value={(form.messageTemplates || {})[ev.key] || ''}
                  onChange={(e) => setForm({ ...form, messageTemplates: { ...(form.messageTemplates || {}), [ev.key]: e.target.value } })}
                  placeholder={ev.hint} maxLength={300}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm" />
              </div>
            ))}
          </div>

          {/* 💬 ردود واتساب جاهزة — تُنسخ بضغطة */}
          <div className="glass rounded-3xl p-5">
            <h2 className="font-extrabold mb-1">💬 ردود جاهزة للعملاء</h2>
            <p className="text-xs text-gray-400 mb-3">اضغط للنسخ ثم ألصق في واتساب — بدّل المتغيرات ببيانات العميل</p>
            <div className="space-y-2">
              {QUICK_REPLIES.map((r) => (
                <button key={r.label} onClick={() => copyReply(r.text)}
                  className="w-full flex items-center gap-3 bg-white/70 hover:bg-white rounded-2xl px-4 py-3 text-right transition-all card-hover">
                  <span className="text-xl shrink-0">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold">{r.label}</div>
                    <div className="text-[11px] text-gray-400 truncate">{r.text}</div>
                  </div>
                  <span className="text-xs font-black text-purple-500 shrink-0">📋 نسخ</span>
                </button>
              ))}
            </div>
          </div>

          {/* 📍 موقع المتجر على خرائط جوجل — يظهر أسفل واجهة متجرك بقسم «موقعنا» */}
          <div className="glass rounded-3xl p-5 space-y-3">
            <h2 className="font-extrabold">📍 حدد موقع {kn.yours}</h2>
            <p className="text-xs text-gray-500 !mt-1">
              حدد موقعك الفعلي — يُعرض للزبائن أسفل صفحة متجرك مع زر الاتجاهات المباشر
            </p>

            <div className="grid grid-cols-2 gap-2">
              <input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="العنوان — الشارع والحي" className="px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              <input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="المدينة" className="px-4 py-3 rounded-xl border border-gray-200 outline-none" />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={useMyLocation} disabled={locating}
                className="btn-primary px-5 py-2.5 rounded-xl text-white font-extrabold text-sm disabled:opacity-40">
                {locating ? '⏳ جاري التحديد...' : '📍 استخدم موقعي الحالي'}
              </button>
              {form.lat != null && form.lng != null && (
                <button onClick={() => { setForm({ ...form, lat: null, lng: null }); toast('🗑️ أُزيل الموقع — احفظ لتأكيد'); }}
                  className="px-4 py-2.5 rounded-xl bg-red-50 text-red-500 font-extrabold text-sm">
                  🗑️ إزالة الموقع
                </button>
              )}
            </div>

            {/* الخريطة الحية + التحريك الدقيق */}
            {form.lat != null && form.lng != null ? (
              <div className="anim-bounce-in">
                <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200" style={{ height: 260 }}>
                  <iframe
                    title="موقع المتجر"
                    src={`https://maps.google.com/maps?q=${form.lat},${form.lng}&z=16&hl=ar&output=embed`}
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>
                {/* 🎮 تحريك دقيق للدبوس */}
                <div className="flex items-center justify-center gap-3 mt-3">
                  <span className="text-[10px] text-gray-400 font-bold">اضبط الدبوس بدقة:</span>
                  <div className="grid grid-cols-3 gap-1 w-28">
                    <span />
                    <button onClick={() => nudge(0.0005, 0)} className="bg-white shadow rounded-lg py-1.5 text-sm font-black">▲</button>
                    <span />
                    <button onClick={() => nudge(0, 0.0005)} className="bg-white shadow rounded-lg py-1.5 text-sm font-black">◀</button>
                    <button onClick={() => nudge(-0.0005, 0)} className="bg-white shadow rounded-lg py-1.5 text-sm font-black">▼</button>
                    <button onClick={() => nudge(0, -0.0005)} className="bg-white shadow rounded-lg py-1.5 text-sm font-black">▶</button>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono" dir="ltr">{form.lat}, {form.lng}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                <div className="text-4xl mb-2">🗺️</div>
                لم يُحدد الموقع بعد — اضغط «استخدم موقعي الحالي» وأنت في متجرك
              </div>
            )}
          </div>

          {/* 🔎 الظهور في محركات البحث والدليل */}
          <div className="glass rounded-3xl p-5 space-y-3">
            <h2 className="font-extrabold">🔎 الظهور في البحث (SEO)</h2>
            <p className="text-xs text-gray-500 !mt-1">
              هذه البيانات تظهر في نتائج قوقل وتُستخدم في البحث الموحد ودليل المتاجر داخل المنصة
            </p>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-1">عنوان صفحة المتجر في قوقل <span className="text-gray-400 font-normal">(اتركه فارغاً لاستخدام اسم المتجر)</span></div>
              <input value={form.metaTitle || ''} onChange={e => setForm({ ...form, metaTitle: e.target.value })}
                maxLength={60} placeholder="مثال: متجر النور للإلكترونيات — صنعاء"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              <div className="text-[10px] text-gray-400 text-left mt-0.5" dir="ltr">{(form.metaTitle || '').length}/60</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-1">وصف الظهور في نتائج البحث</div>
              <textarea value={form.metaDesc || ''} onChange={e => setForm({ ...form, metaDesc: e.target.value })}
                maxLength={160} rows={2} placeholder="وصف جذاب يشجع الزائر على دخول متجرك من قوقل..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              <div className="text-[10px] text-gray-400 text-left mt-0.5" dir="ltr">{(form.metaDesc || '').length}/160</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-1">كلمات مفتاحية <span className="text-gray-400 font-normal">(افصل بينها بفاصلة)</span></div>
              <input value={form.keywords || ''} onChange={e => setForm({ ...form, keywords: e.target.value })}
                placeholder="إلكترونيات، جوالات، صنعاء، توصيل سريع"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              <div className="ai-card rounded-xl px-3 py-2 mt-2 text-[11px] text-gray-600">
                🤖 <b>نصيحة ذكية:</b> الكلمات المفتاحية تجعل متجرك يظهر عندما يبحث الزبائن في المنصة — اكتب ما يكتبه زبائنك فعلاً (اسم منتجك، مدينتك، نوع نشاطك)
              </div>
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="btn-primary w-full py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40">
            {saving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
          </button>
        </div>
      </div>
    </main>
  );
}
