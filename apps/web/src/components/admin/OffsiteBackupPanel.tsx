"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { toast } from "../Toast";

// 🛡️ لوحة النسخ الخارجي التلقائي — pg_dump يومي كامل يُرسل لتيليجرام الإدارة
// الحماية الحقيقية من فقدان السيرفر: نسخة كاملة خارج السيرفر كل يوم

const fmtSize = (b: number) => !b ? "0" : b > 1048576 ? (b / 1048576).toFixed(1) + " م.ب" : Math.round(b / 1024) + " ك.ب";
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "صباحاً" : "مساءً"}`;

export default function OffsiteBackupPanel() {
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({ enabled: false, hour: 3, tgToken: "", tgChatId: "" });
  const [busy, setBusy] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const load = () =>
    api("/admin/backups/offsite").then((d) => {
      setData(d);
      setForm({
        enabled: d.settings.enabled,
        hour: d.settings.hour,
        tgToken: d.settings.tgToken || "",
        tgChatId: d.settings.tgChatId || "",
      });
    }).catch((e) => toast(e.message, "error"));

  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      await api("/admin/backups/offsite/settings", { method: "POST", body: JSON.stringify(form) });
      toast("✅ حُفظت إعدادات النسخ الخارجي");
      load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const test = async () => {
    setBusy(true);
    try {
      await api("/admin/backups/offsite/test", { method: "POST", body: "{}" });
      toast("✅ نجح الربط — تفقد تيليجرام، وصلتك رسالة التأكيد");
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const trigger = async () => {
    setBusy(true);
    try {
      const r = await api("/admin/backups/offsite/trigger", { method: "POST", body: "{}" });
      toast("🚀 " + (r.message || "بدأت النسخة"));
      setTimeout(load, 90_000); // تحديث الحالة بعد اكتمالها غالباً
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const st = data?.status;
  const tgBadge = (s: string) =>
    s === "sent" ? <span className="text-emerald-600">✈️ أُرسلت لتيليجرام</span>
    : s === "failed" ? <span className="text-red-500">🔴 فشل إرسال تيليجرام</span>
    : s === "too-big" ? <span className="text-amber-600">⚠️ أكبر من حد تيليجرام</span>
    : s === "skipped" ? <span className="text-gray-400">⏭️ تيليجرام غير مضبوط</span> : null;

  return (
    <div className="card mb-4" style={{ border: "2px solid #7c3aed22" }}>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-black flex-1">🛡️ النسخ الخارجي التلقائي (تيليجرام)</h3>
        {data?.settings?.enabled
          ? <span className="badge" style={{ background: "#d1fae5", color: "#065f46" }}>🟢 مفعّل — يومياً {hourLabel(data.settings.hour)}</span>
          : <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>⏸️ معطّل</span>}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        نسخة كاملة بصيغة pg_dump (تشمل كل الجداول تلقائياً حتى المستقبلية) تُرسل لمحادثتك في تيليجرام يومياً —
        حماية حقيقية حتى لو فُقد السيرفر بالكامل. تُحفظ أيضاً 14 نسخة يومية + 8 أسبوعية على السيرفر.
      </p>

      {/* آخر حالة */}
      {st && (
        <div className={`rounded-2xl p-3 mb-3 text-sm font-bold ${st.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {st.ok ? "✅" : "🔴"} آخر نسخة: {new Date(st.lastRun).toLocaleString("ar-YE")}
          {st.ok && <> — {st.file} ({fmtSize(st.size)}) {tgBadge(st.telegram)}</>}
          {!st.ok && st.error && <> — {st.error}</>}
        </div>
      )}

      {/* دليل الإعداد */}
      <button onClick={() => setShowGuide(!showGuide)} className="text-xs font-extrabold text-violet-600 underline mb-3">
        {showGuide ? "▼ إخفاء دليل الإعداد" : "📖 كيف أحصل على توكن البوت ومعرّف المحادثة؟ (دقيقتان من جوالك)"}
      </button>
      {showGuide && (
        <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3 mb-3 text-xs font-bold text-gray-600 leading-relaxed space-y-1.5">
          <p>1️⃣ في تيليجرام ابحث عن <b dir="ltr">@BotFather</b> وأرسل <b dir="ltr">/newbot</b> ثم اختر اسماً للبوت — سيعطيك <b>التوكن</b> (انسخه)</p>
          <p>2️⃣ ابحث عن بوتك الجديد في تيليجرام وافتحه واضغط <b>ابدأ / Start</b> (ضروري ليستطيع مراسلتك)</p>
          <p>3️⃣ ابحث عن <b dir="ltr">@userinfobot</b> واضغط ابدأ — سيعطيك <b>معرّف محادثتك</b> (رقم مثل 123456789)</p>
          <p>4️⃣ الصق القيمتين هنا واحفظ ثم اضغط «اختبار الربط» — يجب أن تصلك رسالة تأكيد فوراً ✅</p>
        </div>
      )}

      {/* الإعدادات */}
      <div className="grid md:grid-cols-2 gap-2 mb-2">
        <input className="input" type="password" placeholder="🤖 توكن البوت (مثال: 123456:ABC-DEF...)" dir="ltr"
          value={form.tgToken} onChange={(e) => setForm({ ...form, tgToken: e.target.value })} />
        <input className="input" placeholder="💬 معرّف المحادثة (مثال: 123456789)" dir="ltr"
          value={form.tgChatId} onChange={(e) => setForm({ ...form, tgChatId: e.target.value })} />
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <label className="flex items-center gap-2 text-sm font-extrabold cursor-pointer bg-gray-50 rounded-xl px-3 py-2">
          <input type="checkbox" className="w-4 h-4 accent-violet-600"
            checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          تفعيل النسخ اليومي التلقائي
        </label>
        <select className="input !w-auto text-sm" value={form.hour} onChange={(e) => setForm({ ...form, hour: Number(e.target.value) })}>
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>الموعد: {hourLabel(h)}</option>)}
        </select>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button className="btn" onClick={save} disabled={busy}>💾 حفظ الإعدادات</button>
        <button className="btn" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
          onClick={test} disabled={busy || !data?.settings?.configured}>🔗 اختبار الربط</button>
        <button className="btn" style={{ background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" }}
          onClick={trigger} disabled={busy}>🚀 نسخة فورية الآن</button>
      </div>

      {/* النسخ المحلية الخارجية */}
      {data?.dumps?.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="text-xs font-extrabold text-gray-400 mb-2">🗄️ النسخ الكاملة المحفوظة على السيرفر (pg_dump):</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {data.dumps.map((d: any) => (
              <div key={d.file} className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <span>{d.file.startsWith("weekly") ? "📅" : "📦"}</span>
                <span style={{ fontFamily: "monospace" }} dir="ltr">{d.file}</span>
                <span className="mr-auto">{fmtSize(d.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
