'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';
import FeatureLock from '@/components/FeatureLock';
import { useFeatureGate } from '@/lib/useFeatureGate';

// 📣 حملاتي — أرسل عرضاً أو تنبيهاً لكل زبائن متجرك (ميزة يتحكم بها المدير)
export default function SellerCampaignsPage() {
  const router = useRouter();
  const { checking, locked, store } = useFeatureGate('campaigns');
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({ title: '', body: '', link: '' });
  const [sending, setSending] = useState(false);

  const load = () => api('/seller/campaigns').then(setData).catch((e) => toast(e.message, 'error'));

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    if (!locked) load();
  }, [locked]);

  const send = async () => {
    if (!form.title.trim()) return toast('⚠️ عنوان الحملة مطلوب', 'error');
    setSending(true);
    try {
      const r = await api('/seller/campaigns', { method: 'POST', body: JSON.stringify(form) });
      toast(`🎉 أُرسلت حملتك إلى ${r.sentCount} زبون!`);
      setForm({ title: '', body: '', link: '' });
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  };

  if (checking) return <div className="page"><div className="card text-center py-10">⏳ جارٍ التحميل…</div></div>;

  if (locked) return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <main className="flex-1 min-w-0"><FeatureLock feature="campaigns" /></main>
      </div>
    </div>
  );

  const canSend = !data?.canSendAt;
  const remaining = data?.canSendAt ? Math.ceil((new Date(data.canSendAt).getTime() - Date.now()) / 3600000) : 0;

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">📣 حملاتي لزبائني</h1>
          <p className="text-sm text-gray-500 mb-4">أرسل عرضاً أو خبراً يصل تنبيهاً لكل زبائن متجرك — حملة واحدة كل 24 ساعة</p>

          {/* الزبائن القابلون للوصول */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="card text-center !mb-0">
              <div className="text-2xl font-black grad-text">{data?.reachable?.count ?? '—'}</div>
              <div className="text-xs text-gray-400 font-bold">زبون يصلهم تنبيهك</div>
            </div>
            <div className="card text-center !mb-0">
              <div className="text-2xl font-black">{data?.reachable?.buyers ?? '—'}</div>
              <div className="text-xs text-gray-400 font-bold">🛒 اشتروا منك</div>
            </div>
            <div className="card text-center !mb-0">
              <div className="text-2xl font-black">{data?.reachable?.likers ?? '—'}</div>
              <div className="text-xs text-gray-400 font-bold">❤️ أعجبهم متجرك</div>
            </div>
          </div>

          {/* نموذج الحملة */}
          <div className="card">
            <h2 className="font-black mb-2">🎁 حملة جديدة</h2>
            {!canSend && (
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-700 text-sm font-bold mb-3">
                ⏳ أرسلت حملة مؤخراً — تتاح الحملة القادمة بعد {remaining} ساعة تقريباً (حمايةً لزبائنك من الإزعاج)
              </div>
            )}
            {data?.reachable?.count === 0 && (
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-700 text-sm font-bold mb-3">
                💡 لا زبائن بعد — شارك متجرك من صفحة «مشاركة متجري» لتجمع زبائن ثم أرسل لهم العروض
              </div>
            )}
            <input className="input mb-2" maxLength={120} placeholder="عنوان الحملة * (مثال: 🔥 خصم 20% هذا الأسبوع فقط)"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={!canSend} />
            <textarea className="input w-full mb-2" rows={3} maxLength={500}
              placeholder="تفاصيل العرض (اختياري) — اكتب ما يغري زبونك بالعودة"
              value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} disabled={!canSend} />
            <input className="input mb-3" dir="ltr" placeholder="رابط مخصص (اختياري — الافتراضي صفحة متجرك)"
              value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} disabled={!canSend} />
            <button className="btn w-full" disabled={!canSend || sending || !data?.reachable?.count} onClick={send}>
              {sending ? '⏳ جارٍ الإرسال…' : `📣 إرسال لكل زبائني (${data?.reachable?.count ?? 0})`}
            </button>
          </div>

          {/* حملاتي السابقة */}
          <h2 className="font-black mb-2 mt-2">📋 حملاتي السابقة</h2>
          {(data?.campaigns || []).map((c: any) => {
            const rate = c.sentCount ? Math.round((c.readCount / c.sentCount) * 100) : 0;
            return (
              <div key={c.id} className="card">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <b className="text-sm">{c.title}</b>
                    {c.body && <p className="text-xs text-gray-500 mt-0.5">{c.body}</p>}
                    <div className="text-[10px] text-gray-400 mt-1">{new Date(c.createdAt).toLocaleString('ar-YE')}</div>
                  </div>
                  <div className="text-center shrink-0">
                    <div className="font-black">{c.sentCount}</div>
                    <div className="text-[10px] text-gray-400">مستلم</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${rate}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 shrink-0">👁️ {rate}% قرأوا</span>
                </div>
              </div>
            );
          })}
          {data && data.campaigns.length === 0 && (
            <div className="card text-center py-8 text-gray-400">لا حملات بعد — أرسل أول عرض لزبائنك 🎁</div>
          )}
        </main>
      </div>
    </div>
  );
}
