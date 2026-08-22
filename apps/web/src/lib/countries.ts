// ═══════════════════════════════════════════════════════════════
//  🌍 مفاتيح الدول + التحقق من صحة أرقام الجوال
//  جدول عربي أولاً (اليمن افتراضياً) مع طول الرقم الوطني وبادئته
// ═══════════════════════════════════════════════════════════════

export interface Country {
  code: string;      // ISO
  name: string;
  flag: string;
  dial: string;      // بدون +
  lengths: number[]; // أطوال الرقم الوطني المقبولة
  prefix?: RegExp;   // بادئة الرقم الوطني (اختياري)
  example: string;
  hint: string;      // وصف عربي للصيغة الصحيحة
}

export const COUNTRIES: Country[] = [
  { code: 'YE', name: 'اليمن', flag: '🇾🇪', dial: '967', lengths: [9], prefix: /^7/, example: '777123456', hint: '9 أرقام تبدأ بـ 7' },
  { code: 'SA', name: 'السعودية', flag: '🇸🇦', dial: '966', lengths: [9], prefix: /^5/, example: '512345678', hint: '9 أرقام تبدأ بـ 5' },
  { code: 'AE', name: 'الإمارات', flag: '🇦🇪', dial: '971', lengths: [9], prefix: /^5/, example: '501234567', hint: '9 أرقام تبدأ بـ 5' },
  { code: 'OM', name: 'عُمان', flag: '🇴🇲', dial: '968', lengths: [8], example: '91234567', hint: '8 أرقام' },
  { code: 'KW', name: 'الكويت', flag: '🇰🇼', dial: '965', lengths: [8], example: '51234567', hint: '8 أرقام' },
  { code: 'BH', name: 'البحرين', flag: '🇧🇭', dial: '973', lengths: [8], example: '31234567', hint: '8 أرقام' },
  { code: 'QA', name: 'قطر', flag: '🇶🇦', dial: '974', lengths: [8], example: '31234567', hint: '8 أرقام' },
  { code: 'EG', name: 'مصر', flag: '🇪🇬', dial: '20', lengths: [10], prefix: /^1/, example: '1012345678', hint: '10 أرقام تبدأ بـ 1' },
  { code: 'JO', name: 'الأردن', flag: '🇯🇴', dial: '962', lengths: [9], prefix: /^7/, example: '791234567', hint: '9 أرقام تبدأ بـ 7' },
  { code: 'IQ', name: 'العراق', flag: '🇮🇶', dial: '964', lengths: [10], prefix: /^7/, example: '7712345678', hint: '10 أرقام تبدأ بـ 7' },
  { code: 'SY', name: 'سوريا', flag: '🇸🇾', dial: '963', lengths: [9], prefix: /^9/, example: '912345678', hint: '9 أرقام تبدأ بـ 9' },
  { code: 'LB', name: 'لبنان', flag: '🇱🇧', dial: '961', lengths: [7, 8], example: '71234567', hint: '7 أو 8 أرقام' },
  { code: 'PS', name: 'فلسطين', flag: '🇵🇸', dial: '970', lengths: [9], prefix: /^5/, example: '591234567', hint: '9 أرقام تبدأ بـ 5' },
  { code: 'SD', name: 'السودان', flag: '🇸🇩', dial: '249', lengths: [9], prefix: /^9/, example: '912345678', hint: '9 أرقام تبدأ بـ 9' },
  { code: 'LY', name: 'ليبيا', flag: '🇱🇾', dial: '218', lengths: [9, 10], prefix: /^9/, example: '912345678', hint: '9 أو 10 أرقام تبدأ بـ 9' },
  { code: 'TN', name: 'تونس', flag: '🇹🇳', dial: '216', lengths: [8], example: '21234567', hint: '8 أرقام' },
  { code: 'DZ', name: 'الجزائر', flag: '🇩🇿', dial: '213', lengths: [9], prefix: /^[567]/, example: '551234567', hint: '9 أرقام تبدأ بـ 5 أو 6 أو 7' },
  { code: 'MA', name: 'المغرب', flag: '🇲🇦', dial: '212', lengths: [9], prefix: /^[67]/, example: '612345678', hint: '9 أرقام تبدأ بـ 6 أو 7' },
  { code: 'MR', name: 'موريتانيا', flag: '🇲🇷', dial: '222', lengths: [8], example: '31234567', hint: '8 أرقام' },
  { code: 'DJ', name: 'جيبوتي', flag: '🇩🇯', dial: '253', lengths: [8], example: '77123456', hint: '8 أرقام' },
  { code: 'SO', name: 'الصومال', flag: '🇸🇴', dial: '252', lengths: [8, 9], example: '612345678', hint: '8 أو 9 أرقام' },
  { code: 'KM', name: 'جزر القمر', flag: '🇰🇲', dial: '269', lengths: [7], example: '3212345', hint: '7 أرقام' },
  { code: 'TR', name: 'تركيا', flag: '🇹🇷', dial: '90', lengths: [10], prefix: /^5/, example: '5123456789', hint: '10 أرقام تبدأ بـ 5' },
];

// 🧭 كشف الدولة تلقائياً من المنطقة الزمنية للجهاز ثم لغة المتصفح
const TZ_MAP: Record<string, string> = {
  'Asia/Aden': 'YE', 'Asia/Riyadh': 'SA', 'Asia/Dubai': 'AE', 'Asia/Muscat': 'OM',
  'Asia/Kuwait': 'KW', 'Asia/Bahrain': 'BH', 'Asia/Qatar': 'QA', 'Africa/Cairo': 'EG',
  'Asia/Amman': 'JO', 'Asia/Baghdad': 'IQ', 'Asia/Damascus': 'SY', 'Asia/Beirut': 'LB',
  'Asia/Gaza': 'PS', 'Asia/Hebron': 'PS', 'Africa/Khartoum': 'SD', 'Africa/Tripoli': 'LY',
  'Africa/Tunis': 'TN', 'Africa/Algiers': 'DZ', 'Africa/Casablanca': 'MA',
  'Africa/Nouakchott': 'MR', 'Africa/Djibouti': 'DJ', 'Africa/Mogadishu': 'SO',
  'Indian/Comoro': 'KM', 'Europe/Istanbul': 'TR',
};

export function detectCountry(): Country {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (TZ_MAP[tz]) return COUNTRIES.find(c => c.code === TZ_MAP[tz]) || COUNTRIES[0];
    const lang = (navigator.language || '').toUpperCase(); // ar-YE → YE
    const m = lang.match(/-([A-Z]{2})/);
    if (m) {
      const found = COUNTRIES.find(c => c.code === m[1]);
      if (found) return found;
    }
  } catch { /* بيئة بلا متصفح */ }
  return COUNTRIES[0]; // اليمن افتراضياً
}

// ✅ التحقق من صحة الرقم الوطني حسب قواعد الدولة
export function validateNational(country: Country, national: string): boolean {
  const digits = national.replace(/\D/g, '').replace(/^0+/, ''); // إزالة صفر البداية
  if (!country.lengths.includes(digits.length)) return false;
  if (country.prefix && !country.prefix.test(digits)) return false;
  return true;
}

// تنسيق الرقم الوطني للإرسال: بلا صفر بداية
export function cleanNational(national: string): string {
  return national.replace(/\D/g, '').replace(/^0+/, '');
}

// الرقم الكامل بالصيغة الدولية
export function toInternational(country: Country, national: string): string {
  const n = cleanNational(national);
  return n ? `+${country.dial}${n}` : '';
}
