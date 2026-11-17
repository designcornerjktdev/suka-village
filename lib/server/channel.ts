/**
 * The seam for BookandLink (design §14), Suka Village's booking engine that
 * is already connected to the OTAs (Airbnb, Booking.com, ...). Not built yet:
 * how BookandLink is reached (webhook, polling, iCal) is still being asked
 * (docs/open-questions.md). At launch no channel is set, so this does nothing
 * and dates sold elsewhere are closed by hand in Admin → Kalender.
 *
 * Every change to the nights the website holds passes through here AFTER it
 * has committed: a booking that took its nights or gave them back, a block
 * closed or opened. A BookandLink adapter implements `push` (and, the other
 * way, writes BookandLink's sold nights as blocks with source "bookandlink",
 * so the one Night index keeps guarding against double booking).
 *
 * A failing channel never undoes or blocks a booking: the error is logged,
 * and the adapter is expected to retry on its own.
 */

export type ChannelEvent =
  /** holds: true when the booking took its nights, false when it gave them back. */
  | { kind: "booking"; code: string; holds: boolean }
  | { kind: "block"; id: string; holds: boolean };

export type Channel = { push(event: ChannelEvent): Promise<void> };

let channel: Channel | null = null;

/** Set the adapter (BookandLink, later), or null for none. */
export function setChannel(c: Channel | null) {
  channel = c;
}

export async function notifyChannel(event: ChannelEvent) {
  if (!channel) return;
  try {
    await channel.push(event);
  } catch (e) {
    console.error("[channel] push failed:", event, e);
  }
}
