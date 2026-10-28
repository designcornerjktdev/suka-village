import type { Block, Booking, BookingStatus, ISODate, UnitId } from "./types";
import { HOLDING } from "./types";
import { iso, nightsOf } from "./format";

/**
 * Which nights are taken, derived from bookings and from dates closed by hand.
 *
 * One source of truth: a night is taken if a booking that still holds it, or a
 * block (sold on another platform, repairs, the owner's own use), covers it.
 * A pending booking holds its nights only until its payment window closes,
 * which is what stops two guests paying for the same night while one of them
 * is still looking for their banking app.
 */

/** A pending booking whose window has passed is expired, whatever is stored. */
export function effectiveStatus(b: Booking, now = Date.now()): BookingStatus {
  if (b.status === "pending" && Date.parse(b.payment.expiresAt) <= now) return "expired";
  return b.status;
}

/**
 * Per room: each taken night, and what holds it (a booking code, or
 * "block:<id>"). A room with nothing taken has no entry, so read it through
 * `isTaken`.
 */
export type Occupancy = Record<UnitId, Map<ISODate, string>>;

const cache = new WeakMap<object, Occupancy>();

export function occupancy(bookings: Booking[], blocks: Block[], now = Date.now()): Occupancy {
  const hit = cache.get(bookings);
  if (hit && cache.get(blocks) === hit) return hit;

  const out: Occupancy = {};
  const hold = (unit: UnitId, night: ISODate, by: string) => (out[unit] ??= new Map()).set(night, by);
  for (const b of bookings) {
    if (!HOLDING.includes(effectiveStatus(b, now))) continue;
    for (const night of nightsOf(b.checkIn, b.checkOut)) {
      for (const unit of b.units) hold(unit, night, b.code);
    }
  }
  for (const k of blocks) {
    for (const night of nightsOf(k.from, k.to)) hold(k.unit, night, `block:${k.id}`);
  }

  cache.set(bookings, out);
  cache.set(blocks, out);
  return out;
}

export const isTaken = (occ: Occupancy, unit: UnitId, night: ISODate) => occ[unit]?.has(night) ?? false;

export type Status = "available" | "partial" | "booked";

export function unitStatus(occ: Occupancy, unit: UnitId, checkIn: ISODate, checkOut: ISODate) {
  const nights = nightsOf(checkIn, checkOut);
  const free = nights.filter((n) => !isTaken(occ, unit, n)).length;
  const status: Status = free === nights.length ? "available" : free === 0 ? "booked" : "partial";
  return { status, free, total: nights.length };
}

/** For the calendar: is the NIGHT starting on this day taken for every room in `among`? */
export function fullFor(occ: Occupancy, among: UnitId[]) {
  return (date: Date) => {
    const k = iso(date);
    return among.length > 0 && among.every((u) => isTaken(occ, u, k));
  };
}

/** Some of the rooms in `among` are taken that night, but not all: "few left". */
export function someTaken(occ: Occupancy, among: UnitId[]) {
  return (date: Date) => {
    const k = iso(date);
    const taken = among.filter((u) => isTaken(occ, u, k)).length;
    return taken > 0 && taken < among.length;
  };
}

/** Same, but taken for ANY of them: picking several rooms needs all free. */
export function anyTaken(occ: Occupancy, among: UnitId[]) {
  return (date: Date) => {
    const k = iso(date);
    return among.some((u) => isTaken(occ, u, k));
  };
}

const key = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

/**
 * Which calendar days can be clicked, given what has been picked so far.
 *
 * Calendars disable DAYS; a stay books NIGHTS. So the rule depends on which end
 * of the stay is being chosen:
 *
 *  - Choosing a check in: a day is closed if its own night is taken.
 *  - Choosing a check out: every day up to and INCLUDING the first taken night
 *    after the check in is open (the latest morning the guest can leave before
 *    running into it); everything past it is closed. Days before the check in
 *    stay open as check ins, since clicking one there starts the stay earlier.
 */
export function stayMatcher(
  range: { from?: Date; to?: Date } | undefined,
  today: Date,
  isTaken: (d: Date) => boolean,
) {
  const choosingOut = !!range?.from && !range?.to;
  const from = range?.from;

  let firstTaken: number | null = null;
  if (choosingOut && from) {
    const d = new Date(from);
    for (let i = 0; i < 400; i++) {
      if (isTaken(d)) {
        firstTaken = key(d);
        break;
      }
      d.setDate(d.getDate() + 1);
    }
  }

  return (date: Date) => {
    if (key(date) < key(today)) return true;
    if (!choosingOut || !from) return isTaken(date);
    if (key(date) <= key(from)) return isTaken(date);
    return firstTaken !== null && key(date) > firstTaken;
  };
}
