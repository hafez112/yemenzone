"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, getUser } from "../../../lib/api";
import {
  InvoiceSheet, InvoiceMasthead, PartyCards, ItemsTable,
  InvoiceFooter, PrintToolbar, INK,
} from "../../../components/invoice/InvoiceDoc";

// 📋 كشف التسوية — نظام فواتير يمن زون الموحد (طباعة ملوّنة)
const fmt = (n: any) => Number(n || 0).toLocaleString();

export default function SettlementPrintPage() {
  const { id } = useParams() as { id: string };
  const [st, setSt] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) { setErr("سجّل الدخول أولاً"); return; }
    const typ = localStorage.getItem("yz_type");
    const endpoint = typ === "admin" ? `/admin/finance/settlements/${id}` : `/seller/finance/settlements/${id}`;
    api(endpoint).then(setSt).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <div className="p-10 text-center font-bold text-red-500">{err}</div>;
  if (!st) return <div className="p-10 text-center text-gray-400">⏳ جاري تحميل الكشف...</div>;

  const PAY_AR: Record<string, string> = { cash: "كاش", card: "بطاقة يمن زون", gateway: "بوابة" };
  const STATUS_AR: Record<string, string> = { delivered: "سُلّم", completed: "مكتمل" };
  const paid = st.status === "paid";

  return (
    <div dir="rtl" className="min-h-screen pt-28 pb-6 px-3 print:pt-0"
      style={{ background: "linear-gradient(180deg, #EFEAFB, #F7F7FC)" }}>
      <div className="print:hidden"><PrintToolbar /></div>

      <InvoiceSheet stamp={paid ? { text: "مسوّى", color: "#067A55" } : undefined}>
        <InvoiceMasthead
          docType="كشف تسوية"
          number={st.number}
          title="منصة يمن زون"
          subtitle="منصة التجارة الإلكترونية اليمنية — yemenzone1.com"
          chip={paid
            ? { label: "✅ مسوّى", tone: "ok" }
            : { label: "📋 صادر — بانتظار التسوية", tone: "warn" }}
          logo={<img src="/logo.png" alt="" className="w-14 h-14 rounded-2xl object-contain bg-white/95 p-1.5 shrink-0" style={{ border: "2px solid rgba(255,255,255,.4)" }} />}
        />

        <PartyCards
          from={{ label: "صادر من", lines: [
            "منصة يمن زون",
            `أُصدر: ${new Date(st.createdAt).toLocaleDateString("ar-YE")}`,
          ] }}
          to={{ label: "إلى البائع", lines: [
            st.seller?.name,
            st.seller?.phone,
            st.seller?.stores?.map((s: any) => s.name).join("، "),
            `الفترة: ${new Date(st.periodStart).toLocaleDateString("ar-YE")} ← ${new Date(st.periodEnd).toLocaleDateString("ar-YE")}`,
          ] }}
        />

        {/* الملخص المالي */}
        <div className="px-6 mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ["💰 المبيعات", st.gross, "#1B1437"],
            ["🏛️ عمولة المنصة", st.commission, "#6C3DF5"],
            ["↩️ المرتجعات", st.refunds, "#B42323"],
            ["✨ الصافي", st.net, "#067A55"],
          ].map(([l, v, c]) => (
            <div key={String(l)} className="rounded-2xl p-3 text-center"
              style={{ background: "#F6F4FF", border: `1px solid ${INK.line}` }}>
              <p className="text-[10px] font-black" style={{ color: "#8A86A3" }}>{l}</p>
              <p className="font-black text-lg" style={{ color: c as string }}>{fmt(v)}</p>
              <p className="text-[9px]" style={{ color: "#8A86A3" }}>ر.ي</p>
            </div>
          ))}
        </div>

        <ItemsTable
          columns={[
            { label: "الطلب", align: "right" },
            { label: "الإجمالي", align: "center" },
            { label: "العمولة", align: "center" },
            { label: "الدفع", align: "center" },
            { label: "الحالة", align: "center" },
            { label: "التاريخ", align: "center" },
          ]}
          rows={st.orders.map((o: any) => [
            <b key="n" dir="ltr" className="text-xs">{o.number}</b>,
            <span key="t">{fmt(o.total)}</span>,
            o.commissionReversed
              ? <span key="c" className="text-red-500 font-bold">معكوسة</span>
              : <span key="c">{fmt(o.commissionAmount || 0)}</span>,
            <span key="p" className="text-xs">{PAY_AR[o.paymentMethod] || (o.paymentMethod?.startsWith("store:") ? "طريقة المتجر" : o.paymentMethod || "كاش")}</span>,
            <span key="s" className="text-xs">{STATUS_AR[o.status] || o.status}</span>,
            <span key="d" className="text-xs">{new Date(o.updatedAt).toLocaleDateString("ar-YE")}</span>,
          ])}
          empty="لا طلبات مكتملة في هذه الفترة"
        />

        <InvoiceFooter
          thanks="كشف صادر آلياً من منصة يمن زون 🌟"
          note="العمولة تُخصم من محفظة البائع فور تسليم كل طلب وتُعكس عند الاسترجاع — هذا الكشف مستند إلكتروني لا يتطلب توقيعاً"
          qr={typeof window !== "undefined"
            ? { value: `${window.location.origin}/settlement/${id}`, caption: "تحقق من الكشف" }
            : undefined}
        />
      </InvoiceSheet>
    </div>
  );
}
