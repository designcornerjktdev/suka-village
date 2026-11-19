import type { Metadata } from "next";
import UsersEditor from "@/components/admin/UsersEditor";

export const metadata: Metadata = { title: "Pengguna" };

export default function Page() {
  return <UsersEditor />;
}
