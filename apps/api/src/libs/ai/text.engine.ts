// ═══════════════════════════════════════════════════════════════
//  🧠 مكتبة يمن زون للذكاء الاصطناعي المحلي — محرك النصوص
//  أوامر معالجة النص العربي: تطبيع + مطابقة كلمات + تنظيف أسماء
//  (تعمل 100% محلياً — بلا خوادم خارجية)
// ═══════════════════════════════════════════════════════════════

// تشكيل عربي + تطويل — يُزال قبل المطابقة
const AR_DIACRITICS = /[ً-ْٰـ]/g;

// تطبيع النص العربي لمطابقة موثوقة:
// توحيد الألف بأشكالها + الألف المقصورة + التاء المربوطة + إزالة التشكيل
export function normalizeArabic(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(AR_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

// هل يحتوي النص على أي كلمة من القائمة؟ يعيد الكلمة المطابقة أو null
export function matchKeyword(text: string, words: string[]): string | null {
  const norm = normalizeArabic(text);
  for (const w of words) {
    if (norm.includes(normalizeArabic(w))) return w;
  }
  return null;
}

// تسجيل نقاط كل مفتاح حسب عدد كلماته المطابقة — يعيد المفتاح الأعلى نقاطاً
export function scoreKeywords(
  text: string,
  table: Record<string, string[]>,
): { key: string | null; scores: Record<string, number> } {
  const norm = normalizeArabic(text);
  const scores: Record<string, number> = {};
  let best: string | null = null;
  let bestScore = 0;
  for (const [key, words] of Object.entries(table)) {
    let s = 0;
    for (const w of words) if (norm.includes(normalizeArabic(w))) s++;
    scores[key] = s;
    if (s > bestScore) { bestScore = s; best = key; }
  }
  return { key: best, scores };
}

// تنظيف اسم (منتج/عنصر/عنوان) من الرموز الزائدة مع تنسيق الأحرف الإنجليزية
export function cleanName(raw: string): string {
  let name = (raw || '').trim().replace(/\s+/g, ' ');
  name = name.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  name = name.replace(/[!@#$%^&*()_+=\[\]{};:'"\\|<>?]+/g, '');
  return name;
}

// اقتطاع آمن عند حد أقصى دون قطع كلمة
export function truncateWords(text: string, max: number): string {
  const t = (text || '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

// كشف اللغة الغالبة للنص (عربي/إنجليزي) — يفيد تنسيق الرسائل
export function dominantLang(text: string): 'ar' | 'en' {
  const ar = ((text || '').match(/[؀-ۿ]/g) || []).length;
  const en = ((text || '').match(/[a-zA-Z]/g) || []).length;
  return ar >= en ? 'ar' : 'en';
}
