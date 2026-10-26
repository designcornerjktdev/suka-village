import type { Metadata } from "next";
import RoomsEditor from "@/components/admin/RoomsEditor";

export const metadata: Metadata = { title: "Kamar & harga" };

export default function Page() {
  return <RoomsEditor />;
}
