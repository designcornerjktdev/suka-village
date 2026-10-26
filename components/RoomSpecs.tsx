import { units } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import type { Locale } from "@/content/i18n";

type Unit = (typeof units)[number];

/**
 * A room's specification, in the order the owner's brief lists it: size,
 * bedrooms, bathrooms, then the amenities. Small open rings for bullets, as
 * the reference draws them, so the list reads as a spec sheet rather than as
 * a set of selling points.
 */
export default function RoomSpecs({ unit, locale, className = "" }: { unit: Unit; locale: Locale; className?: string }) {
  const t = getDict(locale).rooms;
  const items = [
    fill(t.size, { n: unit.size }),
    unit.bedrooms === 1 ? t.bedroomsOne : fill(t.bedroomsMany, { n: unit.bedrooms }),
    unit.bathrooms === 1 ? t.bathroomsOne : fill(t.bathroomsMany, { n: unit.bathrooms }),
    ...unit.features.map((f) => t.features[f]),
  ];

  return (
    <ul className={`sv-specs ${className}`} aria-label={t.specsTitle}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
