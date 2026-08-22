'use client';
import { useMemo, useState } from 'react';
import { toast } from '@/components/Toast';
import { fmtN } from './pdfHelper';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, Empty, Field, fmtDate, inp, Stat, todayISO, uid, waLink } from './shared/ui';

// 🏨 مدير حجوزات الغرف — لوحة إشغال واضحة: أي غرفة شاغرة وأيها مشغولة وبمن
interface Room { id: number; no: string; type: string; price: number }
interface Booking { id: number; roomId: number; guest: string; phone: string; in: string; out: string; status: 'active' | 'done' | 'canceled' }
interface Store { rooms: Room[]; bookings: Booking[] }

const ROOM_TYPES = ['🛏️ مفردة', '🛏️🛏️ مزدوجة', '👨‍👩‍👧 عائلية', '👑 جناح', '🏠 شقة'];

export default function RoomsTool() {
  const { data: store, setData: setStore } = useToolDB<Store>('rooms', { rooms: [], bookings: [] }, 'yz-rooms-v1');
  const [no, setNo] = useState('');
  const [rtype, setRtype] = useState(ROOM_TYPES[1]);
  const [price, setPrice] = useState('');
  const [guest, setGuest] = useState('');
  const [phone, setPhone] = useState('');
  const [roomId, setRoomId] = useState(0);
  const [inD, setInD] = useState(todayISO());
  const [outD, setOutD] = useState('');
  const [tab, setTab] = useState<'board' | 'add-room' | 'book'>('board');

  const activeBooking = (roomId: number) => store.bookings.find((b) => b.roomId === roomId && b.status === 'active');

  const addRoom = () => {
    if (!no.trim()) { toast('✍️ أدخل رقم الغرفة', 'error'); return; }
    setStore({ ...store, rooms: [...store.rooms, { id: uid(), no: no.trim(), type: rtype, price: Number(price) || 0 }] });
    setNo(''); setPrice(''); setTab('board');
    toast('🚪 أُضيفت الغرفة');
  };

  const addBooking = () => {
    if (!roomId || !guest.trim()) { toast('✍️ اختر الغرفة وأدخل اسم النزيل', 'error'); return; }
    if (activeBooking(roomId)) { toast('⚠️ هذه الغرفة مشغولة حالياً', 'error'); return; }
    setStore({ ...store, bookings: [{ id: uid(), roomId, guest: guest.trim(), phone: phone.trim(), in: inD, out: outD, status: 'active' }, ...store.bookings] });
    setGuest(''); setPhone(''); setOutD(''); setTab('board');
    toast('🏨 سُجّل الحجز — الغرفة مشغولة الآن');
  };

  const checkout = (b: Booking) => {
    setStore({ ...store, bookings: store.bookings.map((x) => x.id === b.id ? { ...x, status: 'done' as const, out: todayISO() } : x) });
    toast('👋 تم التخريج — الغرفة شاغرة الآن');
  };

  const occupied = store.rooms.filter((r) => activeBooking(r.id)).length;
  const freeRooms = store.rooms.filter((r) => !activeBooking(r.id));
  const todayCheckouts = store.bookings.filter((b) => b.status === 'active' && b.out === todayISO());
  const occupancy = store.rooms.length ? Math.round((occupied / store.rooms.length) * 100) : 0;

  const sortedRooms = useMemo(() => [...store.rooms].sort((a, b) => a.no.localeCompare(b.no, undefined, { numeric: true })), [store.rooms]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="🚪" label="الغرف" value={store.rooms.length} />
        <Stat icon="🔴" label="مشغولة" value={occupied} tone={occupied ? 'text-red-300' : 'text-white'} />
        <Stat icon="📊" label="نسبة الإشغال" value={`${occupancy}٪`} tone="text-lime-300" />
      </div>

      {todayCheckouts.length > 0 && (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3.5">
          <p className="text-xs font-extrabold text-amber-200">🔔 تخريجات متوقعة اليوم: {todayCheckouts.map((b) => store.rooms.find((r) => r.id === b.roomId)?.no).filter(Boolean).join('، ')}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setTab('board')} className={tab === 'board' ? btnP + ' flex-1' : btnS + ' flex-1 !py-2.5'}>🏨 لوحة الغرف</button>
        <button onClick={() => setTab('book')} className={tab === 'book' ? btnP + ' flex-1' : btnS + ' flex-1 !py-2.5'}>➕ حجز</button>
        <button onClick={() => setTab('add-room')} className={tab === 'add-room' ? btnP + ' flex-1' : btnS + ' flex-1 !py-2.5'}>🚪 غرفة</button>
      </div>

      {tab === 'add-room' && (
        <div className={card + ' space-y-3'}>
          <div className="grid grid-cols-3 gap-3">
            <Field label="🚪 رقم الغرفة"><input value={no} onChange={(e) => setNo(e.target.value)} placeholder="101" className={inp} dir="ltr" /></Field>
            <Field label="🛏️ النوع"><select value={rtype} onChange={(e) => setRtype(e.target.value)} className={inp}>{ROOM_TYPES.map((t) => <option key={t} value={t} className="text-gray-900">{t}</option>)}</select></Field>
            <Field label="💰 سعر الليلة"><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className={inp} /></Field>
          </div>
          <button onClick={addRoom} className={btnP + ' w-full'}>🚪 إضافة الغرفة</button>
        </div>
      )}

      {tab === 'book' && (
        <div className={card + ' space-y-3'}>
          <Field label="🚪 الغرفة (الشاغرة فقط)">
            <select value={roomId} onChange={(e) => setRoomId(Number(e.target.value))} className={inp}>
              <option value={0} className="text-gray-900">اختر غرفة...</option>
              {freeRooms.map((r) => <option key={r.id} value={r.id} className="text-gray-900">{r.no} — {r.type} — {fmtN(r.price)}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="👤 اسم النزيل"><input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="محمد علي" className={inp} /></Field>
            <Field label="📱 جواله"><input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="777123456" className={inp} dir="ltr" /></Field>
            <Field label="📅 الدخول"><input type="date" value={inD} onChange={(e) => setInD(e.target.value)} className={inp} dir="ltr" /></Field>
            <Field label="📅 الخروج المتوقع"><input type="date" value={outD} onChange={(e) => setOutD(e.target.value)} className={inp} dir="ltr" /></Field>
          </div>
          <button onClick={addBooking} className={btnP + ' w-full'}>🏨 تسجيل الحجز</button>
        </div>
      )}

      {tab === 'board' && (
        <>
          {store.rooms.length === 0 && <Empty icon="🏨" text="أضف غرفك أولاً من تبويب «غرفة» ثم سجّل الحجوزات" />}
          <div className="grid grid-cols-2 gap-2">
            {sortedRooms.map((r) => {
              const b = activeBooking(r.id);
              return (
                <div key={r.id} className={`rounded-2xl border p-3 ${b ? 'border-red-400/25 bg-red-500/5' : 'border-lime-400/25 bg-lime-500/5'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-lg">{r.no}</span>
                    <span className="text-base">{b ? '🔴' : '🟢'}</span>
                  </div>
                  <p className="text-[10px] text-white/50 font-bold mt-0.5">{r.type} · {fmtN(r.price)}</p>
                  {b ? (
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
                      <p className="text-xs font-extrabold truncate">👤 {b.guest}</p>
                      <p className="text-[10px] text-white/45">دخول {fmtDate(b.in)}{b.out ? ` — خروج ${fmtDate(b.out)}` : ''}</p>
                      <div className="flex gap-1.5">
                        {b.phone && <a href={waLink(b.phone, `السلام عليكم ${b.guest} 🌹`)} target="_blank" rel="noreferrer" className={btnS + ' !px-2 !py-1 !text-[10px]'}>💬</a>}
                        <button onClick={() => checkout(b)} className={btnS + ' !px-2 !py-1 !text-[10px] !bg-lime-600/25 !text-lime-200'}>👋 تخريج</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold text-lime-300 mt-2 pt-2 border-t border-white/10">شاغرة — جاهزة للحجز</p>
                  )}
                </div>
              );
            })}
          </div>

          {store.bookings.filter((b) => b.status === 'done').length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-extrabold text-white/60">🗂️ سجل التخريجات الأخيرة</p>
              {store.bookings.filter((b) => b.status === 'done').slice(0, 8).map((b) => (
                <div key={b.id} className="rounded-xl border border-white/5 bg-white/[.03] p-2.5 flex items-center gap-2 text-xs">
                  <span className="font-black">{store.rooms.find((r) => r.id === b.roomId)?.no || '؟'}</span>
                  <span className="flex-1 truncate text-white/60">{b.guest}</span>
                  <span className="text-white/40">{fmtDate(b.in)} ← {fmtDate(b.out)}</span>
                  <button onClick={() => { setStore({ ...store, bookings: store.bookings.filter((x) => x.id !== b.id) }); toast('🗑️ حُذف السجل'); }} className={btnD}>✕</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
