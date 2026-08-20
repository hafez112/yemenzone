import type { Metadata } from "next";
import DirectoryClient from "./DirectoryClient";

export const metadata: Metadata = {
  title: "دليل المتاجر — تصفح متاجر اليمن | يمن زون",
  description: "دليل متاجر يمن زون: تصفح المتاجر حسب المحافظة والنوع، واعثر على المتاجر الموثقة والأعلى تقييماً في مكان واحد.",
};

export default function StoresDirectoryPage() {
  return <DirectoryClient />;
}
