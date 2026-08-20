"use client";
import { useEffect, useState } from "react";
import SellerSidebar from "../../../components/SellerSidebar";
import FeatureLock from "../../../components/FeatureLock";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const SCOPE_LABEL: Record<string, string> = {
  "store:read": "🏪 بيانات المتجر", "products:read": "📦 قراءة المنتجات",
  "orders:read": "🔎 تتبع الطلبات", "orders:write": "🛒 إنشاء الطلبات",
};
const METHOD_COLOR: Record<string, string> = { GET: "#059669", POST: "#2563eb" };

const DOCS = [
  { method: "GET", path: "/api/open-api/v1/ping", scope: "أي مفتاح", desc: "فحص الاتصال وصحة المفتاح",
    curl: "curl -H \"x-api-key: YOUR_KEY\" BASE/api/open-api/v1/ping" },
  { method: "GET", path: "/api/open-api/v1/store", scope: "store:read", desc: "بيانات متجرك: الاسم، التقييم، عدادات المنتجات والطلبات",
    curl: "curl -H \"x-api-key: YOUR_KEY\" BASE/api/open-api/v1/store" },
  { method: "GET", path: "/api/open-api/v1/products", scope: "products:read", desc: "قائمة منتجاتك — فلاتر: ?q= بحث، ?categoryId=، ?take= (حتى 100)، ?skip=",
    curl: "curl -H \"x-api-key: YOUR_KEY\" \"BASE/api/open-api/v1/products?take=20\"" },
  { method: "GET", path: "/api/open-api/v1/products/:id", scope: "products:read", desc: "تفاصيل منتج واحد مع صنفه",
    curl: "curl -H \"x-api-key: YOUR_KEY\" BASE/api/open-api/v1/products/PRODUCT_ID" },
  { method: "POST", path: "/api/open-api/v1/orders", scope: "orders:write", desc: "إنشاء طلب جديد (متاجر المنتجات) — السعر يُحسب من الخادم",
    curl: "curl -X POST -H \"x-api-key: YOUR_KEY\" -H \"Content-Type: application/json\" -d '{\"items\":[{\"productId\":\"ID\",\"qty\":1}],\"customerName\":\"أحمد\",\"customerPhone\":\"77xxxxxxx\"}' BASE/api/open-api/v1/orders" },
  { method: "GET", path: "/api/open-api/v1/orders/track", scope: "orders:read", desc: "تتبع طلب برقمه وجوال العميل: ?number=ORD-XXX&phone=77...",
    curl: "curl -H \"x-api-key: YOUR_KEY\" \"BASE/api/open-api/v1/orders/track?number=ORD-XXXXXX&phone=77xxxxxxx\"" },
];

export default function SellerApiPage() {
  const [store, setStore] = useState<any>(null);
  const [tab, setTab] = useState<"keys" | "usage" | "docs">("keys");
  const [keys, setKeys] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", scopes: ["store:read", "products:read"] as string[], ratePerMin: "60" });
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [pingKey, setPingKey] = useState("");
  const [pingResult, setPingResult] = useState<any>(null);

  const apiBase = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || window.location.origin.replace(/:\d+$/, ":3001")) : "";

  const load = async () => {
    try {
      const s = await api("/stores/my");
      setStore(s);
      const [k, u] = await Promise.all([api("/seller/api/keys"), api("/seller/api/usage")]);
      setKeys(k); setUsage(u);
    } catch (e: any) { toast(e.message, "error"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createKey = async () => {
    if (!form.name.trim()) return toast("⚠️ أدخل اسماً للمفتاح", "error");
    if (!form.scopes.length) return toast("⚠️ اختر صلاحية واحدة على الأقل", "error");
    try {
      const r = await api("/seller/api/keys", { method: "POST", body: JSON.stringify({ name: form.name, scopes: form.scopes, ratePerMin: +form.ratePerMin }) });
      setNewKey(r.fullKey);
      setForm({ name: "", scopes: ["store:read", "products:read"], ratePerMin: String(usage?.suggestedRate || 60) });
      setShowForm(false);
      toast("✅ أُنشئ المفتاح — انسخه الآن!");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const revoke = async (k: any) => {
    if (!confirm("إيقاف المفتاح " + k.name + "؟ سيتوقف كل تكامل يستخدمه فوراً")) return;
    try { await api("/seller/api/keys/" + k.id, { method: "DELETE" }); toast("🚫 أُوقف المفتاح"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast("📋 نُسخ " + label); }
    catch { toast("⚠️ تعذر النسخ — انسخ يدوياً", "error"); }
  };

  const testPing = async () => {
    if (!pingKey.trim()) return toast("⚠️ الصق مفتاحاً أولاً", "error");
    setPingResult(null);
    try {
      const res = await fetch(apiBase + "/api/open-api/v1/ping", { headers: { "x-api-key": pingKey.trim() } });
      const data = await res.json();
      setPingResult(data);
      if (res.ok) toast("✅ المفتاح يعمل — متجر: " + data.store);
      else toast("❌ " + (data.message || "فشل الاتصال"), "error");
    } catch { toast("❌ تعذر الوصول للخادم", "error"); }
  };

  const toggleScope = (s: string) =>
    setForm({ ...form, scopes: form.scopes.includes(s) ? form.scopes.filter((x) => x !== s) : [...form.scopes, s] });

  if (loading || !store) return <div className="page"><div className="card text-center py-10">⏳ جارٍ التحميل…</div></div>;

  // 🔒 قفل الميزة — API للمطورين في الخطة الاحترافية أو بمنحة من الإدارة
  if (store.features && !store.features.api) {
    return (
      <div className="page">
        <div className="flex flex-col md:flex-row gap-4">
          <SellerSidebar store={store} />
          <FeatureLock feature="api" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🔑 API للمطورين</h1>
          <p className="text-sm text-gray-500 mb-4">اربط متجرك مع تطبيقات ومواقع خارجية بمفاتيح آمنة وحدود استخدام</p>

          <div className="tabs">
            {([["keys", "🗝️ المفاتيح"], ["usage", "📊 الاستخدام"], ["docs", "📖 التوثيق"]] as const).map(([k, l]) => (
              <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => setTab(k as any)}>{l}</button>
            ))}
          </div>

          {newKey && (
            <div className="card mb-4" style={{ border: "2px solid var(--primary)", background: "#f0fdfa" }}>
              <h3 className="font-black mb-1">🎉 مفتاحك الجديد — يظهر مرة واحدة فقط!</h3>
              <div className="flex flex-wrap gap-2 items-center mt-2">
                <code className="flex-1 p-3 rounded-xl bg-white text-sm font-bold" style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{newKey}</code>
                <button className="btn" onClick={() => copy(newKey, "المفتاح")}>📋 نسخ</button>
                <button className="btn btn-danger" onClick={() => setNewKey(null)}>✓ حفظته</button>
              </div>
              <p className="text-xs text-gray-500 mt-2">أرسله في ترويسة <code>x-api-key</code> مع كل طلب. من فقده يجب إنشاء مفتاح جديد.</p>
            </div>
          )}

          {tab === "keys" && (
            <div>
              <div className="card mb-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-black">مفاتيحك ({keys.filter((k) => k.status === "active").length} نشطة من 10)</h3>
                  <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? "إلغاء" : "➕ مفتاح جديد"}</button>
                </div>
                {showForm && (
                  <div className="p-3 rounded-2xl bg-gray-50 mt-3">
                    <input className="input mb-2" placeholder="اسم المفتاح (مثال: تطبيق الجوال)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <div className="text-xs font-bold text-gray-500 mb-1">الصلاحيات:</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {Object.entries(SCOPE_LABEL).map(([k, l]) => (
                        <button key={k} className="badge cursor-pointer"
                          style={{ background: form.scopes.includes(k) ? "var(--primary)" : "#e5e7eb", color: form.scopes.includes(k) ? "#fff" : "#374151" }}
                          onClick={() => toggleScope(k)}>{l}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-500">حد الاستخدام:</span>
                      <input className="input" type="number" min={10} max={600} value={form.ratePerMin} onChange={(e) => setForm({ ...form, ratePerMin: e.target.value })} style={{ maxWidth: 110 }} />
                      <span className="text-xs text-gray-400">طلب/دقيقة (10-600 · المقترح لمتجرك: {usage?.suggestedRate || 60})</span>
                    </div>
                    <button className="btn w-full" onClick={createKey}>🔑 إنشاء المفتاح</button>
                  </div>
                )}
              </div>

              {keys.length === 0 && <div className="card text-center py-8 text-gray-400">لا مفاتيح بعد — أنشئ أول مفتاح وابدأ الربط 🚀</div>}
              {keys.map((k) => (
                <div key={k.id} className="card mb-2">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <b>{k.name}</b> <code className="text-xs text-gray-400" style={{ fontFamily: "monospace" }}>{k.prefix}</code>
                      <span className="badge mr-1" style={{ background: k.status === "active" ? "#d1fae5" : "#fee2e2", color: k.status === "active" ? "#065f46" : "#991b1b" }}>
                        {k.status === "active" ? "✅ نشط" : "🚫 موقوف"}
                      </span>
                    </div>
                    {k.status === "active" && <button className="btn btn-danger" onClick={() => revoke(k)}>إيقاف</button>}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(k.scopes as string[]).map((s) => <span key={s} className="badge" style={{ background: "#eef2ff", color: "#3730a3" }}>{SCOPE_LABEL[s] || s}</span>)}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    📞 {k.totalCalls} طلب · ⚡ {k.ratePerMin}/دقيقة
                    {k.lastUsedAt ? " · آخر استخدام " + new Date(k.lastUsedAt).toLocaleString("ar-YE") : " · لم يُستخدم بعد"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "usage" && usage && (
            <div>
              <div className="grid-cards mb-4">
                <div className="card text-center"><div className="text-2xl font-black">{usage.totalCalls}</div><div className="text-xs text-gray-500">إجمالي الطلبات</div></div>
                <div className="card text-center"><div className="text-2xl font-black" style={{ color: "var(--primary)" }}>{usage.weekCalls}</div><div className="text-xs text-gray-500">آخر 7 أيام</div></div>
                <div className="card text-center"><div className="text-2xl font-black text-teal-600">{usage.activeKeys}</div><div className="text-xs text-gray-500">مفاتيح نشطة</div></div>
              </div>

              <div className="card mb-4">
                <h3 className="font-black mb-3">📈 طلبات آخر 7 أيام</h3>
                <div className="flex items-end gap-2" style={{ height: 120 }}>
                  {usage.series.map((d: any) => {
                    const max = Math.max(...usage.series.map((x: any) => x.calls), 1);
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-bold">{d.calls || ""}</span>
                        <div className="w-full rounded-t-lg" style={{ height: Math.max((d.calls / max) * 90, d.calls ? 6 : 2) + "px", background: d.fails > d.calls / 2 && d.calls > 0 ? "#dc2626" : "var(--primary)" }} title={d.day + ": " + d.calls + " طلب / " + d.fails + " فشل"} />
                        <span className="text-xs text-gray-400">{d.day.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
                {usage.series.some((d: any) => d.fails > 0) && (
                  <div className="text-xs text-red-500 mt-2">🔴 أعمدة حمراء = يوم غلبت فيه الطلبات الفاشلة</div>
                )}
              </div>

              {usage.analysis.insights.length > 0 && (
                <div className="card mb-4">
                  <h3 className="font-black mb-2">🔍 ملاحظات على مفاتيحك</h3>
                  {usage.analysis.insights.map((i: any, idx: number) => {
                    const k = keys.find((x) => x.id === i.keyId);
                    return (
                      <div key={idx} className="assign-row">
                        <span className="badge" style={{ background: i.level === "danger" ? "#fee2e2" : i.level === "warn" ? "#fef3c7" : "#e0f2fe", color: i.level === "danger" ? "#991b1b" : i.level === "warn" ? "#92400e" : "#075985" }}>
                          {i.icon} {k?.name || "مفتاح"}
                        </span>
                        <span className="text-sm flex-1">{i.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="ai-card">
                <h3 className="font-black mb-2">🤖 نصائح الذكاء المحلي</h3>
                {usage.analysis.tips.map((t: string, i: number) => <div key={i} className="text-sm mb-1">• {t}</div>)}
              </div>
            </div>
          )}

          {tab === "docs" && (
            <div>
              <div className="card mb-4">
                <h3 className="font-black mb-2">🧪 جرّب مفتاحك مباشرة</h3>
                <div className="flex flex-wrap gap-2">
                  <input className="input flex-1" placeholder="الصق المفتاح الكامل yzk_…" value={pingKey} onChange={(e) => setPingKey(e.target.value)} style={{ fontFamily: "monospace" }} />
                  <button className="btn" onClick={testPing}>ping</button>
                </div>
                {pingResult && (
                  <pre className="mt-2 p-3 rounded-xl bg-gray-900 text-green-300 text-xs overflow-auto" dir="ltr">{JSON.stringify(pingResult, null, 2)}</pre>
                )}
              </div>

              <div className="card mb-4">
                <h3 className="font-black mb-1">🌐 أساس الاتصال</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded-xl bg-gray-50 text-sm" dir="ltr" style={{ fontFamily: "monospace" }}>{apiBase}/api/open-api/v1</code>
                  <button className="btn" onClick={() => copy(apiBase + "/api/open-api/v1", "الرابط")}>📋</button>
                </div>
                <p className="text-xs text-gray-500 mt-2">الترويسة المطلوبة في كل طلب: <code dir="ltr">x-api-key: yzk_…</code> · الردود JSON · أخطاء 401 (مفتاح مفقود/خاطئ)، 403 (موقوف/بلا صلاحية/تجاوز الحد)، 404 (غير موجود)</p>
              </div>

              {DOCS.map((d) => (
                <div key={d.path} className="card mb-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="badge" style={{ background: METHOD_COLOR[d.method], color: "#fff", fontFamily: "monospace" }}>{d.method}</span>
                    <code className="font-bold text-sm" dir="ltr" style={{ fontFamily: "monospace" }}>{d.path}</code>
                    <span className="badge" style={{ background: "#eef2ff", color: "#3730a3" }}>🔐 {d.scope}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{d.desc}</p>
                  <div className="flex gap-2 items-start">
                    <pre className="flex-1 p-2 rounded-xl bg-gray-900 text-gray-200 text-xs overflow-auto" dir="ltr">{d.curl.replace(/BASE/g, apiBase)}</pre>
                    <button className="btn shrink-0" onClick={() => copy(d.curl.replace(/BASE/g, apiBase), "مثال cURL")}>📋</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
