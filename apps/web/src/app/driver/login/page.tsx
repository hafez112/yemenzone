"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession } from "../../../lib/api";
import { toast } from "../../../components/Toast";

export default function DriverLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) return toast("⚠️ أدخل رقم الجوال وكلمة المرور");
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/driver-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "فشل تسجيل الدخول");
      saveSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.driver }, "driver");
      toast(`✅ أهلاً ${data.driver.name} — رحلات موفقة! 🛵`);
      router.push("/driver");
    } catch (err: any) {
      toast(`❌ ${err.message || "تعذر تسجيل الدخول"}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-3 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #faf5ff, #f0fdfa)' }}>
      <form onSubmit={login} className="glass rounded-3xl p-8 w-full max-w-sm text-center anim-bounce-in">
        <div className="section-chip mx-auto mb-3" style={{ width: '4rem', height: '4rem', fontSize: '2rem' }}>🛵</div>
        <h1 className="f-2xl font-black">دخول السائقين</h1>
        <p className="f-sm text-gray-400 mb-5">منصة يمن زون — تطبيق التوصيل</p>
        <div className="space-y-3">
          <input dir="ltr" type="tel" placeholder="رقم الجوال (77xxxxxxx)" value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-theme w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white/80 text-center font-bold" />
          <input type="password" placeholder="كلمة المرور" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-theme w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white/80 text-center font-bold" />
          <button disabled={loading}
            className="btn-primary w-full py-4 rounded-2xl text-white font-extrabold f-base transition-all hover:opacity-95 disabled:opacity-50">
            {loading ? "⏳ جاري الدخول..." : "🚀 دخول"}
          </button>
        </div>
        <p className="f-xs text-gray-400 mt-4">ليس لديك حساب؟ تُنشئه إدارة المنصة لك</p>
      </form>
    </div>
  );
}
