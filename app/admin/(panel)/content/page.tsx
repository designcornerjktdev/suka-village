import type { Metadata } from "next";
import ContentEditor from "@/components/admin/ContentEditor";

export const metadata: Metadata = { title: "Konten" };

export default function Page() {
  return <ContentEditor />;
}
