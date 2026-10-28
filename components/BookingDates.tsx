"use client";

import type { DateRange } from "react-day-picker";
import type { Locale } from "@/content/i18n";
import { useOccupancy, useSellableRooms } from "@/lib/booking/hooks";
import { freeFor, fullFor } from "@/lib/booking/occupancy";
import { startOfToday } from "./dates";
import RangeCalendar from "./RangeCalendar";

/**
 * The header's calendar, on its own so it loads only when a guest opens it:
 * the date picker and the booking store it reads (closed days) stay out of
 * every page's first download, which matters most on a phone.
 *
 * Days are closed by the night aware rule in lib/booking/occupancy.ts, fed by
 * the same store the booking flow and the admin use. A day is full when
 * every room on sale is taken that night.
 */
export default function BookingDates({
  locale,
  range,
  onSelect,
  months,
  stacked = false,
}: {
  locale: Locale;
  range: DateRange | undefined;
  onSelect: (next: DateRange | undefined) => void;
  months: number;
  stacked?: boolean;
}) {
  const occ = useOccupancy();
  const units = useSellableRooms().map((r) => r.unit);

  return (
    <RangeCalendar
      locale={locale}
      range={range}
      onSelect={onSelect}
      months={months}
      stacked={stacked}
      today={startOfToday()}
      isTaken={fullFor(occ, units)}
      freeRooms={freeFor(occ, units)}
    />
  );
}
