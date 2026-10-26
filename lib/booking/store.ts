"use client";

import { useSyncExternalStore } from "react";
import { CONTENT_REV, DEMO_RATES, seedContent, seedDB, seedRooms, seedSettings, type DB } from "./seed";
import { effectiveStatus } from "./occupancy";

/**
 * THE MOCK BACKEND. Prototype only; replaced by the developer.
 *
 * The whole "database" is one JSON document in localStorage, so the guest
 * pages and the admin share it: book a stay in one tab and it appears in the
 * admin in another (the `storage` event keeps open tabs in step). It lives in
 * ONE browser. A booking made on a phone does not appear in the admin on a
 * laptop, which is the clearest sign this is not the real thing.
 *
 * Nothing outside lib/booking imports this file directly except hooks.ts and
 * api.ts, which is what makes it replaceable.
 */

/* Bumped whenever the shape changes, so an old document in someone's browser
   is replaced by fresh demo data rather than read as the wrong shape. */
const KEY = "sv-demo-db-v2";

/* What the server renders, and what the browser renders while hydrating:
   empty of bookings, so both sides agree. The real data arrives one render
   later. */
const EMPTY: DB = {
  version: 2,
  contentRev: CONTENT_REV,
  bookings: [],
  blocks: [],
  rooms: seedRooms(),
  rates: DEMO_RATES,
  settings: seedSettings(),
  content: seedContent(),
  media: {},
};

let state: DB | null = null;
const listeners = new Set<() => void>();

function read(): DB {
  if (state) return state;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as DB) : null;
    /* A document saved while the calendar was briefly removed has no blocks. */
    if (parsed?.version === 2 && !Array.isArray(parsed.blocks)) parsed.blocks = [];
    /* Seeded from an older edition of the site: take its content and the
       original rooms' photographs afresh, keep bookings, prices and settings. */
    if (parsed?.version === 2 && parsed.contentRev !== CONTENT_REV) {
      const rooms = seedRooms();
      parsed.content = seedContent();
      parsed.rooms = parsed.rooms.map((r) => ({ ...r, photos: rooms.find((s) => s.unit === r.unit)?.photos ?? r.photos }));
      parsed.contentRev = CONTENT_REV;
      persist(parsed);
    }
    state = parsed?.version === 2 ? parsed : seedDB();
    if (parsed?.version !== 2) persist(state);
  } catch {
    state = seedDB();
  }
  return state;
}

function persist(db: DB) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* Private mode or a full disk: the prototype keeps working in memory. */
  }
}

export function getDB() {
  return read();
}

/** Replace the document. Every write goes through here. */
export function setDB(update: (db: DB) => DB) {
  const next = update(read());
  state = next;
  persist(next);
  listeners.forEach((l) => l());
}

/** Pending bookings past their window are written as expired. */
export function sweep(now = Date.now()) {
  const db = read();
  const stale = db.bookings.filter((b) => b.status === "pending" && effectiveStatus(b, now) === "expired");
  if (!stale.length) return;
  setDB((d) => ({
    ...d,
    bookings: d.bookings.map((b) =>
      stale.some((s) => s.code === b.code)
        ? {
            ...b,
            status: "expired",
            payment: { ...b.payment, status: "expired" },
            history: [...b.history, { at: b.payment.expiresAt, by: "system", event: "Waktu pembayaran habis" }],
          }
        : b,
    ),
  }));
}

export function resetDB() {
  state = seedDB();
  persist(state);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    state = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The live document. Re-renders on every write, here or in another tab. */
export function useDB(): DB {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** False during the server render and hydration, true after. */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
