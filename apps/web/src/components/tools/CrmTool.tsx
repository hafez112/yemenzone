'use client';
import { useMemo, useState } from 'react';
import { toast } from '@/components/Toast';
import { fmtN } from './pdfHelper';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, Empty, Field, fmtDate, inp, Stat, uid, waLink } from './shared/ui';

// 👥 سجل العملاء — ملف لكل زبون: جواله وملاحظاته وتعاملاته ومراسلته بضغطة
interface Customer { id: number; name: string; phone: string; note: string; total: number; lastAt: string }

export default function CrmTool() {
  const { data: customers, setData: setCustomers } = useToolDB<Customer[]>('crm', [], 'yz-crm-v1');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [total, setTotal] = useState('');
  const [q, setQ] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const reset = () => { setName(''); setPhone(''); setNote(''); setTotal(''); setEditId(null); setShowForm(false); };

  const save = () => {
    if (!name.trim()) { toast('✍️ أدخل اسم العميل', 'error'); return; }
    if (editId) {
      setCustomers(customers.map((c) => c.id === editId ? { ...c, name: name.trim(), phone: phone.trim(), note: note.trim(), total: Number(total) || 0, lastAt: new Date().toISOString() } : c));
      toast('✏️ حُدّثت بيانات العميل');
    } else {
      setCustomers([{ id: uid(), name: name.trim(), phone: phone.trim(), note: note.trim(), total: Number(total) || 0, lastAt: new Date().toISOString() }, ...customers]);
      toast('👥 أُضيف العميل إلى سجلك');
    }
    reset();
  };

  const edit = (c: Customer) => {
    setEditId(c.id); setName(c.name); setPhone(c.phone); setNote(c.note); setTotal(c.total ? String(c.total) : '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtered = useMemo(() => {
    const list = q ? customers.filter((c) => c.name.includes(q) || c.phone.includes(q)) : [...customers];
    return list.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [customers, q]);

  const totalSales = customers.reduce((s, c) => s + c.total, 0);
  const withPhone = customers.filter((c) => c.phone).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="👥" label="عملائي" value={customers.length} />
        <Stat icon="💰" label="إجمالي تعاملاتهم" value={fmtN(totalSales)} tone="text-lime-300" />
        <Stat icon="📱" label="أرقام محفوظة" value={withPhone} />
      </div>

      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ابحث بالاسم أو الجوال..." className={inp} />
        <button onClick={() => { reset(); setShowForm(!showForm); }} className={btnP + ' shrink-0'}>{showForm ? '✕' : '➕ عميل'}</button>
      </div>

      {showForm && (
        <div className={card + ' space-y-3'}>
          <p className="text-sm font-extrabold">{editId ? '✏️ تعديل بيانات العميل' : '➕ عميل جديد'}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="👤 الاسم"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="أحمد محمد" className={inp} /></Field>
            <Field label="📱 الجوال"><input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="777123456" className={inp} dir="ltr" /></Field>
            <Field label="💰 إجمالي مشترياته"><input inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className={inp} /></Field>
            <Field label="📝 ملاحظة"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="زبون جملة — يفضل التواصل مساءً" className={inp} /></Field>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className={btnP + ' flex-1'}>{editId ? '💾 حفظ التعديل' : '📥 إضافة العميل'}</button>
            {editId && <button onClick={reset} className={btnS}>إلغاء</button>}
          </div>
        </div>
      )}

      {filtered.length === 0 && <Empty icon="👥" text={customers.length ? 'لا نتائج مطابقة' : 'سجلك فارغ — أضف عملاءك وابنِ علاقة دائمة معهم'} />}

      <div className="space-y-2">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-extrabold text-sm truncate">👤 {c.name}</p>
                <p className="text-[11px] text-white/45 mt-0.5" dir="ltr">{c.phone || '—'}</p>
              </div>
              {c.total > 0 && <span className="text-xs font-black text-lime-300 shrink-0">{fmtN(c.total)}</span>}
            </div>
            {c.note && <p className="text-[11px] text-white/55 mt-1.5 leading-relaxed">📝 {c.note}</p>}
            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5">
              {c.phone && (
                <a href={waLink(c.phone, `السلام عليكم ${c.name} 🌹`)} target="_blank" rel="noreferrer" className={btnS + ' !bg-green-600/25 !text-green-200'}>💬 واتساب</a>
              )}
              {c.phone && <a href={`tel:${c.phone}`} className={btnS}>📞 اتصال</a>}
              <button onClick={() => edit(c)} className={btnS}>✏️ تعديل</button>
              <span className="flex-1" />
              <span className="text-[10px] text-white/35">{fmtDate(c.lastAt)}</span>
              <button onClick={() => { setCustomers(customers.filter((x) => x.id !== c.id)); toast('🗑️ حُذف العميل'); }} className={btnD}>حذف</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
