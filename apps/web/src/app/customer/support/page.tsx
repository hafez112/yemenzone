"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser } from "../../../lib/api";
import SupportCenter from "@/components/SupportCenter";

// 🎧 دعم العميل — مراسلة إدارة المنصة من لوحة تحكمه
export default function CustomerSupportPage() {
  const router = useRouter();
  useEffect(() => {
    if (!getUser()) { router.push("/auth/customer-login"); return; }
  }, []);
  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-teal-50 to-purple-50">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/customer" className="w-9 h-9 rounded-xl bg-white shadow flex items-center justify-center font-black text-gray-500">→</Link>
          <div>
            <h1 className="text-xl font-black">🎧 الدعم الفني</h1>
            <p className="text-[11px] text-gray-400 font-bold">راسل إدارة المنصة وتابع الردود — واقتراحاتك تصنع مستقبل يمن زون 💡</p>
          </div>
        </div>
        <SupportCenter base="/customer/support" />
      </div>
    </main>
  );
}
