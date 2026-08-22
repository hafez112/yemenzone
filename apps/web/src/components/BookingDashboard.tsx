'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';
import { BOOKING_SPEC_FIELDS } from '@/lib/activity';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: '⏳ جديد',    color: '#F59E0B' },
  confirmed: { label: '✅ مؤكد',    color: '#0EA5E9' },
  checked_in:{ label: '🛎️ دخل',     color: '#8B5CF6' },
  completed: { label: '✔️ مكتمل',   color: '#059669' },
  cancelled: { label: '✕ ملغي',     color: '#DC2626' },
};

// لوحة موحدة لأصحاب: الإيجارات + الفنادق + الخدمات
export default function BookingDashboard({ kind, config }: {
  kind: 'rentals' | 'hotel' | 'services';
  config: {
    title: string; icon: string; itemName: string; itemPlural: string;
    bookingName: string; priceLabel: string;
    fields: { key: string; label: string; type?: string; placeholder?: string; options?: string[] }[];
  };
}) {
  // 🧬 مواصفات إضافية منظمة حسب النشاط — مصدرها المكتبة الموحدة
  const specFields = BOOKING_SPEC_FIELDS[kind] || [];
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [tab, setTab] = useState<'items' | 'bookings'>('items');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ title: '', price: '', description: '', images: [], currency: '' });
  const { list: currencies, def: defCur } = useCurrency();
  const isym = (code?: string) => currencies.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || defCur?.symbol || 'ر.ي';
  const [saving, setSaving] = useState(false);
  const [wrongKind, setWrongKind] = useState<string>('');

  async function load() {
    const [its, bks] = await Promise.all([
      api(`/seller/items/${kind}`),
      api(`/seller/bookings/${kind}`),
    ]);
    setItems(its); setBookings(bks);
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    load().catch(e => setWrongKind(e.message));
  }, []);

  function startNew() {
    setEditing(null);
    setForm({ title: '', price: '', description: '', images: [], currency: defCur?.code || '' });
    setShowForm(true);
  }

  function startEdit(it: any) {
    setEditing(it);
    setForm({
      title: it.title,
      price: it.pricePerDay || it.pricePerNight || it.price,
      currency: it.currency || defCur?.code || '',
      description: it.description || '',
      images: it.images || [],
      type: it.type, roomType: it.roomType, capacity: it.capacity,
      duration: it.duration, address: it.address,
      // 🧬 حقول النشاط المتخصصة
      pricePerMonth: it.pricePerMonth ?? '', deposit: it.deposit ?? '',
      areaM2: it.areaM2 ?? '', roomsCount: it.roomsCount ?? '',
      beds: it.beds ?? '', view: it.view || '', breakfast: !!it.breakfast,
      category: it.category || '', durationMin: it.durationMin ?? '', warrantyText: it.warrantyText || '',
      specs: it.specs || {},
      features: (it.features || []).join('، '),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        ...form,
        features: form.features ? form.features.split('،').map((f: string) => f.trim()).filter(Boolean) : [],
        specs: Object.fromEntries(Object.entries(form.specs || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined)),
      };
      if (editing) {
        await api(`/seller/items/${kind}/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast('✅ تم التحديث');
      } else {
        await api(`/seller/items/${kind}`, { method: 'POST', body: JSON.stringify(body) });
        toast(`🎉 تمت إضافة ${config.itemName}`);
      }
      setShowForm(false); setEditing(null);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSaving(false);
  }

  async function remove(id: string, t: string) {
    if (!confirm(`حذف "${t}" مع حجوزاته؟`)) return;
    try {
      await api(`/seller/items/${kind}/${id}`, { method: 'DELETE' });
      toast('🗑️ تم الحذف');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  async function setStatus(id: string, status: string) {
    try {
      await api(`/seller/bookings/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      toast(`✅ تم تحديث الحالة`);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  if (!store) return null;

  // متجر من نوع آخر
  if (wrongKind) return (
    <main className="min-h-screen pt-24 px-3 flex items-center justify-center">
      <div className="glass rounded-3xl p-8 text-center max-w-md">
        <div className="text-5xl mb-3">{config.icon}</div>
        <p className="font-bold text-gray-600">{wrongKind}</p>
        <button onClick={() => router.push('/seller')} className="btn-primary mt-4 px-6 py-3 rounded-2xl text-white font-extrabold">
          → لوحتي الرئيسية
        </button>
      </div>
    </main>
  );

  const newBookings = bookings.filter(b => b.status === 'pending').length;

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black">{config.icon} {config.title}</h1>
            {tab === 'items' && (
              <button onClick={() => setShowForm(!showForm)}
                className="btn-primary px-5 py-2.5 rounded-xl text-white font-extrabold">
                {showForm ? '✕ إغلاق' : `➕ ${config.itemName} جديد`}
              </button>
            )}
          </div>

          {/* 📊 شريط إحصاءات النشاط — نظرة فورية قبل التبويبات */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { icon: config.icon, n: items.length, l: config.itemPlural },
              { icon: '📅', n: bookings.length, l: config.bookingName },
              { icon: '⏳', n: newBookings, l: kind === 'services' ? 'طلبات جديدة' : 'بانتظار الرد' },
            ].map(s => (
              <div key={s.l} className="glass rounded-2xl p-3 text-center">
                <div className="text-xl">{s.icon}</div>
                <div className="text-xl font-black grad-text">{s.n}</div>
                <div className="text-[10px] font-bold text-gray-400">{s.l}</div>
              </div>
            ))}
          </div>

          {/* تبويبات */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab('items')}
              className={`px-5 py-2.5 rounded-full font-bold text-sm ${tab === 'items' ? 'text-white' : 'glass'}`}
              style={tab === 'items' ? { background: 'var(--primary)' } : {}}>
              {config.itemPlural} ({items.length})
            </button>
            <button onClick={() => setTab('bookings')}
              className={`px-5 py-2.5 rounded-full font-bold text-sm relative ${tab === 'bookings' ? 'text-white' : 'glass'}`}
              style={tab === 'bookings' ? { background: 'var(--primary)' } : {}}>
              {config.bookingName} ({bookings.length})
              {newBookings > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-black">
                  {newBookings}
                </span>
              )}
            </button>
          </div>

          {/* نموذج إضافة/تعديل */}
          {tab === 'items' && showForm && (
            <div className="glass rounded-3xl p-5 mb-4 anim-bounce-in space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder={`اسم ${config.itemName} *`}
                  className="px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                <div className="flex gap-2">
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                    placeholder={`${config.priceLabel} *`}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                  <select value={form.currency || ''} onChange={e => setForm({ ...form, currency: e.target.value })}
                    title="عملة التسعير — من عملات المنصة المعتمدة"
                    className="w-28 px-2 py-3 rounded-xl border border-gray-200 outline-none bg-white font-bold text-sm">
                    {!form.currency && <option value="">العملة</option>}
                    {currencies.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.symbol}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {config.fields.map(f => f.type === 'checkbox' ? (
                  <label key={f.key} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 font-bold text-sm cursor-pointer">
                    <input type="checkbox" checked={!!form[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.checked })}
                      className="w-4 h-4 accent-purple-600" />
                    {f.label}
                  </label>
                ) : f.type === 'select' ? (
                  <select key={f.key} value={form[f.key] || ''}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white">
                    <option value="">{f.placeholder || f.label}</option>
                    {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input key={f.key} type={f.type || 'text'}
                    value={form[f.key] ?? ''}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder || f.label}
                    className="px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                ))}
              </div>
              {/* 🧬 مواصفات إضافية حسب النشاط */}
              {specFields.length > 0 && (
                <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3">
                  <div className="text-xs font-black text-purple-700 mb-2">🧬 مواصفات إضافية (حسب النشاط)</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {specFields.map(f => f.type === 'select' ? (
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
              )}
              <input value={form.features || ''} onChange={e => setForm({ ...form, features: e.target.value })}
                placeholder="المميزات مفصولة بفاصلة عربية — مثال: واي فاي، موقف، إطلالة"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="الوصف" rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              <button onClick={save} disabled={saving}
                className="btn-primary w-full py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40">
                {saving ? '⏳...' : editing ? '💾 حفظ' : '🎉 إضافة'}
              </button>
            </div>
          )}

          {/* العناصر */}
          {tab === 'items' && (
            <div className="grid md:grid-cols-2 gap-3 stagger">
              {items.length === 0 && (
                <div className="col-span-full glass rounded-3xl p-10 text-center text-gray-400">
                  <div className="text-5xl mb-3">{config.icon}</div>
                  لا عناصر بعد — أضف أول {config.itemName}
                </div>
              )}
              {items.map((it: any) => (
                <div key={it.id} className="glass rounded-3xl p-4 card-hover">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-extrabold">{it.title}</div>
                      <div className="text-xs text-gray-400">
                        {it.type || it.roomType || it.category || it.duration || ''}
                        {it.capacity ? ` • 👥 ${it.capacity}` : ''}
                        {kind === 'rentals' && it.roomsCount ? ` • 🚪 ${it.roomsCount} غرف` : ''}
                        {kind === 'rentals' && it.areaM2 ? ` • 📐 ${it.areaM2} م²` : ''}
                        {kind === 'hotel' && it.beds ? ` • 🛏️ ${it.beds} سرير` : ''}
                        {kind === 'hotel' && it.breakfast ? ' • 🍳 إفطار' : ''}
                        {kind === 'services' && it.durationMin ? ` • ⏱️ ${it.durationMin} د` : ''}
                      </div>
                    </div>
                    <span className="font-black grad-text">
                      {Number(it.pricePerDay || it.pricePerNight || it.price).toLocaleString()} {isym(it.currency)}
                    </span>
                  </div>
                  {(it.features || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {it.features.slice(0, 4).map((f: string) => (
                        <span key={f} className="text-[10px] bg-white/70 px-2 py-0.5 rounded-full font-bold">{f}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">📅 {it._count?.bookings || 0} حجز</span>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(it)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold">✏️</button>
                      <button onClick={() => remove(it.id, it.title)} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-xl text-xs font-bold">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* الحجوزات */}
          {tab === 'bookings' && (
            <div className="space-y-2 stagger">
              {bookings.length === 0 && (
                <div className="glass rounded-3xl p-10 text-center text-gray-400">
                  <div className="text-5xl mb-3">📅</div>
                  لا حجوزات بعد
                </div>
              )}
              {bookings.map((b: any) => {
                const st = STATUS[b.status] || STATUS.pending;
                const title = b.unit?.title || b.room?.title || b.service?.title;
                return (
                  <div key={b.id} className="glass rounded-2xl p-4 card-hover">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-extrabold text-sm">{title}</div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: st.color }}>
                        {st.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>👤 {b.customerName} • 📱 <span dir="ltr">{b.customerPhone}</span></div>
                      {(b.fromDate || b.checkIn) && (
                        <div>📆 {new Date(b.fromDate || b.checkIn).toLocaleDateString('ar-YE')} ← {new Date(b.toDate || b.checkOut).toLocaleDateString('ar-YE')}</div>
                      )}
                      {b.guests && <div>👥 {b.guests} ضيوف</div>}
                      {b.details && <div>📝 {b.details}</div>}
                      <div className="font-black text-sm" style={{ color: 'var(--primary)' }}>
                        💰 {Number(b.total).toLocaleString()} {isym(b.currency)}
                      </div>
                    </div>
                    {/* تغيير الحالة */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(STATUS).map(([k, v]) => (
                        b.status !== k && (
                          <button key={k} onClick={() => setStatus(b.id, k)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/70 hover:bg-white">
                            {v.label}
                          </button>
                        )
                      ))}
                      <a href={`https://wa.me/${b.customerPhone.replace(/[^0-9]/g, '')}`} target="_blank"
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                        💬 واتساب
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
