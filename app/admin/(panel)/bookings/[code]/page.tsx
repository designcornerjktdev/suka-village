import type { Metadata } from "next";
import BookingDetail from "@/components/admin/BookingDetail";

export async function generateMetadata({ params }: PageProps<"/admin/bookings/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: code.toUpperCase() };
}

export default async function BookingPage({ params }: PageProps<"/admin/bookings/[code]">) {
  const { code } = await params;
  return <BookingDetail code={decodeURIComponent(code)} />;
}
