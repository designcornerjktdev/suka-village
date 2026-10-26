import type { Metadata } from "next";
import AdminLogin from "@/components/admin/AdminLogin";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return <AdminLogin />;
}
