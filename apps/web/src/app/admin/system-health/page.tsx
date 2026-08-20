"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

// 🩺 صحة النظام — مقاييس تشغيلية حية (الجلسة 10)
export default function AdminSystemHealthPage() {
  const [m, setM] = useState<any>(null);

  const load = () => api("/v1/admin/system/metrics").then(setM).catch((e) => toast(e.message, "error"));
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const fmtUptime = (s: number) => {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), min = Math.floor((s % 3600) / 60);
    return d ? `${d} يوم ${h} سا` : h ? `${h} سا ${min} د` : `${min} دقيقة`;
  };

  return (
    <div className="page">
      <div className="layout">
        <AdminSidebar />
        <main className="content">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h1>🩺 صحة النظام</h1>
            <button className="btn ghost" onClick={load}>🔄 تحديث</button>
          </div>
          <p className="muted small" style={{ marginTop: "-.5rem", marginBottom: "1rem" }}>
            مقاييس حية تُحدَّث كل 15 ثانية — نقطة الفحص العامة: <code dir="ltr">/api/v1/health</code>
          </p>

          {!m && <p className="muted" style={{ textAlign: "center", padding: "3rem" }}>⏳ جارٍ القياس…</p>}

          {m && (
            <>
              <div className="grid-3" style={{ marginBottom: "1rem" }}>
                <div className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900, color: m.dbLatencyMs < 100 ? "#059669" : m.dbLatencyMs < 400 ? "#d97706" : "#dc2626" }}>
                    {m.dbLatencyMs} م.ث
                  </div>
                  <div className="muted small">⚡ استجابة قاعدة البيانات</div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>{fmtUptime(m.uptimeSec)}</div>
                  <div className="muted small">⏱️ مدة التشغيل المتواصل</div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>{m.memory.heapMB} / {m.memory.rssMB} م.ب</div>
                  <div className="muted small">🧠 الذاكرة (heap / rss)</div>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: "1rem" }}>
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>⚡ الكاش</h3>
                  <p className="small">المحرك: <b>{m.cache.driver === "redis" ? "Redis 🔴" : "ذاكرة محلية 💾"}</b></p>
                  <p className="small">نسبة الإصابة: <b style={{ color: "#059669" }}>{m.cache.hitRate}%</b> ({m.cache.hits} إصابة / {m.cache.misses} فقد)</p>
                  <p className="small muted">مفاتيح الذاكرة: {m.cache.memoryEntries}</p>
                  {m.cache.driver !== "redis" && (
                    <p className="small muted">💡 لتسريع أكبر: فعّل Redis بإضافة REDIS_URL في .env (اختياري تماماً)</p>
                  )}
                </div>
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>📦 طوابير المهام</h3>
                  {Object.keys(m.queues).length === 0 && <p className="small muted">لا مهام منفذة بعد في هذه الجلسة التشغيلية</p>}
                  {Object.entries(m.queues).map(([name, c]: any) => (
                    <p key={name} className="small">
                      <b>{name}</b>: ✅ {c.done} {c.failed ? <span style={{ color: "#dc2626" }}>· ❌ {c.failed}</span> : ""}
                      {c.running && <span style={{ color: "#d97706" }}> · ⏳ يعمل الآن</span>}
                    </p>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginTop: 0 }}>📊 أحجام المنصة</h3>
                <div className="row" style={{ gap: "1.5rem", flexWrap: "wrap" }}>
                  <span className="small">🧑‍💼 بائعون: <b>{m.totals.sellers.toLocaleString()}</b></span>
                  <span className="small">👥 عملاء: <b>{m.totals.customers.toLocaleString()}</b></span>
                  <span className="small">📦 منتجات: <b>{m.totals.products.toLocaleString()}</b></span>
                  <span className="small">🛒 طلبات: <b>{m.totals.orders.toLocaleString()}</b></span>
                  <span className="small muted" dir="ltr">Node {m.node}</span>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
