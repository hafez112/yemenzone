'use client';
import { useMemo, useState } from 'react';
import { toast } from '@/components/Toast';
import { fmtN } from './pdfHelper';

// 📄 مولّد المستندات الرسمية — سند قبض / إيصال / عقد بيع / عقد إيجار
const DOCS = {
  receipt: {
    name: 'سند قبض', icon: '📥',
    fields: ['من السيد', 'مبلغاً وقدره', 'وذلك عن'],
    build: (v: string[], meta: any) => ({
      title: 'سند قبض',
      body: `استلمت أنا الموقع أدناه من السيد/ ${v[0] || '...............'} مبلغاً وقدره ${v[1] || '.......'} ريال يمني فقط لا غير، وذلك عن ${v[2] || '...............'}. وبهذا أوقّع،`,
    }),
  },
  payment: {
    name: 'إيصال استلام بضاعة', icon: '📦',
    fields: ['اسم المستلم', 'البضاعة/المستلمات', 'ملاحظات'],
    build: (v: string[]) => ({
      title: 'إيصال استلام بضاعة',
      body: `أقر أنا/ ${v[0] || '...............'} بأنني استلمت من المحل البضاعة التالية: ${v[1] || '...............'} بحالة سليمة وكاملة. ${v[2] ? 'ملاحظات: ' + v[2] : ''} وبهذا أوقّع،`,
    }),
  },
  sale: {
    name: 'عقد بيع', icon: '🤝',
    fields: ['البائع', 'المشتري', 'الشيء المبيع', 'الثمن المتفق عليه'],
    build: (v: string[]) => ({
      title: 'عقد بيع',
      body: `تم الاتفاق بين البائع/ ${v[0] || '.......'} والمشتري/ ${v[1] || '.......'} على بيع ${v[2] || '...............'} بمبلغ وقدره ${v[3] || '.......'} ريال، وقد قبض البائع الثمن واستلم المشتري المبيع، واتفق الطرفان على صحة هذا البيع شرعاً وقانوناً. وعلى ذلك وقّع الطرفان،`,
    }),
  },
  rent: {
    name: 'عقد إيجار', icon: '🏠',
    fields: ['المؤجر', 'المستأجر', 'العين المؤجرة', 'الإيجار الشهري', 'مدة العقد'],
    build: (v: string[]) => ({
      title: 'عقد إيجار',
      body: `تم الاتفاق بين المؤجر/ ${v[0] || '.......'} والمستأجر/ ${v[1] || '.......'} على إيجار ${v[2] || '...............'} بمبلغ شهري قدره ${v[3] || '.......'} ريال، لمدة ${v[4] || '.......'} تبدأ من تاريخ تحرير هذا العقد. يلتزم المستأجر بالمحافظة على العين المؤجرة وتسليمها عند انتهاء المدة. وعلى ذلك وقّع الطرفان،`,
    }),
  },
} as const;

type DocKey = keyof typeof DOCS;

export default function DocsTool() {
  const [docKey, setDocKey] = useState<DocKey>('receipt');
  const [vals, setVals] = useState<string[]>([]);
  const [name1, setName1] = useState(''); // الموقّع الأول
  const [name2, setName2] = useState('');
  const doc = DOCS[docKey];
  const built = useMemo(() => doc.build(vals, null), [doc, vals]);

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-stone-400 placeholder:text-white/30';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.keys(DOCS) as DocKey[]).map((k) => (
          <button key={k} onClick={() => { setDocKey(k); setVals([]); }}
            className={`py-3 rounded-2xl text-xs font-extrabold transition-all ${docKey === k ? 'bg-gradient-to-l from-stone-500 to-stone-700 shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
            {DOCS[k].icon} {DOCS[k].name}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-2">
        <h3 className="font-extrabold text-sm">✍️ عبّئ بيانات «{doc.name}»</h3>
        {doc.fields.map((f, i) => (
          <input key={f} value={vals[i] || ''} onChange={(e) => setVals(doc.fields.map((_, j) => j === i ? e.target.value : (vals[j] || '')))}
            placeholder={f} className={inp} />
        ))}
        <div className="grid grid-cols-2 gap-2">
          <input value={name1} onChange={(e) => setName1(e.target.value)} placeholder="اسم الموقّع الأول" className={inp} />
          <input value={name2} onChange={(e) => setName2(e.target.value)} placeholder="اسم الموقّع الثاني" className={inp} />
        </div>
      </div>

      {/* المعاينة الورقية */}
      <div id="doc-print" dir="rtl" className="print-root bg-white text-slate-800 rounded-xl p-8 mx-auto max-w-[520px] shadow-2xl" style={{ fontFamily: 'Cairo, sans-serif' }}>
        <div className="text-center mb-6">
          <div className="inline-block border-4 border-double border-stone-700 px-8 py-2 rounded-lg">
            <h2 className="text-2xl font-black text-stone-800">{built.title}</h2>
          </div>
          <p className="text-xs text-slate-500 mt-2">حُرّر بتاريخ {new Date().toLocaleDateString('ar-YE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <p className="leading-loose text-justify text-[15px]">{built.body}</p>
        <div className="grid grid-cols-2 gap-8 mt-12 text-center text-sm font-bold">
          <div><p className="mb-8">{name1 || 'الطرف الأول'}</p><p className="border-t border-slate-300 pt-1 text-xs text-slate-500">التوقيع</p></div>
          <div><p className="mb-8">{name2 || 'الطرف الثاني'}</p><p className="border-t border-slate-300 pt-1 text-xs text-slate-500">التوقيع</p></div>
        </div>
        <p className="text-center text-[9px] text-slate-400 mt-8">⚡ أُنشئ بواسطة منصة يمن زون — yemenzone1.com</p>
      </div>

      <button onClick={() => { window.print(); toast('🖨️ أُرسل المستند للطباعة — اختر «حفظ PDF» إن أردت ملفاً'); }}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-stone-600 to-stone-800 font-extrabold text-sm shadow-lg hover:brightness-110">
        🖨️ طباعة / حفظ PDF
      </button>

      <p className="text-center text-[11px] text-white/50">⚖️ هذه نماذج عامة مساعدة — راجعها وعدّلها بما يناسب حالتك، والتوثيق الرسمي عند الجهات المختصة أقوى</p>
    </div>
  );
}
