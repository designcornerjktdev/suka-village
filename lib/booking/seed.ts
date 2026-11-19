import { events, experiences, explore, facilities, gallery, photos, place, SHOP_CONFIRMED, social, units, whatsapp } from "@/content/site";
import { dict } from "@/content/dict";
import type { Content, PaymentMethodId, Room, Settings, UnitRate } from "./types";
import { DEFAULT_TEMPLATES } from "./notifications";

/**
 * The FIRST IMPORT of the site's own data into the database
 * (lib/server/seed-db.ts, `npm run db:seed`): the rooms, every content
 * section and the default settings, mapped from content/site.ts and
 * content/dict.ts. From then on the owner edits them in the admin.
 *
 * The prototype's generated demo bookings and example promo codes are gone
 * with the mock store; nothing invented is imported.
 */

/** Starting figures for Kamar & harga. NOT the owner's prices (docs/REPLACE.md #5):
    the seed imports them with every room switched off for online booking. */
export const DEMO_RATES: UnitRate[] = [
  {
    unit: "mainVilla",
    weekday: 3_800_000,
    weekend: 4_600_000,
    minNights: 1,
    bookable: true,
    seasons: [{ id: "s1", name: "Contoh: libur akhir tahun", from: "2026-12-20", to: "2027-01-04", rate: 5_400_000 }],
  },
  { unit: "familyCabin", weekday: 1_650_000, weekend: 2_100_000, minNights: 1, bookable: true, seasons: [] },
  { unit: "singleCabin", weekday: 850_000, weekend: 1_100_000, minNights: 1, bookable: true, seasons: [] },
];

const GUEST_METHODS: PaymentMethodId[] = ["qris", "va_bca", "va_bni", "va_bri", "va_mandiri", "gopay", "ovo", "dana", "shopeepay", "card"];

export function seedSettings(): Settings {
  return {
    holdMinutes: 60,
    methods: Object.fromEntries([...GUEST_METHODS.map((m) => [m, true]), ["manual", true]]) as Settings["methods"],
    templates: structuredClone(DEFAULT_TEMPLATES),
    cancellationPolicy: {
      id: "Kebijakan pembatalan belum diatur pemilik. Untuk sementara, perubahan dan pembatalan dibicarakan lewat WhatsApp.",
      en: "The owner has not set a cancellation policy yet. For now, changes and cancellations are arranged on WhatsApp.",
    },
    contact: { whatsapp: `+${whatsapp.number}`, senderEmail: "" },
  };
}

/** The rooms as the brief gives them; from here on the owner edits them. */
export function seedRooms(): Room[] {
  return units.map((u) => ({
    unit: u.id,
    name: u.name,
    size: u.size,
    bedrooms: u.bedrooms,
    bathrooms: u.bathrooms,
    features: [...u.features],
    description: { id: dict.id.rooms.notes[u.id], en: dict.en.rooms.notes[u.id] },
    /* Cover first: the outside of the building, then the interiors. */
    photos: [u.cover.src, ...u.photos.map((p) => p.src).filter((src) => src !== u.cover.src)],
  }));
}

export function seedContent(): Content {
  const id = dict.id;
  const en = dict.en;
  return {
    /* The home page is one photograph, no text. */
    home: [{ id: "hero", name: { id: "Foto beranda", en: "Home photograph" }, body: { id: "", en: "" }, photos: [photos.mainVilla[11].src], visible: true }],
    facilities: facilities.map((f) => ({
      id: f.id,
      name: { id: id.facilities.names[f.id], en: en.facilities.names[f.id] },
      body: { id: id.facilities.copy[f.id], en: en.facilities.copy[f.id] },
      photos: f.photos.map((p) => p.src),
      visible: f.id !== "shop" || SHOP_CONFIRMED,
      ...("soon" in f && f.soon ? { soon: true } : {}),
    })),
    experiences: experiences.map((x) => ({
      id: x.id,
      name: { id: id.experience.names[x.id], en: en.experience.names[x.id] },
      body: { id: id.experience.copy[x.id], en: en.experience.copy[x.id] },
      photos: x.photos.map((p) => p.src),
      visible: true,
    })),
    events: events.map((e) => ({
      id: e.id,
      name: { id: id.event.names[e.id], en: en.event.names[e.id] },
      body: { id: id.event.copy[e.id].join("\n\n"), en: en.event.copy[e.id].join("\n\n") },
      photos: e.photos.map((p) => p.src),
      visible: true,
    })),
    explore: explore.map((s) => ({
      id: s.id,
      name: { id: s.name, en: s.name },
      body: { id: id.explore.copy[s.id], en: en.explore.copy[s.id] },
      photos: s.photos.map((p) => p.src),
      visible: true,
      link: s.mapHref,
      credit: s.photos.map((p) => `${p.credit.by}, ${p.credit.source}, ${p.credit.license}`).join("\n"),
    })),
    /* The gallery is photographs only, in page order. */
    gallery: [{ id: "gallery", name: { id: "Galeri", en: "Gallery" }, body: { id: "", en: "" }, photos: gallery.map((p) => p.src), visible: true }],
    /* The contact page's two rows. The WhatsApp number is in Settings. */
    contact: [
      {
        id: "reserve",
        name: { id: id.contact.reserveTitle, en: en.contact.reserveTitle },
        body: { id: id.contact.reserveCopy, en: en.contact.reserveCopy },
        photos: [photos.home[1].src],
        visible: true,
        link: social.instagram,
      },
      {
        id: "location",
        name: { id: id.contact.location, en: en.contact.location },
        body: { id: place.address, en: place.address },
        photos: [],
        visible: true,
        link: place.mapHref,
        plusCode: place.plusCode,
      },
    ],
  };
}
