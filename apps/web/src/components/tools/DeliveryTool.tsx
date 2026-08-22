'use client';
import { useMemo, useState } from 'react';
import { toast } from '@/components/Toast';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, Chips, Empty, Field, fmtDate, inp, Stat, uid, waLink } from './shared/ui';

// 🚚 متتبع الطلبات والتوصيل — كل طلب بحالته ورسالة جاهزة للزبون عند كل مرحلة
type Status = 'new' | 'preparing' | 'shipped' | 'delivered' | 'canceled';
interface Order { id: number; customer: string; phone: string; address: string; item: string; status: Status; date: string }

const STAGES: { id: Status; label: string; icon: string; msg: string }[] = [
  { id: 'new', label: 'جديد', icon: '🆕', msg: 'استلمنا طلبك وسنجهزه فوراً' },
  { id: 'preparing', label: 'قيد التجهيز', icon: '📦', msg: 'طلبك قيد التجهيز الآن' },
  { id: 'shipped', label: 'خرج للتوصيل', icon: '🛵', msg: 'طلبك خرج مع المندوب وهو في الطريق إليك' },
  { id: 'delivered', label: 'تم التسليم', icon: '✅', msg: 'تم تسليم طلبك — شكراً لثقتك 🌹' },
  { id: 'canceled', label: 'ملغي', icon: '🚫', msg: '' },
];
const stageOf = (s: Status) => STAGES.find((x) => x.id === s)!;
const NEXT: Record<Status, Status | null> = { new: 'preparing', preparing: 'shipped', shipped: 'delivered', delivered: null, canceled: null };

export default function DeliveryTool() {
  const { data: orders, setData: setOrders } = useToolDB<Order[]>('delivery', [], 'yz-delivery-v1');
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [item, setItem] = useState('');
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [showForm, setShowForm] = useState(false);

  const add = () => {
    if (!customer.trim() || !item.trim()) { toast('✍️ أدخل اسم الزبون والطلب', 'error'); return; }
    setOrders([{ id: uid(), customer: customer.trim(), phone: phone.trim(), address: address.trim(), item: item.trim(), status: 'new', date: new Date().toISOString() }, ...orders]);
    setCustomer(''); setPhone(''); setAddress(''); setItem(''); setShowForm(false);
    toast('🚚 سُجّل الطلب — حرّكه عبر المراحل');
  };

  const advance = (o: Order) => {
    const next = NEXT[o.status];
    if (!next) return;
    setOrders(orders.map((x) => x.id === o.id ? { ...x, status: next } : x));
    toast(`${stageOf(next).icon} ${o.customer}: ${stageOf(next).label}`);
  };

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of orders) m[o.status] = (m[o.status] || 0) + 1;
    return m;
  }, [orders]);

  const active = (counts.new || 0) + (counts.preparing || 0) + (counts.shipped || 0);
  const filtered = orders.filter((o) => filter === 'all' || o.status === filter);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="🔥" label="طلبات نشطة" value={active} tone={active ? 'text-amber-300' : 'text-white'} />
        <Stat icon="🛵" label="في الطريق" value={counts.shipped || 0} tone="text-sky-300" />
        <Stat icon="✅" label="سُلّمت" value={counts.delivered || 0} tone="text-lime-300" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1 overflow-x-auto">
          <Chips options={[{ id: 'all' as any, label: `الكل (${orders.length})` }, ...STAGES.map((s) => ({ id: s.id as any, label: `${s.icon} ${counts[s.id] || 0}` }))]} value={filter} onChange={(v) => setFilter(v as any)} />
        </div>
        <button onClick={() => setShowForm(!showForm)} className={btnP + ' shrink-0'}>{showForm ? '✕' : '➕'}</button>
      </div>

      {showForm && (
        <div className={card + ' space-y-3'}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="👤 اسم الزبون"><input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="أحمد" className={inp} /></Field>
            <Field label="📱 جواله"><input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="777123456" className={inp} dir="ltr" /></Field>
            <div className="col-span-2"><Field label="📦 الطلب"><input value={item} onChange={(e) => setItem(e.target.value)} placeholder="ساعة ذكية ×1 + شاحن" className={inp} /></Field></div>
            <div className="col-span-2"><Field label="📍 العنوان"><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="صنعاء — شارع حدة" className={inp} /></Field></div>
          </div>
          <button onClick={add} className={btnP + ' w-full'}>📥 تسجيل الطلب</button>
        </div>
      )}

      {filtered.length === 0 && <Empty icon="🚚" text={orders.length ? 'لا طلبات في هذه الحالة' : 'لا طلبات بعد — سجّل أول طلب توصيل'} />}

      <div className="space-y-2">
        {filtered.map((o) => {
          const st = stageOf(o.status);
          const next = NEXT[o.status];
          return (
            <div key={o.id} className={`rounded-2xl border p-3.5 ${o.status === 'delivered' ? 'border-lime-400/20 bg-lime-500/5' : o.status === 'canceled' ? 'border-white/5 bg-white/[.02] opacity-60' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold text-sm truncate">{o.customer} <span className="text-white/40 font-bold">· {o.item}</span></p>
                  <p className="text-[11px] text-white/45 mt-0.5">{o.address || '—'} · {fmtDate(o.date)}</p>
                </div>
                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-white/10 shrink-0">{st.icon} {st.label}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5 flex-wrap">
                {next && <button onClick={() => advance(o)} className={btnS + ' !bg-lime-600/25 !text-lime-200'}>{stageOf(next).icon} نقل إلى «{stageOf(next).label}»</button>}
                {o.phone && st.msg && (
                  <a href={waLink(o.phone, `السلام عليكم ${o.customer} 🌹\nبخصوص طلبك: ${o.item}\n${st.msg}`)} target="_blank" rel="noreferrer" className={btnS + ' !bg-green-600/25 !text-green-200'}>💬 إشعار الزبون</a>
                )}
                {o.status !== 'delivered' && o.status !== 'canceled' && (
                  <button onClick={() => { setOrders(orders.map((x) => x.id === o.id ? { ...x, status: 'canceled' as Status } : x)); toast('🚫 أُلغي الطلب'); }} className={btnS}>إلغاء</button>
                )}
                <span className="flex-1" />
                <button onClick={() => { setOrders(orders.filter((x) => x.id !== o.id)); toast('🗑️ حُذف الطلب'); }} className={btnD}>حذف</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
