"use client";

import { DayPicker, type DateRange } from "react-day-picker";
import { id as idLocale, enUS } from "react-day-picker/locale";
import type { Locale } from "@/content/i18n";
import { useOccupancy, useRooms } from "@/lib/booking/hooks";
import { fullFor, stayMatcher } from "@/lib/booking/occupancy";
import { startOfToday } from "./dates";

/**
 * The header's calendar, on its own so it loads only when a guest opens it:
 * the date picker and the booking store it reads (closed days) stay out of
 * every page's first download, which matters most on a phone.
 *
 * Days are closed by the night aware rule in lib/booking/occupancy.ts, fed by
 * the same store the booking flow and the admin use.
 */
export default function BookingDates({
  locale,
  range,
  onSelect,
  months,
}: {
  locale: Locale;
  range: DateRange | undefined;
  onSelect: (next: DateRange | undefined) => void;
  months: number;
}) {
  const today = startOfToday();
  const occ = useOccupancy();
  const rooms = useRooms();
  const isEstateFull = fullFor(occ, rooms.map((r) => r.unit));

  return (
    <DayPicker
      mode="range"
      selected={range}
      onSelect={onSelect}
      numberOfMonths={months}
      startMonth={today}
      disabled={stayMatcher(range, today, isEstateFull)}
      modifiers={{ full: isEstateFull }}
      modifiersClassNames={{ full: "sv-day-full" }}
      resetOnSelect
      min={1}
      weekStartsOn={1}
      locale={locale === "id" ? idLocale : enUS}
      className="sv-cal"
    />
  );
}
