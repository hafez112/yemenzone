'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';

// الإشراف على التقييمات: إظهار/إخفاء/حذف + جدول الدرجة الذكية
export default function AdminReviews() {
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [cfg, setCfg] = useState<any>(null); // 🧾 إعداد التقييم الموثوق

  async function load() {
    setReviews(await api(`/admin/reviews?approved=${filter}`));
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load().catch(() => router.push('/auth/admin-login'));
    api('/admin/reviews-config').then(setCfg).catch(() => {});
  }, [filter]);

  async function toggleOnlyBuyers() {
    try {
      const next = await api('/admin/reviews-config', { method: 'POST', body: JSON.stringify({ onlyBuyers: !cfg.onlyBuyers }) });
      setCfg(next);
      toast(next.onlyBuyers ? '🧾 فُعّل وضع تقييم المشترين فقط' : '✅ التقييم مفتوح للجميع');
    } catch (e: any) { toast(e.message, 'error'); }
  }

  async function saveReward(patch: any) {
    try {
      const next = await api('/admin/reviews-config', { method: 'POST', body: JSON.stringify(patch) });
      setCfg(next);
      toast('✅ حُفظت إعدادات المكافأة');
    } catch (e: any) { toast(e.message, 'error'); }
  }

  async function act(fn: () => Promise<any>, msg: string) {
    try { await fn(); toast(msg); await load(); }
    catch (e: any) { toast(e.message, 'error'); }
  }

  return (
    <main className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(180deg, #0A0A14, #141428)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white mb-4">⭐ الإشراف على التقييمات ({reviews.length})</h1>

          {/* 🧾 وضع التقييم الموثوق — تقييد التقييمات بالمشترين الفعليين */}
          {cfg && (
            <div className="glass-dark rounded-2xl p-3.5 mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-white font-extrabold text-xs">🧾 تقييم المشترين فقط</div>
                <div className="text-[10px] text-gray-500 mt-0.5">عند التفعيل لا يُقبل أي تقييم إلا برقم طلب مكتمل — كل تقييم يحمل شارة ✅ مشترٍ موثّق</div>
              </div>
              <button onClick={toggleOnlyBuyers}
                className={`px-4 py-2 rounded-full text-xs font-black transition ${cfg.onlyBuyers ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                {cfg.onlyBuyers ? '🟢 مفعّل' : '⚪ متوقف'}
              </button>
            </div>
          )}

          {/* 🎁 «قيّم واكسب» — نقاط مكافأة للتقييم الموثوق */}
          {cfg && (
            <div className="glass-dark rounded-2xl p-3.5 mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-white font-extrabold text-xs">🎁 قيّم واكسب</div>
                <div className="text-[10px] text-gray-500 mt-0.5">كل تقييم موثوق ✅ (مرتبط بطلب فعلي) يكسب صاحبه نقاطاً تلقائياً — تشجع العملاء على التقييم</div>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={100} value={cfg.rewardPoints}
                  onChange={(e) => setCfg({ ...cfg, rewardPoints: Number(e.target.value) })}
                  onBlur={() => saveReward({ rewardPoints: cfg.rewardPoints })}
                  className="w-16 bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs font-black text-white text-center" />
                <span className="text-[10px] text-gray-400 font-bold">نقطة</span>
                <button onClick={() => saveReward({ rewardEnabled: !cfg.rewardEnabled })}
                  className={`px-4 py-2 rounded-full text-xs font-black transition ${cfg.rewardEnabled ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                  {cfg.rewardEnabled ? '🟢 مفعّلة' : '⚪ متوقفة'}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            {[['', 'الكل'], ['1', '✅ معروض'], ['0', '🙈 مخفي']].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-4 py-2 rounded-full text-xs font-bold ${filter === v ? 'text-white' : 'text-gray-400 bg-white/5'}`}
                style={filter === v ? { background: 'var(--primary)' } : {}}>
                {l}
              </button>
            ))}
          </div>

          <div className="space-y-2 stagger">
            {reviews.map(r => (
              <div key={r.id} className={`glass-dark rounded-2xl p-4 ${!r.isApproved ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-white text-sm">👤 {r.customer.name}</span>
                    <span className="text-amber-400 text-sm mr-2">{'★'.repeat(r.rating)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mr-2 ${
                      r.isApproved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>{r.isApproved ? 'معروض' : 'مخفي'}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      على {r.store ? `🏪 ${r.store.name}` : `📦 ${r.product?.name}`} • {new Date(r.createdAt).toLocaleDateString('ar-YE')}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => act(() => api(`/admin/reviews/${r.id}`, { method: 'PATCH', body: JSON.stringify({ approved: !r.isApproved }) }), r.isApproved ? '🙈 تم الإخفاء' : '✅ تم الإظهار')}
                      className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400">
                      {r.isApproved ? 'إخفاء' : 'إظهار'}
                    </button>
                    <button onClick={() => { if (confirm('حذف التقييم؟')) act(() => api(`/admin/reviews/${r.id}`, { method: 'DELETE' }), '🗑️ تم الحذف'); }}
                      className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-500/20 text-red-400">🗑️</button>
                  </div>
                </div>
                {r.comment && <p className="text-xs text-gray-400 mt-2">{r.comment}</p>}

                {/* 💬 رد البائع + إشراف الإدارة عليه */}
                {r.reply && (
                  <div className={`mt-2 p-2.5 rounded-xl border-r-4 border-purple-500 ${r.replyHidden ? 'bg-red-500/10 opacity-60' : 'bg-purple-500/10'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-[10px] text-purple-400">💬 ردّ المتجر {r.replyHidden && '— مخفي عن الزوار'}</b>
                      <button
                        onClick={() => act(() => api(`/admin/reviews/${r.id}/reply`, { method: 'PATCH', body: JSON.stringify({ hidden: !r.replyHidden }) }), r.replyHidden ? '✅ أُظهر الرد' : '🙈 أُخفي الرد عن الزوار')}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300">
                        {r.replyHidden ? 'إظهار الرد' : 'إخفاء الرد'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{r.reply}</p>
                  </div>
                )}
              </div>
            ))}
            {reviews.length === 0 && (
              <div className="glass-dark rounded-3xl p-10 text-center text-gray-500">لا تقييمات</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
