"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SellerSidebar from "../../../components/SellerSidebar";
import FeatureLock from "../../../components/FeatureLock";
import { api, getUser } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const STATUS_UI: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  none: { label: "لم يُطلب بعد", color: "#6b7280", bg: "#f3f4f6", icon: "▫️" },
  pending: { label: "بانتظار موافقة الإدارة", color: "#92400e", bg: "#fef3c7", icon: "⏳" },
  approved: { label: "معتمد ويعمل", color: "#065f46", bg: "#d1fae5", icon: "✅" },
  rejected: { label: "مرفوض", color: "#991b1b", bg: "#fee2e2", icon: "❌" },
};

// 🌐 النطاق الحقيقي للمتجر — ربط نطاق خاص بموافقة الإدارة
export default function SellerDomainPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [info, setInfo] = useState<any>(null);
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () => api("/stores/my/domain").then(setInfo).catch((e) => toast(e.message, "error"));

  useEffect(() => {
    if (!getUser()) { router.push("/auth/login"); return; }
    api("/stores/my").then(setStore).catch(() => router.push("/seller/setup"));
    load();
  }, []);

  if (!store || !info) return null;

  // 🔒 قفل الميزة — تُفتح بترقية الخطة أو بمنحة من الإدارة
  if (store.features && !store.features.customDomain) {
    return (
      <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
          <SellerSidebar store={store} />
          <FeatureLock feature="customDomain" />
        </div>
      </main>
    );
  }

  const st = STATUS_UI[info.status] || STATUS_UI.none;

  async function submit() {
    if (!domain.trim()) return toast("⚠️ أدخل النطاق أولاً", "error");
    setSaving(true);
    try {
      await api("/stores/my/domain", { method: "POST", body: JSON.stringify({ domain }) });
      toast("✅ أُرسل طلبك — ستُشعرك الإدارة بالنتيجة");
      setDomain("");
      load();
    } catch (e: any) { toast(e.message, "error"); }
    setSaving(false);
  }

  async function remove() {
    if (!confirm("إزالة النطاق نهائياً؟ سيتوقف عن توجيه الزوار لمتجرك")) return;
    try {
      await api("/stores/my/domain", { method: "DELETE" });
      toast("🗑️ أُزيل النطاق");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  }

  function copyTarget() {
    navigator.clipboard?.writeText(info.platformDomain).then(() => {
      setCopied(true); toast("📋 نُسخ الهدف"); setTimeout(() => setCopied(false), 1500);
    }).catch(() => toast("انسخ يدوياً: " + info.platformDomain, "error"));
  }

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <section className="flex-1">
          <h1 className="text-2xl font-black mb-1">🌐 النطاق الخاص بمتجرك</h1>
          <p className="text-sm text-gray-500 mb-4">اربط نطاقاً حقيقياً تملكه (مثل shop.example.com) ليفتح متجرك مباشرة</p>

          {/* الحالة الحالية */}
          {info.domain && (
            <div className="glass rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-black text-lg" dir="ltr">{info.domain}</div>
                  <span className="badge" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                </div>
                <button className="btn btn-danger" onClick={remove}>🗑️ إزالة</button>
              </div>
              {info.status === "rejected" && info.note && (
                <p className="mt-2 text-sm text-red-600">سبب الرفض: {info.note}</p>
              )}
              {info.status === "approved" && (
                <a className="btn mt-3 inline-block" href={`https://${info.domain}`} target="_blank" rel="noreferrer">🔗 زيارة متجري عبر نطاقي</a>
              )}
            </div>
          )}

          {/* طلب جديد / تغيير */}
          {info.status !== "pending" && info.status !== "approved" && (
            <div className="glass rounded-2xl p-4 mb-4">
              <h2 className="font-black mb-2">{info.domain ? "🔄 طلب نطاق بديل" : "➕ اطلب ربط نطاق"}</h2>
              <div className="flex gap-2 flex-wrap">
                <input className="input flex-1 min-w-[220px]" dir="ltr" placeholder="shop.example.com"
                  value={domain} onChange={(e) => setDomain(e.target.value)} />
                <button className="btn primary" disabled={saving} onClick={submit}>
                  {saving ? "⏳..." : "📨 إرسال الطلب"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">يُراجع الطلب من الإدارة — القرار النهائي لها وحدها</p>
            </div>
          )}

          {/* تعليمات DNS */}
          <div className="glass rounded-2xl p-4">
            <h2 className="font-black mb-2">⚙️ خطوات الإعداد عند مسجّل نطاقك</h2>
            <ol className="text-sm space-y-2 list-decimal pr-5 text-gray-700">
              <li>اشترِ نطاقاً من أي مسجّل (Namecheap، GoDaddy، نطاقات محلية…)</li>
              <li>
                في إعدادات DNS أضف سجل <b dir="ltr">CNAME</b> باسم نطاقك يشير إلى:
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-white rounded-lg px-3 py-1 text-purple-700 font-bold" dir="ltr">{info.platformDomain}</code>
                  <button className="btn ghost" onClick={copyTarget}>{copied ? "✅ نُسخ" : "📋 نسخ"}</button>
                </div>
              </li>
              <li>للنطاق الجذر (بدون www) استخدم سجل <b dir="ltr">ALIAS/ANAME</b> إن وفره المسجّل، أو وجّه www فقط</li>
              <li>انتظر انتشار DNS (دقائق إلى 24 ساعة) ثم أرسل طلبك هنا</li>
              <li>بعد اعتماد الإدارة يفتح نطاقك متجرك مباشرة 🎉</li>
            </ol>
            <div className="ai-card mt-3">
              💡 <b>نصيحة ذكية:</b> اختر نطاقاً قصيراً سهل النطق بالعربية، وتجنّب الأرقام والشرطات — يحفظه عملاؤك ويشاركونه بسهولة.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
