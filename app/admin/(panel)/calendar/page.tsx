import type { Metadata } from "next";
import AdminCalendar from "@/components/admin/AdminCalendar";

export const metadata: Metadata = { title: "Kalender" };

export default function Page() {
  return <AdminCalendar />;
}
