'use client';
import { useEffect, useRef, type ReactNode } from 'react';

// 🧩 مكونات وأنماط مشتركة لخدمات المنصة — ثيم زجاجي داكن موحد RTL

export const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-lime-400 placeholder:text-white/30 transition-colors';
export const lbl = 'text-xs font-bold text-white/60 block mb-1.5';
export const card = 'rounded-3xl border border-white/10 bg-white/5 p-4';
export const btnP = 'px-4 py-2.5 rounded-xl text-sm font-extrabold text-white bg-gradient-to-l from-lime-500 to-emerald-600 shadow-lg active:scale-95 transition disabled:opacity-50';
export const btnS = 'px-3 py-2 rounded-xl text-xs font-bold bg-white/10 text-white/80 hover:bg-white/20 active:scale-95 transition';
export const btnD = 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/15 text-red-300 hover:bg-red-500/25 transition';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={lbl}>{label}</span>
      {children}
    </label>
  );
}

// 📊 بطاقة إحصائية صغيرة
export function Stat({ icon, label, value, tone = 'text-white' }: { icon: string; label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
      <div className="text-lg mb-0.5">{icon}</div>
      <div className={`text-base font-black leading-tight ${tone}`}>{value}</div>
      <div className="text-[10px] text-white/50 font-bold mt-0.5">{label}</div>
    </div>
  );
}

// 🕳️ حالة فارغة أنيقة
export function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 py-10 text-center">
      <div className="text-4xl mb-2 opacity-60">{icon}</div>
      <p className="text-xs text-white/50 font-bold">{text}</p>
    </div>
  );
}

// 🏷️ شريط اختيار (chips)
export function Chips<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${value === o.id ? 'bg-gradient-to-l from-lime-500 to-emerald-600 text-white shadow-lg' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// 📱 QR فوري — يُحمّل كسولاً ويعمل بالكامل داخل الجهاز
export function QrView({ data, size = 180, color = '#0f172a' }: { data: string; size?: number; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const qr = useRef<any>(null);
  useEffect(() => {
    if (!data) { if (ref.current) ref.current.innerHTML = ''; qr.current = null; return; }
    (async () => {
      const { default: QRCodeStyling } = await import('qr-code-styling');
      const opts = {
        width: size, height: size, data, margin: 4,
        dotsOptions: { color, type: 'extra-rounded' as const },
        backgroundOptions: { color: '#ffffff' },
      };
      if (!qr.current) { qr.current = new QRCodeStyling(opts); if (ref.current) { ref.current.innerHTML = ''; qr.current.append(ref.current); } }
      else qr.current.update(opts);
    })();
  }, [data, size, color]);
  return <div ref={ref} className="rounded-2xl overflow-hidden bg-white p-1 inline-block" style={{ width: size + 8, height: size + 8 }} />;
}

// 📋 نسخ نص مع تأكيد
export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

// 💬 رقم واتساب بصيغة دولية يمنية
export function waIntl(phone: string): string {
  const p = (phone || '').replace(/[^0-9]/g, '');
  if (!p) return '';
  return p.startsWith('967') ? p : '967' + p.replace(/^0/, '');
}

export function waLink(phone: string, msg: string): string {
  const intl = waIntl(phone);
  return intl ? `https://wa.me/${intl}${msg ? `?text=${encodeURIComponent(msg)}` : ''}` : '';
}

// 📅 تنسيقات تاريخ عربية خفيفة
export const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('ar-YE', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return iso; }
};
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const monthKey = (iso: string) => (iso || '').slice(0, 7);

export const uid = () => Date.now() + Math.floor(Math.random() * 1000);
