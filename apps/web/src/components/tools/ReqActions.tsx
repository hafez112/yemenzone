'use client';
import { toast } from '@/components/Toast';

// 📤 مشاركة الطلب — نسخ الرابط + واتساب (كل مشاركة تعني تاجراً جديداً يراه)
export default function ReqActions({ slug, title }: { slug: string; title: string }) {
  const url = `${typeof location !== 'undefined' ? location.origin : 'https://yemenzone1.com'}/r/${slug}`;

  const copy = () => {
    navigator.clipboard.writeText(url)
      .then(() => toast('📋 نُسخ رابط الطلب'))
      .catch(() => toast('تعذّر النسخ', 'error'));
  };
  const wa = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`📢 مطلوب: ${title}\nمن يوفره؟ ردّ بعرضك هنا:\n${url}`)}`, '_blank');
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={copy} className="py-2.5 rounded-xl bg-gray-100 font-bold text-xs text-gray-700 hover:bg-gray-200 transition-colors">📋 نسخ رابط الطلب</button>
      <button onClick={wa} className="py-2.5 rounded-xl bg-green-100 font-bold text-xs text-green-700 hover:bg-green-200 transition-colors">📤 انشره للتجار واتساب</button>
    </div>
  );
}
