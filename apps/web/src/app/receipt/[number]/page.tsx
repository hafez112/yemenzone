'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getUser, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';
import {
  InvoiceSheet, InvoiceMasthead, PartyCards,
  PayBanner, InvoiceFooter, PrintToolbar,
} from '@/components/invoice/InvoiceDoc';

// 🧾 سند الدفع — فاتورة مدفوعات المنصة (اشتراك/إعلان/شحن/طلب) بطباعة ملوّنة
const PURPOSE_AR: Record<string, { label: string; icon: string }> = {
  subscription: { label: 'اشتراك خطة', icon: '⭐' },
  order:        { label: 'دفع طلب', icon: '📦' },
  topup:        { label: 'شحن محفظة', icon: '💰' },
  pservice:     { label: 'خدمة منصة (إعلان/توثيق)', icon: '📢' },
};
const STATUS_AR: Record<string, { label: string; tone: 'ok' | 'warn' | 'error' }> = {
  pending:  { label: '⏳ قيد المراجعة', tone: 'warn' },
  approved: { label: '✅ معتمد', tone: 'ok' },
  rejected: { label: '❌ مرفوض', tone: 'error' },
};

export default function ReceiptPage() {
  const { number } = useParams<{ number: string }>();
  const { list } = useCurrency();
  const router = useRouter();
  const [p, setP] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api(`/v1/payments/receipt/${number}`)
      .then(setP)
      .catch((e) => { setErr(e.message); toast(e.message, 'error'); });
  }, [number]);

  if (err) return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="text-center"><div className="text-5xl mb-3">🚫</div><p className="font-bold text-gray-600">{err}</p></div>
    </main>
  );
  if (!p) return <main className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="skeleton w-full max-w-2xl h-96 rounded-3xl mx-4" /></main>;

  const purpose = PURPOSE_AR[p.purpose] || { label: p.purpose, icon: '🧾' };
  const st = STATUS_AR[p.status] || { label: p.status, tone: 'warn' as const };
  const stamp = p.status === 'approved' ? { text: 'معتمد', color: '#067A55' }
    : p.status === 'rejected' ? { text: 'مرفوض', color: '#B42323' }
    : undefined;

  const methodLabel = p.method === 'cash' ? 'تحويل نقدي/محفظة يمنية'
    : p.method === 'card' ? 'بطاقة يمن زون'
    : p.gateway?.name ? `بوابة: ${p.gateway.name}`
    : p.method;

  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/receipt/${encodeURIComponent(p.number)}`
    : p.number;

  return (
    <main className="min-h-screen pt-28 pb-6 px-3" style={{ background: 'linear-gradient(180deg, #FBF3E0, #F7F7FC)' }}>
      <PrintToolbar />

      <InvoiceSheet stamp={stamp}>
        <InvoiceMasthead
          docType="سند دفع"
          number={p.number}
          title="منصة يمن زون"
          subtitle="مركز المدفوعات — yemenzone1.com"
          chip={{ label: st.label, tone: st.tone }}
          logo={
            <div className="w-14 h-14 rounded-2xl grid place-items-center text-2xl shrink-0"
              style={{ background: 'rgba(255,184,0,.25)', border: '2px solid rgba(255,255,255,.35)' }}>
              {purpose.icon}
            </div>
          }
        />

        <PartyCards
          from={{ label: 'استلمتها', lines: ['منصة يمن زون', 'مركز المدفوعات'] }}
          to={{ label: 'دفعها', lines: [
            p.payer?.name || '—',
            p.payer?.phone,
            `التاريخ: ${new Date(p.createdAt).toLocaleDateString('ar-YE')}`,
          ] }}
        />

        {/* مبلغ السند — بطاقة بارزة */}
        <div className="px-6 mt-5">
          <div className="rounded-2xl p-[1.5px]" style={{ background: 'linear-gradient(135deg, #FFB800, #6C3DF5, #00B3A4)' }}>
            <div className="rounded-2xl bg-white p-5 text-center">
              <div className="text-[11px] font-black" style={{ color: '#8A86A3' }}>{purpose.icon} {purpose.label}</div>
              <div className="font-black mt-1" style={{ fontSize: 'var(--fs-3xl)', background: 'linear-gradient(90deg, #92600A, #6C3DF5)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {Number(p.amount).toLocaleString()} <span style={{ fontSize: 'var(--fs-base)' }}>{list.find((c) => c.code === String(p.currency || 'YER').toUpperCase())?.symbol || p.currency || 'ر.ي'}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: '#6B6685' }}>💳 {methodLabel}</div>
            </div>
          </div>
        </div>

        <PayBanner items={[
          { icon: purpose.icon, text: `الغرض: ${purpose.label}`, tone: 'neutral' },
          { icon: st.label.split(' ')[0], text: `الحالة: ${st.label.split(' ').slice(1).join(' ')}`, tone: st.tone },
          ...(p.reviewedAt ? [{ icon: '🕐', text: `رُوجع: ${new Date(p.reviewedAt).toLocaleDateString('ar-YE')}`, tone: 'info' as const }] : []),
        ]} />

        {p.proofImage && (
          <div className="px-6 mt-4">
            <div className="text-[10px] font-black mb-1.5" style={{ color: '#8A86A3' }}>📎 إثبات التحويل المرفق</div>
            <img src={imgUrl(p.proofImage)} alt="إثبات الدفع" className="rounded-2xl max-h-64 object-contain mx-auto" style={{ border: '1px solid #ECE7FB' }} />
          </div>
        )}

        <InvoiceFooter
          thanks="شكراً لتعاملكم مع منصة يمن زون 🌟"
          note="سند دفع صادر إلكترونياً ولا يتطلب توقيعاً — امسح رمز QR للتحقق من صحة السند"
          qr={{ value: verifyUrl, caption: 'تحقق من السند' }}
        />
      </InvoiceSheet>
    </main>
  );
}
