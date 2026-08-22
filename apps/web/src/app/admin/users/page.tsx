"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api, getUser } from "../../../lib/api";
import { toast } from "../../../components/Toast";
import { useCurrency } from '../../../lib/currency';
import { useRouter } from "next/navigation";

const ROLES = [
  { k: "seller", l: "🏪 البائعون" },
  { k: "customer", l: "👥 العملاء" },
  { k: "driver", l: "🛵 السائقون" },
];
const STATUS_AR: Record<string, string> = { active: "نشط", suspended: "موقوف", banned: "محظور" };

// 🧑‍🤝‍🧑 إدارة المستخدمين الموحدة — بائعون/عملاء/سائقون
export default function AdminUsersPage() {
  const { list: CURS, def: defCur } = useCurrency();
  const dsym = (code?: string) => CURS.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || defCur?.symbol || 'ر.ي';
  const router = useRouter();
  const [role, setRole] = useState("seller");
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = (r = role, query = q) => {
    setLoading(true);
    api(`/admin/users?role=${r}${query ? "&q=" + encodeURIComponent(query) : ""}`)
      .then((d) => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch((e) => { toast(e.message, "error"); setLoading(false); });
  };

  useEffect(() => {
    if (!getUser()) { router.push("/auth/admin-login"); return; }
    load();
  }, [role]);

  async function setStatus(u: any, status: string) {
    try {
      await api(`/admin/users/${role}/${u.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast(status === "active" ? "✅ فُعّل الحساب" : status === "suspended" ? "⏸️ عُلّق الحساب" : "🚫 حُظر الحساب");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  }

  const isActive = (u: any) => role === "driver" ? u.isActive : u.status === "active";

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🧑‍🤝‍🧑 إدارة المستخدمين</h1>
          <p className="text-sm text-gray-500 mb-4">تفعيل · تعليق · حظر — البائعون والعملاء والسائقون</p>

          <div className="tabs">
            {ROLES.map((r) => (
              <button key={r.k} className={"tab" + (role === r.k ? " active" : "")} onClick={() => setRole(r.k)}>{r.l}</button>
            ))}
          </div>

          <div className="row" style={{ marginBottom: "1rem" }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 بحث بالاسم أو الجوال..."
              style={{ flex: 1, padding: ".7rem 1rem", borderRadius: ".8rem", border: "1px solid #e5e7eb", fontFamily: "inherit" }}
              onKeyDown={(e) => e.key === "Enter" && load()} />
            <button className="btn primary" onClick={() => load()}>بحث</button>
          </div>

          {loading ? <div className="skeleton h-64 rounded-3xl" /> : (
            <section className="card">
              <h2>{ROLES.find((r) => r.k === role)?.l} ({users.length})</h2>
              {!users.length && <div className="empty-state">لا يوجد مستخدمون بعد</div>}
              {users.map((u) => (
                <div key={u.id} className="assign-row">
                  <div className="flex-1 min-w-0">
                    <strong>{u.name}</strong>{" "}
                    <span className={`badge ${isActive(u) ? "active" : "cancelled"}`}>
                      {role === "driver" ? (u.isActive ? "نشط" : "موقوف") : (STATUS_AR[u.status] || u.status)}
                    </span>
                    <p className="muted small" dir="ltr">{u.phone}</p>
                    {role === "seller" && (
                      <p className="muted small">
                        🏪 {u.stores?.length || 0} متجر{u.stores?.[0] ? ` (${u.stores[0].name})` : ""}
                        {u.wallet ? ` · 💰 ${Number(u.wallet.balance).toLocaleString()} ${dsym(u.wallet.currency)}` : ""}
                      </p>
                    )}
                    {role === "customer" && <p className="muted small">🛒 {u._count?.orders || 0} طلب</p>}
                    {role === "driver" && <p className="muted small">{u.vehicle || "—"} · {u.governorate || "—"}</p>}
                  </div>
                  <div className="row">
                    {isActive(u) ? (
                      <>
                        <button className="btn small ghost" onClick={() => setStatus(u, "suspended")}>⏸️ تعليق</button>
                        {role !== "driver" && <button className="btn small danger" onClick={() => setStatus(u, "banned")}>🚫 حظر</button>}
                      </>
                    ) : (
                      <button className="btn small success" onClick={() => setStatus(u, "active")}>✅ تفعيل</button>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
