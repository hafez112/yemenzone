"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { sessionType } from "@/lib/tool-db";
import CardPanel from "@/components/CardPanel";

// 💳 بطاقة البائع — بطاقة يمن زون الخاصة به داخل لوحة تحكمه
// يشحنها ويدفع بها الخدمات المدفوعة واشتراكات الخطط
export default function SellerCardPage() {
  const router = useRouter();
  useEffect(() => {
    if (!getUser() || sessionType() !== "seller") { router.push("/auth/login"); return; }
  }, []);
  return <CardPanel base="/seller/card" backHref="/seller" backLabel="لوحة تحكمي" />;
}
