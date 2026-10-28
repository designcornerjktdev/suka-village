"use client";

import type { DateRange } from "react-day-picker";
import { RotateCcw } from "lucide-react";
import { fill, getDict } from "@/content/dict";
import type { Locale } from "@/content/i18n";
import { nightsBetween } from "./dates";

export type FreeRooms = (from: Date, to: Date) => { free: number; total: number };

/**
 * The two ends of the stay, over the calendar, and one line under them that
 * says what to do next or what the dates mean.
 *
 *  - Check in and check out side by side. The end the calendar is waiting
 *    for is marked (a tint and a green bar along its foot), so it is always
 *    clear what the next tap picks. Tapping an end picks it again.
 *  - The line: "pick a check in", then "now pick a check out", then, once
 *    both are chosen, the nights and how many rooms are free for all of
 *    them, in words. This replaced a dot on every day that had a room
 *    taken: with three rooms that was nearly every day.
 */
export default function StayEnds({
  locale,
  range,
  onSelect,
  freeRooms,
}: {
  locale: Locale;
  range: DateRange | undefined;
  onSelect: (next: DateRange | undefined) => void;
  /** Leave out once rooms are picked: the calendar then only offers nights they have free. */
  freeRooms?: FreeRooms;
}) {
  const t = getDict(locale);
  const a = t.avail;
  const from = range?.from;
  const to = range?.to;
  const choosingOut = !!from && !to;
  const nights = from && to ? nightsBetween(from, to) : 0;
  const rooms = from && to && freeRooms ? freeRooms(from, to) : null;

  const fmt = (d: Date) =>
    d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { weekday: "short", day: "numeric", month: "short" });

  let status = a.pickIn;
  let tone: "warn" | "stop" | undefined;
  if (choosingOut) status = a.pickOut;
  else if (nights) {
    const n = fill(t.checkout.nightsN, { n: nights });
    let more = "";
    if (rooms) {
      if (rooms.free === 0) {
        more = a.noneFree;
        tone = "stop";
      } else if (rooms.free === 1 && rooms.total > 1) {
        more = a.lastRoom;
        tone = "warn";
      } else if (rooms.free === rooms.total) more = a.allFree;
      else more = fill(a.someFree, { n: rooms.free, total: rooms.total });
    }
    status = more ? `${n} · ${more}` : n;
  }

  return (
    <div className="sv-ends">
      <div className="sv-ends-pair">
        <button type="button" className="sv-ends-seg" data-active={!from ? "true" : undefined} onClick={() => onSelect(undefined)}>
          <span className="sv-ends-label">{t.bar.checkIn}</span>
          <span className="sv-ends-value tnum" data-empty={from ? undefined : "true"}>
            {from ? fmt(from) : t.bar.pick}
          </span>
        </button>
        <button
          type="button"
          className="sv-ends-seg"
          data-active={choosingOut ? "true" : undefined}
          disabled={!from}
          onClick={() => from && onSelect({ from, to: undefined })}
        >
          <span className="sv-ends-label">{t.bar.checkOut}</span>
          <span className="sv-ends-value tnum" data-empty={to ? undefined : "true"}>
            {to ? fmt(to) : t.bar.pick}
          </span>
        </button>
      </div>

      <div className="sv-ends-status">
        <p aria-live="polite" data-tone={tone}>
          {status}
        </p>
        {from ? (
          <button type="button" className="sv-ends-clear" onClick={() => onSelect(undefined)}>
            <RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" />
            {a.clear}
          </button>
        ) : null}
      </div>
    </div>
  );
}
