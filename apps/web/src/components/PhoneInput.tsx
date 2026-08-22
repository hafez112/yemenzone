'use client';
import { useEffect, useRef, useState } from 'react';
import { COUNTRIES, Country, detectCountry, validateNational, toInternational } from '@/lib/countries';

// ═══════════════════════════════════════════════════════════════
//  📱 حقل جوال بمفتاح دولة — يكشف الدولة تلقائياً ويتحقق من الرقم
//  onChange يستلم الرقم الكامل بالصيغة الدولية (+9677XXXXXXXX)
//  ويتفهم القيم المعبأة مسبقاً بأي صيغة (محلية أو دولية)
// ═══════════════════════════════════════════════════════════════

// تفكيك رقم قادم من الخارج إلى (دولة + رقم وطني)
function parseValue(v: string): { c: Country; n: string } {
  const digits = v.replace(/[^\d+]/g, '');
  const noPlus = digits.replace(/^\+/, '');
  // دولي: +الكود… أو 00الكود…
  const intlDigits = digits.startsWith('+') ? noPlus : digits.startsWith('00') ? noPlus.replace(/^00/, '') : '';
  if (intlDigits) {
    // الأطول أولاً حتى لا يلتقط '96' قبل '967' مثلاً
    const hit = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
      .find(k => intlDigits.startsWith(k.dial) && intlDigits.length > k.dial.length);
    if (hit) return { c: hit, n: intlDigits.slice(hit.dial.length) };
  }
  // يمني محلي شائع
  if (/^7\d{8}$/.test(noPlus)) return { c: COUNTRIES[0], n: noPlus };
  return { c: detectCountry(), n: noPlus.replace(/^0+/, '') };
}

export default function PhoneInput({ value, onChange, inputClass, required }: {
  value: string; // القيمة الحالية (دولية أو وطنية)
  onChange: (fullInternational: string) => void;
  inputClass?: string;
  required?: boolean;
}) {
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [national, setNational] = useState('');
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(''); // آخر قيمة أرسلناها — لمنع حلقة إعادة التفكيك

  // 🧭 كشف الدولة تلقائياً عند التحميل
  useEffect(() => {
    if (!value) setCountry(detectCountry());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔄 مزامنة القيم الخارجية (تعبئة مسبقة من رابط/حساب) مع الحفاظ على ما يكتبه المستخدم
  useEffect(() => {
    const v = (value || '').trim();
    if (!v || v === lastEmitted.current) return;
    const { c, n } = parseValue(v);
    if (c.code !== country.code) setCountry(c);
    if (n !== national) setNational(n);
    const intl = toInternational(c, n);
    if (intl && intl !== v) {
      lastEmitted.current = intl;
      onChange(intl); // توحيد الصيغة دولياً حتى للقيم القديمة
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const emit = (c: Country, n: string) => {
    const intl = n ? toInternational(c, n) : '';
    lastEmitted.current = intl;
    onChange(intl);
  };

  const valid = national.length > 0 && validateNational(country, national);
  const showError = touched && national.length > 0 && !valid;

  const pick = (c: Country) => {
    setCountry(c);
    setOpen(false);
    setTouched(false);
    emit(c, national);
  };

  const type = (raw: string) => {
    const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15);
    setNational(digits);
    setTouched(true);
    emit(country, digits);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div dir="ltr"
        className={`flex items-stretch rounded-xl border overflow-hidden transition bg-white ${
          valid ? 'border-emerald-400 ring-1 ring-emerald-200'
          : showError ? 'border-red-400 ring-1 ring-red-200'
          : 'border-gray-200'}`}>
        {/* زر الدولة */}
        <button type="button" onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 bg-gray-50 border-r border-gray-200 shrink-0 hover:bg-gray-100 transition">
          <span className="text-lg">{country.flag}</span>
          <span className="text-sm font-black text-gray-700">+{country.dial}</span>
          <span className={`text-[9px] text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {/* الرقم الوطني */}
        <input value={national} onChange={(e) => type(e.target.value)} required={required}
          inputMode="numeric" autoComplete="tel-national" placeholder={country.example}
          className={`flex-1 min-w-0 px-3 py-3 text-gray-900 outline-none text-left placeholder:text-gray-300 ${inputClass || ''}`} />
        {/* مؤشر الصحة */}
        {national.length > 0 && (
          <span className="flex items-center px-2.5 text-sm shrink-0">{valid ? '✅' : '⚠️'}</span>
        )}
      </div>

      {/* قائمة الدول */}
      {open && (
        <div dir="rtl" className="absolute z-50 top-full mt-1.5 right-0 left-0 max-h-56 overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100 anim-bounce-in">
          {COUNTRIES.map((c) => (
            <button key={c.code} type="button" onClick={() => pick(c)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-right hover:bg-purple-50 transition ${c.code === country.code ? 'bg-purple-50' : ''}`}>
              <span className="text-lg">{c.flag}</span>
              <span className="flex-1 text-sm font-bold text-gray-800">{c.name}</span>
              <span dir="ltr" className="text-xs font-black text-gray-400">+{c.dial}</span>
            </button>
          ))}
        </div>
      )}

      {/* رسالة التحقق */}
      {showError && (
        <p className="text-[11px] font-bold text-red-500 mt-1.5">
          ⚠️ الرقم غير صحيح لدولة {country.name} — المطلوب: {country.hint} (مثال: <span dir="ltr">{country.example}</span>)
        </p>
      )}
      {valid && (
        <p className="text-[11px] font-bold text-emerald-600 mt-1.5" dir="ltr">✓ {toInternational(country, national)}</p>
      )}
    </div>
  );
}
