// 🎉 عروض الباقات المحدودة — حساب الأيام المتبقية وتنسيقها (خادم وعميل)
export function offerDaysLeft(endsAt?: string | Date | null): number | null {
  if (!endsAt) return null;
  const ms = +new Date(endsAt) - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

export function offerLeftText(endsAt?: string | Date | null): string | null {
  const d = offerDaysLeft(endsAt);
  if (d === null) return null;
  if (d <= 0) return 'انتهى العرض';
  if (d === 1) return '⏳ آخر يوم في العرض';
  if (d === 2) return '⏳ يومان فقط على انتهاء العرض';
  if (d <= 10) return `⏳ ${d} أيام فقط على انتهاء العرض`;
  return `⏳ ينتهي العرض خلال ${d} يوماً`;
}

export function offerEndDate(endsAt?: string | Date | null): string | null {
  if (!endsAt) return null;
  return new Date(endsAt).toLocaleDateString('ar-YE', { day: 'numeric', month: 'long', year: 'numeric' });
}
