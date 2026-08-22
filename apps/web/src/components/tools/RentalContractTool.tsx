'use client';
import { useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { elementToPdf, fmtN } from './pdfHelper';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, Empty, Field, fmtDate, inp, todayISO, uid } from './shared/ui';

// 🚗 عقود الإيجار الإلكترونية — عقد منسق بالبنود اليمنية المتعارفة جاهز للطباعة والتوقيع
interface Contract {
  id: number; kind: string; lessor: string; lessorPhone: string; lessee: string; lesseePhone: string; lesseeId: string;
  asset: string; rent: number; months: number; start: string; terms: string; date: string;
}

const KINDS = ['🚗 سيارة', '🏠 منزل/شقة', '🏪 محل تجاري', '🏗️ معدات', '📦 أخرى'];
const DEFAULT_TERMS = '1. يلتزم الطرف الثاني بسداد الأجرة في بداية كل شهر دون تأخير.\n2. يلتزم الطرف الثاني بالمحافظة على العين المؤجرة وتسليمها بحالتها المستلمة عليها.\n3. لا يحق للطرف الثاني تأجير العين من الباطن أو التنازل عنها دون موافقة خطية من الطرف الأول.\n4. يحق للطرف الأول فسخ العقد عند الإخلال بأي بند من بنوده.\n5. حُرر هذا العقد من نسختين بيد كل طرف نسخة للعمل بموجبها.';

export default function RentalContractTool() {
  const { data: contracts, setData: setContracts } = useToolDB<Contract[]>('rental-contract', [], 'yz-contracts-v1');
  const [kind, setKind] = useState(KINDS[0]);
  const [lessor, setLessor] = useState('');
  const [lessorPhone, setLessorPhone] = useState('');
  const [lessee, setLessee] = useState('');
  const [lesseePhone, setLesseePhone] = useState('');
  const [lesseeId, setLesseeId] = useState('');
  const [asset, setAsset] = useState('');
  const [rent, setRent] = useState('');
  const [months, setMonths] = useState('1');
  const [start, setStart] = useState(todayISO());
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [current, setCurrent] = useState<Contract | null>(null);
  const [showForm, setShowForm] = useState(true);
  const pdfRef = useRef<HTMLDivElement>(null);

  const issue = () => {
    if (!lessor.trim() || !lessee.trim() || !asset.trim() || !(Number(rent) > 0)) { toast('✍️ أكمل الطرفين والعين والأجرة', 'error'); return; }
    const c: Contract = { id: uid(), kind, lessor: lessor.trim(), lessorPhone: lessorPhone.trim(), lessee: lessee.trim(), lesseePhone: lesseePhone.trim(), lesseeId: lesseeId.trim(), asset: asset.trim(), rent: Number(rent), months: Number(months) || 1, start, terms, date: new Date().toISOString() };
    setContracts([c, ...contracts].slice(0, 100));
    setCurrent(c); setShowForm(false);
    toast('📜 صدر العقد — راجعه ثم نزّله PDF');
  };

  const download = async () => {
    if (!current || !pdfRef.current) return;
    toast('⏳ جاري تجهيز PDF...');
    try { await elementToPdf(pdfRef.current, `عقد-إيجار-${current.lessee}.pdf`); toast('📄 نُزّل العقد PDF'); }
    catch { toast('تعذّر إنشاء PDF', 'error'); }
  };

  return (
    <div className="space-y-4">
      {showForm && (
        <div className={card + ' space-y-3'}>
          <Field label="📦 نوع العين المؤجرة">
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${kind === k ? 'bg-gradient-to-l from-lime-500 to-emerald-600 shadow-lg' : 'bg-white/10 text-white/60'}`}>{k}</button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="1️⃣ المؤجر (الطرف الأول)"><input value={lessor} onChange={(e) => setLessor(e.target.value)} placeholder="الاسم الكامل" className={inp} /></Field>
            <Field label="📱 جواله"><input inputMode="tel" value={lessorPhone} onChange={(e) => setLessorPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="777123456" className={inp} dir="ltr" /></Field>
            <Field label="2️⃣ المستأجر (الطرف الثاني)"><input value={lessee} onChange={(e) => setLessee(e.target.value)} placeholder="الاسم الكامل" className={inp} /></Field>
            <Field label="📱 جواله"><input inputMode="tel" value={lesseePhone} onChange={(e) => setLesseePhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="777123456" className={inp} dir="ltr" /></Field>
            <Field label="🪪 رقم هوية المستأجر"><input inputMode="numeric" value={lesseeId} onChange={(e) => setLesseeId(e.target.value.replace(/[^0-9]/g, ''))} placeholder="اختياري" className={inp} dir="ltr" /></Field>
            <Field label="📦 وصف العين"><input value={asset} onChange={(e) => setAsset(e.target.value)} placeholder="سيارة هايلوكس موديل 2020 لوحة 12345" className={inp} /></Field>
            <Field label="💰 الأجرة الشهرية"><input inputMode="decimal" value={rent} onChange={(e) => setRent(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className={inp} /></Field>
            <Field label="📅 المدة (أشهر)"><input inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value.replace(/[^0-9]/g, ''))} className={inp} /></Field>
            <div className="col-span-2"><Field label="📅 تاريخ بدء الإيجار"><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inp} dir="ltr" /></Field></div>
          </div>
          <Field label="📜 البنود (عدّلها كما يناسبك)">
            <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={6} className={inp + ' leading-relaxed'} />
          </Field>
          <button onClick={issue} className={btnP + ' w-full !py-3.5'}>📜 إصدار العقد</button>
        </div>
      )}

      {current && (
        <div className="space-y-3">
          <div ref={pdfRef} dir="rtl" className="bg-white text-gray-900 rounded-2xl p-6 space-y-4">
            <div className="text-center border-b-2 border-stone-700 pb-3">
              <h2 className="text-xl font-black text-stone-800">عقد إيجار {current.kind}</h2>
              <p className="text-[11px] text-gray-400 mt-1">حُرر بتاريخ {fmtDate(current.date)}</p>
            </div>
            <div className="text-sm leading-loose space-y-1.5">
              <p><b>الطرف الأول (المؤجر):</b> {current.lessor}{current.lessorPhone ? ` — جوال ${current.lessorPhone}` : ''}</p>
              <p><b>الطرف الثاني (المستأجر):</b> {current.lessee}{current.lesseeId ? ` — هوية ${current.lesseeId}` : ''}{current.lesseePhone ? ` — جوال ${current.lesseePhone}` : ''}</p>
              <p><b>العين المؤجرة:</b> {current.asset}</p>
              <p><b>الأجرة الشهرية:</b> <span className="font-black">{fmtN(current.rent)} ريال يمني</span> — <b>المدة:</b> {current.months} {current.months === 1 ? 'شهر' : 'أشهر'} تبدأ من {fmtDate(current.start)}</p>
              <p><b>إجمالي قيمة العقد:</b> {fmtN(current.rent * current.months)} ريال يمني</p>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <p className="font-black text-sm mb-2">📜 البنود:</p>
              <p className="text-xs leading-loose whitespace-pre-line text-gray-700">{current.terms}</p>
            </div>
            <div className="flex justify-between pt-8 text-xs text-gray-600">
              <div className="text-center"><p className="font-bold mb-8">الطرف الأول (المؤجر)</p><p>التوقيع: ......................</p></div>
              <div className="text-center"><p className="font-bold mb-8">الطرف الثاني (المستأجر)</p><p>التوقيع: ......................</p></div>
            </div>
            <p className="text-[10px] text-gray-400 text-center border-t border-gray-200 pt-2">أُنشئ إلكترونياً عبر منصة يمن زون ⚡</p>
          </div>
          <div className="flex gap-2">
            <button onClick={download} className={btnP + ' flex-1'}>📄 تنزيل العقد PDF</button>
            <button onClick={() => setShowForm(true)} className={btnS + ' flex-1'}>➕ عقد جديد</button>
          </div>
        </div>
      )}

      {contracts.length === 0 && !current && <Empty icon="📜" text="لا عقود بعد — عبّئ النموذج وأصدر أول عقد إيجار منسق" />}

      {contracts.length > 0 && showForm && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-white/60">🗂️ العقود السابقة ({contracts.length})</p>
          {contracts.slice(0, 10).map((c) => (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center text-base shrink-0">{c.kind.split(' ')[0]}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{c.lessee} ← {c.asset}</p>
                <p className="text-[10px] text-white/40">{fmtDate(c.date)} · {fmtN(c.rent)}/شهر · {c.months} شهر</p>
              </div>
              <button onClick={() => { setCurrent(c); setShowForm(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={btnS}>فتح</button>
              <button onClick={() => { setContracts(contracts.filter((x) => x.id !== c.id)); toast('🗑️ حُذف العقد'); }} className={btnD}>حذف</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
