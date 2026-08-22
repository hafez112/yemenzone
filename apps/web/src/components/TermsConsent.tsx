'use client';

// 📜 موافقة السياسات — إلزامية عند إنشاء أي حساب (عميل/بائع)
export default function TermsConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-start gap-2.5 cursor-pointer rounded-xl border p-3 select-none transition-colors ${checked ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 mt-0.5 accent-emerald-600 shrink-0"
      />
      <span className="text-xs font-bold text-gray-600 leading-relaxed">
        قرأتُ وأوافق على{' '}
        <a href="/terms" target="_blank" rel="noopener" className="text-teal-600 underline" onClick={(e) => e.stopPropagation()}>شروط الاستخدام</a>
        {' '}و{' '}
        <a href="/privacy" target="_blank" rel="noopener" className="text-teal-600 underline" onClick={(e) => e.stopPropagation()}>سياسة الخصوصية</a>
        {' '}لمنصة يمن زون 📜
      </span>
    </label>
  );
}
