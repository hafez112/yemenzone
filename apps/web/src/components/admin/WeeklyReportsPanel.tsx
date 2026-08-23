'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

// 📊 لوحة التقارير الأسبوعية الذكية — تُعرض داخل صفحة تحليلات المنصة
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function WeeklyReportsPanel() {
  const [cfg, setCfg] = useState<any>(null);
  const [digest, setDigest] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const load = () => {
    api('/admin/reports/config').then(setCfg).catch((e) => toast(e.message, 'error'));
    api('/admin/reports/platform').then(setDigest).catch(() => {});
  };
  useEffect(load, []);

  if (!cfg) return null;

  const save = async () => {
    setSaving(true);
    try {
      await api('/admin/reports/config', { method: 'POST', body: JSON.stringify(cfg) });
      toast('✅ حُفظت إعدادات التقارير');
    } catch (e: any) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const sendNow = async () => {
    if (!confirm('إرسال التقرير الأسبوعي الآن لكل البائعين؟')) return;
    setSending(true);
    try {
      const r = await api('/admin/reports/send-now', { method: 'POST' });
      toast(r.message || '✅ أُرسلت التقارير');
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  };

  return (
    <div className="glass-dark rounded-3xl p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-extrabold text-white text-sm">📊 التقارير الأسبوعية الذكية <span className="text-[10px] text-gray-400 font-normal">تصل كل بائع إشعاراً بملخص أسبوعه + نصيحة</span></h2>
        <button onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })}
          className={`px-3 py-1.5 rounded-full text-xs font-black transition ${cfg.enabled ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-400'}`}>
          {cfg.enabled ? '🟢 مفعّلة' : '⚪ متوقفة'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400 font-bold">الإرسال كل</span>
        <select value={cfg.day} onChange={(e) => setCfg({ ...cfg, day: Number(e.target.value) })}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white">
          {DAYS.map((d, i) => <option key={i} value={i} className="text-black">{d}</option>)}
        </select>
        <span className="text-xs text-gray-400 font-bold">الساعة</span>
        <select value={cfg.hour} onChange={(e) => setCfg({ ...cfg, hour: Number(e.target.value) })}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white">
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h} className="text-black">{h}:00</option>)}
        </select>
        <span className="text-[10px] text-gray-500">بتوقيت عدن</span>
        <div className="mr-auto flex gap-2">
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-black text-white disabled:opacity-50" style={{ background: 'var(--primary)' }}>
            {saving ? '⏳' : '💾 حفظ'}
          </button>
          <button onClick={sendNow} disabled={sending}
            className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 disabled:opacity-50">
            {sending ? '⏳ يُرسل...' : '📬 أرسل الآن للكل'}
          </button>
        </div>
      </div>

      {/* ملخص المنصة — آخر 7 أيام */}
      {digest && (
        <div className="border-t border-white/10 pt-3">
          <h3 className="text-xs font-extrabold text-gray-300 mb-2">🗓️ ملخص المنصة — آخر 7 أيام</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {[
              [digest.newStores, 'متجر جديد', '🏪'],
              [digest.newCustomers, 'عميل جديد', '👥'],
              [digest.ordersCount, 'طلباً', '🛒'],
              [digest.revenue.toLocaleString(), 'ريال مبيعات', '💰'],
              [digest.openTickets, 'تذكرة مفتوحة', '🎧'],
              [digest.newSuggestions, 'فكرة جديدة', '💡'],
            ].map(([v, l, i]) => (
              <div key={String(l)} className="bg-white/5 rounded-xl p-2.5 text-center">
                <div className="text-sm">{i}</div>
                <div className="text-white font-black text-xs">{v}</div>
                <div className="text-[9px] text-gray-500">{l}</div>
              </div>
            ))}
          </div>
          {digest.topStores?.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {digest.topStores.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span>{['🥇', '🥈', '🥉'][i] || '🏅'}</span>
                  <span className="text-gray-300 font-bold flex-1 truncate">{s.name}</span>
                  <span className="text-white font-extrabold">{s.orders} طلباً</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
