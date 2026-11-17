import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { Content, ContentItem, ContentSection, MediaMeta, Promo, Room, Settings, UnitRate } from "@/lib/booking/types";
import { HOLDING } from "@/lib/booking/types";
import { normalizeCode } from "@/lib/booking/promo";
import { db } from "./db";
import { isUniqueViolation } from "./errors";
import { fromDay, toPromo, toRate, toRoom } from "./mappers";
import { jakartaToday } from "./time";

/**
 * What the owner edits in the admin besides bookings: rooms and rates, promo
 * codes, settings, page content and photo descriptions. Saving rooms or
 * content refreshes the public pages (revalidate) without a deploy.
 */

const json = (v: unknown) => v as Prisma.InputJsonValue;

/**
 * Next's cache tags; a no-op outside a running Next server (tests, scripts).
 * `expire: 0`: the owner who just pressed Simpan sees the change on the very
 * next page load ("max" would serve the old page once more). updateTag is the
 * Server Action way and not available in route handlers.
 */
async function revalidate(tag: "rooms" | "content" | "settings") {
  try {
    const { revalidateTag } = await import("next/cache");
    revalidateTag(tag, { expire: 0 });
  } catch {
    /* not inside a Next request */
  }
}

/* --- Rooms and rates ------------------------------------------------------ */

/** Every room, archived ones too (old bookings still name them), and every rate. */
export async function listRooms(): Promise<{ rooms: Room[]; rates: UnitRate[] }> {
  const rows = await db.room.findMany({ orderBy: { position: "asc" }, include: { rate: true } });
  return { rooms: rows.map(toRoom), rates: rows.flatMap((r) => (r.rate ? [toRate(r.rate)] : [])) };
}

/** A new room starts empty and NOT for sale online, so nothing half filled in can be booked. */
export async function createRoom(name: string): Promise<Room> {
  const unit = `room-${randomBytes(4).toString("hex")}`;
  const position = (await db.room.count()) + 1;
  const row = await db.room.create({
    data: {
      unit,
      name: name.trim() || "Kamar baru",
      size: 30,
      bedrooms: 1,
      bathrooms: 1,
      features: [],
      description: { id: "", en: "" },
      photos: [],
      position,
      rate: { create: { weekday: 0, weekend: 0, minNights: 1, bookable: false, seasons: [] } },
    },
  });
  await revalidate("rooms");
  return toRoom(row);
}

export async function saveRoom(room: Room): Promise<boolean> {
  const hit = await db.room.updateMany({
    where: { unit: room.unit },
    data: { name: room.name, size: room.size, bedrooms: room.bedrooms, bathrooms: room.bathrooms, features: json(room.features), description: json(room.description), photos: json(room.photos) },
  });
  await revalidate("rooms");
  return hit.count > 0;
}

/**
 * Refused while a booking still holds the room for a night to come: those
 * guests are coming. Otherwise archived (off sale, out of every list, its
 * blocks gone), never erased, so past bookings still name it.
 */
export async function archiveRoom(unit: string): Promise<{ ok: true } | { ok: false; codes: string[] }> {
  const upcoming = await db.booking.findMany({
    where: { status: { in: HOLDING }, deletedAt: null, checkOut: { gt: fromDay(jakartaToday()) }, units: { some: { unit } } },
    select: { code: true },
    orderBy: { checkIn: "asc" },
  });
  if (upcoming.length) return { ok: false, codes: upcoming.map((b) => b.code) };
  await db.$transaction([
    db.room.updateMany({ where: { unit }, data: { archived: true } }),
    db.rate.updateMany({ where: { unit }, data: { bookable: false } }),
    db.block.deleteMany({ where: { unit } }),
  ]);
  await revalidate("rooms");
  return { ok: true };
}

export async function saveRate(rate: UnitRate): Promise<boolean> {
  if (!(await db.room.findUnique({ where: { unit: rate.unit }, select: { unit: true } }))) return false;
  const data = { weekday: rate.weekday, weekend: rate.weekend, minNights: rate.minNights, maxGuests: rate.maxGuests ?? null, bookable: rate.bookable, seasons: json(rate.seasons) };
  await db.rate.upsert({ where: { unit: rate.unit }, create: { unit: rate.unit, ...data }, update: data });
  await revalidate("rooms");
  return true;
}

/* --- Promo codes ------------------------------------------------------------ */

export type PromoInput = Omit<Promo, "id" | "createdAt">;
export type PromoSaveError = "code" | "duplicate" | "value" | "not_found";

/* Same rules as the admin form: code 3 to 20 of A-Z, 0-9, "-"; percent 1 to 100. */
function promoProblem(p: PromoInput): PromoSaveError | null {
  if (!/^[A-Z0-9-]{3,20}$/.test(normalizeCode(p.code))) return "code";
  if (p.value <= 0 || (p.kind === "percent" && p.value > 100)) return "value";
  return null;
}

const promoData = (p: PromoInput) => ({
  code: normalizeCode(p.code),
  note: p.note?.trim() || null,
  kind: p.kind,
  value: p.value,
  maxDiscount: p.maxDiscount ?? null,
  minNights: p.minNights,
  validFrom: p.validFrom ? fromDay(p.validFrom) : null,
  validTo: p.validTo ? fromDay(p.validTo) : null,
  units: json(p.units),
  quota: p.quota ?? null,
  active: p.active,
});

export async function listPromos(): Promise<Promo[]> {
  return (await db.promo.findMany({ orderBy: { createdAt: "desc" } })).map(toPromo);
}

export async function createPromo(p: PromoInput): Promise<{ ok: true; promo: Promo } | { ok: false; error: PromoSaveError }> {
  const problem = promoProblem(p);
  if (problem) return { ok: false, error: problem };
  try {
    return { ok: true, promo: toPromo(await db.promo.create({ data: promoData(p) })) };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "duplicate" };
    throw e;
  }
}

/** Bookings that already used a promo keep the discount they got (it is frozen in their quote). */
export async function savePromo(id: string, p: PromoInput): Promise<{ ok: true; promo: Promo } | { ok: false; error: PromoSaveError }> {
  const problem = promoProblem(p);
  if (problem) return { ok: false, error: problem };
  try {
    const hit = await db.promo.updateMany({ where: { id }, data: promoData(p) });
    if (!hit.count) return { ok: false, error: "not_found" };
    return { ok: true, promo: toPromo(await db.promo.findUniqueOrThrow({ where: { id } })) };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "duplicate" };
    throw e;
  }
}

export async function deletePromo(id: string) {
  await db.promo.deleteMany({ where: { id } });
}

/* --- Settings ------------------------------------------------------------------ */

export async function readSettingsRow(): Promise<Settings> {
  return (await db.settings.findUniqueOrThrow({ where: { id: 1 } })).data as unknown as Settings;
}

export async function saveSettings(s: Settings) {
  await db.settings.upsert({ where: { id: 1 }, create: { id: 1, data: json(s) }, update: { data: json(s) } });
  /* The Contact page shows the WhatsApp number. */
  await revalidate("settings");
}

/** What guests' pages read: everything but the sender address. */
export function publicSettings(s: Settings) {
  return { ...s, contact: { whatsapp: s.contact.whatsapp } };
}

/* --- Content and media ---------------------------------------------------------- */

export async function readContent(): Promise<Content> {
  const rows = await db.contentItem.findMany({ orderBy: [{ section: "asc" }, { position: "asc" }] });
  const content = { home: [], facilities: [], experiences: [], events: [], explore: [], gallery: [], contact: [] } as Content;
  for (const r of rows) (content[r.section as ContentSection] ??= []).push({ id: r.id, ...(r.data as Omit<ContentItem, "id">) });
  return content;
}

/** Replaces one section; the order given is the order on the page. */
export async function saveContent(section: ContentSection, items: ContentItem[]) {
  await db.$transaction([
    db.contentItem.deleteMany({ where: { section } }),
    db.contentItem.createMany({
      data: items.map(({ id, ...data }, position) => ({ section, id, position, data: json(data) })),
    }),
  ]);
  await revalidate("content");
}

export async function readMedia(): Promise<Record<string, MediaMeta>> {
  return Object.fromEntries((await db.media.findMany()).map((m) => [m.src, { name: m.name, alt: m.alt as MediaMeta["alt"] }]));
}

export async function saveMedia(src: string, meta: MediaMeta) {
  await db.media.upsert({ where: { src }, create: { src, name: meta.name, alt: json(meta.alt) }, update: { name: meta.name, alt: json(meta.alt) } });
  /* Alt text is on the public pages too (rooms and content photographs). */
  await revalidate("content");
}
