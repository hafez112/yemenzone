'use client';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, Empty, Field, fmtDate, inp, Stat, uid } from './shared/ui';

// 🎯 منشئ الكوبونات والعروض — أكواد خصم تتبع استخدامها وانتهائها
interface Coupon { id: number; code: string; type: 'pct' | 'fixed'; value: number; maxUses: number; used: number; expiry: string; active: boolean }

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

export default function CouponsTool() {
  const { data: coupons, setData: setCoupons } = useToolDB<Coupon[]>('coupons', [], 'yz-coupons-v1');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'pct' | 'fixed'>('pct');
  const [value, setValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiry, setExpiry] = useState('');
  const [showForm, setShowForm] = useState(false);

  const isExpired = (c: Coupon) => c.expiry && new Date(c.expiry) < new Date(new Date().toDateString());
  const isLive = (c: Coupon) => c.active && !isExpired(c) && (!c.maxUses || c.used < c.maxUses);

  const add = () => {
    const c = (code.trim() || genCode()).toUpperCase();
    if (!(Number(value) > 0)) { toast('✍️ أدخل قيمة الخصم', 'error'); return; }
    if (coupons.some((x) => x.code === c)) { toast('⚠️ هذا الكود موجود مسبقاً', 'error'); return; }
    if (type === 'pct' && Number(value) > 100) { toast('⚠️ النسبة لا تتجاوز 100%', 'error'); return; }
    setCoupons([{ id: uid(), code: c, type, value: Number(value), maxUses: Number(maxUses) || 0, used: 0, expiry, active: true }, ...coupons]);
    setCode(''); setValue(''); setMaxUses(''); setExpiry(''); setShowForm(false);
    toast('🎯 أُنشئ الكوبون — شاركه مع زبائنك');
  };

  const live = coupons.filter(isLive);
  const totalUsed = coupons.reduce((s, c) => s + c.used, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="🎯" label="كوبونات" value={coupons.length} />
        <Stat icon="✅" label="سارية الآن" value={live.length} tone="text-lime-300" />
        <Stat icon="🧾" label="مرات الاستخدام" value={totalUsed} tone="text-amber-300" />
      </div>

      <button onClick={() => setShowForm(!showForm)} className={btnP + ' w-full'}>{showForm ? '✕ إغلاق' : '➕ كوبون جديد'}</button>

      {showForm && (
        <div className={card + ' space-y-3'}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="🔖 الكود">
              <div className="flex gap-1.5">
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))} placeholder="SALE20" className={inp} dir="ltr" />
                <button type="button" onClick={() => setCode(genCode())} className={btnS + ' shrink-0'}>🎲</button>
              </div>
            </Field>
            <Field label="💰 قيمة الخصم">
              <div className="flex gap-1.5">
                <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="20" className={inp} />
                <button type="button" onClick={() => setType(type === 'pct' ? 'fixed' : 'pct')} className={btnS + ' shrink-0 min-w-11'}>{type === 'pct' ? '٪' : '💵'}</button>
              </div>
            </Field>
            <Field label="🔢 حد الاستخدام (فارغ = بلا حد)"><input inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ''))} placeholder="100" className={inp} /></Field>
            <Field label="📅 ينتهي في (اختياري)"><input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inp} dir="ltr" /></Field>
          </div>
          <button onClick={add} className={btnP + ' w-full'}>🎯 إنشاء الكوبون</button>
        </div>
      )}

      {coupons.length === 0 && <Empty icon="🎯" text="لا كوبونات بعد — أنشئ أول كود خصم وحرّك مبيعاتك" />}

      <div className="space-y-2">
        {coupons.map((c) => {
          const expired = isExpired(c);
          const exhausted = c.maxUses > 0 && c.used >= c.maxUses;
          return (
            <div key={c.id} className={`rounded-2xl border p-3.5 ${isLive(c) ? 'border-lime-400/25 bg-lime-500/5' : 'border-white/10 bg-white/[.03] opacity-70'}`}>
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => { navigator.clipboard.writeText(c.code).then(() => toast('📋 نُسخ الكود')); }}
                  className="font-black text-lg tracking-widest text-lime-300 bg-white/5 border border-dashed border-lime-400/40 rounded-xl px-3 py-1" dir="ltr">
                  {c.code}
                </button>
                <span className="text-sm font-black">{c.type === 'pct' ? `خصم ${c.value}٪` : `خصم ${c.value}`}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-white/45 mt-2">
                <span>🧾 استُخدم {c.used}{c.maxUses ? `/${c.maxUses}` : ''} مرة</span>
                {c.expiry && <span className={expired ? 'text-red-300' : ''}>📅 {expired ? 'انتهى' : 'حتى'} {fmtDate(c.expiry)}</span>}
                {exhausted && <span className="text-red-300">⛔ استُنفد</span>}
                {!c.active && <span className="text-amber-300">⏸️ موقوف</span>}
              </div>
              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                <button onClick={() => { setCoupons(coupons.map((x) => x.id === c.id ? { ...x, used: x.used + 1 } : x)); toast('🧾 سُجّل استخدام'); }} className={btnS}>➕ تسجيل استخدام</button>
                <button onClick={() => { setCoupons(coupons.map((x) => x.id === c.id ? { ...x, active: !x.active } : x)); toast(c.active ? '⏸️ أُوقف الكوبون' : '▶️ فُعّل الكوبون'); }} className={btnS}>{c.active ? '⏸️ إيقاف' : '▶️ تفعيل'}</button>
                <span className="flex-1" />
                <button onClick={() => { setCoupons(coupons.filter((x) => x.id !== c.id)); toast('🗑️ حُذف الكوبون'); }} className={btnD}>حذف</button>
              </div>
            </div>
          );
        })}
      </div>

      {live.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <p className="text-[11px] text-white/55 leading-relaxed">💡 <b>رسالة مشاركة جاهزة:</b> «🎉 خصم خاص لزبائننا! استخدم كود <b>{live[0].code}</b> واحصل على خصم {live[0].type === 'pct' ? `${live[0].value}٪` : live[0].value} فوراً» — اضغط الكود لنسخه والصقه في حالتك</p>
        </div>
      )}
    </div>
  );
}
