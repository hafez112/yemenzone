'use client';
import { useEffect, useRef, useState } from 'react';

// 📝 محرر نصوص خفيف بلا مكتبات — عريض/مائل/عناوين/قوائم/محاذاة/ألوان/روابط
// يحفظ HTML نظيفاً (يُعقّم من السكربتات قبل الحفظ)
function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|form|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|form|link|meta)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2');
}

const COLORS = ['#1e1b2e', '#6C3DF5', '#0d9488', '#dc2626', '#d97706', '#2563eb'];

const BTNS: { cmd: string; arg?: string; icon: string; title: string }[] = [
  { cmd: 'bold', icon: 'B', title: 'عريض' },
  { cmd: 'italic', icon: 'I', title: 'مائل' },
  { cmd: 'underline', icon: 'U', title: 'تحته خط' },
  { cmd: 'formatBlock', arg: 'h3', icon: 'H', title: 'عنوان فرعي' },
  { cmd: 'formatBlock', arg: 'p', icon: '¶', title: 'نص عادي' },
  { cmd: 'insertUnorderedList', icon: '•≡', title: 'قائمة نقطية' },
  { cmd: 'insertOrderedList', icon: '1≡', title: 'قائمة رقمية' },
  { cmd: 'justifyRight', icon: '⇥', title: 'محاذاة يمين' },
  { cmd: 'justifyCenter', icon: '≡', title: 'توسيط' },
];

export default function RichTextEditor({ value, onChange, placeholder, minHeight }: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  const [showColors, setShowColors] = useState(false);

  // مزامنة القيمة الخارجية (توليد الذكاء/فتح التعديل) دون كسر موضع المؤشر أثناء الكتابة
  useEffect(() => {
    if (ref.current && !focused.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const emit = () => onChange(sanitizeHtml(ref.current?.innerHTML || ''));

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const addLink = () => {
    const url = prompt('🔗 رابط (https://...)');
    if (url && /^https?:\/\//.test(url)) exec('createLink', url);
  };

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white focus-within:border-purple-400 transition-colors">
      {/* شريط الأدوات */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-100">
        {BTNS.map((b, i) => (
          <button key={i} type="button" title={b.title}
            onMouseDown={(e) => { e.preventDefault(); exec(b.cmd, b.arg); }}
            className={`min-w-8 h-8 px-1.5 rounded-lg text-sm font-black text-gray-600 hover:bg-purple-100 hover:text-purple-700 transition-colors ${b.cmd === 'bold' ? 'font-black' : b.cmd === 'italic' ? 'italic' : b.cmd === 'underline' ? 'underline' : ''}`}>
            {b.icon}
          </button>
        ))}
        {/* الألوان */}
        <div className="relative">
          <button type="button" title="لون النص" onMouseDown={(e) => { e.preventDefault(); setShowColors(!showColors); }}
            className="min-w-8 h-8 px-1.5 rounded-lg text-sm font-black text-gray-600 hover:bg-purple-100 transition-colors">
            🎨
          </button>
          {showColors && (
            <div className="absolute top-9 right-0 z-20 bg-white rounded-xl shadow-xl border border-gray-100 p-2 flex gap-1.5 anim-bounce-in">
              {COLORS.map((c) => (
                <button key={c} type="button" onMouseDown={(e) => { e.preventDefault(); exec('foreColor', c); setShowColors(false); }}
                  className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                  style={{ background: c }} />
              ))}
            </div>
          )}
        </div>
        <button type="button" title="رابط" onMouseDown={(e) => { e.preventDefault(); addLink(); }}
          className="min-w-8 h-8 px-1.5 rounded-lg text-sm text-gray-600 hover:bg-purple-100 transition-colors">🔗</button>
        <button type="button" title="مسح التنسيق" onMouseDown={(e) => { e.preventDefault(); exec('removeFormat'); }}
          className="min-w-8 h-8 px-1.5 rounded-lg text-sm text-gray-600 hover:bg-red-100 transition-colors">🧹</button>
      </div>

      {/* منطقة الكتابة */}
      <div className="relative">
        <div ref={ref} contentEditable dir="rtl"
          onInput={emit}
          onFocus={() => { focused.current = true; }}
          onBlur={() => { focused.current = false; emit(); }}
          className="rich-editor min-h-28 max-h-72 overflow-y-auto px-4 py-3 text-sm leading-relaxed outline-none"
          style={{ unicodeBidi: 'plaintext', ...(minHeight ? { minHeight } : {}) }}
          suppressContentEditableWarning />
        {!value && (
          <div className="absolute top-3 right-4 text-sm text-gray-400 pointer-events-none">
            {placeholder || 'اكتب وصفاً غنياً: عناوين، قوائم، ألوان، روابط...'}
          </div>
        )}
      </div>
    </div>
  );
}
