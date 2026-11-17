"use client";

import { useMemo, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import type { Block, Booking, Content, ISODate, MediaMeta, Promo, Room, Settings, UnitId, UnitRate } from "./types";
import type { Occupancy } from "./occupancy";
import { effectiveStatus } from "./occupancy";
import { FALLBACK_SETTINGS, getJSON, readToken } from "./client";
import { todayISO } from "./format";

/**
 * READS, the other half of the integration seam (api.ts holds the writes).
 * Each hook is a cached fetch (SWR) against the backend, with the same name
 * and return shape the prototype had, and a safe value until the answer
 * arrives ([] / {} / the fallback settings), so no component changes.
 *
 * Inside /admin the hooks read the admin API (everything, with the session
 * cookie); on the public site they read the public endpoints.
 */

const useInAdmin = () => (usePathname() ?? "").startsWith("/admin");

const EMPTY_CONTENT: Content = { home: [], facilities: [], experiences: [], events: [], explore: [], gallery: [], contact: [] };
const NONE: never[] = [];

/* Rooms and rates: the admin's list includes archived rooms (old bookings
   still name them); the public one has the rooms on sale. */
function useCatalog() {
  const admin = useInAdmin();
  const { data } = useSWR(admin ? "/api/admin/rooms" : "/api/rooms", (u: string) => getJSON<{ rooms: Room[]; rates: UnitRate[] }>(u));
  return data ?? { rooms: NONE as Room[], rates: NONE as UnitRate[] };
}

/** Bookings with their status as it is NOW (a lapsed hold reads as expired). Admin only; [] elsewhere. */
export function useBookings(): Booking[] {
  const admin = useInAdmin();
  const now = useNow(30_000);
  const { data } = useSWR(admin ? "/api/admin/bookings" : null, (u: string) => getJSON<{ bookings: Booking[] }>(u), { refreshInterval: 30_000 });
  const list = data?.bookings ?? (NONE as Booking[]);
  /* Until the clock has ticked (now is 0), the status the server computed stands. */
  return useMemo(() => (now ? list.map((b) => ({ ...b, status: effectiveStatus(b, now) })) : list), [list, now]);
}

/**
 * One booking: undefined while loading, null when not found (or, for a guest,
 * no valid token). The guest's order page asks again every 5 seconds while it
 * waits for payment, so it moves on by itself when DOKU's webhook lands.
 */
export function useBooking(code: string): Booking | null | undefined {
  const admin = useInAdmin();
  const hydrated = useHydratedStore();
  const now = useNow(30_000);
  const c = code.trim().toUpperCase();
  const token = hydrated && !admin ? readToken(c) : null;
  const key = !hydrated ? null : admin ? `/api/admin/bookings/${c}` : token ? `/api/bookings/${c}?t=${encodeURIComponent(token)}` : null;
  const { data, isLoading } = useSWR(key, (u: string) => getJSON<Booking>(u), {
    refreshInterval: (b) => (!admin && b?.status === "pending" ? 5000 : 0),
  });
  return useMemo(() => {
    if (!hydrated || (key && isLoading)) return undefined;
    if (!data) return null;
    return now ? { ...data, status: effectiveStatus(data, now) } : data;
  }, [hydrated, key, isLoading, data, now]);
}

/** Taken nights per room, from today on (dates only: who holds them is not public). */
export function useOccupancy(): Occupancy {
  const { data } = useSWR(`/api/availability?from=${todayISO()}`, (u: string) => getJSON<{ occupancy: Record<UnitId, ISODate[]> }>(u), { refreshInterval: 60_000 });
  return useMemo(() => {
    const occ: Occupancy = {};
    for (const [unit, days] of Object.entries(data?.occupancy ?? {})) occ[unit] = new Map(days.map((d) => [d, "taken"]));
    return occ;
  }, [data]);
}

/** Dates closed by hand in the admin calendar. */
export function useBlocks(): Block[] {
  const admin = useInAdmin();
  const { data } = useSWR(admin ? "/api/admin/blocks" : null, (u: string) => getJSON<Block[]>(u));
  return data ?? (NONE as Block[]);
}

export function useRates(): UnitRate[] {
  return useCatalog().rates;
}

export function useRate(unit: UnitId) {
  const rates = useRates();
  return rates.find((r) => r.unit === unit);
}

export function useSettings(): Settings {
  const admin = useInAdmin();
  const { data } = useSWR(admin ? "/api/admin/settings" : "/api/settings", (u: string) => getJSON<Settings>(u));
  return data ?? FALLBACK_SETTINGS;
}

/** Every page section, hidden items too (the CMS). */
export function useContent(): Content {
  const admin = useInAdmin();
  const { data } = useSWR(admin ? "/api/admin/content" : null, (u: string) => getJSON<Content>(u));
  return data ?? EMPTY_CONTENT;
}

/** The rooms on sale, as the admin has edited them (name, size, photos, ...). */
export function useRooms(): Room[] {
  const { rooms } = useCatalog();
  return useMemo(() => rooms.filter((r) => !r.archived), [rooms]);
}

/** The rooms a guest can actually book online. A room the owner has just
 *  added (off sale, no price yet) is left out, so it never makes the
 *  calendar look free when every room that is for sale is taken. */
export function useSellableRooms() {
  const rooms = useRooms();
  const { rates } = useCatalog();
  return useMemo(() => rooms.filter((r) => rates.find((x) => x.unit === r.unit)?.bookable), [rooms, rates]);
}

/** id → the room's current name, for lists that only have the id. Archived
 *  rooms are included in the admin: an old booking still names the room it was for. */
export function useRoomName() {
  const { rooms } = useCatalog();
  return useMemo(() => {
    const names = new Map<string, string>(rooms.map((r) => [r.unit, r.name]));
    return (id: string) => names.get(id) ?? id;
  }, [rooms]);
}

export function useMediaMeta(): Record<string, MediaMeta> {
  const admin = useInAdmin();
  const { data } = useSWR(admin ? "/api/admin/media" : null, (u: string) => getJSON<Record<string, MediaMeta>>(u));
  return data ?? ({} as Record<string, MediaMeta>);
}

/** Every promo code, for the admin. */
export function usePromos(): Promo[] {
  const admin = useInAdmin();
  const { data } = useSWR(admin ? "/api/admin/promos" : null, (u: string) => getJSON<Promo[]>(u));
  return data ?? (NONE as Promo[]);
}

/** One code's rules, for the checkout to keep a discount right while the
 *  guest changes dates or rooms: GET /api/promos/:code, which answers only
 *  for a code the guest has already typed. */
export function usePromo(code: string | null): Promo | null {
  const { data } = useSWR(code ? `/api/promos/${encodeURIComponent(code)}` : null, (u: string) => getJSON<Promo>(u));
  return code ? (data ?? null) : null;
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

/* Who is signed in, from GET /api/admin/me (the session cookie is httpOnly,
   so the browser cannot read it). undefined while asking, null when nobody
   is, { email } when someone is. Asked again on "sv-admin-session" (login,
   logout). */
type AdminSession = { email: string } | null | undefined;
let session: AdminSession = undefined;
const sessionListeners = new Set<() => void>();
let asking: Promise<void> | null = null;

function askSession() {
  asking ??= fetch("/api/admin/me", { cache: "no-store" })
    .then(async (res) => (res.ok ? ((await res.json()) as { email: string }) : null))
    .catch(() => null)
    .then((s) => {
      session = s ? { email: s.email } : null;
      asking = null;
      sessionListeners.forEach((l) => l());
    });
}

const onSessionChanged = () => {
  session = undefined;
  sessionListeners.forEach((l) => l());
  askSession();
};

const subscribeSession = (listener: () => void) => {
  sessionListeners.add(listener);
  if (sessionListeners.size === 1) window.addEventListener("sv-admin-session", onSessionChanged);
  if (session === undefined) askSession();
  return () => {
    sessionListeners.delete(listener);
    if (!sessionListeners.size) window.removeEventListener("sv-admin-session", onSessionChanged);
  };
};

export function useAdminSession(): AdminSession {
  return useSyncExternalStore(subscribeSession, () => session, () => undefined);
}

const noop = () => () => {};

function useHydratedStore() {
  return useSyncExternalStore(noop, () => true, () => false);
}
