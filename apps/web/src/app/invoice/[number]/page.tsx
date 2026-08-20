'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getUser, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import {
  InvoiceSheet, InvoiceMasthead, PartyCards, ItemsTable,
  TotalsPanel, PayBanner, InvoiceFooter, PrintToolbar,
} from '@/components/invoice/InvoiceDoc';

// 🧾 فاتورة الطلب — نظام فواتير يمن زون الموحد (طباعة ملوّنة + QR تحقق)
const STATUS_AR: Record<string, { label: string; tone: 'ok' | 'warn' | 'error' | 'info' | 'neutral' }> = {
  pending:    { label: '⏳ قيد المراجعة', tone: 'warn' },
  confirmed:  { label: '✅ مؤكد', tone: 'info' },
  processing: { label: '📦 قيد التجهيز', tone: 'info' },
  shipped:    { label: '🚚 في الطريق', tone: 'info' },
  delivered:  { label: '✅ سُلّم', tone: 'ok' },
  completed:  { label: '🌟 مكتمل', tone: 'ok' },
  cancelled:  { label: '❌ ملغي', tone: 'error' },
  refunded:   { label: '↩️ مسترجع', tone: 'error' },
};
const PAY_AR: Record<string, string> = { cash: 'الدفع عند الاستلام', card: 'بطاقة يمن زون' };

export default function InvoicePage() {
  const { number } = useParams<{ number: string }>();
  const router = useRouter();
  const [o, setO] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api(`/v1/orders/invoice/${number}`)
      .then(setO)
      .catch((e) => { setErr(e.message); toast(e.message, 'error'); });
  }, [number]);

  if (err) return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="text-center"><div className="text-5xl mb-3">🚫</div><p className="font-bold text-gray-600">{err}</p></div>
    </main>
  );
  if (!o) return <main className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="skeleton w-full max-w-2xl h-96 rounded-3xl mx-4" /></main>;

  const sym = 'ر.ي';
  const st = STATUS_AR[o.status] || { label: o.status, tone: 'neutral' as const };
  const stamp = o.status === 'cancelled' ? { text: 'ملغاة', color: '#B42323' }
    : o.status === 'refunded' ? { text: 'مسترجعة', color: '#B42323' }
    : o.status === 'completed' ? { text: 'مكتملة', color: '#067A55' }
    : undefined;

  const payItems = [
    { icon: '💳', text: `طريقة الدفع: ${PAY_AR[o.paymentMethod] || o.paymentMethod || '—'}`, tone: 'neutral' as const },
    o.payment
      ? o.payment.status === 'approved'
        ? { icon: '✅', text: 'الدفع معتمد', tone: 'ok' as const }
        : o.payment.status === 'pending'
          ? { icon: '⏳', text: 'إثبات الدفع قيد المراجعة', tone: 'warn' as const }
          : { icon: '❌', text: 'إثبات مرفوض', tone: 'error' as const }
      : o.paymentMethod === 'cash'
        ? { icon: '💵', text: 'يُدفع عند الاستلام', tone: 'info' as const }
        : { icon: '💳', text: '—', tone: 'neutral' as const },
  ];

  const trackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/track?number=${encodeURIComponent(o.number)}&phone=${encodeURIComponent(o.customerPhone || '')}`
    : o.number;

  return (
    <main className="min-h-screen pt-28 pb-6 px-3" style={{ background: 'linear-gradient(180deg, #EFEAFB, #F7F7FC)' }}>
      <PrintToolbar />

      <InvoiceSheet stamp={stamp}>
        <InvoiceMasthead
          docType="فاتورة"
          number={o.number}
          title={o.store.name}
          subtitle="منصة يمن زون — yemenzone1.com"
          chip={{ label: st.label, tone: st.tone }}
          logo={o.store.logo
            ? <img src={imgUrl(o.store.logo)} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" style={{ border: '2px solid rgba(255,255,255,.4)' }} />
            : undefined}
        />

        <PartyCards
          from={{ label: 'فاتورة من', lines: [o.store.name, o.store.phone, 'يمن زون'] }}
          to={{ label: 'فاتورة إلى', lines: [
            o.customerName,
            o.customerPhone,
            o.address ? `📍 ${o.address}` : null,
            `التاريخ: ${new Date(o.createdAt).toLocaleDateString('ar-YE')}`,
          ] }}
        />

        <ItemsTable
          columns={[
            { label: 'الصنف', align: 'right' },
            { label: 'الكمية', align: 'center', width: '60px' },
            { label: 'السعر', align: 'center', width: '90px' },
            { label: 'الإجمالي', align: 'left', width: '100px' },
          ]}
          rows={o.items.map((it: any) => [
            <b key="n">{it.name}</b>,
            <span key="q">{it.qty}</span>,
            <span key="p">{Number(it.price).toLocaleString()}</span>,
            <b key="t">{Number(it.qty * it.price).toLocaleString()}</b>,
          ])}
        />

        <TotalsPanel
          sym={sym}
          rows={[
            { label: 'المجموع الفرعي', value: Number(o.subtotal).toLocaleString() },
            ...(Number(o.discount) > 0 ? [{ label: 'الخصم', value: `-${Number(o.discount).toLocaleString()}`, tone: 'ok' as const }] : []),
            ...(Number(o.deliveryFee) > 0 ? [{ label: 'التوصيل والدفع', value: Number(o.deliveryFee).toLocaleString() }] : []),
          ]}
          total={{ label: 'الإجمالي', value: Number(o.total).toLocaleString() }}
        />

        <PayBanner items={payItems} />
        {o.notes && <p className="px-6 mt-3 text-xs" style={{ color: '#8A86A3' }}>📝 {o.notes}</p>}

        <InvoiceFooter
          thanks={`شكراً لتسوقكم من ${o.store.name} 🌟`}
          note="فاتورة صادرة إلكترونياً من منصة يمن زون ولا تتطلب توقيعاً — امسح رمز QR لتتبع طلبك والتحقق من الفاتورة"
          qr={{ value: trackUrl, caption: 'تتبع وتحقق' }}
        />
      </InvoiceSheet>
    </main>
  );
}
