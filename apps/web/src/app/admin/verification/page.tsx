'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';

// 🎖️ مراجعة طلبات توثيق المتاجر — الإدارة وحدها تمنح الشارة الزرقاء
const DOC_TYPES: Record<string, string> = {
  id: '🪪 بطاقة شخصية / جواز',
  commercial: '📜 سجل تجاري / رخصة',
  other: '📄 وثيقة أخرى',
};
const TABS = [
  { id: 'pending',  label: '⏳ قيد المراجعة' },
  { id: 'approved', label: '✅ مقبولة' },
  { id: 'rejected', label: '❌ مرفوضة' },
  { id: '',         label: '🗂️ الكل' },
];

export default function AdminVerificationPage() {
  const router = useRouter();
  const [tab, setTab] = useState('pending');
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [zoom, setZoom] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<any>(null); // الطلب الجاري رفضه
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function load(status = tab) {
    const list = await api(`/admin/verification${status ? `?status=${status}` : ''}`);
    setItems(list);
  }
  async function loadCounts() {
    const all = await api('/admin/verification');
    setCounts({
      pending: all.filter((r: any) => r.status === 'pending').length,
      approved: all.filter((r: any) => r.status === 'approved').length,
      rejected: all.filter((r: any) => r.status === 'rejected').length,
    });
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load().catch(() => router.push('/auth/admin-login'));
    loadCounts().catch(() => {});
  }, []);

  function switchTab(t: string) {
    setTab(t);
    setRejecting(null);
    load(t).catch((e) => toast(e.message, 'error'));
  }

  async function approve(id: string) {
    setBusy(true);
    try {
      await api(`/admin/verification/${id}/review`, { method: 'POST', body: JSON.stringify({ approve: true }) });
      toast('🎖️ مُنحت الشارة — وصل تنبيه للبائع');
      await load(); loadCounts().catch(() => {});
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  }

  async function reject() {
    if (!reason.trim()) return toast('⚠️ اكتب سبب الرفض', 'error');
    setBusy(true);
    try {
      await api(`/admin/verification/${rejecting.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ approve: false, reason: reason.trim() }),
      });
      toast('❌ رُفض الطلب مع ذكر السبب');
      setRejecting(null); setReason('');
      await load(); loadCounts().catch(() => {});
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  }

  return (
    <main className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(180deg, #0A0A14, #141428)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-white">🎖️ توثيق المتاجر</h1>
          <p className="text-xs text-gray-400 mt-1 mb-4">راجع وثائق البائعين وامنح الشارة الزرقاء — تُغلق الطلبات المكررة تلقائياً عند القبول</p>

          {/* عدّادات */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { k: 'pending', label: 'بانتظار المراجعة', color: 'text-amber-400' },
              { k: 'approved', label: 'موثق', color: 'text-emerald-400' },
              { k: 'rejected', label: 'مرفوض', color: 'text-red-400' },
            ].map((c) => (
              <div key={c.k} className="glass-dark rounded-2xl p-3 text-center">
                <div className={`text-xl font-black ${c.color}`}>{counts[c.k] ?? 0}</div>
                <div className="text-[10px] text-gray-400 font-bold">{c.label}</div>
              </div>
            ))}
          </div>

          {/* التبويبات */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => switchTab(t.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${tab === t.id ? 'text-white' : 'text-gray-400 bg-white/5'}`}
                style={tab === t.id ? { background: 'var(--primary)' } : {}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* القائمة */}
          {items.length === 0 && (
            <div className="glass-dark rounded-3xl p-10 text-center text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              لا توجد طلبات هنا
            </div>
          )}

          {items.map((r) => (
            <div key={r.id} className="glass-dark rounded-3xl p-4 mb-3 border border-white/5">
              <div className="flex flex-wrap gap-3">
                {/* الوثيقة */}
                <button onClick={() => setZoom(imgUrl(r.docImage))}
                  className="w-24 h-24 rounded-2xl shrink-0 overflow-hidden border-2 border-white/10 hover:border-purple-400 transition-colors"
                  style={{ background: `url(${imgUrl(r.docImage)}) center/cover` }}
                  title="🔍 تكبير الوثيقة" />

                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.store?.logo && (
                      <span className="w-7 h-7 rounded-lg inline-block" style={{ background: `url(${imgUrl(r.store.logo)}) center/cover` }} />
                    )}
                    <b className="text-white">{r.store?.name}</b>
                    {r.store?.isVerified && <span className="text-[10px] font-bold text-blue-400">🎖️ موثق</span>}
                    <span className={`badge ${r.status === 'pending' ? 'pending' : r.status === 'approved' ? 'active' : 'cancelled'}`}>
                      {r.status === 'pending' ? '⏳ قيد المراجعة' : r.status === 'approved' ? '✅ مقبول' : '❌ مرفوض'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {DOC_TYPES[r.docType] || r.docType} · {r.store?.seller?.name} · <span dir="ltr">{r.store?.seller?.phone}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    📅 {new Date(r.createdAt).toLocaleString('ar-YE')}
                    {r.reviewedAt && ` · رُوجع ${new Date(r.reviewedAt).toLocaleDateString('ar-YE')}`}
                  </div>
                  {r.notes && <div className="text-xs text-gray-300 mt-1 bg-white/5 rounded-lg px-2 py-1">📝 {r.notes}</div>}
                  {r.rejectReason && <div className="text-xs text-red-300 mt-1 bg-red-500/10 rounded-lg px-2 py-1">❌ {r.rejectReason}</div>}
                </div>
              </div>

              {/* قرارات المراجعة */}
              {r.status === 'pending' && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  {rejecting?.id === r.id ? (
                    <div className="anim-bounce-in">
                      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300}
                        placeholder="سبب الرفض * (يظهر للبائع — مثال: الصورة غير واضحة، أعد رفعها)"
                        className="w-full mb-2 px-4 py-2.5 rounded-xl bg-white/5 border border-red-400/40 text-white outline-none text-sm" />
                      <div className="flex gap-2">
                        <button onClick={reject} disabled={busy}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500">
                          ❌ تأكيد الرفض
                        </button>
                        <button onClick={() => { setRejecting(null); setReason(''); }}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 bg-white/10">
                          تراجع
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => approve(r.id)} disabled={busy}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600">
                        🎖️ قبول ومنح الشارة
                      </button>
                      <button onClick={() => setRejecting(r)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-red-300 bg-red-500/15">
                        ❌ رفض
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 🔍 تكبير الوثيقة */}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.9)' }} onClick={() => setZoom(null)}>
          <img src={zoom} alt="الوثيقة" className="max-w-full max-h-full rounded-2xl object-contain" />
          <button className="absolute top-4 right-4 text-white text-3xl leading-none">✕</button>
        </div>
      )}
    </main>
  );
}
