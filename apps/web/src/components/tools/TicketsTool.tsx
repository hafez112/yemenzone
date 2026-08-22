'use client';
import { useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { elementToPdf } from './pdfHelper';
import { shareCreate, shareUpdate } from '@/lib/tool-db';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, copyText, Empty, Field, inp, QrView, Stat, uid, waIntl } from './shared/ui';

// 🎫 تذاكر الفعاليات بـ QR — صفحة فعالية عامة + تذاكر مرقمة + بوابة فحص دخول
interface Ticket { code: string; buyer: string; phone: string; used: boolean }
interface Store {
  name: string; date: string; place: string; price: number; whatsapp: string; slug: string;
  tickets: Ticket[];
}

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
const genCode = () => 'YZ-' + Math.random().toString(36).slice(2, 8).toUpperCase();

export default function TicketsTool() {
  const { data: store, setData: setStore } = useToolDB<Store>('tickets', { name: '', date: '', place: '', price: 0, whatsapp: '', slug: '', tickets: [] }, 'yz-tickets-v1');
  const [buyer, setBuyer] = useState('');
  const [phone, setPhone] = useState('');
  const [checkCode, setCheckCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastTicket, setLastTicket] = useState<Ticket | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const link = store.slug ? `${SITE()}/s/${store.slug}` : '';
  const sold = store.tickets.length;
  const checkedIn = store.tickets.filter((t) => t.used).length;

  const publish = async () => {
    if (!store.name.trim() || !store.date) { toast('✍️ أدخل اسم الفعالية وتاريخها', 'error'); return; }
    setBusy(true);
    const payload = { name: store.name, date: store.date, place: store.place, price: store.price, whatsapp: waIntl(store.whatsapp) };
    try {
      if (store.slug) {
        await shareUpdate(store.slug, store.name, payload);
        toast('🔄 حُدّثت صفحة الفعالية');
      } else {
        const r = await shareCreate('ticket', store.name, payload);
        setStore({ ...store, slug: r.slug });
        toast('🎉 نُشرت صفحة الفعالية — شارك رابطها');
      }
    } catch (e: any) { toast(e.message || 'تعذّر النشر', 'error'); }
    setBusy(false);
  };

  const issue = () => {
    if (!buyer.trim()) { toast('✍️ أدخل اسم المشتري', 'error'); return; }
    const t: Ticket = { code: genCode(), buyer: buyer.trim(), phone: phone.trim(), used: false };
    setStore({ ...store, tickets: [t, ...store.tickets] });
    setLastTicket(t);
    setBuyer(''); setPhone('');
    toast(`🎫 صدرت التذكرة ${t.code} — اطبعها أو أرسلها`);
  };

  const checkIn = () => {
    const code = checkCode.trim().toUpperCase();
    if (!code) return;
    const t = store.tickets.find((x) => x.code === code);
    if (!t) { toast('⛔ كود غير صالح — لا تذكرة بهذا الرقم', 'error'); return; }
    if (t.used) { toast(`⚠️ تذكرة ${t.buyer} استُخدمت مسبقاً!`, 'error'); return; }
    setStore({ ...store, tickets: store.tickets.map((x) => x.code === code ? { ...x, used: true } : x) });
    setCheckCode('');
    toast(`✅ دخول مسموح — أهلاً ${t.buyer} 🎉`);
  };

  const downloadTicket = async () => {
    if (!lastTicket || !pdfRef.current) return;
    toast('⏳ جاري تجهيز التذكرة...');
    try { await elementToPdf(pdfRef.current, `تذكرة-${lastTicket.code}.pdf`); toast('📄 نُزّلت التذكرة PDF'); }
    catch { toast('تعذّر إنشاء PDF', 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="🎫" label="تذاكر مباعة" value={sold} />
        <Stat icon="✅" label="دخلوا" value={checkedIn} tone="text-lime-300" />
        <Stat icon="⏳" label="لم يحضروا" value={sold - checkedIn} tone="text-amber-300" />
      </div>

      {/* 🎪 بيانات الفعالية */}
      <div className={card + ' space-y-3'}>
        <p className="text-sm font-extrabold">🎪 بيانات الفعالية</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Field label="🎪 اسم الفعالية"><input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} placeholder="دورة التجارة الإلكترونية / حفل التخرج..." className={inp} /></Field></div>
          <Field label="📅 التاريخ والوقت"><input type="datetime-local" value={store.date} onChange={(e) => setStore({ ...store, date: e.target.value })} className={inp} dir="ltr" /></Field>
          <Field label="📍 المكان"><input value={store.place} onChange={(e) => setStore({ ...store, place: e.target.value })} placeholder="قاعة الماسة — صنعاء" className={inp} /></Field>
          <Field label="💰 سعر التذكرة"><input inputMode="decimal" value={store.price || ''} onChange={(e) => setStore({ ...store, price: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 })} placeholder="0 = مجانية" className={inp} /></Field>
          <Field label="📱 واتساب الحجز"><input inputMode="tel" value={store.whatsapp} onChange={(e) => setStore({ ...store, whatsapp: e.target.value.replace(/[^0-9+]/g, '') })} placeholder="777123456" className={inp} dir="ltr" /></Field>
        </div>
        <button onClick={publish} disabled={busy} className={btnP + ' w-full'}>{busy ? '⏳...' : store.slug ? '🔄 تحديث صفحة الفعالية' : '🚀 نشر صفحة الفعالية'}</button>
        {link && (
          <div className="flex gap-2 pt-1">
            <input readOnly value={link} className={inp + ' text-center text-xs'} dir="ltr" onClick={(e) => (e.target as HTMLInputElement).select()} />
            <button onClick={() => copyText(link).then(() => toast('📋 نُسخ رابط الفعالية'))} className={btnS + ' shrink-0'}>📋</button>
            <a href={link} target="_blank" rel="noreferrer" className={btnS + ' shrink-0'}>👁️</a>
          </div>
        )}
      </div>

      {/* 🎫 إصدار تذكرة */}
      <div className={card + ' space-y-3'}>
        <p className="text-sm font-extrabold">🎫 إصدار تذكرة (عند استلام قيمتها)</p>
        <div className="flex gap-2">
          <input value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="اسم المشتري" className={inp} />
          <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="جواله" className={inp + ' !w-32'} dir="ltr" />
          <button onClick={issue} className={btnP + ' shrink-0'}>إصدار</button>
        </div>
        {lastTicket && (
          <div className="space-y-3 pt-2">
            <div ref={pdfRef} dir="rtl" className="bg-white text-gray-900 rounded-2xl p-5 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-black text-base text-stone-800">{store.name || 'فعالية'}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{store.place} · {store.date ? new Date(store.date).toLocaleString('ar-YE') : ''}</p>
                <p className="text-sm font-bold mt-2">👤 {lastTicket.buyer}</p>
                <p className="text-lg font-black tracking-widest text-emerald-700 mt-1" dir="ltr">{lastTicket.code}</p>
                <p className="text-[9px] text-gray-400 mt-1">منصة يمن زون ⚡ — تُستخدم مرة واحدة فقط</p>
              </div>
              <QrView data={lastTicket.code} size={90} color="#065f46" />
            </div>
            <div className="flex gap-2">
              <button onClick={downloadTicket} className={btnP + ' flex-1'}>📄 تنزيل التذكرة PDF</button>
              {lastTicket.phone && (
                <a href={`https://wa.me/${waIntl(lastTicket.phone)}?text=${encodeURIComponent(`🎫 تذكرتك لفعالية: ${store.name}\nالكود: ${lastTicket.code}\n📍 ${store.place}\nاحتفظ بالكود — يُطلب عند الدخول`)}`} target="_blank" rel="noreferrer" className={btnS + ' flex-1 text-center !bg-green-600/25 !text-green-200'}>💬 إرسال واتساب</a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🛂 بوابة الفحص */}
      <div className="rounded-3xl border border-lime-400/25 bg-lime-500/5 p-4 space-y-3">
        <p className="text-sm font-extrabold text-lime-200">🛂 بوابة فحص الدخول — يوم الفعالية</p>
        <div className="flex gap-2">
          <input value={checkCode} onChange={(e) => setCheckCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && checkIn()} placeholder="أدخل كود التذكرة YZ-XXXX" className={inp + ' text-center font-black tracking-widest'} dir="ltr" />
          <button onClick={checkIn} className={btnP + ' shrink-0'}>فحص ✓</button>
        </div>
        <p className="text-[10px] text-white/40">كل تذكرة تدخل مرة واحدة فقط — المحاولة الثانية تُرفض وتُنبّهك</p>
      </div>

      {store.tickets.length === 0 && <Empty icon="🎫" text="لا تذاكر بعد — انشر الفعالية وأصدر أول تذكرة" />}

      {store.tickets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-white/60">🗂️ التذاكر المصدرة</p>
          {store.tickets.slice(0, 20).map((t) => (
            <div key={t.code} className={`rounded-xl border p-2.5 flex items-center gap-2 text-xs ${t.used ? 'border-lime-400/20 bg-lime-500/5' : 'border-white/10 bg-white/5'}`}>
              <span className="font-black tracking-wider" dir="ltr">{t.code}</span>
              <span className="flex-1 truncate text-white/60">{t.buyer}</span>
              <span className={t.used ? 'text-lime-300' : 'text-amber-300'}>{t.used ? '✅ دخل' : '⏳'}</span>
              <button onClick={() => { setStore({ ...store, tickets: store.tickets.filter((x) => x.code !== t.code) }); toast('🗑️ حُذفت التذكرة'); }} className={btnD}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
