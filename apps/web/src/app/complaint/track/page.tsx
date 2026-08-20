"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "../../../components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL || "";

const STATUS: Record<string, { label: string; color: string; bg: string; step: number }> = {
  open: { label: "⏳ قيد المراجعة", color: "#92400e", bg: "#fef3c7", step: 1 },
  replied: { label: "💬 تم الرد", color: "#065f46", bg: "#d1fae5", step: 2 },
  closed: { label: "🔒 مغلقة", color: "#6b7280", bg: "#f3f4f6", step: 3 },
};

function TrackInner() {
  const params = useSearchParams();
  const [number, setNumber] = useState(params.get("number") || "");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const track = async (n?: string, p?: string) => {
    const num = (n ?? number).trim();
    const ph = (p ?? phone).trim();
    if (!num || !ph) return toast("⚠️ أدخل رقم الشكوى والجوال", "error");
    setLoading(true);
    try {
      const res = await fetch(API + "/api/v1/complaints/track?number=" + encodeURIComponent(num) + "&phone=" + encodeURIComponent(ph));
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "لم تُعثر على الشكوى");
      setResult(data);
    } catch (e: any) { toast(e.message, "error"); setResult(null); }
    setLoading(false);
  };

  return (
    <div className="page">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-5">
          <h1 className="text-3xl font-black mb-2">🔎 تتبع شكوى</h1>
          <p className="text-gray-500 text-sm">أدخل رقم الشكوى (CMP-…) ورقم الجوال المسجل فيها</p>
        </div>

        <div className="card mb-4">
          <input className="input mb-2" placeholder="رقم الشكوى (CMP-XXXXXX)" value={number} onChange={(e) => setNumber(e.target.value)} style={{ fontFamily: "monospace" }} />
          <input className="input mb-3" placeholder="رقم الجوال" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="btn w-full" onClick={() => track()} disabled={loading}>{loading ? "⏳…" : "🔎 تتبع"}</button>
        </div>

        {result && (
          <div className="card">
            <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
              <div>
                <b>{result.subject}</b> <span className="text-xs text-gray-400">{result.category}</span>
                <div className="text-xs text-gray-400 mt-0.5">{result.number} · {new Date(result.createdAt).toLocaleString("ar-YE")}</div>
              </div>
              {(() => { const st = STATUS[result.status]; return <span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>; })()}
            </div>

            <div className="flex items-center gap-1 mb-4">
              {[1, 2, 3].map((s) => {
                const cur = STATUS[result.status].step;
                return <div key={s} className="flex-1 h-2 rounded-full" style={{ background: s <= cur ? "var(--primary)" : "#e5e7eb" }} />;
              })}
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 mb-3">
              <div className="text-xs font-bold text-gray-500 mb-1">📝 شكواك:</div>
              <p className="text-sm">{result.message}</p>
            </div>

            {result.reply ? (
              <div className="p-3 rounded-2xl" style={{ background: "#f0fdfa", border: "1px solid #99f6e4" }}>
                <div className="text-xs font-bold mb-1" style={{ color: "#0f766e" }}>💬 رد إدارة المنصة {result.repliedAt && "· " + new Date(result.repliedAt).toLocaleString("ar-YE")}:</div>
                <p className="text-sm">{result.reply}</p>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-400 py-2">لم يُرد بعد — نراجع شكواك حالياً ⏳</div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">شكوى جديدة؟ <Link href="/complaint" className="underline" style={{ color: "var(--primary)" }}>قدّمها هنا</Link></p>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return <Suspense fallback={<div className="page"><div className="card text-center py-10">⏳…</div></div>}><TrackInner /></Suspense>;
}
