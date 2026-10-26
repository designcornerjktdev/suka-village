import type { Metadata } from "next";
import SettingsEditor from "@/components/admin/SettingsEditor";

export const metadata: Metadata = { title: "Pengaturan" };

export default function Page() {
  return <SettingsEditor />;
}
