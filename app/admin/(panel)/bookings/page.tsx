import type { Metadata } from "next";
import { Suspense } from "react";
import BookingsTable from "@/components/admin/BookingsTable";

export const metadata: Metadata = { title: "Booking" };

export default function BookingsPage() {
  /* The status filter is read from the URL (?status=pending), which needs a
     boundary on a statically rendered page. */
  return (
    <Suspense fallback={null}>
      <BookingsTable />
    </Suspense>
  );
}
