"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { ArrowRight, CalendarDays, RotateCcw, X } from "lucide-react";
import { getDict } from "@/content/dict";
import { localePath, type Locale } from "@/content/i18n";
import { lockScroll, unlockScroll } from "./scroll";
import { useMedia } from "./useMedia";
import { nightsBetween, toISO } from "./dates";

/* The calendar loads when it is first wanted (or a moment before: on hover,
   focus or touch of the button that opens it), not with every page. */
const loadDates = () => import("./BookingDates");
const BookingDates = dynamic(loadDates, { ssr: false, loading: () => <div className="sv-cal sv-cal--loading" aria-hidden="true" /> });

/**
 * Check in, check out, Book now: in the header, where the brief's reference
 * (yats.co) puts them.
 *
 *  - On a wide screen, one date button and Book now sit at the right of the
 *    header. The button opens a two month calendar beneath it, says which end
 *    of the stay it is waiting for, shows the stay once chosen, and closes
 *    itself once both ends are picked.
 *  - On a phone there is no room for fields, so the header carries a single
 *    "Book" button that opens a bottom sheet with the same calendar.
 *
 * "Book now" goes to the availability page with the dates in the URL. Nothing
 * is reserved there either: it composes a WhatsApp message the guest reads
 * before sending. It steps aside on that page, where the full calendar is
 * already open.
 *
 * The calendar itself is BookingDates, loaded on demand.
 */
export default function BookingBar({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const router = useRouter();
  const pathname = usePathname() || "";
  const wide = useMedia("(min-width: 1100px)");
  /* The sheet is portalled to <body>; a portal must not exist during the
     server render or React cannot match the two. */
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const root = useRef<HTMLDivElement>(null);
  const closer = useRef<number>(0);

  const onBooking = /\/booking(\/|$)/.test(pathname);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (wide && root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    if (!wide) lockScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      if (!wide) unlockScroll();
    };
  }, [open, wide]);

  useEffect(() => () => window.clearTimeout(closer.current), []);

  if (onBooking) return null;

  const fmt = (d?: Date) =>
    d ? d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short" }) : null;
  const nights = range?.from && range?.to ? nightsBetween(range.from, range.to) : 0;
  const choosingOut = !!range?.from && !range?.to;

  const select = (next: DateRange | undefined) => {
    setRange(next);
    window.clearTimeout(closer.current);
    /* Both ends chosen on the wide calendar: let the selection register for a
       beat, then get out of the way of the button. */
    if (wide && next?.from && next?.to) closer.current = window.setTimeout(() => setOpen(false), 450);
  };

  const go = () => {
    const q = new URLSearchParams();
    if (range?.from) q.set("in", toISO(range.from));
    if (range?.to) q.set("out", toISO(range.to));
    setOpen(false);
    const query = q.toString();
    router.push(`${localePath(locale, "booking")}${query ? `?${query}` : ""}`);
  };

  const calendar = (months: number) => <BookingDates locale={locale} range={range} onSelect={select} months={months} />;
  const warm = () => void loadDates();

  const hint = (
    <div className="sv-dock-hint">
      <span className="sv-label">{choosingOut ? t.bar.checkOut : t.bar.checkIn}</span>
      {nights ? (
        <span className="sv-dock-nights tnum">
          {nights} {nights === 1 ? t.bar.night : t.bar.nights}
        </span>
      ) : null}
      {range?.from ? (
        <button type="button" className="sv-dock-clear" onClick={() => setRange(undefined)}>
          <RotateCcw size={13} strokeWidth={1.6} aria-hidden="true" />
          {t.avail.clear}
        </button>
      ) : null}
    </div>
  );

  /* --- Phone: one button, and a bottom sheet ----------------------------- */
  if (!wide) {
    return (
      <>
        <button type="button" className="sv-book-mini" onClick={() => setOpen(true)} onPointerDown={warm} aria-haspopup="dialog">
          {t.common.bookShort}
        </button>

        {mounted
          ? createPortal(
              open ? (
                <>
                  <button type="button" className="sv-sheet-scrim" aria-label={t.common.close} onClick={() => setOpen(false)} />
                  <div className="sv-sheet" role="dialog" aria-modal="true" aria-label={t.bar.label}>
                    <span className="sv-sheet-grab" aria-hidden="true" />
                    <div className="sv-sheet-head">
                      <p className="sv-sheet-title">{t.bar.label}</p>
                      <button type="button" className="sv-sheet-close" onClick={() => setOpen(false)}>
                        <X size={20} strokeWidth={1.5} aria-hidden="true" />
                        <span className="sr-only">{t.common.close}</span>
                      </button>
                    </div>

                    <div className="sv-sheet-dates">
                      <div data-active={!choosingOut ? "true" : undefined}>
                        <span className="sv-dock-seg-label">{t.bar.checkIn}</span>
                        <span className="tnum" data-empty={range?.from ? undefined : "true"}>
                          {fmt(range?.from) ?? t.bar.pick}
                        </span>
                      </div>
                      <div data-active={choosingOut ? "true" : undefined}>
                        <span className="sv-dock-seg-label">{t.bar.checkOut}</span>
                        <span className="tnum" data-empty={range?.to ? undefined : "true"}>
                          {fmt(range?.to) ?? t.bar.pick}
                        </span>
                      </div>
                    </div>

                    {hint}
                    <div className="sv-sheet-cal">{calendar(1)}</div>

                    <div className="sv-sheet-foot">
                      <button type="button" className="sv-btn sv-btn--primary sv-sheet-go" onClick={go}>
                        <span>{t.common.bookNow}</span>
                        <ArrowRight size={16} strokeWidth={1.6} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </>
              ) : null,
              document.body,
            )
          : null}
      </>
    );
  }

  /* --- Wide: one date button and Book now, calendar beneath ------------- */
  const stay = range?.from ? `${fmt(range.from)}${range.to ? ` → ${fmt(range.to)}` : ""}` : null;
  return (
    <div ref={root} className="sv-book" role="group" aria-label={t.bar.label}>
      {/* Check in and check out share one quiet button that opens the two
          month calendar. It steps aside below 1600px, where the centred tabs
          need the room; Book now then goes straight to the booking page's own
          calendar. */}
      <button
        type="button"
        className="sv-book-field"
        data-active={open ? "true" : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onPointerEnter={warm}
        onFocus={warm}
      >
        <CalendarDays size={16} strokeWidth={1.4} aria-hidden="true" />
        <span className="sv-book-field-text">
          <span className="sv-book-field-label">
            {t.bar.checkIn} · {t.bar.checkOut}
          </span>
          <span className="sv-book-field-value tnum" data-empty={stay ? undefined : "true"}>
            {stay ?? t.bar.pick}
          </span>
        </span>
      </button>
      <button type="button" className="sv-book-go" onClick={go}>
        {t.common.bookNow}
      </button>

      {open ? (
        <div className="sv-book-panel">
          {hint}
          {calendar(2)}
        </div>
      ) : null}
    </div>
  );
}
