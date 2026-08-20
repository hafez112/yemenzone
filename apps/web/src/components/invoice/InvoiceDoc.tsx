'use client';
// ═══════════════════════════════════════════════════════════════
//  🧾 نظام فواتير يمن زون الموحد — تصميم فاخر + طباعة ملوّنة
//  تستخدمه: فاتورة الطلب، كشف التسوية، وأي مستند مالي مستقبلاً
// ═══════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';

export const INK = {
  deep: '#1B1437',      // البنفسجي العميق للنصوص
  violet: '#6C3DF5',
  teal: '#00B3A4',
  gold: '#FFB800',
  soft: '#F6F4FF',
  line: '#ECE7FB',
};

// درجات الحالة الدلالية
export type Tone = 'ok' | 'warn' | 'error' | 'info' | 'neutral';
const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  ok:      { bg: '#E8FBF3', fg: '#067A55', border: '#9BE8C9' },
  warn:    { bg: '#FFF6E0', fg: '#92600A', border: '#F5D78A' },
  error:   { bg: '#FEECEC', fg: '#B42323', border: '#F5B5B5' },
  info:    { bg: '#EDF4FF', fg: '#1D4FD7', border: '#BCD4FB' },
  neutral: { bg: '#F3F2F7', fg: '#565270', border: '#DDD9EA' },
};

// ─── الورقة ─── مع ختم مائي اختياري (ملغي/مسترجع/مسوّى...)
export function InvoiceSheet({ children, stamp }: { children: React.ReactNode; stamp?: { text: string; color: string } }) {
  return (
    <div className="invoice-sheet relative max-w-2xl mx-auto bg-white rounded-[1.8rem] shadow-2xl overflow-hidden"
      style={{ color: INK.deep }}>
      {/* شريط علوي مذهّب رفيع */}
      <div style={{ height: 5, background: `linear-gradient(90deg, ${INK.gold}, ${INK.violet}, ${INK.teal}, ${INK.gold})` }} />
      {stamp && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none" style={{ zIndex: 5 }}>
          <span className="font-black border-8 rounded-3xl px-8 py-3"
            style={{
              fontSize: '3rem', transform: 'rotate(-14deg)', color: stamp.color,
              borderColor: stamp.color, opacity: 0.13, letterSpacing: 4,
            }}>
            {stamp.text}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── الترويسة الفاخرة: تدرّج عميق + زخارف دائرية + شعار ───
export function InvoiceMasthead({ docType, number, logo, title, subtitle, chip }: {
  docType: string; number?: string; logo?: React.ReactNode;
  title: string; subtitle?: string; chip?: { label: string; tone: Tone };
}) {
  return (
    <div className="relative p-6 text-white overflow-hidden"
      style={{ background: `linear-gradient(120deg, #2A1459 0%, ${INK.violet} 55%, ${INK.teal} 130%)` }}>
      {/* زخارف */}
      <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full" style={{ background: 'rgba(255,255,255,.08)' }} />
      <div className="absolute -bottom-14 left-24 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,.06)' }} />
      <div className="absolute top-4 left-1/3 w-16 h-16 rounded-full" style={{ background: 'rgba(255,184,0,.15)' }} />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {logo || (
            <div className="w-14 h-14 rounded-2xl grid place-items-center text-2xl shrink-0"
              style={{ background: 'rgba(255,255,255,.16)', border: '2px solid rgba(255,255,255,.35)' }}>🧾</div>
          )}
          <div>
            <div className="font-black text-lg leading-tight">{title}</div>
            {subtitle && <div className="text-[11px] opacity-85 mt-0.5">{subtitle}</div>}
          </div>
        </div>
        <div className="text-left shrink-0">
          <div className="inline-block px-4 py-1.5 rounded-xl font-black text-base"
            style={{ background: 'rgba(255,255,255,.14)', border: '1.5px solid rgba(255,255,255,.3)' }}>
            {docType}
          </div>
          {number && <div className="text-[11px] opacity-85 mt-1.5 font-bold" dir="ltr">{number}</div>}
          {chip && (
            <div className="mt-1.5">
              <StatusChip tone={chip.tone} label={chip.label} light />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── شارة حالة ───
export function StatusChip({ tone, label, light }: { tone: Tone; label: string; light?: boolean }) {
  const t = TONES[tone];
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black"
      style={light
        ? { background: 'rgba(255,255,255,.2)', color: '#fff', border: '1px solid rgba(255,255,255,.4)' }
        : { background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}>
      {label}
    </span>
  );
}

// ─── بطاقتا الأطراف (من/إلى) ───
export function PartyCards({ from, to }: {
  from: { label: string; lines: (string | null | undefined)[] };
  to: { label: string; lines: (string | null | undefined)[] };
}) {
  const Card = ({ label, lines, accent }: any) => (
    <div className="rounded-2xl p-3.5" style={{ background: INK.soft, border: `1px solid ${INK.line}` }}>
      <div className="text-[10px] font-black mb-1.5 flex items-center gap-1" style={{ color: INK.violet }}>
        <span className="w-4 h-0.5 rounded-full inline-block" style={{ background: accent }} />
        {label}
      </div>
      {lines.filter(Boolean).map((l: string, i: number) => (
        <div key={i} className={i === 0 ? 'font-extrabold text-sm' : 'text-xs mt-0.5'}
          style={i === 0 ? {} : { color: '#6B6685' }}
          dir={/^[\d+\s-]+$/.test(l) ? 'ltr' : 'rtl'}>
          {i > 0 && /^[\d+\s-]+$/.test(l) ? <span style={{ textAlign: 'right', display: 'block' }}>{l}</span> : l}
        </div>
      ))}
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-3 px-6 mt-5">
      <Card label={from.label} lines={from.lines} accent={INK.violet} />
      <Card label={to.label} lines={to.lines} accent={INK.teal} />
    </div>
  );
}

// ─── جدول الأصناف: ترويسة متدرّجة + صفوف مخطّطة ───
export function ItemsTable({ columns, rows, empty }: {
  columns: { label: string; align?: 'right' | 'center' | 'left'; width?: string }[];
  rows: (React.ReactNode)[][];
  empty?: string;
}) {
  const alignCls = (a?: string) => a === 'left' ? 'text-left' : a === 'center' ? 'text-center' : 'text-right';
  return (
    <div className="px-6 mt-5">
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${INK.line}` }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: `linear-gradient(90deg, ${INK.soft}, #EDFAF8)` }}>
              {columns.map((c, i) => (
                <th key={i} className={`py-2.5 px-3 text-[10px] font-black ${alignCls(c.align)}`}
                  style={{ color: INK.violet, width: c.width, borderBottom: `2px solid ${INK.line}` }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? '#FBFAFF' : '#fff', borderBottom: `1px solid ${INK.line}` }}>
                {r.map((cell, j) => (
                  <td key={j} className={`py-2.5 px-3 ${alignCls(columns[j]?.align)}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-center text-xs py-5" style={{ color: '#8A86A3' }}>{empty || 'لا توجد عناصر'}</p>
        )}
      </div>
    </div>
  );
}

// ─── لوحة الإجماليات: بطاقة بإطار متدرّج وإجمالي بارز ───
export function TotalsPanel({ rows, total, sym }: {
  rows: { label: string; value: string; tone?: Tone }[];
  total: { label: string; value: string };
  sym: string;
}) {
  return (
    <div className="px-6 mt-5 flex justify-start">
      <div className="w-full sm:w-80 rounded-2xl p-[1.5px]"
        style={{ background: `linear-gradient(135deg, ${INK.violet}, ${INK.teal})` }}>
        <div className="rounded-2xl bg-white p-4 space-y-2 text-sm">
          {rows.map((r, i) => {
            const t = r.tone ? TONES[r.tone] : null;
            return (
              <div key={i} className="flex justify-between items-center">
                <span style={{ color: '#6B6685' }}>{r.label}</span>
                <b style={t ? { color: t.fg } : {}}>{r.value} {sym}</b>
              </div>
            );
          })}
          <div className="flex justify-between items-center pt-2.5 mt-1"
            style={{ borderTop: `2px dashed ${INK.line}` }}>
            <span className="font-black text-base">{total.label}</span>
            <span className="font-black text-xl"
              style={{ background: `linear-gradient(90deg, ${INK.violet}, ${INK.teal})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {total.value} {sym}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── شريط الدفع/الحالة الملوّن ───
export function PayBanner({ items }: { items: { icon: string; text: string; tone: Tone }[] }) {
  return (
    <div className="px-6 mt-4 flex flex-wrap gap-2">
      {items.map((it, i) => {
        const t = TONES[it.tone];
        return (
          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold"
            style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}>
            {it.icon} {it.text}
          </span>
        );
      })}
    </div>
  );
}

// ─── رمز QR للتحقق (يُرسم على Canvas — يُطبع بجودة عالية) ───
export function InvoiceQR({ value, caption }: { value: string; caption?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let qr: any;
    import('qr-code-styling').then((m) => {
      const QRCodeStyling = m.default;
      qr = new QRCodeStyling({
        width: 92, height: 92, data: value, margin: 0,
        dotsOptions: { color: '#2A1459', type: 'rounded' },
        cornersSquareOptions: { color: INK.violet, type: 'extra-rounded' },
        cornersDotOptions: { color: INK.teal },
        backgroundOptions: { color: '#ffffff' },
      });
      if (ref.current) { ref.current.innerHTML = ''; qr.append(ref.current); }
    }).catch(() => {});
  }, [value]);
  return (
    <div className="text-center">
      <div className="inline-block p-1.5 rounded-xl bg-white" style={{ border: `1px solid ${INK.line}` }}>
        <div ref={ref} />
      </div>
      {caption && <div className="text-[9px] font-bold mt-1" style={{ color: '#8A86A3' }}>{caption}</div>}
    </div>
  );
}

// ─── التذييل: QR + شكر + شريط زخرفي ───
export function InvoiceFooter({ qr, thanks, note }: {
  qr?: { value: string; caption?: string }; thanks: string; note?: string;
}) {
  return (
    <div className="mt-6 px-6 pt-4 pb-5" style={{ background: '#FBFAFF', borderTop: `1.5px solid ${INK.line}` }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="font-extrabold text-sm" style={{ color: INK.violet }}>{thanks}</div>
          {note && <div className="text-[10px] mt-1 leading-relaxed" style={{ color: '#8A86A3' }}>{note}</div>}
        </div>
        {qr && <InvoiceQR value={qr.value} caption={qr.caption} />}
      </div>
      {/* شريط زخرفي سفلي */}
      <div className="mt-4 h-1.5 rounded-full"
        style={{ background: `repeating-linear-gradient(90deg, ${INK.violet} 0 14px, ${INK.soft} 14px 20px, ${INK.teal} 20px 34px, ${INK.soft} 34px 40px)` }} />
    </div>
  );
}

// ─── شريط أدوات الطباعة (لا يُطبع) ───
export function PrintToolbar() {
  return (
    <div className="no-print max-w-2xl mx-auto mb-4 flex gap-2">
      <button onClick={() => window.print()}
        className="flex-1 py-3.5 rounded-2xl text-white font-extrabold shadow-lg transition-transform active:scale-95"
        style={{ background: `linear-gradient(135deg, ${INK.violet}, ${INK.teal})` }}>
        🖨️ طباعة ملوّنة / حفظ PDF
      </button>
      <button onClick={() => history.back()}
        className="px-5 py-3.5 rounded-2xl bg-white font-bold text-gray-600 shadow">→ رجوع</button>
    </div>
  );
}
