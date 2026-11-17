import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { ADMIN_COOKIE, getAdmin } from "@/lib/server/auth";

/* Every admin screen except the login sits inside the shell. The session is
   checked here, on the server (the proxy only checks that a cookie exists);
   the shell keeps its own client guard for the interface. */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await getAdmin(token))) redirect("/admin/login");
  return <AdminShell>{children}</AdminShell>;
}
