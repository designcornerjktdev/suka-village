"use client";

import { mutate } from "swr";
import { whatsapp } from "@/content/site";
import { DEFAULT_TEMPLATES } from "./notifications";
import type { Settings } from "./types";

/**
 * What api.ts (writes) and hooks.ts (reads) share: JSON fetching, the guest's
 * order page tokens, and the settings to show before the real ones arrive.
 */

/** GET as JSON; null on any non-2xx (404 for "not yours" included). */
export async function getJSON<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store" });
  return res.ok ? ((await res.json()) as T) : null;
}

/** A write. `data` is the parsed body whatever the status, so callers can read { ok, error }. */
export async function send<T>(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** After a write: every cached read is fetched again (a small app; simplest and always right). */
export const refreshAll = () => mutate(() => true);

/* --- Guest access tokens ------------------------------------------------------
   The order page has no account: it opens with the token from the booking,
   from "Cek pesanan", or from the ?t= in an email link. Kept per booking in
   localStorage, so a guest coming back from DOKU's payment page, a wallet, or
   another tab of the same browser lands on their order. */

const tokenKey = (code: string) => `sv-booking-token:${code.toUpperCase()}`;

export function saveToken(code: string, token: string) {
  try {
    localStorage.setItem(tokenKey(code), token);
  } catch {
    /* private mode or storage blocked: the email link still works */
  }
}

/** The token for a booking: the URL's ?t= first (and remembered), else the stored one. */
export function readToken(code: string): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("t");
    if (fromUrl) {
      saveToken(code, fromUrl);
      return fromUrl;
    }
    return localStorage.getItem(tokenKey(code));
  } catch {
    return null;
  }
}

/** `?t=` for a guest call, or "" when there is no token. */
export const tokenQuery = (code: string) => {
  const t = readToken(code);
  return t ? `?t=${encodeURIComponent(t)}` : "";
};

/* --- Before the settings arrive -------------------------------------------- */

/** Shown for the first moment only. OVO and GoPay are off, as on the server. */
export const FALLBACK_SETTINGS: Settings = {
  holdMinutes: 60,
  methods: { qris: true, va_bca: true, va_bni: true, va_bri: true, va_mandiri: true, gopay: false, ovo: false, dana: true, shopeepay: true, card: true, manual: true },
  templates: DEFAULT_TEMPLATES,
  cancellationPolicy: { id: "", en: "" },
  contact: { whatsapp: `+${whatsapp.number}`, senderEmail: "" },
};
