'use client';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════
//  🧰 نظام اللوحات الموحد (الجلسة 5)
//  مكوّنات مشتركة تخدم لوحات: البائع (فاتح) / الإدارة (داكن) / السائق
//  مبنية على طبقة التصميم: glass / glass-dark / section-chip / f-* / card-hover
// ═══════════════════════════════════════════════════════════

// 📊 بطاقة إحصاء موحدة — بلاطة أيقونة ملوّنة + رقم كبير + تسمية
export function DashStat({ icon, value, label, color = '#6C3DF5', href, dark, sub }: {
  icon: string; value: React.ReactNode; label: string; color?: string;
  href?: string; dark?: boolean; sub?: string;
}) {
  const inner = (
    <div className={`${dark ? 'glass-dark' : 'glass'} rounded-3xl p-4 card-hover relative overflow-hidden group h-full`}>
      <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full opacity-15 group-hover:opacity-30 transition-opacity"
        style={{ background: color }} />
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base mb-2 relative"
        style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
        {icon}
      </div>
      <div className={`f-2xl font-black leading-none relative ${dark ? 'text-white' : 'text-gray-800'}`}>{value}</div>
      <div className="f-xs font-bold mt-1 relative" style={{ color }}>{label}</div>
      {sub && <div className={`text-[10px] mt-0.5 relative ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{sub}</div>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

// 🧩 لوحة قسم موحدة — رأس برقاقة أيقونة متدرجة + رابط اختياري + محتوى
export function DashPanel({ icon, title, href, hrefLabel = 'الكل ←', dark, extra, children, className = '' }: {
  icon: string; title: string; href?: string; hrefLabel?: string;
  dark?: boolean; extra?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`${dark ? 'glass-dark' : 'glass'} rounded-3xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className={`font-black f-lg flex items-center gap-2.5 min-w-0 ${dark ? 'text-white' : 'text-gray-800'}`}>
          <span className="section-chip shrink-0" style={{ width: '2.2rem', height: '2.2rem', fontSize: '1.05rem' }}>{icon}</span>
          <span className="truncate">{title}</span>
        </h2>
        <span className="flex items-center gap-3 shrink-0">
          {extra}
          {href && (
            <Link href={href} className="f-xs font-bold hover:underline"
              style={{ color: dark ? '#c4b5fd' : 'var(--primary)' }}>
              {hrefLabel}
            </Link>
          )}
        </span>
      </div>
      {children}
    </section>
  );
}

// 🈳 حالة فارغة موحدة
export function DashEmpty({ icon = '✨', text, dark }: { icon?: string; text: string; dark?: boolean }) {
  return (
    <div className={`text-center py-8 f-sm font-bold ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
      <div className="text-4xl mb-2 opacity-60">{icon}</div>
      {text}
    </div>
  );
}

// 🏷️ شارة حالة موحدة بالألوان الدلالية
const TONES: Record<string, { bg: string; fg: string }> = {
  ok:      { bg: 'rgba(5,150,105,.12)',  fg: '#059669' },
  warn:    { bg: 'rgba(217,119,6,.12)',  fg: '#b45309' },
  error:   { bg: 'rgba(220,38,38,.12)',  fg: '#dc2626' },
  info:    { bg: 'rgba(37,99,235,.12)',  fg: '#2563eb' },
  neutral: { bg: 'rgba(107,114,128,.12)', fg: '#4b5563' },
};
export function DashBadge({ tone = 'neutral', label }: { tone?: keyof typeof TONES; label: string }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: t.bg, color: t.fg }}>
      {label}
    </span>
  );
}
