import { createLucideIcon, Presentation, Shapes, ShoppingBag, UtensilsCrossed, Waves, type LucideIcon } from "lucide-react";
import type { FacilityId } from "@/content/site";

/**
 * One icon set, one stroke weight, drawn from a real library.
 *
 * A facility without photographs yet (the shop, once the owner confirms it)
 * shows its icon on a sage panel instead of a picture of something else.
 * Sizing and stroke are set at the call site.
 *
 * Lucide has no padel racket or horse, so those two are drawn here on its
 * 24px grid with its round caps, and take its size and stroke like the rest.
 */

const PadelRacket = createLucideIcon("padel-racket", [
  ["circle", { cx: "14.5", cy: "9.5", r: "6.5", key: "head" }],
  ["path", { d: "M9.9 14.1 3 21", key: "handle" }],
  ["path", { d: "M12.5 7.5h.01M16.5 7.5h.01M14.5 9.5h.01M12.5 11.5h.01M16.5 11.5h.01", key: "holes" }],
  ["circle", { cx: "5", cy: "5", r: "2", key: "ball" }],
]);

const Horseshoe = createLucideIcon("horseshoe", [
  ["path", { d: "M5 21c-1.4-2.8-2-5.8-2-9a9 9 0 0 1 18 0c0 3.2-.6 6.2-2 9", key: "outer" }],
  ["path", { d: "M9 21c-.9-2.4-1.5-4.8-1.5-7.5a4.5 4.5 0 0 1 9 0c0 2.7-.6 5.1-1.5 7.5", key: "inner" }],
  ["path", { d: "M5 21h4M15 21h4", key: "heels" }],
  ["path", { d: "M5.3 12.5h.01M18.7 12.5h.01M7.4 7.4h.01M16.6 7.4h.01", key: "nails" }],
]);

export const facilityIcon: Record<FacilityId, LucideIcon> = {
  pool: Waves,
  dining: UtensilsCrossed,
  meeting: Presentation,
  playground: Shapes,
  padel: PadelRacket,
  equestrian: Horseshoe,
  shop: ShoppingBag,
};
