'use client';
import { useRef, useState } from 'react';
import { apiUpload } from '@/lib/api';
import { toast } from '@/components/Toast';
import VideoPlayer from '@/components/VideoPlayer';

// ═══ إدخال فيديو توضيحي — رفع من الجهاز (حتى 60MB) أو لصق رابط ═══
export default function VideoInput({
  endpoint, value, onChange,
}: {
  endpoint: string;            // مسار الرفع (مثال: /admin/platform-services/upload-video)
  value?: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'link'>('upload');
  const [link, setLink] = useState('');
  const [uploading, setUploading] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 60 * 1024 * 1024) { toast('⚠️ الحد الأقصى 60 ميجابايت', 'error'); return; }
    setUploading(true);
    try {
      const r = await apiUpload(endpoint, 'video', file);
      if (!r.url) throw new Error('لم يُرجع الخادم رابطاً');
      onChange(r.url);
      toast('✅ رُفع الفيديو بنجاح');
    } catch (err: any) { toast(err.message, 'error'); }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function applyLink() {
    const u = link.trim();
    if (!u) return;
    if (!/^(https?:\/\/|\/uploads)/i.test(u)) { toast('⚠️ الرابط يجب أن يبدأ بـ https://', 'error'); return; }
    onChange(u);
    setLink('');
    toast('✅ أُرفق رابط الفيديو');
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <b className="text-sm">🎬 فيديو توضيحي (اختياري)</b>
        {value && (
          <button type="button" onClick={() => onChange('')}
            className="text-xs font-extrabold text-red-500">🗑️ إزالة الفيديو</button>
        )}
      </div>

      {value ? (
        <VideoPlayer url={value} title="معاينة" />
      ) : (
        <>
          <div className="tabs mb-2">
            <button type="button" className={'tab' + (mode === 'upload' ? ' active' : '')} onClick={() => setMode('upload')}>📤 رفع من الجهاز</button>
            <button type="button" className={'tab' + (mode === 'link' ? ' active' : '')} onClick={() => setMode('link')}>🔗 رابط فيديو</button>
          </div>

          {mode === 'upload' ? (
            <>
              <input ref={inputRef} type="file" accept="video/*,.mp4,.webm,.mov,.m4v" onChange={pick} className="hidden" />
              <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
                className="w-full py-6 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/50 flex flex-col items-center justify-center gap-1 text-purple-500 hover:bg-purple-50 transition-all disabled:opacity-50">
                <span className="text-3xl">{uploading ? '⏳' : '🎬'}</span>
                <span className="text-xs font-extrabold">{uploading ? 'جاري رفع الفيديو…' : 'اختر فيديو من جهازك'}</span>
                <span className="text-[10px] text-gray-400">mp4 / webm / mov — حتى 60 ميجابايت</span>
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <input className="input flex-1" dir="ltr" placeholder="https://youtube.com/watch?v=…"
                value={link} onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyLink())} />
              <button type="button" className="btn small shrink-0" onClick={applyLink}>إرفاق</button>
            </div>
          )}
          {mode === 'link' && <p className="text-[10px] text-gray-400 mt-1">يدعم: يوتيوب (watch / youtu.be / shorts) · فيميو · رابط mp4 مباشر</p>}
        </>
      )}
    </div>
  );
}
