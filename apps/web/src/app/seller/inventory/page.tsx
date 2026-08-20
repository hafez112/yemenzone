'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';
import FeatureLock from '@/components/FeatureLock';

// 📦 المخزون الذكي — حالات مباشرة + حد تنبيه لكل منتج + إعادة تخزين سريعة
type Status = 'out' | 'low' | 'ok';
const ST: Record<Status, { label: string; bg: string; color: string; icon: string }> = {
  out: { label: 'نفد',    bg: '#fee2e2', color: '#991b1b', icon: '🚨' },
  low: { label: 'منخفض',  bg: '#fef3c7', color: '#92400e', icon: '⚠️' },
  ok:  { label: 'متوفر', bg: '#d1fae5', color: '#065f46', icon: '✅' },
};

export default function SellerInventoryPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [edit, setEdit] = useState<any>(null); // {id, stock, lowStockAt}
  const [saving, setSaving] = useState(false);

  const load = () => api('/seller/products').then(setProducts).catch((e) => toast(e.message, 'error'));

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    load();
  }, []);

  const statusOf = (p: any): Status => p.stock <= 0 ? 'out' : p.stock <= (p.lowStockAt ?? 5) ? 'low' : 'ok';
  const counts = {
    out: products.filter((p) => statusOf(p) === 'out').length,
    low: products.filter((p) => statusOf(p) === 'low').length,
    ok: products.filter((p) => statusOf(p) === 'ok').length,
  };
  const list = products
    .filter((p) => filter === 'all' ? true : statusOf(p) === filter)
    .sort((a, b) => a.stock - b.stock);

  if (store?.features && !store.features.inventory) {
    return (
      <div className="page">
        <div className="flex flex-col md:flex-row gap-4">
          <SellerSidebar store={store} />
          <main className="flex-1 min-w-0"><FeatureLock feature="inventory" /></main>
        </div>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await api(`/seller/products/${edit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock: Number(edit.stock), lowStockAt: Number(edit.lowStockAt) }),
      });
      toast('✅ حُدّث المخزون — وأُعيد تفعيل التنبيه الذكي');
      setEdit(null);
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">📦 المخزون الذكي</h1>
          <p className="text-sm text-gray-500 mb-4">يصلك تنبيه 🔔 تلقائياً عندما ينخفض أي منتج إلى حدّه — حدد الحد لكل منتج</p>

          {/* الملخص */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(['out', 'low', 'ok'] as const).map((k) => (
              <button key={k} onClick={() => setFilter(filter === k ? 'all' : k)}
                className="card text-center !mb-0 transition-all"
                style={filter === k ? { outline: `2px solid ${ST[k].color}` } : {}}>
                <div className="text-2xl font-black" style={{ color: ST[k].color }}>{counts[k]}</div>
                <div className="text-xs text-gray-400 font-bold">{ST[k].icon} {ST[k].label}</div>
              </button>
            ))}
          </div>

          {(counts.out > 0 || counts.low > 0) && (
            <div className="ai-card card">
              <b className="text-sm">🤖 توصية المخزون</b>
              <p className="text-xs text-gray-600 mt-1">
                {counts.out > 0 && `${counts.out} منتج يظهر للزبائن كـ (نفد) — كل يوم تأخير = مبيعات ضائعة. `}
                {counts.low > 0 && `${counts.low} منتج اقترب من النفاد — أعد تخزينه قبل الزحام.`}
              </p>
            </div>
          )}

          {/* القائمة */}
          {list.map((p) => {
            const s = statusOf(p);
            return (
              <div key={p.id} className="card !mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden skeleton flex items-center justify-center text-xl"
                    style={p.images?.[0] ? { background: `url(${imgUrl(p.images[0])}) center/cover`, animation: 'none' } : {}}>
                    {!p.images?.[0] && '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <b className="text-sm block truncate">{p.name}</b>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="badge" style={{ background: ST[s].bg, color: ST[s].color }}>{ST[s].icon} {ST[s].label}</span>
                      <span className="text-xs text-gray-400">المتبقي: <b className="text-gray-700">{p.stock}</b></span>
                      <span className="text-[10px] text-gray-400">🔔 ينبهك عند {p.lowStockAt ?? 5}</span>
                    </div>
                  </div>
                  <button className="btn small shrink-0" onClick={() => setEdit({ id: p.id, name: p.name, stock: p.stock, lowStockAt: p.lowStockAt ?? 5 })}>
                    ✏️ تخزين
                  </button>
                </div>

                {/* محرر سريع */}
                {edit?.id === p.id && (
                  <div className="mt-3 p-3 rounded-2xl bg-gray-50 anim-bounce-in">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <label className="text-xs font-bold text-gray-500">
                        الكمية الجديدة
                        <input type="number" min={0} className="input mt-1" value={edit.stock}
                          onChange={(e) => setEdit({ ...edit, stock: e.target.value })} />
                      </label>
                      <label className="text-xs font-bold text-gray-500">
                        🔔 حد التنبيه
                        <input type="number" min={0} className="input mt-1" value={edit.lowStockAt}
                          onChange={(e) => setEdit({ ...edit, lowStockAt: e.target.value })} />
                      </label>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">عند بلوغ «{edit.name}» عدد {edit.lowStockAt} قطعة يصلك تنبيه فوري — ويُعاد تفعيله تلقائياً بعد إعادة التخزين</p>
                    <div className="flex gap-2">
                      <button className="btn small flex-1" disabled={saving} onClick={save}>{saving ? '⏳…' : '💾 حفظ'}</button>
                      <button className="btn small btn-danger" onClick={() => setEdit(null)}>إلغاء</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {products.length > 0 && list.length === 0 && (
            <div className="card text-center py-8 text-gray-400">لا منتجات بهذه الحالة 🎉</div>
          )}
          {products.length === 0 && (
            <div className="card text-center py-10 text-gray-400">لا منتجات بعد — أضف منتجاتك من صفحة المنتجات 📦</div>
          )}
        </main>
      </div>
    </div>
  );
}
