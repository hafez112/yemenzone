'use client';
import { toast } from '@/components/Toast';

// 🔗 أزرار مشاركة صفحة «بع برابط واحد» — نسخ + واتساب
export default function QsActions({ slug, name }: { slug: string; name: string }) {
  const url = `${typeof location !== 'undefined' ? location.origin : 'https://yemenzone1.com'}/q/${slug}`;

  const copy = () => {
    navigator.clipboard.writeText(url)
      .then(() => toast('📋 نُسخ رابط المنتج'))
      .catch(() => toast('تعذّر النسخ', 'error'));
  };
  const wa = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`🛍️ ${name}\n${url}`)}`, '_blank');
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={copy} className="py-3 rounded-2xl bg-white/10 border border-white/15 font-bold text-sm hover:bg-white/20 transition-colors">📋 نسخ الرابط</button>
      <button onClick={wa} className="py-3 rounded-2xl bg-white/10 border border-white/15 font-bold text-sm hover:bg-white/20 transition-colors">📤 مشاركة واتساب</button>
    </div>
  );
}
