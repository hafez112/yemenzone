// ═══════════════════════════════════════════════════════════════
//  🛡️ مكتبة يمن زون للأمن والحماية — تعقيم المدخلات
//  تنظيف النصوص الواردة من العملاء قبل الحفظ أو العرض:
//  إزالة وسوم HTML + محارف التحكم والتوجيه الخفية + حد الطول
// ═══════════════════════════════════════════════════════════════

// محارف توجيه النص الخفية (RLE/LRE/PDF...) + علامة اتجاه
const BIDI_CHARS = /[‎‏‪-‮⁦-⁩]/g;
// وسوم HTML وبقايا أقواسها
const HTML_TAGS = /<[^>]*>/g;
const ANGLE_BRACKETS = /[<>]/g;
// محارف التحكم C0 (باستثناء المسافة) + حذف DEL
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

// تعقيم نص حر (اسم عميل/ملاحظات/رسالة): بلا وسوم ولا محارف خفية
export function sanitizeText(input: unknown, maxLen = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(BIDI_CHARS, '')
    .replace(HTML_TAGS, '')
    .replace(ANGLE_BRACKETS, '')
    .replace(CONTROL_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

// تعقيم رقم هاتف: أرقام فقط مع + اختيارية في المقدمة
export function sanitizePhone(input: unknown): string {
  if (typeof input !== 'string') return '';
  const t = input.trim().replace(/[\s\-()]/g, '');
  return t.replace(/(?!^)\+/g, '').replace(/[^\d+]/g, '').slice(0, 20);
}

// تعقيم عميق: يمشي على الكائن وينظف كل النصوص فيه (القيم غير النصية تُترك)
export function sanitizeObject<T>(obj: T, maxLen = 500): T {
  if (typeof obj === 'string') return sanitizeText(obj, maxLen) as unknown as T;
  if (Array.isArray(obj)) return obj.map((v) => sanitizeObject(v, maxLen)) as unknown as T;
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj as any)) out[k] = sanitizeObject(v, maxLen);
    return out;
  }
  return obj;
}

// تحقق صيغة بريد إلكتروني (للنماذج العامة)
export const isEmail = (v: unknown): boolean =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) && v.length <= 120;
