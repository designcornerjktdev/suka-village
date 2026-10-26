import type { Metadata } from "next";
import { brand, listedFacilities, photos, place, share, social, units, whatsapp, type ShareKey } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import { defaultLocale, localePath, locales, type Locale } from "@/content/i18n";
import { INDEXABLE, SITE_URL } from "./site-url";

/**
 * Everything a search engine or a link preview reads that a visitor does not:
 * titles and descriptions, canonical and hreflang links, share images, and
 * the structured data.
 *
 * Two rules:
 *
 *  1. Each language version is its own page with its own canonical URL, and
 *     names the other as its alternate. Nothing canonicalises across
 *     languages, so neither is treated as a duplicate of the other.
 *  2. Structured data states only what content/site.ts states. No price
 *     range, rating, opening hours, postal code or coordinates until the
 *     owner supplies them (REPLACE.md).
 */

/** An absolute URL on the site's own domain. */
export const abs = (path: string) => new URL(path, SITE_URL).toString();

/** Every public, indexable route, without its locale. Home is "". */
export const PUBLIC_PATHS = [
  "",
  "rooms",
  ...units.map((u) => `rooms/${u.slug}`),
  "facilities",
  "experience",
  "explore",
  "event",
  "gallery",
  "contact",
  "booking",
];

const OG_LOCALE: Record<Locale, string> = { id: "id_ID", en: "en_US" };

/** hreflang: each language, plus x-default for everyone else (Indonesian). */
function languagesFor(path: string, url: (p: string) => string = (p) => p) {
  return {
    ...Object.fromEntries(locales.map((l) => [l, url(localePath(l, path))])),
    "x-default": url(localePath(defaultLocale, path)),
  };
}

/** The same links as absolute URLs, for the sitemap. */
export const sitemapLanguages = (path: string) => languagesFor(path, abs);

/** What a shared link shows: Open Graph (WhatsApp, Facebook, LinkedIn) and the X card. */
function preview(locale: Locale, title: string, description: string, image: ShareKey, url?: string) {
  const picture = { url: `/og/${image}.jpg`, width: 1200, height: 630, alt: share[image].alt[locale] };
  return {
    openGraph: {
      type: "website" as const,
      siteName: brand.name,
      title,
      description,
      ...(url ? { url } : {}),
      locale: OG_LOCALE[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [picture],
    },
    twitter: { card: "summary_large_image" as const, title, description, images: [picture] },
  };
}

/**
 * The preview for pages that set none of their own: the private ones (order
 * status, booking lookup). It carries no URL, so a shared order link never
 * claims to be the home page.
 */
export function sitePreview(locale: Locale) {
  const t = getDict(locale);
  return preview(locale, t.seo.home.title, t.seo.home.description, "home");
}

/** Indexing rules for the whole public site; private pages override them. */
export const siteRobots: Metadata["robots"] = INDEXABLE
  ? {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    }
  : { index: false, follow: false };

/**
 * The metadata of one public page. Next merges metadata shallowly, so
 * `openGraph` and `twitter` are written out whole here; a page that set only a
 * title would inherit the home page's preview.
 */
export function pageMetadata({
  locale,
  path = "",
  title,
  description,
  image,
  absoluteTitle = false,
}: {
  locale: Locale;
  /** The route without its locale: "rooms", "rooms/main-villa". Home is "". */
  path?: string;
  title: string;
  description: string;
  image: ShareKey;
  /** The title already carries the name, so the layout's template is skipped. */
  absoluteTitle?: boolean;
}): Metadata {
  const url = localePath(locale, path);
  const full = absoluteTitle ? title : `${title} · ${brand.name}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: languagesFor(path) },
    ...preview(locale, full, description, image, url),
  };
}

/** A room's title and description, with its numbers filled in from the facts. */
export function roomMeta(locale: Locale, unit: (typeof units)[number]) {
  const meta = getDict(locale).seo.room[unit.id];
  const values = { size: unit.size, bedrooms: unit.bedrooms, bathrooms: unit.bathrooms };
  return { title: fill(meta.title, values), description: fill(meta.description, values) };
}

/* --- Structured data (schema.org JSON-LD) ---------------------------------- */

const LODGING_ID = `${SITE_URL}/#lodging`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const roomId = (slug: string) => `${SITE_URL}/#${slug}`;

const feature = (name: string) => ({ "@type": "LocationFeatureSpecification", name, value: true });

/**
 * The site and the property, on every public page. The property is a
 * LodgingBusiness: the plainest type that is certainly true of a villa and
 * two cabins.
 */
export function siteGraph(locale: Locale) {
  const t = getDict(locale);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: abs("/"),
        name: brand.name,
        inLanguage: [...locales],
        publisher: { "@id": LODGING_ID },
      },
      {
        "@type": "LodgingBusiness",
        "@id": LODGING_ID,
        name: brand.name,
        description: t.seo.home.description,
        url: abs(localePath(locale)),
        image: [photos.home[0], photos.mainVilla[11], photos.pool[0]].map((p) => abs(p.src)),
        telephone: `+${whatsapp.number}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: place.street,
          addressLocality: place.regency,
          addressRegion: place.province,
          addressCountry: place.country,
        },
        hasMap: place.mapHref,
        sameAs: [social.instagram],
        amenityFeature: listedFacilities.map((f) => feature(t.facilities.names[f.id])),
        containsPlace: units.map((u) => ({
          "@type": "Accommodation",
          "@id": roomId(u.slug),
          name: u.name,
          url: abs(localePath(locale, `rooms/${u.slug}`)),
        })),
      },
    ],
  };
}

/** One room, on its own page, tied back to the property. */
export function roomSchema(locale: Locale, unit: (typeof units)[number]) {
  const t = getDict(locale);
  return {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    "@id": roomId(unit.slug),
    name: unit.name,
    description: roomMeta(locale, unit).description,
    url: abs(localePath(locale, `rooms/${unit.slug}`)),
    image: unit.photos.slice(0, 6).map((p) => abs(p.src)),
    floorSize: { "@type": "QuantitativeValue", value: unit.size, unitCode: "MTK" },
    numberOfBedrooms: unit.bedrooms,
    numberOfBathroomsTotal: unit.bathrooms,
    bed: { "@type": "BedDetails", typeOfBed: "Double bed" },
    amenityFeature: unit.features.filter((f) => f !== "noSmoking").map((f) => feature(t.rooms.features[f])),
    smokingAllowed: !unit.features.includes("noSmoking"),
    containedInPlace: { "@id": LODGING_ID },
  };
}

/** Home first, then each step down to the current page. */
export function breadcrumbs(locale: Locale, trail: { name: string; path: string }[]) {
  const t = getDict(locale);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: t.nav.home, path: "" }, ...trail].map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: abs(localePath(locale, step.path)),
    })),
  };
}
