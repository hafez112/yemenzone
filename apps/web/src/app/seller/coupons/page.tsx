'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';
import SellerSidebar from '@/components/SellerSidebar';
import FeatureLock from '@/components/FeatureLock';

// كوبونات الخصم لمتجري
export default function CouponsPage() {
  const { list: CURS, def: defCur } = useCurrency();
  const dsym = (code?: string) => CURS.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || defCur?.symbol || 'ر.ي';
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState({ code: '', type: 'percent', value: '', maxUses: '', expiresAt: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setCoupons(await api('/seller/coupons'));
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    load().catch(e => toast(e.message, 'error'));
  }, []);

  async function create() {
    setSaving(true);
    try {
      await api('/seller/coupons', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          value: Number(form.value),
          maxUses: form.maxUses ? Number(form.maxUses) : undefined,
          expiresAt: form.expiresAt || undefined,
        }),
      });
      toast('🎟️ تم إنشاء الكوبون');
      setForm({ code: '', type: 'percent', value: '', maxUses: '', expiresAt: '' });
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSaving(false);
  }

  if (!store) return null;

  // 🔒 قفل الميزة — الكوبونات تُفتح بترقية الخطة أو منحة من الإدارة
  if (store.features && !store.features.coupons) {
    return (
      <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
          <SellerSidebar store={store} />
          <FeatureLock feature="coupons" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1">
          <h1 className="text-2xl font-black mb-4">🎟️ كوبونات متجري</h1>

          {/* إنشاء كوبون */}
          <div className="glass rounded-3xl p-5 mb-4">
            <h2 className="font-extrabold mb-3">➕ كوبون جديد</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="الكود" dir="ltr"
                className="px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none">
                <option value="percent">نسبة %</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
              <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                placeholder={form.type === 'percent' ? 'النسبة %' : 'المبلغ'}
                className="px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              <input type="number" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })}
                placeholder="أقصى استخدام"
                className="px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                className="px-4 py-3 rounded-xl border border-gray-200 outline-none" />
            </div>
            <button onClick={create} disabled={saving}
              className="btn-primary w-full mt-3 py-3 rounded-xl text-white font-extrabold disabled:opacity-40">
              {saving ? '⏳...' : '🎟️ إنشاء الكوبون'}
            </button>
          </div>

          {/* القائمة */}
          <div className="space-y-2 stagger">
            {coupons.length === 0 && (
              <div className="glass rounded-3xl p-10 text-center text-gray-400">
                <div className="text-5xl mb-3">🎟️</div>
                لا كوبونات — أنشئ أول كوبون خصم لعملائك
              </div>
            )}
            {coupons.map((c: any) => {
              const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
              const exhausted = c.maxUses && c.usedCount >= c.maxUses;
              return (
                <div key={c.id} className={`glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-2 ${(!c.isActive || expired || exhausted) ? 'opacity-50' : ''}`}>
                  <div>
                    <span className="font-black text-lg" dir="ltr">{c.code}</span>
                    <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mr-2">
                      {c.type === 'percent' ? `${c.value}%` : `${Number(c.value).toLocaleString()} ${dsym()}`}
                    </span>
                    {expired && <span className="text-xs text-red-500 font-bold">منتهي ⏰</span>}
                    {exhausted && <span className="text-xs text-red-500 font-bold">مستنفد</span>}
                    <div className="text-xs text-gray-400 mt-1">
                      استُخدم {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''} مرة
                      {c.expiresAt && ` • ينتهي ${new Date(c.expiresAt).toLocaleDateString('ar-YE')}`}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={async () => {
                        try { await api(`/seller/coupons/${c.id}/toggle`, { method: 'PATCH' }); toast('✅'); await load(); }
                        catch (e: any) { toast(e.message, 'error'); }
                      }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full ${c.isActive ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {c.isActive ? 'إيقاف' : 'تفعيل'}
                    </button>
                    <button onClick={async () => {
                        if (!confirm(`حذف كوبون ${c.code}؟`)) return;
                        try { await api(`/seller/coupons/${c.id}`, { method: 'DELETE' }); toast('🗑️'); await load(); }
                        catch (e: any) { toast(e.message, 'error'); }
                      }}
                      className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-100 text-red-500">🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
