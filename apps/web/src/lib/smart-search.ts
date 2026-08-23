// 🔍 بحث ذكي عربي — تطبيع الحروف + تعدد الكلمات
// يفهم: أ/إ/آ/ا = ا | ة/ه | ى/ي | الأرقام العربية ٠١٢٣ = 0123 | يتجاهل التشكيل والتطويل

export function normalizeAr(text: any): string {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/[ً-ْٰـ]/g, '') // تشكيل + تطويل
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))) // أرقام عربية → إنجليزية
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))) // أرقام فارسية
    .replace(/\s+/g, ' ')
    .trim();
}

// كل كلمات الاستعلام يجب أن توجد في النص (بأي ترتيب)
export function smartMatch(text: any, query: string): boolean {
  const hay = normalizeAr(text);
  const words = normalizeAr(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  return words.every((w) => hay.includes(w));
}

// يبني سلسلة بحث موحدة من عدة حقول
export function searchBlob(fields: any[]): string {
  return fields.filter((f) => f !== null && f !== undefined && f !== '').join(' ');
}
