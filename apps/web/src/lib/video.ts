// ═══ تحديد نوع الفيديو ومصدر التضمين — يوتيوب / ملف مرفوع / رابط تضمين ═══
export type VideoSource = { type: 'youtube' | 'file' | 'embed'; src: string };

export function videoSource(url?: string | null): VideoSource | null {
  if (!url || !url.trim()) return null;
  const u = url.trim();
  // يوتيوب: watch?v= | youtu.be/ | shorts/ | embed/
  const yt = u.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}` };
  // ملف فيديو (مرفوع على المنصة أو رابط مباشر)
  if (u.startsWith('/uploads') || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u)) return { type: 'file', src: u };
  // أي رابط آخر يُعامل كتضمين جاهز (فيميو…)
  return { type: 'embed', src: u };
}
