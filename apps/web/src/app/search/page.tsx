import type { Metadata } from "next";
import { Suspense } from "react";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "البحث — متاجر ومنتجات | يمن زون",
  description: "ابحث في منصة يمن زون عن المتاجر والمنتجات — نتائج موحدة من كل متاجر المنصة.",
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="page"><div className="card skeleton h-40 max-w-3xl mx-auto" /></div>}>
      <SearchClient />
    </Suspense>
  );
}
