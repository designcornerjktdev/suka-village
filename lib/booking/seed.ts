import { events, experiences, explore, facilities, gallery, photos, place, SHOP_CONFIRMED, social, units, whatsapp } from "@/content/site";
import { dict } from "@/content/dict";
import type { Block, Booking, BookingStatus, Content, MediaMeta, PaymentMethodId, Room, Settings, UnitId, UnitRate } from "./types";
import { addDays, iso, nightsOf } from "./format";
import { DEFAULT_TEMPLATES } from "./notifications";
import { quote } from "./pricing";

/**
 * DEMO DATA for the prototype. Every name, email, phone number, booking and
 * price below is invented so the admin has something to show. None of it is
 * real and none of it may be imported into production.
 *
 * Generated, not random: a PRNG seeded per unit lays stays down relative to
 * today, so the server render and the browser agree, and the calendar looks
 * like a property that is open for business.
 */

export type DB = {
  version: 2;
  /** Which edition of the site the content and room photographs were seeded
      from. When the site changes (CONTENT_REV), a stored demo refreshes them
      and keeps its bookings. */
  contentRev?: number;
  bookings: Booking[];
  blocks: Block[];
  rooms: Room[];
  rates: UnitRate[];
  settings: Settings;
  content: Content;
  /** Alt text and file name for photographs uploaded in the admin. */
  media: Record<string, MediaMeta>;
};

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const codeFrom = (r: () => number) => `SV-${Array.from({ length: 6 }, () => ALPHA[Math.floor(r() * ALPHA.length)]).join("")}`;
const digitsFrom = (r: () => number, n: number) => Array.from({ length: n }, () => Math.floor(r() * 10)).join("");

/* Plainly invented, and the addresses use example.com, which can never belong
   to anyone. */
const NAMES = [
  "Rina Kusuma",
  "Adi Pratama",
  "Sari Wulandari",
  "Bima Saputra",
  "Dewi Lestari",
  "Fajar Nugroho",
  "Maya Anggraini",
  "Hendra Wijaya",
  "Putri Ramadhani",
  "Yoga Permana",
  "Intan Maharani",
  "Rizky Hidayat",
];

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

function at(date: string, hour: number, minute = 0) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute).toISOString();
}

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

/** Bump when the public site's content or room photographs change. */
export const CONTENT_REV = 3;

export function seedDB(now = new Date()): DB {
  const today = iso(now);
  const rates = structuredClone(DEMO_RATES);
  const bookings: Booking[] = [];
  const blocks: Block[] = [];
  const taken: Record<UnitId, Set<string>> = Object.fromEntries(units.map((u) => [u.id, new Set<string>()]));

  const makeBooking = (r: () => number, unit: UnitId, checkIn: string, checkOut: string, status: BookingStatus, createdAt: string): Booking => {
    const name = NAMES[Math.floor(r() * NAMES.length)];
    const [first, last] = name.toLowerCase().split(" ");
    const method = GUEST_METHODS[Math.floor(r() * GUEST_METHODS.length)];
    const q = quote(rates, checkIn, checkOut, [unit]);
    const code = codeFrom(r);
    const created = Date.parse(createdAt);
    const paidAt = new Date(created + (8 + Math.floor(r() * 30)) * 60_000).toISOString();
    const isPaid = status === "paid" || status === "confirmed" || status === "rejected" || status === "checked_in" || status === "completed";
    const isAccepted = status === "confirmed" || status === "checked_in" || status === "completed";
    const expiresAt = new Date(created + 60 * 60_000).toISOString();
    const email = `${first}.${last}@example.com`;
    const decidedAt = new Date(Date.parse(paidAt) + (20 + Math.floor(r() * 160)) * 60_000).toISOString();
    const history: Booking["history"] = [{ at: createdAt, by: "guest", event: "Pesanan dibuat di website" }];
    const notifications: Booking["notifications"] = [
      { id: `${code}-1`, template: "awaiting_payment", to: email, at: createdAt, status: "simulated" },
    ];
    if (isPaid) {
      history.push({ at: paidAt, by: "gateway", event: "Pembayaran diterima, menunggu konfirmasi admin" });
      notifications.push({ id: `${code}-2`, template: "payment_received", to: email, at: paidAt, status: "simulated" });
    }
    if (isAccepted) {
      history.push({ at: decidedAt, by: "admin", event: "Pesanan diterima admin" });
      notifications.push({ id: `${code}-3`, template: "confirmed", to: email, at: decidedAt, status: "simulated" });
    }
    if (status === "rejected") {
      history.push({ at: decidedAt, by: "admin", event: "Pesanan ditolak admin: kamar sedang diperbaiki" });
      notifications.push({ id: `${code}-3`, template: "rejected", to: email, at: decidedAt, status: "simulated" });
    }
    if (status === "checked_in" || status === "completed") history.push({ at: at(checkIn, 14, 20), by: "admin", event: "Tamu check-in" });
    if (status === "completed") history.push({ at: at(checkOut, 11, 5), by: "admin", event: "Tamu check-out" });
    return {
      code,
      createdAt,
      status,
      source: "website",
      locale: r() < 0.85 ? "id" : "en",
      checkIn,
      checkOut,
      units: [unit],
      guests: unit === "mainVilla" ? 4 + Math.floor(r() * 5) : unit === "familyCabin" ? 2 + Math.floor(r() * 3) : 2,
      guest: { name, email, phone: `+62812000${digitsFrom(r, 5)}` },
      quote: q,
      payment: {
        method,
        amount: q.total,
        status: isPaid ? "paid" : status === "expired" ? "expired" : "pending",
        reference: method.startsWith("va_") ? `8808${digitsFrom(r, 12)}` : `DEMO-${digitsFrom(r, 10)}`,
        expiresAt,
        paidAt: isPaid ? paidAt : undefined,
      },
      notifications,
      history,
      rejectReason: status === "rejected" ? "Kamar sedang diperbaiki pada tanggal tersebut." : undefined,
    };
  };

  units.forEach((u, index) => {
    const r = prng(0x5ca1ab1e + index * 7919);
    const busy = [0.34, 0.42, 0.5][index] ?? 0.4;
    let offset = -32 + Math.floor(r() * 5);
    let n = 0;
    while (offset < 150) {
      offset += 2 + Math.floor(r() * (1 / busy) * 4);
      const nights = 2 + Math.floor(r() * 3);
      const from = addDays(today, offset);
      const to = addDays(today, offset + nights);
      /* One slot in five was sold on another platform and closed by hand in
         the calendar; one in five stays unsold, so the estate is not booked
         solid. */
      if (n % 5 === 1) {
        nightsOf(from, to).forEach((d) => taken[u.id].add(d));
        blocks.push({ id: `blk-${u.id}-${n}`, unit: u.id, from, to, reason: n % 10 === 1 ? "airbnb" : "booking_com", note: "Contoh: terjual di platform lain" });
      } else if (n % 5 !== 3) {
        nightsOf(from, to).forEach((d) => taken[u.id].add(d));
        const status: BookingStatus = to <= today ? "completed" : from <= today ? "checked_in" : "confirmed";
        /* Booked some days ahead of arrival, but never later than today: a
           stay months away was still booked in the past. */
        const lead = 6 + Math.floor(r() * 30);
        const planned = at(addDays(from, -lead), 9 + Math.floor(r() * 10), Math.floor(r() * 60));
        const latest = new Date(now.getTime() - (2 + Math.floor(r() * 400)) * 3_600_000).toISOString();
        bookings.push(makeBooking(r, u.id, from, to, status, planned < latest ? planned : latest));
      }
      offset += nights;
      n += 1;
    }
  });

  /* A few in other states, so every list and filter has something in it. */
  const r = prng(0xbeef);
  const firstFree = (unit: UnitId, start: number, nights: number) => {
    for (let o = start; o < start + 120; o++) {
      const from = addDays(today, o);
      if (nightsOf(from, addDays(from, nights)).every((d) => !taken[unit].has(d))) return from;
    }
    return addDays(today, start);
  };
  const extra = (unit: UnitId, start: number, nights: number, status: BookingStatus, minutesAgo: number) => {
    const from = firstFree(unit, start, nights);
    const to = addDays(from, nights);
    const createdAt = new Date(now.getTime() - minutesAgo * 60_000).toISOString();
    const b = makeBooking(r, unit, from, to, status, createdAt);
    if (status === "pending") b.payment.expiresAt = new Date(now.getTime() + (60 - minutesAgo) * 60_000).toISOString();
    if (status === "pending" || status === "paid") nightsOf(from, to).forEach((d) => taken[unit].add(d));
    if (status === "cancelled") b.history.push({ at: new Date(Date.parse(createdAt) + 3 * 3_600_000).toISOString(), by: "guest", event: "Dibatalkan oleh tamu" });
    if (status === "expired") b.history.push({ at: b.payment.expiresAt, by: "system", event: "Waktu pembayaran habis" });
    bookings.push(b);
  };
  /* Three paid and waiting for the admin: the first thing the list shows. */
  extra("mainVilla", 16, 2, "paid", 95);
  extra("singleCabin", 11, 3, "paid", 240);
  extra("familyCabin", 24, 2, "paid", 60 * 9);
  extra("familyCabin", 12, 2, "pending", 14);
  extra("mainVilla", 34, 3, "pending", 41);
  extra("singleCabin", 40, 2, "expired", 60 * 30);
  extra("familyCabin", 44, 2, "cancelled", 60 * 52);
  extra("singleCabin", 48, 2, "rejected", 60 * 70);

  bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { version: 2, contentRev: CONTENT_REV, bookings, blocks, rooms: seedRooms(), rates, settings: seedSettings(), content: seedContent(), media: {} };
}
