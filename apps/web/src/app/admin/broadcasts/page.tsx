'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';

// 📡 مركز البث الجماعي — تنبيه يصل كل البائعين أو كل الزبائن دفعة واحدة
const AUDIENCE: Record<string, { label: string; icon: string; desc: string }> = {
  sellers:   { label: 'كل البائعين', icon: '🏪', desc: 'تنبيه يظهر في لوحة كل بائع نشط' },
  customers: { label: 'كل الزبائن',  icon: '👥', desc: 'تنبيه يظهر في حساب كل زبون' },
  store_customers: { label: 'زبائن متجر', icon: '🎁', desc: 'حملة أرسلها بائع لزبائنه' },
};

export default function AdminBroadcastsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', body: '', link: '', audience: 'sellers' });
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() { setItems(await api('/admin/broadcasts')); }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load().catch(() => router.push('/auth/admin-login'));
  }, []);

  async function send() {
    if (!form.title.trim()) return toast('⚠️ عنوان الحملة مطلوب', 'error');
    setSending(true);
    try {
      const r = await api('/admin/broadcasts', { method: 'POST', body: JSON.stringify(form) });
      toast(`📡 أُرسلت الحملة إلى ${r.sentCount} مستلم`);
      setForm({ title: '', body: '', link: '', audience: form.audience });
      setShowForm(false);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  }

  const totalSent = items.filter(b => b.fromAdmin).reduce((s, b) => s + b.sentCount, 0);
  const totalRead = items.filter(b => b.fromAdmin).reduce((s, b) => s + b.readCount, 0);

  return (
    <main className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(180deg, #0A0A14, #141428)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
            <div>
              <h1 className="text-2xl font-black text-white">📡 مركز البث الجماعي</h1>
              <p className="text-xs text-gray-400 mt-1">أرسل تنبيهاً لكل البائعين أو كل الزبائن — وراقب نسبة القراءة حياً</p>
            </div>
            <button onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 rounded-full text-xs font-bold text-white" style={{ background: 'var(--primary)' }}>
              {showForm ? '✕ إلغاء' : '➕ حملة جديدة'}
            </button>
          </div>

          {/* إحصائيات */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="glass-dark rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-white">{items.filter(b => b.fromAdmin).length}</div>
              <div className="text-[10px] text-gray-400 font-bold">حملة من الإدارة</div>
            </div>
            <div className="glass-dark rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-white">{totalSent.toLocaleString('en')}</div>
              <div className="text-[10px] text-gray-400 font-bold">تنبيه مُرسل</div>
            </div>
            <div className="glass-dark rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-emerald-400">{totalSent ? Math.round((totalRead / totalSent) * 100) : 0}%</div>
              <div className="text-[10px] text-gray-400 font-bold">نسبة القراءة</div>
            </div>
          </div>

          {/* نموذج الحملة */}
          {showForm && (
            <div className="glass-dark rounded-3xl p-5 mb-4 border border-purple-400/30 anim-bounce-in">
              <h3 className="font-black text-white mb-3">📡 حملة بث جديدة</h3>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {(['sellers', 'customers'] as const).map(a => (
                  <button key={a} onClick={() => setForm({ ...form, audience: a })}
                    className={`rounded-2xl p-3 text-center transition-all border-2 ${form.audience === a ? 'border-purple-500 bg-purple-500/10' : 'border-transparent bg-white/5'}`}>
                    <div className="text-2xl mb-1">{AUDIENCE[a].icon}</div>
                    <div className="font-black text-white text-sm">{AUDIENCE[a].label}</div>
                    <div className="text-[10px] text-gray-400">{AUDIENCE[a].desc}</div>
                  </button>
                ))}
              </div>

              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={120}
                placeholder="عنوان الحملة * (مثال: 🎉 عروض الأسبوع بدأت)"
                className="w-full mb-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none text-sm" />
              <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} maxLength={500} rows={3}
                placeholder="نص التنبيه (اختياري) — تفاصيل أكثر عن الحملة"
                className="w-full mb-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none text-sm" />
              <input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} dir="ltr"
                placeholder="رابط عند الضغط (اختياري): /services أو https://…"
                className="w-full mb-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none text-sm" />

              <button onClick={send} disabled={sending}
                className="w-full py-3 rounded-2xl text-white font-extrabold disabled:opacity-40" style={{ background: 'var(--primary)' }}>
                {sending ? '⏳ جارٍ الإرسال…' : `📡 إرسال إلى ${AUDIENCE[form.audience].label}`}
              </button>
              <p className="text-[10px] text-gray-500 mt-2 text-center">يصل التنبيه فوراً — لا يمكن التراجع بعد الإرسال</p>
            </div>
          )}

          {/* السجل */}
          <div className="space-y-2 stagger">
            {items.map(b => {
              const aud = AUDIENCE[b.audience] || AUDIENCE.customers;
              const rate = b.sentCount ? Math.round((b.readCount / b.sentCount) * 100) : 0;
              return (
                <div key={b.id} className="glass-dark rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <b className="text-white text-sm">{b.title}</b>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.fromAdmin ? 'bg-purple-500/20 text-purple-300' : 'bg-teal-500/20 text-teal-300'}`}>
                          {b.fromAdmin ? '📡 الإدارة' : `🏪 ${b.storeName || 'بائع'}`}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{aud.icon} {aud.label}</span>
                      </div>
                      {b.body && <p className="text-xs text-gray-400 mt-1">{b.body}</p>}
                      <div className="text-[10px] text-gray-500 mt-1">{new Date(b.createdAt).toLocaleString('ar-YE')}</div>
                    </div>
                    <div className="text-center shrink-0">
                      <div className="text-lg font-black text-white">{b.sentCount.toLocaleString('en')}</div>
                      <div className="text-[10px] text-gray-400">مستلم</div>
                    </div>
                  </div>
                  {/* شريط القراءة */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${rate}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 shrink-0">👁️ {rate}% قرأوا</span>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="glass-dark rounded-3xl p-10 text-center text-gray-500">لا حملات بعد — أرسل أول حملة بث 📡</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
