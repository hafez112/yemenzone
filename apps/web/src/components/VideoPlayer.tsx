'use client';
import { imgUrl } from '@/lib/api';
import { videoSource } from '@/lib/video';

// ═══ مشغل فيديو موحد — يدعم يوتيوب والملفات المرفوعة وروابط التضمين ═══
export default function VideoPlayer({ url, title = '' }: { url?: string | null; title?: string }) {
  const v = videoSource(url);
  if (!v) return null;

  if (v.type === 'file') {
    return (
      <div className="video-frame">
        <video controls preload="metadata" playsInline src={imgUrl(v.src)} />
      </div>
    );
  }
  return (
    <div className="video-frame">
      <iframe src={v.src} title={title} loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen />
    </div>
  );
}
