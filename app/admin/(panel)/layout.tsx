import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";

/* Every admin screen except the login sits inside the shell, which also holds
   the (prototype) sign-in guard. */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
