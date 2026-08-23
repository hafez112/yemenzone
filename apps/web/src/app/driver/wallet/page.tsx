"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getUser } from "../../../lib/api";
import { toast } from "../../../components/Toast";

// 💰 محفظة السائق — أجور التوصيل المدفوعة ببطاقة يمن زون + طلبات السحب
const WD_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "⏳ قيد المراجعة", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "✅ تم الصرف", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "❌ مرفوض — أُعيد المبلغ", cls: "bg-red-100 text-red-600" },
};
const METHODS = ["حوالة عبر محفظة جوال", "حوالة مصرفية", "كريمي / أمين", "كاش من المكتب"];

export default function DriverWalletPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [accountInfo, setAccountInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => api("/driver/wallet").then(setData).catch((e) => toast(e.message, "error"));

  useEffect(() => {
    const u = localStorage.getItem("yz_type") === "driver" ? getUser() : null;
    if (!u) { router.replace("/driver/login"); return; }
    load();
  }, []);

  const withdraw = async () => {
    const amt = Math.round(Number(amount));
    if (!amt || amt <= 0) return toast("⚠️ أدخل مبلغاً صحيحاً", "error");
    if (!method) return toast("⚠️ اختر طريقة الاستلام", "error");
    if (!accountInfo.trim()) return toast("⚠️ أدخل بيانات الاستلام (رقم/اسم الحساب)", "error");
    setBusy(true);
    try {
      await api("/driver/wallet/withdraw", { method: "POST", body: JSON.stringify({ amount: amt, method, accountInfo }) });
      toast("✅ أُرسل طلب السحب للإدارة — ستصلك الموافقة هنا");
      setAmount(""); setAccountInfo(""); setMethod(""); setShowForm(false);
      load();
    } catch (e: any) { toast(e.message, "error"); }
    setBusy(false);
  };

  if (!data) return null;
  const pendingSum = data.withdrawals.filter((w: any) => w.status === "pending").reduce((a: number, w: any) => a + Number(w.amount), 0);

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-lg mx-auto space-y-4">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black">💰 محفظتي</h1>
          <Link href="/driver" className="text-xs font-extrabold text-purple-600">← طلباتي</Link>
        </div>

        {/* الرصيد */}
        <div className="rounded-3xl p-6 text-white text-center shadow-lg" style={{ background: "linear-gradient(135deg, #6C3DF5, #00E5C7)" }}>
          <div className="text-xs font-bold opacity-80">الرصيد المتاح</div>
          <div className="text-4xl font-black mt-1">{Number(data.balance).toLocaleString()} <span className="text-base">{data.currency === "YER" ? "ر.ي" : data.currency}</span></div>
          {pendingSum > 0 && <div className="text-[11px] font-bold opacity-80 mt-1">⏳ محجوز للسحب: {pendingSum.toLocaleString()}</div>}
          <p className="text-[10px] opacity-70 mt-2">تُضاف أجرة التوصيل تلقائياً عند تسليم الطلبات المدفوعة ببطاقة يمن زون</p>
        </div>

        {/* زر/نموذج السحب */}
        {!showForm ? (
          <button onClick={() => setShowForm(true)} disabled={Number(data.balance) < 1000}
            className="btn-primary w-full py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40">
            📤 طلب سحب الرصيد
          </button>
        ) : (
          <div className="glass rounded-3xl p-4 space-y-3 anim-fade-up">
            <div className="font-black text-sm">📤 طلب سحب من الإدارة</div>
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric"
              placeholder={`المبلغ (المتاح: ${Number(data.balance).toLocaleString()})`}
              className="w-full px-4 py-3 rounded-2xl border border-purple-200 outline-none text-sm font-bold bg-white focus:border-purple-400" />
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`px-3 py-2 rounded-full text-[11px] font-extrabold transition-all ${method === m ? "text-white" : "bg-white text-gray-500 border border-gray-200"}`}
                  style={method === m ? { background: "var(--primary)" } : {}}>
                  {m}
                </button>
              ))}
            </div>
            <input value={accountInfo} onChange={(e) => setAccountInfo(e.target.value)}
              placeholder="بيانات الاستلام: رقم المحفظة / اسم المستلم / رقم الحساب"
              className="w-full px-4 py-3 rounded-2xl border border-purple-200 outline-none text-sm font-bold bg-white focus:border-purple-400" />
            <div className="flex gap-2">
              <button onClick={withdraw} disabled={busy}
                className="btn-primary flex-1 py-3 rounded-2xl text-white font-extrabold disabled:opacity-40">
                {busy ? "⏳..." : "✅ إرسال الطلب"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-500 text-xs font-extrabold">إلغاء</button>
            </div>
            <p className="text-[10px] text-gray-400 font-bold">يُحجز المبلغ فور الإرسال، وتصرفه الإدارة لك بالطريقة المختارة — عند الرفض يعود المبلغ لمحفظتك تلقائياً</p>
          </div>
        )}

        {/* طلبات السحب */}
        {data.withdrawals.length > 0 && (
          <div className="glass rounded-3xl p-4">
            <div className="font-black text-sm mb-3">📤 طلبات السحب</div>
            <div className="space-y-2">
              {data.withdrawals.map((w: any) => (
                <div key={w.id} className="flex items-center gap-2 text-xs bg-white/60 rounded-2xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold">{Number(w.amount).toLocaleString()} {w.currency === "YER" ? "ر.ي" : w.currency} — {w.method}</div>
                    <div className="text-[10px] text-gray-400">{new Date(w.createdAt).toLocaleString("ar-YE")}</div>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full shrink-0 ${WD_STATUS[w.status]?.cls || ""}`}>
                    {WD_STATUS[w.status]?.label || w.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* الحركات */}
        <div className="glass rounded-3xl p-4">
          <div className="font-black text-sm mb-3">🧾 حركات المحفظة</div>
          {data.transactions.length === 0 ? (
            <div className="text-center text-gray-400 text-xs py-8">
              <div className="text-4xl mb-2">🛵</div>
              لا حركات بعد — سلّم طلباً مدفوعاً ببطاقة يمن زون وستُضاف أجرته هنا تلقائياً
            </div>
          ) : (
            <div className="space-y-2">
              {data.transactions.map((t: any) => (
                <div key={t.id} className="flex items-center gap-2 text-xs bg-white/60 rounded-2xl px-3 py-2.5">
                  <span className="text-lg">{t.type === "credit" ? "➕" : "➖"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{t.note || (t.type === "credit" ? "إيداع" : "خصم")}</div>
                    <div className="text-[10px] text-gray-400">{new Date(t.createdAt).toLocaleString("ar-YE")}</div>
                  </div>
                  <b className={t.type === "credit" ? "text-emerald-600" : "text-red-500"}>
                    {t.type === "credit" ? "+" : "-"}{Number(t.amount).toLocaleString()}
                  </b>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
