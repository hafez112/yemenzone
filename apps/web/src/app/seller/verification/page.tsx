'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';
import ImageUpload from '@/components/ImageUpload';
import { kindInfo } from '@/lib/activity';

// 🎖️ توثيق المتجر — طلب الشارة الزرقاء بمراجعة وثيقة رسمية
const DOC_TYPES = [
  { id: 'id',         name: '🪪 بطاقة شخصية / جواز سفر', desc: 'للأفراد والمتاجر الناشئة' },
  { id: 'commercial', name: '📜 سجل تجاري / رخصة مزاولة', desc: 'للشركات والمؤسسات المسجلة' },
  { id: 'other',      name: '📄 وثيقة أخرى',              desc: 'أي إثبات رسمي لنشاطك التجاري' },
];

const STATUS: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  pending:  { label: 'قيد المراجعة', bg: '#fef3c7', color: '#92400e', icon: '⏳' },
  approved: { label: 'تم القبول',    bg: '#d1fae5', color: '#065f46', icon: '✅' },
  rejected: { label: 'مرفوض',        bg: '#fee2e2', color: '#991b1b', icon: '❌' },
};

export default function SellerVerificationPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [docType, setDocType] = useState('commercial');
  const [docImage, setDocImage] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => api('/stores/my/verification').then(setData).catch((e) => toast(e.message, 'error'));

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    load();
  }, []);

  const submit = async () => {
    if (!docImage) { toast('⚠️ ارفع صورة الوثيقة أولاً', 'error'); return; }
    setSending(true);
    try {
      await api('/stores/my/verification', {
        method: 'POST',
        body: JSON.stringify({ docType, docImage, notes }),
      });
      toast('📨 أُرسل طلبك — ستصلك النتيجة فور مراجعة الإدارة');
      setDocImage(''); setNotes('');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  };

  const doc = DOC_TYPES.find((d) => d.id === docType)!;

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🎖️ توثيق {kindInfo(store).yours}</h1>
          <p className="text-sm text-gray-500 mb-4">الشارة الزرقاء ترفع ثقة الزبائن وتُميّزك في البحث والدليل</p>

          {/* حالة التوثيق */}
          {data?.verified ? (
            <div className="card text-center" style={{ background: 'linear-gradient(135deg,#eff6ff,#f0fdfa)', border: '2px solid #bfdbfe' }}>
              <div className="text-5xl mb-2">🎖️</div>
              <h2 className="!mb-1" style={{ color: '#1d4ed8' }}>{kindInfo(store).yours} موثق!</h2>
              <p className="text-sm text-gray-600 mb-3">تظهر الشارة الزرقاء بجانب اسمك في كل المنصة</p>
              <Link href={`/store/${store?.slug}/certificate`} className="btn primary small">
                📜 شهادة التوثيق
              </Link>
            </div>
          ) : data?.pending ? (
            <div className="card text-center" style={{ background: '#fffbeb', border: '2px solid #fde68a' }}>
              <div className="text-4xl mb-2">⏳</div>
              <h2 className="!mb-1" style={{ color: '#92400e' }}>طلبك قيد المراجعة</h2>
              <p className="text-sm text-gray-600">تراجع الإدارة وثيقتك الآن — تصلك النتيجة في تنبيه 🔔 وعادة خلال ٢٤–٤٨ ساعة</p>
            </div>
          ) : (
            <>
              {/* نموذج الطلب */}
              <div className="card">
                <h2>📤 تقديم طلب توثيق</h2>

                <label className="block text-xs font-extrabold text-gray-500 mb-1">نوع الوثيقة</label>
                <div className="grid gap-2 mb-3">
                  {DOC_TYPES.map((d) => (
                    <button key={d.id} type="button" onClick={() => setDocType(d.id)}
                      className="text-right rounded-xl px-3 py-2.5 transition-all"
                      style={docType === d.id
                        ? { border: '2px solid var(--primary)', background: '#faf5ff' }
                        : { border: '1.5px solid #e5e7eb', background: '#fff' }}>
                      <b className="text-sm block">{d.name}</b>
                      <span className="text-[11px] text-gray-400">{d.desc}</span>
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-extrabold text-gray-500 mb-1">صورة الوثيقة <span className="text-red-400">*</span></label>
                <ImageUpload
                  endpoint="/stores/my/verification/upload"
                  value={docImage}
                  onChange={setDocImage}
                  label="📷 ارفع صورة واضحة للوثيقة"
                  hint={`${doc.name} — تأكد من وضوح الاسم والأرقام`}
                />

                <label className="block text-xs font-extrabold text-gray-500 mt-3 mb-1">ملاحظات إضافية (اختياري)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="مثال: الاسم في الوثيقة يطابق اسم المتجر..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
                  style={{ background: '#fff', resize: 'vertical' }}
                />

                <button className="btn primary w-full justify-center mt-2" onClick={submit} disabled={sending || !docImage}>
                  {sending ? '⏳ جارٍ الإرسال...' : '📨 إرسال الطلب للمراجعة'}
                </button>
              </div>

              {/* المتطلبات */}
              <div className="ai-card card">
                <b className="text-sm">💡 قبل أن ترسل</b>
                <ul className="text-xs text-gray-600 mt-1 space-y-1 list-none">
                  <li>✅ صورة واضحة — الاسم والأرقام مقروءة بدون قص</li>
                  <li>✅ الوثيقة سارية وتخصّك أو تخص نشاطك التجاري</li>
                  <li>✅ اسم متجرك وبياناته مكتملة في الإعدادات</li>
                  <li>🔒 تُستخدم الوثيقة للمراجعة فقط ولا تظهر للزبائن</li>
                </ul>
              </div>
            </>
          )}

          {/* سجل الطلبات */}
          {data?.requests?.length > 0 && (
            <div className="card">
              <h2>🗂️ سجل الطلبات</h2>
              {data.requests.map((r: any) => {
                const st = STATUS[r.status] || STATUS.pending;
                const t = DOC_TYPES.find((d) => d.id === r.docType);
                return (
                  <div key={r.id} className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
                    <button type="button" onClick={() => window.open(imgUrl(r.docImage), '_blank')}
                      className="w-14 h-14 rounded-xl shrink-0 overflow-hidden border border-gray-200"
                      style={{ background: `url(${imgUrl(r.docImage)}) center/cover` }}
                      title="عرض الوثيقة" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <b className="text-sm">{t?.name || r.docType}</b>
                        <span className="badge" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(r.createdAt).toLocaleDateString('ar-YE', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      {r.status === 'rejected' && r.rejectReason && (
                        <div className="text-xs mt-1 px-2 py-1.5 rounded-lg" style={{ background: '#fef2f2', color: '#991b1b' }}>
                          ❌ السبب: {r.rejectReason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
