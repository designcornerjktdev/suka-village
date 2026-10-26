import { Presentation, Shapes, ShoppingBag, UtensilsCrossed, Waves, type LucideIcon } from "lucide-react";
import type { FacilityId } from "@/content/site";

/**
 * One icon set, one stroke weight, drawn from a real library.
 *
 * A facility without photographs yet (the shop, once the owner confirms it)
 * shows its icon on a sage panel instead of a picture of something else.
 * Sizing and stroke are set at the call site.
 */
export const facilityIcon: Record<FacilityId, LucideIcon> = {
  pool: Waves,
  dining: UtensilsCrossed,
  meeting: Presentation,
  playground: Shapes,
  shop: ShoppingBag,
};
