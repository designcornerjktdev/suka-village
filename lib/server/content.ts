import { unstable_cache } from "next/cache";
import { explore, gallery, photos as library, units, type Photo } from "@/content/site";
import type { Bilingual, ContentItem, ContentSection, Feature, MediaMeta } from "@/lib/booking/types";
import { db } from "./db";

/**
 * What the public pages read from the database (CMS → site, BOOKING.md §7),
 * in the shapes the page components already take from content/site.ts:
 * photographs as { src, alt }, rooms with a slug, a cover and their facts.
 *
 * Cached with the tags "rooms" and "content"; saving in the admin
 * revalidates them (lib/server/catalog.ts), so a change shows without a
 * deploy. The pages stay statically generated.
 */

export type PublicRoom = {
  id: string;
  slug: string;
  name: string;
  size: number;
  bedrooms: number;
  bathrooms: number;
  features: Feature[];
  description: Bilingual;
  /** Cover first (the outside of the building), then the rest. */
  photos: Photo[];
  cover: Photo;
};

export type PublicItem = {
  id: string;
  name: Bilingual;
  body: Bilingual;
  photos: Photo[];
  soon: boolean;
  link?: string;
  credit?: string;
  plusCode?: string;
};

/* Every photograph that ships with the site, by src, with its alt text (and,
   for Explore, its licence credit). */
const shipped = new Map<string, Photo>();
for (const set of Object.values(library)) for (const p of set) shipped.set(p.src, p);
for (const p of gallery) shipped.set(p.src, p);
for (const spot of explore) for (const p of spot.photos) shipped.set(p.src, p);

/** A photograph by src: the site's own alt text, else the admin's (uploads), else the item's name. */
export function toPhoto(src: string, media: Record<string, MediaMeta>, fallbackName: string): Photo {
  const own = shipped.get(src);
  if (own) return own;
  const alt = media[src]?.alt;
  return { src, alt: alt && (alt.id || alt.en) ? { id: alt.id || alt.en, en: alt.en || alt.id } : { id: fallbackName, en: fallbackName } };
}

/** The three launch rooms keep their addresses; a room added in the admin is reached by its id. */
const SLUGS = new Map<string, string>(units.map((u) => [u.id, u.slug]));

async function mediaMap(): Promise<Record<string, MediaMeta>> {
  return Object.fromEntries((await db.media.findMany()).map((m) => [m.src, { name: m.name, alt: m.alt as Bilingual }]));
}

/** Rooms on the site: not archived, with at least one photograph, in the admin's order. */
export async function loadRooms(): Promise<PublicRoom[]> {
  const [rows, media] = await Promise.all([db.room.findMany({ where: { archived: false }, orderBy: { position: "asc" } }), mediaMap()]);
  return rows.flatMap((r) => {
    const srcs = r.photos as string[];
    if (!srcs.length) return [];
    const photos = srcs.map((src) => toPhoto(src, media, r.name));
    return [
      {
        id: r.unit,
        slug: SLUGS.get(r.unit) ?? r.unit,
        name: r.name,
        size: r.size,
        bedrooms: r.bedrooms,
        bathrooms: r.bathrooms,
        features: r.features as Feature[],
        description: r.description as Bilingual,
        photos,
        cover: photos[0],
      },
    ];
  });
}

/** One page's items: the visible ones, in the admin's order. */
export async function loadSection(section: ContentSection): Promise<PublicItem[]> {
  const [rows, media] = await Promise.all([db.contentItem.findMany({ where: { section }, orderBy: { position: "asc" } }), mediaMap()]);
  return rows.flatMap((r) => {
    const item = r.data as Omit<ContentItem, "id">;
    if (!item.visible) return [];
    const fallback = item.name?.id || r.id;
    return [
      {
        id: r.id,
        name: item.name,
        body: item.body,
        photos: (item.photos ?? []).map((src) => toPhoto(src, media, fallback)),
        soon: !!item.soon,
        ...(item.link ? { link: item.link } : {}),
        ...(item.credit ? { credit: item.credit } : {}),
        ...(item.plusCode ? { plusCode: item.plusCode } : {}),
      },
    ];
  });
}

/* The cached versions the pages call. */
export const getRooms = unstable_cache(loadRooms, ["public-rooms"], { tags: ["rooms", "content"] });
export const getSection = unstable_cache(loadSection, ["public-section"], { tags: ["content"] });

/** The WhatsApp number set in Admin → Pengaturan, for the Contact page. */
export const getWhatsapp = unstable_cache(
  async () => {
    const row = await db.settings.findUnique({ where: { id: 1 } });
    return ((row?.data as { contact?: { whatsapp?: string } } | undefined)?.contact?.whatsapp ?? "").trim();
  },
  ["public-whatsapp"],
  { tags: ["settings"] },
);

export async function getRoom(slug: string): Promise<PublicRoom | null> {
  return (await getRooms()).find((r) => r.slug === slug) ?? null;
}

/** A body as paragraphs (a blank line separates them in the CMS). */
export const paragraphs = (text: string) => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
