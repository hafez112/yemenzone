'use client';
import { useRef, useState } from 'react';
import { apiUpload, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';

// ═══ رفع صور من الجهاز — معاينة فورية + ضغط WebP في الخادم ═══
// endpoint: مسار الرفع (مثال: /seller/upload أو /admin/ads/upload)
// field: اسم الحقل الذي يتوقعه الخادم (images | image)
export default function ImageUpload({
  endpoint, field = 'image', value, onChange, label = '📷 رفع صورة من الجهاز',
  hint, ratio = 'aspect-video',
}: {
  endpoint: string;
  field?: string;
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  ratio?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('⚠️ الحد الأقصى 5 ميجابايت', 'error'); return; }
    setUploading(true);
    try {
      const r = await apiUpload(endpoint, field, file);
      const url = r.url || r.urls?.[0];
      if (!url) throw new Error('لم يُرجع الخادم رابطاً');
      onChange(url);
      toast('✅ رُفعت الصورة بنجاح');
    } catch (err: any) { toast(err.message, 'error'); }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={pick} className="hidden" />
      {value ? (
        <div className={`relative ${ratio} rounded-2xl overflow-hidden border-2 border-purple-200 group`}>
          <img src={imgUrl(value)} alt="معاينة" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="bg-white text-gray-800 text-xs font-extrabold px-3 py-2 rounded-xl">
              🔄 تغيير
            </button>
            <button type="button" onClick={() => onChange('')}
              className="bg-red-500 text-white text-xs font-extrabold px-3 py-2 rounded-xl">
              🗑️ إزالة
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className={`w-full ${ratio} rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/50 flex flex-col items-center justify-center gap-1 text-purple-500 hover:bg-purple-50 transition-all disabled:opacity-50`}>
          <span className="text-3xl">{uploading ? '⏳' : '📷'}</span>
          <span className="text-xs font-extrabold">{uploading ? 'جاري الرفع...' : label}</span>
          {hint && !uploading && <span className="text-[10px] text-gray-400">{hint}</span>}
        </button>
      )}
    </div>
  );
}
