'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';

// 🎁 نظام الإحالة بالنقاط — الإعدادات + الإحصاءات + السجل (الإدارة وحدها تتحكم)
export default function AdminReferralsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api('/admin/referrals').then((d) => {
    setData(d);
    setForm({ ...d.config });
  }).catch((e) => toast(e.message, 'error'));

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api('/admin/referrals/settings', { method: 'POST', body: JSON.stringify(form) });
      toast('✅ حُفظت إعدادات نظام الإحالة');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSaving(false);
  };

  if (!data || !form) {
    return (
      <main className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(180deg, #0A0A14, #141428)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
          <AdminSidebar />
          <div className="flex-1"><div className="glass-dark rounded-3xl p-10 animate-pulse h-64" /></div>
        </div>
      </main>
    );
  }

  const F = (key: string, label: string, hint: string) => (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1">{label}</label>
      <input type="number" min={0} value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none text-sm" />
      <p className="text-[10px] text-gray-500 mt-0.5">{hint}</p>
    </div>
  );

  return (
    <main className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(180deg, #0A0A14, #141428)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-white">🎁 نظام الإحالة بالنقاط</h1>
          <p className="text-xs text-gray-400 mt-1 mb-4">العملاء يدعون أصدقاءهم فيكسب الطرفان نقاطاً — تُستبدل خصومات على خدمات المنصة</p>

          {/* إحصاءات */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="glass-dark rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-white">{data.stats.totalReferrals}</div>
              <div className="text-[10px] text-gray-400 font-bold">إحالة ناجحة</div>
            </div>
            <div className="glass-dark rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-purple-400">{data.stats.totalPointsGiven.toLocaleString('en')}</div>
              <div className="text-[10px] text-gray-400 font-bold">نقطة مُنحت</div>
            </div>
            <div className="glass-dark rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-emerald-400">{data.stats.customersWithPoints}</div>
              <div className="text-[10px] text-gray-400 font-bold">عميل لديه رصيد</div>
            </div>
          </div>

          {/* الإعدادات */}
          <div className="glass-dark rounded-3xl p-5 mb-4 border border-purple-400/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-white text-sm">⚙️ إعدادات النظام</h2>
              <button onClick={() => setForm({ ...form, active: !form.active })}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${form.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {form.active ? '✅ النظام يعمل' : '⏸️ متوقف'}
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {F('pointsReferrer', 'نقاط صاحب الدعوة', 'تُضاف له عند تسجيل صديقه برمزه')}
              {F('pointsReferred', 'نقاط العضو الجديد', 'هدية الانضمام برمز الدعوة')}
              {F('pointValueYER', 'قيمة النقطة (ريال)', 'كم ريالاً يخصم كل نقطة عند الاستبدال — 0 يوقف الاستبدال')}
              {F('maxDiscountPct', 'أقصى خصم (%)', 'النقاط لا تغطي أكثر من هذه النسبة من سعر الخدمة')}
            </div>
            <button onClick={save} disabled={saving}
              className="mt-3 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: 'var(--primary)' }}>
              {saving ? '⏳ جارٍ الحفظ...' : '💾 حفظ الإعدادات'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {/* أفضل الداعين */}
            <div className="glass-dark rounded-3xl p-4">
              <h2 className="font-black text-white text-sm mb-3">🏆 أفضل الداعين</h2>
              {data.top.length === 0 && <div className="text-gray-500 text-xs">لا إحالات بعد</div>}
              {data.top.map((t: any, i: number) => (
                <div key={t.id || i} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <span className="w-6 text-center">{['🥇', '🥈', '🥉'][i] || `#${i + 1}`}</span>
                  <div className="flex-1 min-w-0">
                    <b className="text-white text-xs block truncate">{t.name}</b>
                    <span className="text-[10px] text-gray-500" dir="ltr">{t.phone}</span>
                  </div>
                  <span className="text-xs font-bold text-purple-300">{t.invited} دعوة</span>
                  <span className="text-[10px] text-gray-400">{t.points} نقطة</span>
                </div>
              ))}
            </div>

            {/* آخر الإحالات */}
            <div className="glass-dark rounded-3xl p-4">
              <h2 className="font-black text-white text-sm mb-3">🕐 آخر الإحالات</h2>
              {data.recent.length === 0 && <div className="text-gray-500 text-xs">لا إحالات بعد — فعّل النظام وروّج له</div>}
              {data.recent.map((r: any) => (
                <div key={r.id} className="py-1.5 border-b border-white/5 last:border-0 text-xs">
                  <b className="text-purple-300">{r.referrer?.name}</b>
                  <span className="text-gray-400"> دعا </span>
                  <b className="text-emerald-300">{r.referred?.name}</b>
                  <div className="text-[10px] text-gray-500">
                    +{r.pointsGiven} نقطة · {new Date(r.createdAt).toLocaleDateString('ar-YE')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
