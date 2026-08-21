"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "../../../lib/api";
import CardPanel from "@/components/CardPanel";

// 💳 بطاقة العميل — اللوحة الموحدة (رصيد + شحن + بيانات + طلبات تعديل)
export default function CustomerCardPage() {
  const router = useRouter();
  useEffect(() => {
    if (!getUser()) { router.push("/auth/customer-login"); return; }
  }, []);
  return <CardPanel base="/customer/card" backHref="/customer" backLabel="لوحة تحكمي" />;
}
