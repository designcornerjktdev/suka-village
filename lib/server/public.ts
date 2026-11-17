import type { Booking, Promo } from "@/lib/booking/types";

/** What a guest may see of their booking: no internal note. */
export function guestView(b: Booking): Booking {
  const { internalNote: _internal, ...rest } = b;
  void _internal;
  return rest;
}

/** What a guest may see of a promo they typed: no admin note. */
export function publicPromo(p: Promo): Promo {
  const { note: _note, ...rest } = p;
  void _note;
  return rest;
}
