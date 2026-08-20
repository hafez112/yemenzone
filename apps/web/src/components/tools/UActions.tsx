'use client';
import { toast } from '@/components/Toast';

// ♻️ أزرار مشاركة إعلان المستعمل — نسخ الرابط + واتساب
export default function UActions({ slug, title }: { slug: string; title: string }) {
  const url = `${typeof location !== 'undefined' ? location.origin : ''}/u/${slug}`;

  const copy = () => {
    navigator.clipboard.writeText(url)
      .then(() => toast('📋 نُسخ رابط الإعلان — شاركه أينما تريد'))
      .catch(() => toast('تعذّر النسخ', 'error'));
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={copy}
        className="py-3 rounded-2xl bg-white/10 border border-white/15 font-bold text-sm hover:bg-white/20 transition-colors">
        📋 نسخ الرابط
      </button>
      <a href={`https://wa.me/?text=${encodeURIComponent(`♻️ ${title} — إعلان في سوق المستعمل:\n${url}`)}`} target="_blank" rel="noreferrer"
        className="py-3 rounded-2xl bg-white/10 border border-white/15 font-bold text-sm hover:bg-white/20 transition-colors text-center">
        📤 شارك الإعلان
      </a>
    </div>
  );
}
