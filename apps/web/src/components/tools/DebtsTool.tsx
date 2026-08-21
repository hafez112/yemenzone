'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { fmtN } from './pdfHelper';
import { loadToolData, saveToolData, sessionType } from '@/lib/tool-db';

interface Entry { id: number; who: string; phone: string; amount: number; kind: 'debt' | 'pay'; note: string; date: string }
const KEY = 'yz-debts-v1';

// 📓 دفتر الديون الرقمي — يعمل بدون إنترنت، بياناته محفوظة في جهازك
export default function DebtsTool() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [who, setWho] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<'debt' | 'pay'>('debt');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');

  // 🗄️ قاعدة بيانات الدفتر الخاصة بالمستخدم — تُزامن مع حسابه عند تسجيل الدخول
  const cloudOn = useRef(false);
  const saveTimer = useRef<any>(null);

  useEffect(() => {
    let local: Entry[] = [];
    try { local = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch {}
    if (sessionType()) {
      // مسجل دخول: قاعدة بيانات الخدمة في الحساب هي المرجع، وتندمج معها النسخة المحلية
      loadToolData<Entry[]>('debts').then((cloud) => {
        cloudOn.current = true;
        if (Array.isArray(cloud) && cloud.length) {
          const ids = new Set(cloud.map((c) => c.id));
          const merged = [...cloud, ...local.filter((l) => !ids.has(l.id))]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setEntries(merged);
          if (merged.length !== cloud.length) saveToolData('debts', merged).catch(() => {});
        } else {
          setEntries(local);
          if (local.length) saveToolData('debts', local).catch(() => {}); // أول رفع للدفتر المحلي
        }
        setLoaded(true);
      }).catch(() => { setEntries(local); setLoaded(true); });
    } else {
      setEntries(local);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(KEY, JSON.stringify(entries));
    // حفظ مؤجل في قاعدة بيانات الخدمة (يجمع التعديلات المتتالية)
    if (cloudOn.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { saveToolData('debts', entries).catch(() => {}); }, 800);
    }
  }, [entries, loaded]);

  const add = () => {
    if (!who.trim() || !(Number(amount) > 0)) { toast('✍️ أدخل الاسم والمبلغ', 'error'); return; }
    setEntries([{ id: Date.now(), who: who.trim(), phone: phone.trim(), amount: Number(amount), kind, note: note.trim(), date: new Date().toISOString() }, ...entries]);
    setAmount(''); setNote('');
    toast(kind === 'debt' ? '📝 سُجّل الدَّين' : '💰 سُجّل السداد');
  };

  // أرصدة الأشخاص
  const people = useMemo(() => {
    const map = new Map<string, { phone: string; balance: number; last: string }>();
    for (const e of [...entries].reverse()) {
      const p = map.get(e.who) || { phone: e.phone, balance: 0, last: '' };
      p.balance += e.kind === 'debt' ? e.amount : -e.amount;
      p.phone = e.phone || p.phone;
      p.last = e.date;
      map.set(e.who, p);
    }
    return [...map.entries()].filter(([n]) => !filter || n.includes(filter)).sort((a, b) => b[1].balance - a[1].balance);
  }, [entries, filter]);

  const total = people.reduce((s, [, p]) => s + Math.max(p.balance, 0), 0);

  const remind = (name: string, p: { phone: string; balance: number }) => {
    const msg = `السلام عليكم ${name} 🌹\nتذكير ودي بالرصيد المتبقي: ${fmtN(p.balance)} ريال\nشاكرين تعاونكم 🙏`;
    const ph = p.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${ph ? (ph.startsWith('967') ? ph : '967' + ph.replace(/^0/, '')) : ''}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const inp = 'bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-orange-400 placeholder:text-white/30';

  return (
    <div className="space-y-4">
      <div className="rounded-3xl p-5 text-center bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-400/30">
        <p className="text-xs font-bold text-white/60 mb-1">💰 إجمالي الديون القائمة عليك تحصيلها</p>
        <p className="text-3xl font-black text-orange-300">{fmtN(total)} <span className="text-sm">ريال</span></p>
        <p className="text-[11px] text-white/50 mt-1">👥 {people.filter(([, p]) => p.balance > 0).length} شخص عليهم رصيد · 🔒 بياناتك محفوظة في جهازك فقط</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="اسم الشخص *" className={inp} />
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="جواله (للتذكير)" className={inp} dir="ltr" />
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="المبلغ *" className={`${inp} text-center`} />
          <button onClick={() => setKind('debt')} className={`px-4 rounded-xl text-sm font-bold ${kind === 'debt' ? 'bg-red-500/80' : 'bg-white/10 text-white/60'}`}>📤 عليه (دين)</button>
          <button onClick={() => setKind('pay')} className={`px-4 rounded-xl text-sm font-bold ${kind === 'pay' ? 'bg-green-500/80' : 'bg-white/10 text-white/60'}`}>📥 سدّد</button>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" className={inp} />
          <button onClick={add} className="px-6 rounded-xl bg-gradient-to-l from-orange-500 to-red-500 font-extrabold text-sm shadow-lg shadow-orange-500/30 hover:brightness-110">➕ سجّل</button>
        </div>
      </div>

      <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="🔍 ابحث عن شخص..." className={`${inp} w-full`} />

      <div className="space-y-2">
        {people.map(([name, p]) => (
          <div key={name} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl grid place-items-center text-lg shrink-0 ${p.balance > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>{p.balance > 0 ? '📤' : '✅'}</div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold truncate">{name}</p>
              <p className={`text-sm font-black ${p.balance > 0 ? 'text-red-300' : 'text-green-300'}`}>
                {p.balance > 0 ? `عليه ${fmtN(p.balance)} ريال` : p.balance < 0 ? `له رصيد ${fmtN(-p.balance)} ريال` : 'مسدّد بالكامل ✨'}
              </p>
            </div>
            {p.balance > 0 && <button onClick={() => remind(name, p)} className="px-3 py-2 rounded-xl bg-green-500/20 text-green-300 text-xs font-bold hover:bg-green-500/30 shrink-0">💬 ذكّره</button>}
            <button onClick={() => { if (confirm(`حذف كل سجلات «${name}»؟`)) { setEntries(entries.filter((e) => e.who !== name)); toast('🗑️ حُذفت السجلات'); } }}
              className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/25 shrink-0">🗑️</button>
          </div>
        ))}
        {!people.length && <div className="text-center py-12 text-white/50"><div className="text-5xl mb-3">📓</div><p className="font-bold text-sm">الدفتر فارغ — سجّل أول عملية بالأعلى</p></div>}
      </div>

      {/* آخر الحركات */}
      {entries.length > 0 && (
        <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <summary className="font-bold text-sm cursor-pointer">🧾 آخر الحركات ({entries.length})</summary>
          <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
            {entries.slice(0, 30).map((e) => (
              <div key={e.id} className="flex justify-between items-center text-xs bg-white/5 rounded-lg px-3 py-2">
                <span className="text-white/70">{e.kind === 'debt' ? '📤' : '📥'} {e.who}{e.note ? ` — ${e.note}` : ''}</span>
                <b className={e.kind === 'debt' ? 'text-red-300' : 'text-green-300'}>{fmtN(e.amount)}</b>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
