import type { Feature } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import type { Locale } from "@/content/i18n";

/** The facts the specs need: a launch room from content/site.ts or a room from the CMS. */
type Unit = { size: number; bedrooms: number; bathrooms: number; features: readonly Feature[] };

/**
 * A room's specification, in the order the owner's brief lists it: size,
 * bedrooms, bathrooms, then the amenities. Small open rings for bullets, as
 * the reference draws them, so the list reads as a spec sheet rather than as
 * a set of selling points.
 *
 * The first three carry `data-key`: on a phone they are set large in
 * KeySpecs instead, and the list keeps to the amenities.
 */
export default function RoomSpecs({ unit, locale, className = "" }: { unit: Unit; locale: Locale; className?: string }) {
  const t = getDict(locale).rooms;
  const key = [
    fill(t.size, { n: unit.size }),
    unit.bedrooms === 1 ? t.bedroomsOne : fill(t.bedroomsMany, { n: unit.bedrooms }),
    unit.bathrooms === 1 ? t.bathroomsOne : fill(t.bathroomsMany, { n: unit.bathrooms }),
  ];

  return (
    <ul className={`sv-specs ${className}`} aria-label={t.specsTitle}>
      {key.map((item) => (
        <li key={item} data-key="true">
          {item}
        </li>
      ))}
      {unit.features.map((f) => (
        <li key={f}>{t.features[f]}</li>
      ))}
    </ul>
  );
}

/**
 * The three facts a family asks first, on a phone: the number large, the
 * word under it, side by side, the way a product page sets out its specs.
 * Hidden on a wide screen, where the list beside the photographs says it.
 */
export function KeySpecs({ unit, locale }: { unit: Unit; locale: Locale }) {
  const t = getDict(locale).rooms;
  const facts = [
    { value: `${unit.size} m²`, label: t.keySize },
    { value: String(unit.bedrooms), label: t.keyBedrooms },
    { value: String(unit.bathrooms), label: t.keyBathrooms },
  ];
  return (
    <dl className="sv-keyspecs">
      {facts.map((f) => (
        <div key={f.label}>
          <dt>{f.label}</dt>
          <dd className="tnum">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
