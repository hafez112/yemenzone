'use client';
import { useMemo, useState } from 'react';
import { toast } from '@/components/Toast';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, Empty, Field, fmtDate, inp, Stat, todayISO, uid, waLink } from './shared/ui';

// ⏰ حجوزات ومواعيد الخدمات — جدولك اليومي وتذكير الزبون برسالة جاهزة
interface Appt { id: number; client: string; phone: string; service: string; date: string; time: string; status: 'pending' | 'done' | 'canceled' }

export default function AppointmentsTool() {
  const { data: appts, setData: setAppts } = useToolDB<Appt[]>('appointments', [], 'yz-appointments-v1');
  const [client, setClient] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('');
  const [showForm, setShowForm] = useState(false);

  const add = () => {
    if (!client.trim() || !date) { toast('✍️ أدخل اسم العميل والتاريخ', 'error'); return; }
    setAppts([...appts, { id: uid(), client: client.trim(), phone: phone.trim(), service: service.trim(), date, time, status: 'pending' }]);
    setClient(''); setPhone(''); setService(''); setTime(''); setShowForm(false);
    toast('⏰ حُجز الموعد — ستجده في جدولك');
  };

  const setStatus = (id: number, status: Appt['status']) => {
    setAppts(appts.map((a) => a.id === id ? { ...a, status } : a));
    toast(status === 'done' ? '✅ أُنجز الموعد' : '🚫 أُلغي الموعد');
  };

  const pending = useMemo(() => appts.filter((a) => a.status === 'pending').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)), [appts]);
  const today = pending.filter((a) => a.date === todayISO());
  const upcoming = pending.filter((a) => a.date > todayISO());
  const overdue = pending.filter((a) => a.date < todayISO());
  const doneCount = appts.filter((a) => a.status === 'done').length;

  const Row = ({ a }: { a: Appt }) => (
    <div className={`rounded-2xl border p-3.5 ${a.date === todayISO() ? 'border-lime-400/30 bg-lime-500/5' : a.date < todayISO() ? 'border-red-400/25 bg-red-500/5' : 'border-white/10 bg-white/5'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-extrabold text-sm truncate">👤 {a.client} {a.service && <span className="text-white/40 font-bold">· {a.service}</span>}</p>
          <p className="text-[11px] text-white/45 mt-0.5">📅 {fmtDate(a.date)} {a.time && <span dir="ltr">· 🕐 {a.time}</span>}</p>
        </div>
        {a.date === todayISO() && <span className="text-[10px] font-black px-2 py-1 rounded-full bg-lime-500/20 text-lime-200 shrink-0">اليوم</span>}
        {a.date < todayISO() && <span className="text-[10px] font-black px-2 py-1 rounded-full bg-red-500/20 text-red-200 shrink-0">فائت</span>}
      </div>
      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5 flex-wrap">
        <button onClick={() => setStatus(a.id, 'done')} className={btnS + ' !bg-lime-600/25 !text-lime-200'}>✅ تم</button>
        {a.phone && (
          <a href={waLink(a.phone, `السلام عليكم ${a.client} 🌹\nتذكير بموعدك: ${a.service || 'الخدمة المطلوبة'}\n📅 ${fmtDate(a.date)}${a.time ? ` — 🕐 ${a.time}` : ''}\nننتظرك 🌹`)} target="_blank" rel="noreferrer" className={btnS + ' !bg-green-600/25 !text-green-200'}>💬 تذكير</a>
        )}
        <button onClick={() => setStatus(a.id, 'canceled')} className={btnS}>إلغاء</button>
        <span className="flex-1" />
        <button onClick={() => { setAppts(appts.filter((x) => x.id !== a.id)); toast('🗑️ حُذف الموعد'); }} className={btnD}>حذف</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="📅" label="مواعيد اليوم" value={today.length} tone={today.length ? 'text-lime-300' : 'text-white'} />
        <Stat icon="⏳" label="قادمة" value={upcoming.length} tone="text-sky-300" />
        <Stat icon="✅" label="أُنجزت" value={doneCount} />
      </div>

      <button onClick={() => setShowForm(!showForm)} className={btnP + ' w-full'}>{showForm ? '✕ إغلاق' : '➕ حجز موعد جديد'}</button>

      {showForm && (
        <div className={card + ' space-y-3'}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="👤 اسم العميل"><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="أحمد" className={inp} /></Field>
            <Field label="📱 جواله"><input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="777123456" className={inp} dir="ltr" /></Field>
            <div className="col-span-2"><Field label="🛠️ الخدمة"><input value={service} onChange={(e) => setService(e.target.value)} placeholder="حلاقة / صيانة جوال / كشف..." className={inp} /></Field></div>
            <Field label="📅 التاريخ"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} dir="ltr" /></Field>
            <Field label="🕐 الوقت"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inp} dir="ltr" /></Field>
          </div>
          <button onClick={add} className={btnP + ' w-full'}>⏰ حجز الموعد</button>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-red-300">⚠️ مواعيد فائتة بحاجة لمعالجة ({overdue.length})</p>
          {overdue.map((a) => <Row key={a.id} a={a} />)}
        </div>
      )}

      {today.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-lime-300">📅 جدول اليوم ({today.length})</p>
          {today.map((a) => <Row key={a.id} a={a} />)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-white/60">⏳ المواعيد القادمة ({upcoming.length})</p>
          {upcoming.map((a) => <Row key={a.id} a={a} />)}
        </div>
      )}

      {pending.length === 0 && <Empty icon="⏰" text="لا مواعيد قادمة — احجز أول موعد ونظّم يومك" />}
    </div>
  );
}
