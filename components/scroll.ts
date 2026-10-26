/**
 * The one place that knows whether the page may scroll.
 *
 * Overlays (the menu, the booking sheet, the lightbox) need the page behind
 * them to hold still. The count lets two overlays overlap without the first
 * one to close unlocking the page early.
 */
let locks = 0;

export function lockScroll() {
  locks += 1;
  if (locks > 1) return;
  document.documentElement.style.overflow = "hidden";
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;
  document.documentElement.style.overflow = "";
}
