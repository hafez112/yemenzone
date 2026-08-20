"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "../../components/Toast";
import { getUser } from "../../lib/api";
import CaptchaBox from "../../components/CaptchaBox";

const API = process.env.NEXT_PUBLIC_API_URL || "";

const SUBJECTS = ["مشكلة في طلب", "مشكلة في الدفع", "بلاغ عن متجر", "مشكلة تقنية", "اقتراح", "أخرى"];

export default function ComplaintPage() {
  const user = typeof window !== "undefined" ? getUser() : null;
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", subject: SUBJECTS[0], message: "" });
  const [sending, setSending] = useState(false);
  const [captcha, setCaptcha] = useState({ id: "", answer: "" });
  const [capKey, setCapKey] = useState(0);
  const [result, setResult] = useState<any>(null);

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast("⚠️ الاسم والجوال مطلوبان", "error");
    if (form.message.trim().length < 10) return toast("⚠️ اكتب تفاصيل أكثر عن شكواك", "error");
    setSending(true);
    try {
      const res = await fetch(API + "/api/v1/complaints", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, captchaId: captcha.id || undefined, captchaAnswer: captcha.answer || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "فشل الإرسال");
      setResult(data);
      toast("✅ استلمنا شكواك");
    } catch (e: any) { toast(e.message, "error"); setCapKey(k => k + 1); }
    setSending(false);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(result.number); toast("📋 نُسخ رقم الشكوى"); } catch {}
  };

  return (
    <div className="page">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-5">
          <h1 className="text-3xl font-black mb-2">📣 قدّم شكوى</h1>
          <p className="text-gray-500 text-sm">صوتك يهمنا — كل شكوى تُراجع من فريق المنصة خلال 24-48 ساعة</p>
        </div>

        {!result ? (
          <div className="card">
            <input className="input mb-2" placeholder="اسمك الكامل *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input mb-2" placeholder="رقم الجوال *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <div className="text-xs font-bold text-gray-500 mb-1">موضوع الشكوى:</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {SUBJECTS.map((s) => (
                <button key={s} className="badge cursor-pointer"
                  style={{ background: form.subject === s ? "var(--primary)" : "#e5e7eb", color: form.subject === s ? "#fff" : "#374151" }}
                  onClick={() => setForm({ ...form, subject: s })}>{s}</button>
              ))}
            </div>
            <textarea className="input w-full mb-3" rows={5} placeholder="اشرح شكواك بالتفصيل… (رقم الطلب إن وجد، اسم المتجر، ماذا حدث؟)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <div className="mb-3"><CaptchaBox key={capKey} scope="complaint" onChange={(id, answer) => setCaptcha({ id, answer })} /></div>
            <button className="btn w-full" onClick={submit} disabled={sending}>{sending ? "⏳ جارٍ الإرسال…" : "📣 إرسال الشكوى"}</button>
            <p className="text-center text-xs text-gray-400 mt-3">لديك رقم شكوى؟ <Link href="/complaint/track" className="underline" style={{ color: "var(--primary)" }}>تتبعها هنا</Link></p>
          </div>
        ) : (
          <div className="card text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-black mb-2">استلمنا شكواك!</h2>
            <p className="text-sm text-gray-500 mb-1">صُنّفت تلقائياً: <b>{result.category}</b>{result.priority === "high" && <span className="badge mr-1" style={{ background: "#fee2e2", color: "#991b1b" }}>🚨 أولوية عالية</span>}</p>
            <div className="flex items-center justify-center gap-2 my-4">
              <code className="text-2xl font-black p-3 rounded-2xl bg-gray-50" style={{ fontFamily: "monospace" }}>{result.number}</code>
              <button className="btn" onClick={copy}>📋</button>
            </div>
            <p className="text-xs text-gray-400 mb-4">احفظ هذا الرقم — ستحتاجه مع جوالك لتتبع الرد</p>
            <div className="flex gap-2 justify-center">
              <Link href={"/complaint/track?number=" + result.number} className="btn">🔎 تتبع الشكوى</Link>
              <Link href="/" className="btn" style={{ background: "#6b7280" }}>الرئيسية</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
