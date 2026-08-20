// 🧮 حسابات مالية نقية — مشتركة بين المحرك والاختبارات الآلية

// عمولة المنصة: نسبة مئوية من الإجمالي، بدقة كسرين — دائماً ≥ 0
export function calcCommission(total: number, ratePercent: number): number {
  const t = Math.max(0, Number(total) || 0);
  const r = Math.max(0, Number(ratePercent) || 0);
  return Math.round(t * r) / 100;
}

// رقم تسلسلي بادئة — ST-XXXXXX / ORD-XXXXXX
export function serialNumber(prefix: string, n: number): string {
  return `${prefix}-${String(Math.max(0, n)).padStart(6, '0')}`;
}

// صافي التسوية: إجمالي المبيعات − العمولة − الاسترجاعات (لا يكون سالباً)
export function settlementNet(gross: number, commission: number, refunds: number): number {
  return Math.max(0, Math.round(((Number(gross) || 0) - (Number(commission) || 0) - (Number(refunds) || 0)) * 100) / 100);
}

// 🛡️ اسم ملف آمن — يمنع اختراق المسارات والأحرف الخطرة
export function safeName(name: string): string {
  const base = String(name || '')
    .replace(/[\\/]/g, '_') // لا فواصل مسارات
    .replace(/\.\./g, '_') // لا تصعيد للأعلى
    .replace(/[^\w.\-ء-ي ]/g, '_') // عربي/إنجليزي/أرقام فقط
    .replace(/_+/g, '_')
    .replace(/^[_\s.]+|[_\s.]+$/g, '') // لا حواف مشوهة
    .trim()
    .slice(0, 120);
  return base || 'file';
}

// 🛡️ اسم مجلد آمن
export function safeFolder(folder: string): string {
  return String(folder || '')
    .replace(/[\\/]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[^\w\-ء-ي ]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\s.]+|[_\s.]+$/g, '')
    .trim()
    .slice(0, 60);
}
