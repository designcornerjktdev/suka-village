import type { Booking, Promo, PromoError, Quote, UnitId } from "./types";
import { HOLDING } from "./types";
import { effectiveStatus } from "./occupancy";

/**
 * Promo codes: whether one applies to a stay, and what it takes off.
 *
 * The discount is worked out from the quote, so it follows the same night by
 * night prices the guest sees. A code limited to some rooms only discounts
 * those rooms' lines; a percent is rounded down to whole rupiah; an amount
 * never takes a stay below zero.
 *
 * IN PRODUCTION THE SERVER IS THE AUTHORITY, as with prices: it looks the
 * code up, counts its uses inside the booking transaction, and computes the
 * discount itself.
 */

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

/** Bookings that still count against a promo's quota. */
export function promoUses(promo: Pick<Promo, "id">, bookings: Booking[], now = Date.now()) {
  return bookings.filter((b) => b.quote.promo?.id === promo.id && HOLDING.includes(effectiveStatus(b, now))).length;
}

export type PromoContext = { nights: number; units: UnitId[]; today: string; uses?: number };

/** Why a promo does not apply, or null when it does. */
export function promoProblem(promo: Promo, ctx: PromoContext): PromoError | null {
  if (!promo.active) return "inactive";
  if (promo.validFrom && ctx.today < promo.validFrom) return "not_started";
  if (promo.validTo && ctx.today > promo.validTo) return "ended";
  if (promo.quota != null && (ctx.uses ?? 0) >= promo.quota) return "used_up";
  if (ctx.nights < promo.minNights) return "min_nights";
  if (promo.units.length && !ctx.units.some((u) => promo.units.includes(u))) return "rooms";
  return null;
}

/** The quote with the promo taken off. */
export function applyPromo(q: Quote, promo: Promo): Quote {
  const subtotal = q.subtotal ?? q.total;
  const base = q.lines.filter((l) => !promo.units.length || promo.units.includes(l.unit)).reduce((sum, l) => sum + l.subtotal, 0);
  let discount = promo.kind === "percent" ? Math.floor((base * promo.value) / 100) : promo.value;
  if (promo.kind === "percent" && promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
  discount = Math.max(0, Math.min(discount, base));
  return {
    ...q,
    subtotal,
    discount,
    promo: { id: promo.id, code: promo.code, kind: promo.kind, value: promo.value, discount },
    total: subtotal - discount,
  };
}

/** "10%", "10% (maks Rp 500.000)", "Rp 200.000". */
export function promoLabel(promo: Pick<Promo, "kind" | "value" | "maxDiscount">, idr: (n: number) => string) {
  if (promo.kind === "amount") return idr(promo.value);
  return promo.maxDiscount ? `${promo.value}% (maks ${idr(promo.maxDiscount)})` : `${promo.value}%`;
}
