import type { Locale } from "@/content/i18n";
import type { Feature } from "@/content/site";

/**
 * The booking domain, as the developer will find it in the database.
 *
 * Dates are calendar days as "yyyy-mm-dd" strings in the property's own time
 * zone (Asia/Jakarta), never Date objects or timestamps: a stay is a run of
 * NIGHTS, and a night has no time of day. `checkIn` is the first night,
 * `checkOut` the morning of departure and is not a night.
 *
 * Money is whole rupiah as integers. No floats, no cents.
 */

export type { Feature };

/**
 * A room's id. The three the site launched with are "mainVilla",
 * "familyCabin" and "singleCabin"; rooms the owner adds in the admin get a
 * generated one. So it is data, not a fixed list.
 */
export type UnitId = string;

export type ISODate = string;
export type ISODateTime = string;

/**
 * pending      created, awaiting payment; holds its nights until `payment.expiresAt`
 * paid         payment received, WAITING FOR THE ADMIN to accept or reject
 * confirmed    accepted by the admin; the stay is on
 * rejected     rejected by the admin after payment; nights released, refund owed
 * checked_in   the guest has arrived
 * completed    the guest has left
 * cancelled    cancelled by the guest or the admin; nights released
 * expired      payment window ran out; nights released
 *
 * Money first, then a person: the guest pays, and a booking only becomes a
 * stay once someone at the property has looked at it. See BOOKING.md.
 */
export type BookingStatus =
  | "pending"
  | "paid"
  | "confirmed"
  | "rejected"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "expired";

/** Statuses that occupy their nights. */
export const HOLDING: BookingStatus[] = ["pending", "paid", "confirmed", "checked_in", "completed"];

/** How the admin list groups them: what needs a decision, then everything else. */
export type StatusGroup = "review" | "unpaid" | "confirmed" | "done" | "closed";

export const STATUS_GROUP: Record<BookingStatus, StatusGroup> = {
  paid: "review",
  pending: "unpaid",
  confirmed: "confirmed",
  checked_in: "confirmed",
  completed: "done",
  rejected: "closed",
  cancelled: "closed",
  expired: "closed",
};

export type PaymentMethodId =
  | "qris"
  | "va_bca"
  | "va_bni"
  | "va_bri"
  | "va_mandiri"
  | "gopay"
  | "ovo"
  | "dana"
  | "shopeepay"
  | "card"
  | "manual";

export type PaymentGroup = "qris" | "va" | "ewallet" | "card" | "manual";

export type Guest = {
  name: string;
  /** Where every automatic message goes. */
  email: string;
  /** E.164, e.g. +6281234567890. A contact number: the admin may message it
      on WhatsApp by hand. Nothing automatic is sent to it. */
  phone: string;
};

export type NightPrice = { date: ISODate; rate: number; kind: "weekday" | "weekend" | "season" };

export type QuoteLine = { unit: UnitId; nights: NightPrice[]; subtotal: number };

export type Quote = {
  checkIn: ISODate;
  checkOut: ISODate;
  nights: number;
  lines: QuoteLine[];
  /** The rooms before any promo. Missing on bookings made before promo codes
      existed; read it as `total` then. */
  subtotal?: number;
  /** What the promo took off, in rupiah. */
  discount?: number;
  promo?: AppliedPromo;
  /** What the guest pays: subtotal minus discount. */
  total: number;
  currency: "IDR";
};

/* --- Promo codes ----------------------------------------------------------- */

/** percent: `value` is 1 to 100, optionally capped by `maxDiscount`.
    amount:  `value` is rupiah off the stay. */
export type PromoKind = "percent" | "amount";

export type Promo = {
  id: string;
  /** What the guest types. Stored in capitals; matched without regard to case. */
  code: string;
  /** For the admin only: what the promo is for. */
  note?: string;
  kind: PromoKind;
  value: number;
  maxDiscount?: number;
  minNights: number;
  /** The days the code can be USED (the booking date, not the stay), both
      inclusive. Empty means no limit on that side. */
  validFrom?: ISODate;
  validTo?: ISODate;
  /** Rooms it applies to. Empty means every room. In a group booking only
      the rooms listed are discounted. */
  units: UnitId[];
  /** How many bookings may use it. Empty means no limit. A booking that is
      cancelled, rejected or expired gives its use back. */
  quota?: number;
  active: boolean;
  createdAt: ISODateTime;
};

/** The promo as it was applied to one booking, frozen with the quote. */
export type AppliedPromo = { id: string; code: string; kind: PromoKind; value: number; discount: number };

export type PromoError = "not_found" | "inactive" | "not_started" | "ended" | "used_up" | "min_nights" | "rooms";

export type Payment = {
  method: PaymentMethodId;
  amount: number;
  status: "pending" | "paid" | "expired" | "failed" | "refunded";
  /** What the guest needs to pay with: a VA number, a QR payload, a redirect URL. */
  reference: string;
  /** Gateway's own id for the charge, for reconciliation. */
  gatewayId?: string;
  expiresAt: ISODateTime;
  paidAt?: ISODateTime;
};

export type TemplateId =
  | "awaiting_payment"
  | "payment_received"
  | "confirmed"
  | "rejected"
  | "expired"
  | "cancelled"
  | "reminder";

/** Every automatic message is an email. */
export type NotificationLog = {
  id: string;
  template: TemplateId;
  to: string;
  at: ISODateTime;
  /** "simulated" only exists in the prototype. */
  status: "sent" | "failed" | "simulated";
};

export type HistoryEvent = {
  at: ISODateTime;
  by: "guest" | "admin" | "system" | "gateway";
  event: string;
};

export type Booking = {
  /** Short, human readable, shown to the guest: SV-K7M2QX. */
  code: string;
  createdAt: ISODateTime;
  status: BookingStatus;
  source: "website" | "admin";
  locale: Locale;
  checkIn: ISODate;
  checkOut: ISODate;
  units: UnitId[];
  guests: number;
  guest: Guest;
  notes?: string;
  quote: Quote;
  payment: Payment;
  notifications: NotificationLog[];
  history: HistoryEvent[];
  internalNote?: string;
  /** Why the admin rejected it; shown to the guest. */
  rejectReason?: string;
};

export type BlockReason = "airbnb" | "booking_com" | "maintenance" | "owner" | "other";

/** Nights closed by hand, without a website booking: sold on another platform, repairs, the owner's own use. */
export type Block = {
  id: string;
  unit: UnitId;
  from: ISODate;
  /** Exclusive, like checkOut. */
  to: ISODate;
  reason: BlockReason;
  note?: string;
};

export type Season = { id: string; name: string; from: ISODate; to: ISODate; rate: number };

export type UnitRate = {
  unit: UnitId;
  weekday: number;
  /** Friday and Saturday nights. */
  weekend: number;
  minNights: number;
  maxGuests?: number;
  bookable: boolean;
  seasons: Season[];
};

export type Bilingual = Record<Locale, string>;

export type Template = { subject: Bilingual; email: Bilingual };

export type Settings = {
  holdMinutes: number;
  methods: Record<PaymentMethodId, boolean>;
  templates: Record<TemplateId, Template>;
  cancellationPolicy: Bilingual;
  contact: { whatsapp: string; senderEmail: string };
};

/**
 * A room as the owner edits it in the admin: its facts, its description, its
 * photographs. Prices and booking rules are `UnitRate`.
 */
export type Room = {
  unit: UnitId;
  name: string;
  size: number;
  bedrooms: number;
  bathrooms: number;
  features: Feature[];
  description: Bilingual;
  photos: string[];
  /**
   * Removed by the owner. An archived room is no longer sold, listed or shown
   * in the calendar, but past bookings still name it, so it is kept rather
   * than deleted.
   */
  archived?: boolean;
};

/**
 * A photograph is referenced by a string: a path under /photos for the ones
 * that ship with the site, or "upload:<id>" for one added in the admin (the
 * file itself is in IndexedDB in the prototype; object storage in production).
 */
export type MediaMeta = { name: string; alt: Bilingual };

export type ContentItem = {
  id: string;
  name: Bilingual;
  body: Bilingual;
  photos: string[];
  visible: boolean;
  /** What the item's button opens: Google Maps for a place (Jelajah, and
      Kontak's location), the Instagram profile for Kontak's reservation row. */
  link?: string;
  /** Who took the photographs, one line each, for pictures that are not the
      property's own (Jelajah). */
  credit?: string;
  /** The address's plus code (Kontak's location). */
  plusCode?: string;
};

/** One per page of the public site that has editable words or photographs.
    Rooms are edited with their prices, under Kamar & harga. */
export type ContentSection = "home" | "facilities" | "experiences" | "events" | "explore" | "gallery" | "contact";

export type Content = Record<ContentSection, ContentItem[]>;
