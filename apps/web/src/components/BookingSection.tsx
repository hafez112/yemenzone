'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { specChips } from '@/lib/activity';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// قسم الحجوزات في واجهة المتجر — للإيجارات والفنادق والخدمات
export default function BookingSection({ store, kind }: { store: any; kind: 'rentals' | 'hotel' | 'services' }) {
  const { list: currencies } = useCurrency();
  const bsym = (code?: string) => currencies.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || 'ر.ي';
  const theme = (store.themeJson as any) || {};
  const primary = theme.primary || '#6C3DF5';
  const secondary = theme.secondary || '#00E5C7';
  const isDark = store.template === 'dark';

  const items = kind === 'rentals' ? store.rentalUnits : kind === 'hotel' ? store.rooms : store.services;
  const [booking, setBooking] = useState<any>(null);
  const [form, setForm] = useState({ customerName: '', customerPhone: '', fromDate: '', toDate: '', guests: 1, details: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<any>(null);

  const CFG = {
    rentals: { title: '🏠 الوحدات المتاحة للإيجار', btn: 'احجز الوحدة', priceLabel: 'يومياً', itemType: 'rental', dateA: 'من تاريخ', dateB: 'إلى تاريخ' },
    hotel:   { title: '🏨 الغرف المتاحة', btn: 'احجز الغرفة', priceLabel: 'لليلة', itemType: 'room', dateA: 'تاريخ الوصول', dateB: 'تاريخ المغادرة' },
    services:{ title: '🛠️ خدماتنا', btn: 'اطلب الخدمة', priceLabel: '', itemType: 'service', dateA: '', dateB: '' },
  }[kind];

  async function submit() {
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      return toast('الاسم ورقم الجوال مطلوبان', 'error');
    }
    if (kind !== 'services' && (!form.fromDate || !form.toDate)) {
      return toast('حدد التواريخ أولاً', 'error');
    }
    setSending(true);
    try {
      const r = await api(`/v1/bookings/${store.slug}`, {
        method: 'POST',
        body: JSON.stringify({ itemType: CFG.itemType, itemId: booking.id, ...form }),
      });
      setDone(r);
      toast('🎉 تم إرسال طلب الحجز');
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  }

  if (!items?.length) return null;

  // سطر المواصفات النشاطية لكل عنصر — يختلف بين إيجار/فندق/خدمة
  const metaLine = (it: any): string => {
    if (kind === 'rentals') {
      return [
        it.type,
        it.roomsCount ? `🚪 ${it.roomsCount} غرف` : '',
        it.areaM2 ? `📐 ${it.areaM2} م²` : '',
        it.address ? `📍 ${it.address}` : '',
      ].filter(Boolean).join(' • ');
    }
    if (kind === 'hotel') {
      return [
        it.roomType,
        it.capacity ? `👥 ${it.capacity}` : '',
        it.beds ? `🛏️ ${it.beds} سرير` : '',
        it.view ? `🏙️ ${it.view}` : '',
        it.breakfast ? '🍳 يشمل الإفطار' : '',
      ].filter(Boolean).join(' • ');
    }
    return [
      it.category,
      it.duration || (it.durationMin ? `⏱️ ${it.durationMin} دقيقة` : ''),
      it.warrantyText ? `🛡️ ${it.warrantyText}` : '',
    ].filter(Boolean).join(' • ');
  };

  return (
    <div id="booking" className="max-w-5xl mx-auto px-3 mt-5 scroll-mt-20"
      style={{ '--tp': primary, '--ts': secondary } as any}>
      <h2 className={`font-black f-xl mb-3 flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
        <span className="w-1.5 h-6 rounded-full" style={{ background: `linear-gradient(180deg, ${primary}, ${secondary})` }} />
        {CFG.title}
      </h2>
      <div className="grid md:grid-cols-2 gap-3 stagger">
        {items.map((it: any) => (
          <div key={it.id}
            className={`rounded-3xl overflow-hidden card-hover card-glow ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-sm'
            }`}>
            <div className="h-44 relative overflow-hidden">
              <div className="zoom-bg absolute inset-0" style={it.images?.[0]
                ? { background: `url(${API}${it.images[0]}) center/cover` }
                : { background: `linear-gradient(135deg, ${primary}15, ${primary}35)` }} />
              {!it.images?.[0] && <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-40">
                {kind === 'rentals' ? '🏠' : kind === 'hotel' ? '🛏️' : '🛠️'}
              </div>}
              {/* 💊 حبة السعر الزجاجية */}
              <span className="price-chip absolute bottom-2.5 right-2.5">
                <b className="price-grad text-sm">{Number(it.pricePerDay || it.pricePerNight || it.price).toLocaleString()} {bsym(it.currency)}</b>
                {CFG.priceLabel && <small className="text-[9px] font-bold text-gray-500">{CFG.priceLabel}</small>}
              </span>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className={`font-extrabold f-base ${isDark ? 'text-white' : ''}`}>{it.title}</div>
                  <div className={`f-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {metaLine(it)}
                  </div>
                </div>
                {kind === 'rentals' && it.pricePerMonth && (
                  <span className="shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-full"
                    style={{ background: `${primary}14`, color: primary }}>
                    {Number(it.pricePerMonth).toLocaleString()} شهرياً
                  </span>
                )}
              </div>
              {/* 💰 التأمين للإيجارات */}
              {kind === 'rentals' && it.deposit && (
                <div className={`text-[11px] mt-1.5 font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                  💰 تأمين مسترد: {Number(it.deposit).toLocaleString()} {bsym(it.currency)}
                </div>
              )}
              {/* 🧬 مواصفات منظمة حسب النشاط */}
              {specChips(it.specs).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {specChips(it.specs).map((s: string) => (
                    <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isDark ? 'bg-white/5 border border-white/10' : ''
                    }`}
                      style={isDark ? {} : { background: `${primary}12`, color: primary }}>{s}</span>
                  ))}
                </div>
              )}
              {(it.features || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {it.features.map((f: string) => (
                    <span key={f} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isDark ? 'bg-white/10' : 'bg-gray-100'
                    }`}>{f}</span>
                  ))}
                </div>
              )}
              {it.description && (
                <p className={`text-xs mt-2 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{it.description}</p>
              )}
              <button onClick={() => { setBooking(it); setDone(null); }}
                className="theme-glow w-full mt-3 py-3 rounded-2xl text-white font-extrabold transition-all hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 55%, ${secondary}))` }}>
                📅 {CFG.btn}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* نافذة الحجز */}
      {booking && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" onClick={() => setBooking(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-5 anim-bounce-in max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            {done ? (
              <div className="text-center py-6">
                <div className="text-6xl mb-4 anim-float">🎉</div>
                <h3 className="font-black text-xl mb-1">تم إرسال طلب حجزك!</h3>
                <p className="text-gray-500 text-sm mb-1">{booking.title}</p>
                <p className="font-black f-xl mb-5 price-grad">
                  الإجمالي: {done.total.toLocaleString()} {bsym(done.booking?.currency || done.currency || booking?.currency)}
                </p>
                {done.storeWhatsapp && (
                  <a href={`https://wa.me/${done.storeWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(done.waText)}`}
                    target="_blank"
                    className="block py-4 rounded-2xl bg-green-500 text-white font-extrabold shadow-xl mb-3 anim-pulse-glow">
                    💬 تأكيد الحجز عبر واتساب
                  </a>
                )}
                <button onClick={() => setBooking(null)} className="text-sm text-gray-400 font-bold">إغلاق</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-lg">📅 {CFG.btn}</h3>
                  <button onClick={() => setBooking(null)} className="w-9 h-9 rounded-full bg-gray-100">✕</button>
                </div>
                <p className="text-sm text-gray-500 mb-3">{booking.title} — <span className="font-black" style={{ color: primary }}>
                  {Number(booking.pricePerDay || booking.pricePerNight || booking.price).toLocaleString()} {bsym(booking.currency)} {CFG.priceLabel}
                </span></p>
                <div className="space-y-3">
                  <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}
                    placeholder="الاسم الكامل *" className="w-full px-4 py-3 rounded-xl border border-gray-200 input-theme" />
                  <input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                    placeholder="رقم الجوال *" dir="ltr" className="w-full px-4 py-3 rounded-xl border border-gray-200 input-theme" />
                  {kind !== 'services' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-gray-400">{CFG.dateA}</label>
                        <input type="date" value={form.fromDate} onChange={e => setForm({ ...form, fromDate: e.target.value })}
                          className="w-full px-3 py-3 rounded-xl border border-gray-200 input-theme" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400">{CFG.dateB}</label>
                        <input type="date" value={form.toDate} onChange={e => setForm({ ...form, toDate: e.target.value })}
                          className="w-full px-3 py-3 rounded-xl border border-gray-200 input-theme" />
                      </div>
                    </div>
                  )}
                  {kind === 'hotel' && (
                    <input type="number" min={1} value={form.guests} onChange={e => setForm({ ...form, guests: Number(e.target.value) })}
                      placeholder="عدد الضيوف" className="w-full px-4 py-3 rounded-xl border border-gray-200 input-theme" />
                  )}
                  <textarea value={form.details} onChange={e => setForm({ ...form, details: e.target.value })}
                    placeholder="ملاحظات إضافية (اختياري)" rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 input-theme" />
                  <button onClick={submit} disabled={sending}
                    className="theme-glow w-full py-4 rounded-2xl text-white font-extrabold disabled:opacity-40"
                    style={{ background: `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 55%, ${secondary}))` }}>
                    {sending ? '⏳ جاري الإرسال...' : '✅ تأكيد الحجز'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
