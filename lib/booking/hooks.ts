"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Booking, UnitId } from "./types";
import { effectiveStatus, occupancy } from "./occupancy";
import { useDB } from "./store";
import { readAdminSession } from "./api";

/**
 * READS. The other half of the integration seam (api.ts holds the writes).
 *
 * In the prototype each hook selects from the mock store and re-renders when
 * it changes. In production each becomes a fetch with a cache (SWR or
 * TanStack Query) against the matching GET endpoint in BOOKING.md, keeping
 * the same name and return shape so no component changes.
 */

/** Bookings with their status as it is NOW (a lapsed hold reads as expired). */
export function useBookings(): Booking[] {
  const db = useDB();
  const now = useNow(30_000);
  return useMemo(
    () => db.bookings.map((b) => ({ ...b, status: effectiveStatus(b, now) })),
    [db.bookings, now],
  );
}

export function useBooking(code: string): Booking | null | undefined {
  const all = useBookings();
  const hydrated = useHydratedStore();
  return useMemo(() => {
    if (!hydrated) return undefined;
    return all.find((b) => b.code.toUpperCase() === code.toUpperCase()) ?? null;
  }, [all, code, hydrated]);
}

export function useOccupancy() {
  const db = useDB();
  return useMemo(() => occupancy(db.bookings, db.blocks), [db.bookings, db.blocks]);
}

/** Dates closed by hand in the admin calendar. */
export function useBlocks() {
  return useDB().blocks;
}

export function useRates() {
  return useDB().rates;
}

export function useRate(unit: UnitId) {
  const rates = useRates();
  return rates.find((r) => r.unit === unit);
}

export function useSettings() {
  return useDB().settings;
}

export function useContent() {
  return useDB().content;
}

/** The rooms on sale, as the admin has edited them (name, size, photos, ...). */
export function useRooms() {
  const rooms = useDB().rooms;
  return useMemo(() => rooms.filter((r) => !r.archived), [rooms]);
}

/** id → the room's current name, for lists that only have the id. Archived
 *  rooms are included: an old booking still names the room it was for. */
export function useRoomName() {
  const rooms = useDB().rooms;
  return useMemo(() => {
    const names = new Map<string, string>(rooms.map((r) => [r.unit, r.name]));
    return (id: string) => names.get(id) ?? id;
  }, [rooms]);
}

export function useMediaMeta() {
  return useDB().media;
}

/* --- Time ------------------------------------------------------------------ */

type Clock = { now: number; listeners: Set<() => void>; timer?: number };
const clocks = new Map<number, Clock>();

function clockFor(interval: number) {
  let c = clocks.get(interval);
  if (!c) {
    c = { now: Date.now(), listeners: new Set() };
    clocks.set(interval, c);
  }
  return c;
}

/* One subscribe function per interval, created once. useSyncExternalStore
   resubscribes whenever it receives a NEW function, and a fresh subscription
   that refreshed the clock would change the snapshot, re-render, resubscribe
   and refresh again: an infinite loop. */
const subscribers = new Map<number, (listener: () => void) => () => void>();

function subscribeTo(interval: number) {
  let subscribe = subscribers.get(interval);
  if (subscribe) return subscribe;
  subscribe = (listener) => {
    const c = clockFor(interval);
    c.listeners.add(listener);
    if (!c.timer) {
      c.timer = window.setInterval(() => {
        c.now = Date.now();
        c.listeners.forEach((l) => l());
      }, interval);
    }
    return () => {
      c.listeners.delete(listener);
      if (!c.listeners.size && c.timer) {
        window.clearInterval(c.timer);
        c.timer = undefined;
      }
    };
  };
  subscribers.set(interval, subscribe);
  return subscribe;
}

/** The current time, refreshed every `interval` ms, shared by every caller. */
export function useNow(interval = 1000) {
  return useSyncExternalStore(
    subscribeTo(interval),
    () => clockFor(interval).now,
    () => 0,
  );
}

/* --- Admin session ----------------------------------------------------- */

const subscribeSession = (listener: () => void) => {
  window.addEventListener("sv-admin-session", listener);
  return () => window.removeEventListener("sv-admin-session", listener);
};

export function useAdminSession() {
  return useSyncExternalStore(subscribeSession, () => sessionCache(), () => undefined);
}

let lastRaw: string | null = null;
let lastSession: { email: string } | null = null;
function sessionCache() {
  const raw = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem("sv-admin-session");
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastSession = readAdminSession();
  }
  return lastSession;
}

const noop = () => () => {};

function useHydratedStore() {
  return useSyncExternalStore(noop, () => true, () => false);
}
