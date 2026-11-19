import type { Prisma, Promo as PromoRow, Rate as RateRow, Room as RoomRow } from "@prisma/client";
import type { Locale } from "@/content/i18n";
import type {
  Bilingual,
  Booking,
  BookingStatus,
  Feature,
  HistoryEvent,
  NotificationLog,
  Payment,
  PaymentMethodId,
  Promo,
  PromoKind,
  Quote,
  Room,
  Season,
  TemplateId,
  UnitRate,
} from "@/lib/booking/types";

/**
 * Database rows → the shapes in lib/booking/types.ts, which are the contract
 * the interface already speaks. Nothing outside lib/server sees a Prisma row.
 */

/** A @db.Date column comes back as midnight UTC; its date part IS the calendar day. */
export const toDay = (d: Date) => d.toISOString().slice(0, 10);

/** A calendar day for a @db.Date column. */
export const fromDay = (s: string) => new Date(`${s}T00:00:00.000Z`);

const opt = <T>(v: T | null) => (v === null ? undefined : v);

export const bookingInclude = {
  units: true,
  payment: true,
  notifications: { orderBy: { at: "asc" } },
  events: { orderBy: { id: "asc" } },
} satisfies Prisma.BookingInclude;

export type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

/** `adminNames` (admin id → display name) names admin history events; only the admin screens pass it. */
export function toBooking(row: BookingWithRelations, adminNames?: Map<string, string>): Booking {
  if (!row.payment) throw new Error(`Booking ${row.code} has no payment row`);
  const p = row.payment;
  const payment: Payment = {
    method: p.method as PaymentMethodId,
    amount: p.amount,
    status: p.status as Payment["status"],
    reference: p.reference,
    gatewayId: opt(p.gatewayId),
    expiresAt: p.expiresAt.toISOString(),
    paidAt: p.paidAt?.toISOString(),
  };
  return {
    code: row.code,
    createdAt: row.createdAt.toISOString(),
    status: row.status as BookingStatus,
    source: row.source as Booking["source"],
    locale: row.locale as Locale,
    checkIn: toDay(row.checkIn),
    checkOut: toDay(row.checkOut),
    units: row.units.map((u) => u.unit),
    guests: row.guests,
    guest: { name: row.guestName, email: row.guestEmail, phone: row.guestPhone },
    notes: opt(row.notes),
    quote: row.quote as unknown as Quote,
    payment,
    notifications: row.notifications.map(
      (n): NotificationLog => ({ id: n.id, template: n.template as TemplateId, to: n.to, at: n.at.toISOString(), status: n.status as NotificationLog["status"] }),
    ),
    history: row.events.map((e): HistoryEvent => {
      const adminName = e.adminId ? adminNames?.get(e.adminId) : undefined;
      return { at: e.at.toISOString(), by: e.by as HistoryEvent["by"], event: e.event, ...(adminName ? { adminName } : {}) };
    }),
    internalNote: opt(row.internalNote),
    rejectReason: opt(row.rejectReason),
  };
}

export function toRoom(row: RoomRow): Room {
  return {
    unit: row.unit,
    name: row.name,
    size: row.size,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    features: row.features as Feature[],
    description: row.description as Bilingual,
    photos: row.photos as string[],
    ...(row.archived ? { archived: true } : {}),
  };
}

export function toRate(row: RateRow): UnitRate {
  return {
    unit: row.unit,
    weekday: row.weekday,
    weekend: row.weekend,
    minNights: row.minNights,
    ...(row.maxGuests !== null ? { maxGuests: row.maxGuests } : {}),
    bookable: row.bookable,
    seasons: row.seasons as Season[],
  };
}

export function toPromo(row: PromoRow): Promo {
  return {
    id: row.id,
    code: row.code,
    note: opt(row.note),
    kind: row.kind as PromoKind,
    value: row.value,
    maxDiscount: opt(row.maxDiscount),
    minNights: row.minNights,
    validFrom: row.validFrom ? toDay(row.validFrom) : undefined,
    validTo: row.validTo ? toDay(row.validTo) : undefined,
    units: row.units as string[],
    quota: opt(row.quota),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}
