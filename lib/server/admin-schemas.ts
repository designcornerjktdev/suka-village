import { z } from "zod";

/** Request bodies of the admin API, checked before anything is written. */

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const bilingual = z.object({ id: z.string().max(5000), en: z.string().max(5000) });
const money = z.number().int().min(0).max(1_000_000_000);

export const manualBookingBody = z.object({
  checkIn: day,
  checkOut: day,
  units: z.array(z.string().min(1).max(64)).min(1).max(20),
  guests: z.number().int().min(1).max(200),
  guest: z.object({ name: z.string().max(120), email: z.string().max(200), phone: z.string().max(40) }),
  notes: z.string().max(2000).optional(),
  method: z.enum(["qris", "va_bca", "va_bni", "va_bri", "va_mandiri", "gopay", "ovo", "dana", "shopeepay", "card", "manual"]),
  locale: z.enum(["id", "en"]),
  promoCode: z.string().max(40).optional(),
  paid: z.boolean().optional(),
});

export const bookingPatchBody = z.union([
  z.object({ internalNote: z.string().max(5000) }).strict(),
  z.object({ guest: z.object({ name: z.string().max(120), email: z.string().max(200), phone: z.string().max(40) }), guests: z.number().int().min(1).max(200), notes: z.string().max(2000).optional() }),
]);

export const blockBody = z.object({
  unit: z.string().min(1).max(64),
  from: day,
  to: day,
  reason: z.enum(["airbnb", "booking_com", "maintenance", "owner", "other"]),
  note: z.string().max(500).optional(),
});

export const promoBody = z.object({
  id: z.string().optional(),
  code: z.string().max(40),
  note: z.string().max(500).optional(),
  kind: z.enum(["percent", "amount"]),
  value: z.number().int(),
  maxDiscount: money.optional(),
  minNights: z.number().int().min(1).max(365),
  validFrom: day.optional(),
  validTo: day.optional(),
  units: z.array(z.string().max(64)).max(50),
  quota: z.number().int().min(1).max(1_000_000).optional(),
  active: z.boolean(),
});

const feature = z.string().max(64);

export const roomBody = z.object({
  unit: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  size: z.number().int().min(0).max(100_000),
  bedrooms: z.number().int().min(0).max(100),
  bathrooms: z.number().int().min(0).max(100),
  features: z.array(feature).max(100),
  description: bilingual,
  photos: z.array(z.string().max(500)).max(100),
});

export const rateBody = z.object({
  unit: z.string().min(1).max(64),
  weekday: money,
  weekend: money,
  minNights: z.number().int().min(1).max(365),
  maxGuests: z.number().int().min(1).max(200).optional(),
  bookable: z.boolean(),
  seasons: z.array(z.object({ id: z.string().max(64), name: z.string().max(120), from: day, to: day, rate: money })).max(50),
});

const template = z.object({ subject: bilingual, email: bilingual });
const TEMPLATE_IDS = ["awaiting_payment", "payment_received", "confirmed", "rejected", "expired", "cancelled", "reminder"] as const;
const METHOD_IDS = ["qris", "va_bca", "va_bni", "va_bri", "va_mandiri", "gopay", "ovo", "dana", "shopeepay", "card", "manual"] as const;

export const settingsBody = z.object({
  /* Pengaturan offers 15 minutes to 24 hours (IA §08). */
  holdMinutes: z.number().int().min(15).max(24 * 60),
  methods: z.object(Object.fromEntries(METHOD_IDS.map((m) => [m, z.boolean()])) as Record<(typeof METHOD_IDS)[number], z.ZodBoolean>),
  templates: z.object(Object.fromEntries(TEMPLATE_IDS.map((t) => [t, template])) as Record<(typeof TEMPLATE_IDS)[number], typeof template>),
  cancellationPolicy: bilingual,
  contact: z.object({ whatsapp: z.string().max(40), senderEmail: z.string().max(200) }),
});

export const SECTIONS = ["home", "facilities", "experiences", "events", "explore", "gallery", "contact"] as const;

export const contentItemBody = z.object({
  id: z.string().min(1).max(64),
  name: bilingual,
  body: bilingual,
  photos: z.array(z.string().max(500)).max(200),
  visible: z.boolean(),
  soon: z.boolean().optional(),
  link: z.string().max(500).optional(),
  credit: z.string().max(500).optional(),
  plusCode: z.string().max(40).optional(),
});

export const mediaBody = z.object({ src: z.string().min(1).max(500), meta: z.object({ name: z.string().max(255), alt: bilingual }) });
