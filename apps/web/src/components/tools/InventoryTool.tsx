'use client';
import { useMemo, useState } from 'react';
import { toast } from '@/components/Toast';
import { fmtN } from './pdfHelper';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, Empty, Field, inp, Stat, uid } from './shared/ui';

// 📦 إدارة المخزون الذكية — كميات وتنبيهات نفاد وقيمة المخزون
interface Item { id: number; name: string; sku: string; qty: number; min: number; cost: number; price: number }

export default function InventoryTool() {
  const { data: items, setData: setItems } = useToolDB<Item[]>('inventory', [], 'yz-inventory-v1');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState('');
  const [min, setMin] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);

  const add = () => {
    if (!name.trim()) { toast('✍️ أدخل اسم الصنف', 'error'); return; }
    setItems([{ id: uid(), name: name.trim(), sku: sku.trim(), qty: Math.max(0, Number(qty) || 0), min: Math.max(0, Number(min) || 0), cost: Number(cost) || 0, price: Number(price) || 0 }, ...items]);
    setName(''); setSku(''); setQty(''); setMin(''); setCost(''); setPrice(''); setShowForm(false);
    toast('📦 أُضيف الصنف إلى المخزون');
  };

  const bump = (id: number, d: number) => {
    setItems(items.map((it) => it.id === id ? { ...it, qty: Math.max(0, it.qty + d) } : it));
  };

  const low = items.filter((it) => it.min > 0 && it.qty <= it.min);
  const filtered = useMemo(() => {
    const list = q ? items.filter((it) => it.name.includes(q) || it.sku.includes(q)) : [...items];
    return list.sort((a, b) => ((a.min > 0 && a.qty <= a.min) ? 0 : 1) - ((b.min > 0 && b.qty <= b.min) ? 0 : 1));
  }, [items, q]);
  const costValue = items.reduce((s, it) => s + it.qty * it.cost, 0);
  const saleValue = items.reduce((s, it) => s + it.qty * it.price, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="📦" label="الأصناف" value={items.length} />
        <Stat icon="💰" label="قيمة البيع" value={fmtN(saleValue)} tone="text-lime-300" />
        <Stat icon="⚠️" label="تنبيهات نفاد" value={low.length} tone={low.length ? 'text-red-300' : 'text-white'} />
      </div>

      {low.length > 0 && (
        <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-3.5">
          <p className="text-xs font-extrabold text-red-200 mb-1.5">⚠️ أصناف على وشك النفاد — أعد طلبها:</p>
          <div className="flex flex-wrap gap-1.5">
            {low.map((it) => (
              <span key={it.id} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-200">{it.name} ({it.qty})</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ابحث بالاسم أو الكود..." className={inp} />
        <button onClick={() => setShowForm(!showForm)} className={btnP + ' shrink-0'}>{showForm ? '✕' : '➕ صنف'}</button>
      </div>

      {showForm && (
        <div className={card + ' space-y-3'}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="📦 اسم الصنف"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: ساعة ذكية X9" className={inp} /></Field></div>
            <Field label="🔖 الكود (اختياري)"><input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-001" className={inp} dir="ltr" /></Field>
            <Field label="🔢 الكمية الحالية"><input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" className={inp} /></Field>
            <Field label="⚠️ حد التنبيه"><input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/[^0-9]/g, ''))} placeholder="5" className={inp} /></Field>
            <Field label="💵 سعر التكلفة"><input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className={inp} /></Field>
            <Field label="💰 سعر البيع"><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className={inp} /></Field>
          </div>
          <button onClick={add} className={btnP + ' w-full'}>📥 إضافة إلى المخزون</button>
        </div>
      )}

      {filtered.length === 0 && <Empty icon="📦" text={items.length ? 'لا نتائج مطابقة للبحث' : 'مخزونك فارغ — أضف أول صنف وابدأ التتبع'} />}

      <div className="space-y-2">
        {filtered.map((it) => {
          const isLow = it.min > 0 && it.qty <= it.min;
          return (
            <div key={it.id} className={`rounded-2xl border p-3.5 ${isLow ? 'border-red-400/30 bg-red-500/5' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold text-sm truncate">{it.name} {isLow && <span className="text-red-300 text-[10px]">⚠️ ناقص</span>}</p>
                  <p className="text-[11px] text-white/45 mt-0.5">
                    {it.sku && <span dir="ltr">{it.sku} · </span>}تكلفة {fmtN(it.cost)} · بيع {fmtN(it.price)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => bump(it.id, -1)} className={btnS + ' !px-2.5'}>−</button>
                  <span className={`w-10 text-center font-black text-lg ${isLow ? 'text-red-300' : 'text-lime-300'}`}>{it.qty}</span>
                  <button onClick={() => bump(it.id, 1)} className={btnS + ' !px-2.5'}>+</button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <span className="text-[10px] text-white/40">حد التنبيه: {it.min || '—'} · قيمة المخزون: {fmtN(it.qty * it.cost)}</span>
                <button onClick={() => { setItems(items.filter((x) => x.id !== it.id)); toast('🗑️ حُذف الصنف'); }} className={btnD}>حذف</button>
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 0 && (
        <p className="text-center text-[11px] text-white/40">💵 إجمالي التكلفة: {fmtN(costValue)} · 💰 إجمالي البيع: {fmtN(saleValue)} · 📈 ربح متوقع: {fmtN(saleValue - costValue)}</p>
      )}
    </div>
  );
}
