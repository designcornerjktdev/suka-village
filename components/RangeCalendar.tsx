"use client";

import { useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { id as idLocale, enUS } from "react-day-picker/locale";
import type { Locale } from "@/content/i18n";
import { stayMatcher } from "@/lib/booking/occupancy";
import CalendarLegend from "./CalendarLegend";

/**
 * The stay calendar, shared by the booking page and the header's date
 * picker, so both read the same way:
 *
 *  - free days are plain numbers, a day with only some rooms left carries a
 *    small dot, a full night is a struck-through clay tile, past days fade;
 *  - the stay is one continuous band from check in to check out, with the
 *    two ends as filled circles, so a five night stay reads as one thing;
 *  - while the check out is being chosen, pointing at a day previews the
 *    band up to it, so the guest sees the stay before committing to it.
 *
 * Which days can be picked is the night aware rule in occupancy.ts.
 */

const key = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

export default function RangeCalendar({
  locale,
  range,
  onSelect,
  months,
  today,
  isTaken,
  isFew,
  className = "sv-cal",
}: {
  locale: Locale;
  range: DateRange | undefined;
  onSelect: (next: DateRange | undefined) => void;
  months: number;
  today: Date;
  /** The night starting on this day cannot be sold. */
  isTaken: (d: Date) => boolean;
  /** Some rooms are taken that night, not all. Leave out once rooms are picked. */
  isFew?: (d: Date) => boolean;
  className?: string;
}) {
  const [hover, setHover] = useState<Date | undefined>();
  const disabled = stayMatcher(range, today, isTaken);
  const choosingOut = !!range?.from && !range?.to;
  const from = range?.from;
  const preview = choosingOut && from && hover && key(hover) > key(from) && !disabled(hover) ? hover : undefined;

  const past = (d: Date) => key(d) < key(today);

  return (
    <>
      <DayPicker
        mode="range"
        selected={range}
        onSelect={(next) => {
          setHover(undefined);
          onSelect(next);
        }}
        numberOfMonths={months}
        startMonth={today}
        disabled={disabled}
        modifiers={{
          past,
          /* Only a closed day reads as full: the morning after the last free
             night is a valid check out, even though that night is taken. */
          full: (d) => !past(d) && isTaken(d) && disabled(d),
          few: (d) => !past(d) && !isTaken(d) && !!isFew?.(d),
          previewMiddle: (d) => !!preview && !!from && key(d) > key(from) && key(d) < key(preview),
          previewEnd: (d) => !!preview && key(d) === key(preview),
          previewStart: (d) => !!preview && !!from && key(d) === key(from),
        }}
        modifiersClassNames={{
          past: "sv-day-past",
          full: "sv-day-full",
          few: "sv-day-few",
          previewMiddle: "sv-day-preview",
          previewEnd: "sv-day-preview-end",
          previewStart: "sv-day-preview-start",
        }}
        onDayMouseEnter={(d) => setHover(d)}
        onDayMouseLeave={() => setHover(undefined)}
        resetOnSelect
        min={1}
        weekStartsOn={1}
        locale={locale === "id" ? idLocale : enUS}
        className={className}
      />
      <CalendarLegend locale={locale} few={!!isFew} />
    </>
  );
}
