'use client';
import { useMemo, useState } from 'react';
import { toast } from '@/components/Toast';
import { fmtN } from './pdfHelper';

// 📅 حاسبة الأقساط — جدول سداد كامل قابل للمشاركة والطباعة
export default function InstallmentsTool() {
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState(6);
  const [interest, setInterest] = useState('0');
  const [down, setDown] = useState('');

  const r = useMemo(() => {
    const a = Number(amount) || 0;
    const d = Math.min(Number(down) || 0, a);
    const rest = a - d;
    if (!rest || !months) return null;
    const totalInterest = (rest * (Number(interest) || 0)) / 100;
    const total = rest + totalInterest;
    const monthly = total / months;
    const rows = Array.from({ length: months }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      return { n: i + 1, date, pay: monthly, remain: Math.max(total - monthly * (i + 1), 0) };
    });
    return { a, d, rest, totalInterest, total, monthly, rows };
  }, [amount, months, interest, down]);

  const share = () => {
    if (!r) return;
    const msg = `📅 جدول أقساط\n💰 المبلغ: ${fmtN(r.a)} ريال\n💵 المقدم: ${fmtN(r.d)} ريال\n🗓️ ${months} قسطاً × ${fmtN(r.monthly)} ريال\n📊 الإجمالي: ${fmtN(r.total)} ريال\n\n⚡ عبر منصة يمن زون`;
    navigator.clipboard.writeText(msg).then(() => toast('📋 نُسخ الجدول — الصقه في واتساب')).catch(() => {});
  };

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-3 px-3 text-sm font-bold outline-none focus:border-teal-400 placeholder:text-white/30 text-center';

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-bold text-white/60">💰 المبلغ الكلي<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1`} placeholder="100000" /></label>
          <label className="text-xs font-bold text-white/60">💵 الدفعة المقدمة<input inputMode="decimal" value={down} onChange={(e) => setDown(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1`} placeholder="0" /></label>
        </div>
        <div>
          <div className="flex justify-between text-xs font-bold mb-1"><span className="text-white/60">🗓️ عدد الأشهر</span><span className="text-teal-300 text-base">{months}</span></div>
          <input type="range" min={1} max={24} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full accent-teal-500" />
        </div>
        <label className="text-xs font-bold text-white/60 block">📈 نسبة إضافية % (ربح التقسيط)<input inputMode="decimal" value={interest} onChange={(e) => setInterest(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1`} placeholder="0" /></label>
      </div>

      {r && (
        <div className="space-y-3 print-root">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-gradient-to-br from-teal-500/25 to-emerald-600/10 border border-teal-400/30 p-4">
              <p className="text-[10px] font-bold text-white/60 mb-1">القسط الشهري</p><p className="text-xl font-black text-teal-300">{fmtN(Math.round(r.monthly))}</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-[10px] font-bold text-white/60 mb-1">المتبقي بعد المقدم</p><p className="text-xl font-black">{fmtN(r.rest)}</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-[10px] font-bold text-white/60 mb-1">الإجمالي النهائي</p><p className="text-xl font-black">{fmtN(Math.round(r.total))}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-white/10 text-white/70 text-xs">
                <th className="py-2.5 px-3 text-right">القسط</th><th className="py-2.5 px-3">التاريخ</th><th className="py-2.5 px-3">المبلغ</th><th className="py-2.5 px-3">المتبقي</th>
              </tr></thead>
              <tbody>
                {r.rows.map((row) => (
                  <tr key={row.n} className="border-t border-white/5">
                    <td className="py-2.5 px-3 font-bold text-teal-300">#{row.n}</td>
                    <td className="py-2.5 px-3 text-center text-white/70">{row.date.toLocaleDateString('ar-YE', { month: 'long', year: 'numeric' })}</td>
                    <td className="py-2.5 px-3 text-center font-bold">{fmtN(Math.round(row.pay))}</td>
                    <td className="py-2.5 px-3 text-center text-white/60">{fmtN(Math.round(row.remain))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={share} className="py-3 rounded-2xl bg-gradient-to-l from-teal-500 to-emerald-600 font-extrabold text-sm shadow-lg shadow-teal-500/30 hover:brightness-110">📋 نسخ الجدول للمشاركة</button>
            <button onClick={() => { window.print(); toast('🖨️ أُرسل الجدول للطباعة'); }} className="py-3 rounded-2xl bg-white/10 font-bold text-sm hover:bg-white/20">🖨️ طباعة</button>
          </div>
        </div>
      )}
    </div>
  );
}
