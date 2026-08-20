'use client';
import { useMemo, useState } from 'react';
import { fmtN } from './pdfHelper';

// 💰 حاسبة الزكاة — نصاب وقيمة بدقة، نقود وذهب وفضة وعروض تجارة
export default function ZakatTool() {
  const [tab, setTab] = useState<'money' | 'gold' | 'silver' | 'trade'>('money');
  const [goldPrice, setGoldPrice] = useState(''); // سعر جرام الذهب عيار 24
  const [cash, setCash] = useState('');
  const [goldG, setGoldG] = useState('');
  const [silverG, setSilverG] = useState('');
  const [goods, setGoods] = useState('');
  const [debtsOnYou, setDebtsOnYou] = useState('');

  const NISAB_GOLD = 85; // جرام ذهب عيار 24
  const NISAB_SILVER = 595; // جرام فضة

  const r = useMemo(() => {
    const gp = Number(goldPrice) || 0;
    const nisabMoney = gp * NISAB_GOLD;
    let wealth = 0, nisab = 0, unit = 'ريال';
    if (tab === 'money') { wealth = Number(cash) || 0; nisab = nisabMoney; }
    if (tab === 'gold') { wealth = Number(goldG) || 0; nisab = NISAB_GOLD; unit = 'جرام'; }
    if (tab === 'silver') { wealth = Number(silverG) || 0; nisab = NISAB_SILVER; unit = 'جرام'; }
    if (tab === 'trade') { wealth = (Number(goods) || 0) + (Number(cash) || 0); nisab = nisabMoney; }
    const net = Math.max(wealth - (Number(debtsOnYou) || 0), 0);
    const due = nisab > 0 && net >= nisab;
    const zakat = due ? net * 0.025 : 0;
    return { wealth, net, nisab, due, zakat, unit, nisabMoney };
  }, [tab, goldPrice, cash, goldG, silverG, goods, debtsOnYou]);

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-3 px-3 text-sm font-bold outline-none focus:border-amber-400 placeholder:text-white/30 text-center';
  const TABS = [
    { id: 'money', icon: '💵', label: 'نقود' },
    { id: 'gold', icon: '🥇', label: 'ذهب' },
    { id: 'silver', icon: '🥈', label: 'فضة' },
    { id: 'trade', icon: '🏪', label: 'عروض تجارة' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[100px] py-3 rounded-2xl text-sm font-extrabold transition-all ${tab === t.id ? 'bg-gradient-to-l from-yellow-500 to-amber-600 shadow-lg shadow-amber-500/30' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        {(tab === 'money' || tab === 'trade') && (
          <label className="block text-xs font-bold text-white/60">🥇 سعر جرام الذهب عيار 24 اليوم (لحساب النصاب) — بالريال
            <input inputMode="decimal" value={goldPrice} onChange={(e) => setGoldPrice(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1`} placeholder="مثال: 45000" /></label>
        )}
        {(tab === 'money' || tab === 'trade') && (
          <label className="block text-xs font-bold text-white/60">{tab === 'trade' ? '💵 النقود المدخرة/في الخزينة' : '💵 مجموع النقود التي حال عليها الحول'}
            <input inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1`} placeholder="0" /></label>
        )}
        {tab === 'trade' && (
          <label className="block text-xs font-bold text-white/60">📦 قيمة البضاعة المعدّة للبيع (بسعر البيع الحالي)
            <input inputMode="decimal" value={goods} onChange={(e) => setGoods(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1`} placeholder="0" /></label>
        )}
        {tab === 'gold' && (
          <label className="block text-xs font-bold text-white/60">🥇 وزن الذهب بالجرام (المعد للادخار/الاستثمار)
            <input inputMode="decimal" value={goldG} onChange={(e) => setGoldG(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1`} placeholder="0" /></label>
        )}
        {tab === 'silver' && (
          <label className="block text-xs font-bold text-white/60">🥈 وزن الفضة بالجرام
            <input inputMode="decimal" value={silverG} onChange={(e) => setSilverG(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1`} placeholder="0" /></label>
        )}
        {(tab === 'money' || tab === 'trade') && (
          <label className="block text-xs font-bold text-white/60">💳 ديون مستحقة عليك (تُخصم من الوعاء)
            <input inputMode="decimal" value={debtsOnYou} onChange={(e) => setDebtsOnYou(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1`} placeholder="0" /></label>
        )}
      </div>

      {(r.wealth > 0 || r.net > 0) && (
        <div className="space-y-3">
          <div className={`rounded-3xl p-6 text-center border ${r.due ? 'bg-gradient-to-br from-amber-500/25 to-yellow-600/10 border-amber-400/30' : 'bg-white/5 border-white/10'}`}>
            {r.due ? (
              <>
                <p className="text-xs font-bold text-white/60 mb-1">✅ بلغت النصاب — الزكاة الواجبة (2.5%)</p>
                <p className="text-4xl font-black text-amber-300">{fmtN(Math.round(r.zakat))}</p>
                <p className="text-sm font-bold text-white/80 mt-1">{tab === 'gold' || tab === 'silver' ? `جرام ${tab === 'gold' ? 'ذهباً' : 'فضة'} (أو ما يعادلها نقداً)` : 'ريال يمني'}</p>
              </>
            ) : (
              <>
                <p className="text-2xl mb-1">🌿</p>
                <p className="font-extrabold">لم تبلغ النصاب بعد — لا زكاة عليك</p>
                {r.nisab > 0 && <p className="text-xs text-white/60 mt-1">النصاب: {fmtN(Math.round(r.nisab))} {r.unit} · صافي ما تملكه: {fmtN(Math.round(r.net))} {r.unit}</p>}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><p className="text-[10px] font-bold text-white/50 mb-1">الوعاء الزكوي (الصافي)</p><p className="font-black">{fmtN(Math.round(r.net))} {r.unit}</p></div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><p className="text-[10px] font-bold text-white/50 mb-1">النصاب</p><p className="font-black">{r.nisab ? fmtN(Math.round(r.nisab)) : '—'} {r.unit}</p></div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-white/70 leading-relaxed">
        📖 <b>تذكير:</b> النصاب الشرعي = 85 جرام ذهب خالص (أو 595 جرام فضة)، ويشترط حَوَلان الحول (مرور سنة هجرية). زكاة عروض التجارة تُقوَّم بسعر البيع وقت الزكاة. هذه الحاسبة للمساعدة — وللمسائل الخاصة استشر أهل العلم. 🤲
      </div>
    </div>
  );
}
