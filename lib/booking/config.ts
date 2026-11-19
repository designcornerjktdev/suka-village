/**
 * PROTOTYPE SWITCH.
 *
 * While true, everything under lib/booking runs against a mock store in the
 * browser (localStorage) and the interface shows what is simulated: demo
 * prices, a "simulate payment" panel on the order page, a banner in the admin.
 *
 * The developer sets this to false once api.ts and hooks.ts talk to the real
 * backend. Nothing else in the interface needs to change. See docs/BOOKING.md.
 */
export const DEMO = false;

/** Artificial latency on mock calls, so loading states are exercised. */
export const MOCK_LATENCY_MS = 450;
