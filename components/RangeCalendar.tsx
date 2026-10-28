"use client";

import { useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { id as idLocale, enUS } from "react-day-picker/locale";
import { ChevronDown } from "lucide-react";
import { getDict } from "@/content/dict";
import type { Locale } from "@/content/i18n";
import { stayMatcher } from "@/lib/booking/occupancy";
import CalendarLegend from "./CalendarLegend";
import StayEnds, { type FreeRooms } from "./StayEnds";

/**
 * The stay calendar, shared by the booking page and the header's date
 * picker, so both read the same way:
 *
 *  - over it, the two ends of the stay and a line on what they mean
 *    (StayEnds), including how many rooms are free for the dates;
 *  - free days are plain numbers, a full night is a struck-through clay
 *    circle, past days fade;
 *  - the stay is one capsule from check in to check out, its two ends raised
 *    on a soft shadow, so a five night stay reads as one thing;
 *  - while the check out is being chosen, pointing at a day previews the
 *    capsule up to it, so the guest sees the stay before committing to it.
 *
 * `stacked` is the phone's calendar: months one under another, scrolled
 * with the thumb like the phone's own calendar, rather than paged with two
 * small arrows. Three to start, three more a tap away, up to a year.
 *
 * Which days can be picked is the night aware rule in occupancy.ts.
 */

const key = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const STEP = 3;
const MAX = 12;

export default function RangeCalendar({
  locale,
  range,
  onSelect,
  months,
  stacked = false,
  today,
  isTaken,
  freeRooms,
  className = "sv-cal",
}: {
  locale: Locale;
  range: DateRange | undefined;
  onSelect: (next: DateRange | undefined) => void;
  /** Side by side, with arrows to page through (ignored when stacked). */
  months: number;
  stacked?: boolean;
  today: Date;
  /** The night starting on this day cannot be sold. */
  isTaken: (d: Date) => boolean;
  /** Rooms free for a whole stay. Leave out once rooms are picked. */
  freeRooms?: FreeRooms;
  className?: string;
}) {
  const a = getDict(locale).avail;
  const [hover, setHover] = useState<Date | undefined>();
  const [shown, setShown] = useState(STEP);
  const disabled = stayMatcher(range, today, isTaken);
  const choosingOut = !!range?.from && !range?.to;
  const from = range?.from;
  const preview = choosingOut && from && hover && key(hover) > key(from) && !disabled(hover) ? hover : undefined;

  const past = (d: Date) => key(d) < key(today);
  const select = (next: DateRange | undefined) => {
    setHover(undefined);
    onSelect(next);
  };

  return (
    <div className="sv-rc" data-stacked={stacked ? "true" : undefined}>
      <StayEnds locale={locale} range={range} onSelect={select} freeRooms={freeRooms} />
      {stacked ? <CalendarLegend locale={locale} /> : null}
      <div className="sv-rc-scroll">
        <DayPicker
          mode="range"
          selected={range}
          onSelect={select}
          numberOfMonths={stacked ? shown : months}
          hideNavigation={stacked}
          startMonth={today}
          disabled={disabled}
          modifiers={{
            past,
            /* Only a closed day reads as full: the morning after the last free
               night is a valid check out, even though that night is taken. */
            full: (d) => !past(d) && isTaken(d) && disabled(d),
            previewMiddle: (d) => !!preview && !!from && key(d) > key(from) && key(d) < key(preview),
            previewEnd: (d) => !!preview && key(d) === key(preview),
            previewStart: (d) => !!preview && !!from && key(d) === key(from),
          }}
          modifiersClassNames={{
            past: "sv-day-past",
            full: "sv-day-full",
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
          className={`${className}${stacked ? " sv-cal--stacked" : ""}`}
        />
        {stacked && shown < MAX ? (
          <button type="button" className="sv-rc-more" onClick={() => setShown((n) => Math.min(MAX, n + STEP))}>
            {a.moreMonths}
            <ChevronDown size={16} strokeWidth={1.6} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {stacked ? null : <CalendarLegend locale={locale} />}
    </div>
  );
}
