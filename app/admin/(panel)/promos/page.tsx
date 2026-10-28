import type { Metadata } from "next";
import PromosEditor from "@/components/admin/PromosEditor";

export const metadata: Metadata = { title: "Promo" };

export default function Page() {
  return <PromosEditor />;
}
