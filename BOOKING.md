# Booking & CMS — developer handoff

The guest booking flow and the admin panel are **built and working as a
prototype**. Every screen, state and interaction is final; what is missing is
the backend. Today all data lives in the browser (`localStorage`) through a
mock store, so the client can click through the whole thing.

Your job is to replace two files and add a backend. No component needs to
change.

```
lib/booking/
  types.ts          the data model (keep it; it is the contract)
  api.ts            ← WRITES. Replace each function body with a call to your API.
  hooks.ts          ← READS. Replace each hook with a fetch + cache (SWR / TanStack Query).
  store.ts          mock backend in localStorage. Delete when done.
  seed.ts           demo data. Delete when done (keep seedContent() for the first import).
  config.ts         DEMO = true. Set to false when the backend is live.
  pricing.ts        price rules. Move/duplicate to the server; the server is the authority.
  promo.ts          promo code rules and the discount. Same: the server is the authority.
  occupancy.ts      night-aware availability rules. Same: the server is the authority.
  notifications.ts  default EMAIL templates + variable rendering (no WhatsApp).
  uploads.ts        ← prototype photo storage in IndexedDB. Replace with object storage.
  payments.ts       payment method catalogue; mockReference() is prototype-only.
  format.ts         rupiah, dates, phone normalisation (+62), booking codes.
```

Screens:

| Route | Who | Component |
|---|---|---|
| `/[lang]/booking` | guest | `components/booking/BookingFlow.tsx` (4 steps) |
| `/[lang]/booking/[code]` | guest | `components/booking/OrderView.tsx` (pay / waiting / confirmed / rejected / expired / cancelled) |
| `/[lang]/booking/check` | guest | `components/booking/FindBooking.tsx` (code + email lookup) |
| `/admin/login` | owner | `components/admin/AdminLogin.tsx` |
| `/admin` → `/admin/bookings` | owner | `BookingsTable.tsx`: the first screen, no dashboard. Accept / reject on the row (`Decision.tsx`). |
| `/admin/bookings/[code]` | owner | `BookingDetail.tsx` |
| `/admin/calendar` | owner | `AdminCalendar.tsx` (every room by day; close dates by hand: click a free day or "Tutup tanggal") |
| `/admin/rooms` | owner | `RoomsEditor.tsx` (add and remove rooms; name, size, bedrooms, features, description, photos, rates, rules) |
| `/admin/promos` | owner | `PromosEditor.tsx` (promo codes: add, edit, switch off, delete) |
| `/admin/content` | owner | `ContentEditor.tsx` (CMS: add, edit, hide, order and delete items; text ID/EN, photo upload; the home photograph) |

Every admin screen that holds records works the same way: a list with
**Ubah** and **Hapus** on each row, **Tambah** at the top right, and the form in
a panel along the right edge (`Sheet` in `components/admin/ui.tsx`) with its
own Simpan. Deletes always ask first (`ConfirmDelete`).
| `/admin/settings` | owner | `SettingsEditor.tsx` (payment methods, hold time, email templates, policy) |

The header's check-in/check-out fields (`components/BookingBar.tsx`) read the
same availability.

---

## 1. Data model

See `lib/booking/types.ts`. Rules that matter:

- **Dates are calendar days** (`yyyy-mm-dd`, property time zone Asia/Jakarta),
  not timestamps. `checkIn` is the first night; `checkOut` is the departure
  morning and is **not** a night.
- **Money is integer rupiah.** No floats.
- A booking holds **one or more units** (`units: UnitId[]`) — groups book the
  villa and a cabin together.
- `quote` stores the price **night by night** at the moment of booking, so a
  later rate change never alters an existing booking. With a promo code it
  also stores `subtotal`, `discount` and the `promo` as applied, and `total`
  is what the guest pays; editing or deleting the promo later changes nothing
  on bookings that used it.

Suggested tables: `bookings`, `booking_units`, `booking_nights` (unit, date,
booking_id — a unique index on `(unit, date)` for holding statuses is the
simplest double-booking guard), `payments`, `notifications`, `booking_events`,
`blocks`, `rooms`, `rates`, `seasons`, `promos`, `settings`, `content_items`,
`content_photos`, `admins`.

- **Rooms are data.** `UnitId` is a string: the three launch rooms keep
  `mainVilla`, `familyCabin`, `singleCabin`; a room added in the admin gets a
  generated id. A removed room is `archived`, never deleted, so old bookings
  still name it.

### Status machine

**Money first, then a person.** The guest pays; the booking only becomes a
stay once an admin has accepted it.

```
            ┌──────── expired    (hold ran out, unpaid)
pending ────┼──────── cancelled  (guest/admin, unpaid)
            └─► paid ─┬─► confirmed ──► checked_in ──► completed
              (waiting │        └────► cancelled (admin; refund outside)
               for the └─► rejected   (admin; REFUND OWED)
               admin)
```

- `paid` means **paid and waiting for the admin**. It is the only state that
  is the admin's turn; the list opens on it and the sidebar badge counts it.
- `pending`, `paid`, `confirmed`, `checked_in`, `completed` **occupy** their
  nights. `rejected`, `cancelled`, `expired` release them.
- A pending booking holds its nights until `payment.expiresAt`
  (`settings.holdMinutes`, default 60). Run a job every minute that expires
  lapsed holds and emails `expired`; also treat `pending && expiresAt <= now`
  as expired on every read (`effectiveStatus` in occupancy.ts).
- A booking the admin enters by hand as already paid, or marks paid by hand,
  goes straight to `confirmed`: the admin has seen the money.
- There is no time limit on the admin's decision in the prototype. Consider a
  reminder to the admin (and an SLA shown to the guest) if bookings sit in
  `paid` for long.

---

## 2. Endpoints

One endpoint per function in `api.ts` / hook in `hooks.ts`. Same arguments,
same return shapes.

### Guest (public)

| Function | Endpoint | Server must |
|---|---|---|
| `useOccupancy`, `useRates`, `useRooms` | `GET /api/availability?from&to`, `GET /api/rooms` | Return taken nights per unit (every booking that still holds them), public rates, and the rooms as edited in the admin. Cache briefly. |
| `checkPromo`, `usePromo` | `POST /api/promos/check`, `GET /api/promos/:code` | The checkout's "Pakai" button. Look the code up (case-insensitive), check it is active, inside its dates (the booking date), under its quota, long enough (`minNights`) and for the chosen rooms; answer with the discounted quote. **Rate-limit**: codes can be guessed. Never list codes. |
| `createBooking` | `POST /api/bookings` | Validate input (name, email, +62 mobile). If `promoCode` is sent, **check it again and compute the discount on the server**, counting uses inside the same transaction (a code with quota 1 must not be used twice). | **Re-check availability inside a transaction / with the unique night index.** **Compute the price on the server** from its own rates — never trust a total from the browser. Enforce `bookable` and `minNights`. Create the charge at the payment gateway, store `reference` + `gatewayId` + `expiresAt`. Email `awaiting_payment`. Return the booking + a signed access token. Rate-limit by IP. |
| `getBooking` / `useBooking` | `GET /api/bookings/:code?t=token` | Only with a valid token (see §5). |
| `findBooking` | `POST /api/bookings/lookup {code, email}` | Both must match. Rate-limit. Respond the same way whether or not the code exists. |
| `checkPayment` | `POST /api/bookings/:code/check-payment` | Ask the gateway for the charge status (the webhook is still the source of truth). |
| `changePaymentMethod` | `POST /api/bookings/:code/payment-method` | Cancel the old charge, create a new one; keep the original `expiresAt`. |
| `cancelBooking` (guest) | `POST /api/bookings/:code/cancel` | Only while `pending` (after paying, the guest asks the property). Release nights, email `cancelled`. |
| — | `POST /api/webhooks/payment` | **Verify the gateway signature / callback token.** Idempotent (the same event can arrive twice). On paid: status `paid` (= waiting for the admin), `paidAt`, email `payment_received`. On expired/failed: `expired`, email `expired`. `simulateGateway()` in api.ts is the prototype stand-in for this — delete it. |

### Admin (authenticated, see §6)

| Function | Endpoint |
|---|---|
| `useBookings` | `GET /api/admin/bookings?group&unit&q` (paginate; groups: review, unpaid, confirmed, done, closed) |
| `confirmBooking` | `POST /api/admin/bookings/:code/confirm` — only from `paid`; emails `confirmed` |
| `rejectBooking` | `POST /api/admin/bookings/:code/reject {reason}` — only from `paid`; releases nights; emails `rejected`; **flags a refund** |
| `setBookingStatus` | `PATCH /api/admin/bookings/:code/status` (check-in only from the arrival day; check-out) |
| `markPaidManually` | `POST /api/admin/bookings/:code/mark-paid` (transfer/cash; pays **and** confirms) |
| `cancelBooking` (admin) | `POST /api/admin/bookings/:code/cancel` |
| `resendNotification` | `POST /api/admin/bookings/:code/notify {template}` |
| `saveInternalNote` | `PATCH /api/admin/bookings/:code {internalNote}` |
| `updateBooking` | `PATCH /api/admin/bookings/:code {guest, guests, notes}` — corrects the guest only; dates, rooms and price are not editable (cancel and book again) |
| `deleteBooking` | `DELETE /api/admin/bookings/:code` — only `cancelled`, `expired`, `rejected`; soft delete, keep what tax records need |
| `createBooking` (source `admin`) | `POST /api/admin/bookings` — email optional; `paid: true` creates it confirmed |
| `createBlock` / `updateBlock` / `deleteBlock` | `POST /api/admin/blocks`, `PUT /api/admin/blocks/:id`, `DELETE /api/admin/blocks/:id` (refuse overlaps with bookings or other blocks) |
| `createPromo` / `savePromo` / `deletePromo` | `POST /api/admin/promos`, `PUT /api/admin/promos/:id`, `DELETE /api/admin/promos/:id` — code 3 to 20 of A-Z, 0-9, `-`, unique; percent 1 to 100 |
| `createRoom` | `POST /api/admin/rooms` — starts empty and `bookable: false` |
| `archiveRoom` | `DELETE /api/admin/rooms/:unit` — refuse while a holding booking has nights still to come; otherwise archive, take off sale, drop its blocks |
| `saveRoom` | `PUT /api/admin/rooms/:unit` — then revalidate the room pages (§7) |
| `saveRate` | `PUT /api/admin/rates/:unit` |
| `saveMedia` | `PUT /api/admin/media/:id` (alt text ID/EN) |
| `putUpload` (uploads.ts) | `POST /api/admin/uploads` (multipart) → URL |
| `saveSettings` | `PUT /api/admin/settings` |
| `saveContent` | `PUT /api/admin/content/:section` — then revalidate the public pages (§7) |
| `adminLogin` / `adminLogout` | your auth provider |

Log every admin write to `booking_events` with the admin's id (the History
card in the booking detail already renders these).

---

### Promo codes

Rules in `lib/booking/promo.ts`:

- **percent** (`value` 1 to 100, optional `maxDiscount` cap, rounded down to
  whole rupiah) or **amount** (`value` rupiah, never more than the stay).
- Limited by the days the code can be used (`validFrom` / `validTo`, the
  booking date, not the stay), `minNights`, `units` (empty = every room; in a
  group booking only the listed rooms are discounted) and `quota`.
- A use counts while the booking holds its nights (`HOLDING`); a cancelled,
  rejected or expired booking gives its use back.
- The admin booking manual can take a code too.
- The two codes seeded as examples (`CONTOH10`, `CABIN200`) are demo data.

## 3. Payments

Built for an Indonesian gateway (Xendit or Midtrans); the method list in
`payments.ts` matches what both offer: QRIS, virtual accounts (BCA, BNI, BRI,
Mandiri), e-wallets (GoPay, OVO, DANA, ShopeePay), cards. `manual` is
admin-only (transfer/cash marked paid by hand).

- On create: open a charge for `quote.total`, expiring at `expiresAt`.
  Store what the guest pays *with* in `payment.reference`:
  VA → the VA number; QRIS → the QR string (render a real QR, replacing
  `components/booking/DemoQR.tsx`); e-wallet → the deeplink/checkout URL;
  card → the hosted checkout URL (never take card details on this site).
- The order page polls nothing: refresh the booking when the webhook lands
  (SSE/websocket, or poll `GET /api/bookings/:code` every ~5 s while
  `pending`).
- Methods switched off in admin settings must also be off at the gateway.
- Refunds are outside this flow for now (admin cancels; money handled at the
  gateway dashboard).

---

## 4. Notifications (email only)

By the owner's decision every automatic message is an **email**. Automatic
WhatsApp needs the paid WhatsApp Business Platform and is out of scope.

Templates, variables and rendering are in `notifications.ts`; the owner edits
them in **Admin → Pengaturan → Email otomatis** (ID and EN, per template).

| Template | Trigger |
|---|---|
| `awaiting_payment` | booking created |
| `payment_received` | payment webhook paid: "we have your payment, reviewing" |
| `confirmed` | admin accepts / admin marks paid by hand |
| `rejected` | admin rejects (carries `{alasan}`, promises the refund) |
| `expired` | hold job or gateway expiry |
| `cancelled` | guest or admin cancels |
| `reminder` | daily job, the day before `checkIn`, for `confirmed` bookings |

- Send in the **booking's language** (`booking.locale`).
- Any transactional provider (Resend, Postmark, SES); sender address is in
  settings; verify the domain (SPF/DKIM).
- Record every send in `notifications` with the provider's real status
  (`sent` / `failed`); the admin shows it.
- The guest's WhatsApp number is still collected, as a contact. The booking
  page has a **"Chat tamu di WhatsApp"** button: a plain `wa.me` link with a
  pre-filled message that the admin sends from their own WhatsApp. No API, no
  cost, nothing to build.

---

## 5. Order page access

The guest has no account. The order page must not be readable by anyone who
guesses a code:

- Links in the emails carry a signed token: `/[lang]/booking/SV-XXXXXX?t=…`
  (HMAC of code + expiry, or a random token stored on the booking).
- Without a token, the page asks for the email (the existing
  `/[lang]/booking/check` flow).
- The page is already `noindex`.

---

## 6. Admin access

- Real authentication (Auth.js, Clerk, Supabase Auth, …). Owner + staff
  accounts; consider roles (owner: everything; staff: bookings and calendar
  only).
- Protect **every** `/api/admin/*` route on the server, and `/admin/*` pages
  in `proxy.ts` or the admin layout. The client guard in `AdminShell.tsx` is
  only for the interface.
- `/admin` is excluded from the locale redirect in `proxy.ts` and is
  `noindex`.

---

## 7. CMS → public site

The public pages currently read content from `content/site.ts` and
`content/dict.ts`. The booking flow and the admin already read rooms from the
store (`useRooms`), so a room renamed in the admin shows under its new name
in the flow. To make every admin edit go live:

1. Import the initial data once: `seedRooms()` and `seedContent()` in
   `seed.ts` already map the rooms and every section (home, facilities,
   experiences, events, explore) from the code into the store's shape.
2. Make the pages read rooms and content from the database (server
   components; keep them statically generated) and tag the fetches.
3. `saveRoom` / `saveContent` revalidate the affected pages
   (`revalidateTag` / `revalidatePath`) so changes appear without a deploy.
4. `visible: false` hides an item (the Shop starts hidden until the owner
   confirms it exists). Items can also be added, removed and reordered; the
   order in the admin is the order on the page.
5. The home page is one photograph: the `home` section is the first photo of
   its first item, nothing else.

Rooms can be added and removed in the admin, and the booking flow, the
calendar and the admin already follow (they read `useRooms`). The public
`/[lang]/rooms` and `/[lang]/rooms/[slug]` pages still read the three rooms
from `content/site.ts`; step 2 above is what makes a new room get its own
page and its row on the Rooms page. Until then, in the prototype, a room
added in the admin can be booked but has no public page.

### Uploads

`components/admin/PhotoManager.tsx` is the whole photo UI (drop or choose
files, order, cover, remove, describe). In the prototype `uploads.ts` shrinks
each file to 1800px JPEG in the browser and stores it in IndexedDB, referenced
as `upload:<id>`; `components/StorePhoto.tsx` renders either kind.

In production: `putUpload` posts the file to object storage (S3, R2, Supabase
Storage) and returns a real URL, resizing on the server or via an image CDN;
`StorePhoto` then becomes plain `next/image` (add the storage host to
`images.remotePatterns`). Keep the alt text ID/EN per photo (`media`): the
dialog asks for it and flags photos without one.

---

## 8. Airbnb, Booking.com and the manual calendar

**No automatic sync**, by the owner's decision ("yang penting bisa booking
dulu"); the iCal screen has been removed. Instead the owner asked for a
**manual calendar**: when a room is sold on another platform, is being
repaired, or the owner is using it, marketing closes those dates by hand in
**Admin → Kalender** (click a free day, or "Tutup tanggal" for a range), and
the website stops offering them. Closed dates are `blocks`; "Buka kembali"
opens them again.

A stay agreed on WhatsApp or by phone is entered as a booking instead
(**Admin → Booking → Booking manual**, `createBooking` with source `admin`),
so the guest is on record.

Double booking *within* the website is prevented by the system (night index +
the payment hold). Between the website and another platform it is prevented
only by someone closing the dates in time; that is the cost of having no sync.
If this changes, iCal import/export or a channel manager attaches at
`createBlock` and `createBooking`; nothing else needs to move.

---

## 9. Privacy (UU PDP)

The flow collects name, email and a WhatsApp number only — keep it that way.
Publish a privacy policy and terms (the payment step already links to them in
copy), use the data only for the booking, set a retention period, and let
guests ask for deletion.

---

## 10. Going live checklist

- [ ] Backend implements every endpoint above; `api.ts` / `hooks.ts` call it.
- [ ] `DEMO = false` in `lib/booking/config.ts`; delete `store.ts`,
      `simulateGateway`, the demo data in `seed.ts`, `DemoQR.tsx`, and the
      "simulate" panels go with the flag.
- [ ] Real rates entered in **Kamar & harga** (the current ones are examples).
- [ ] Example promo codes deleted in **Promo**; real ones created if wanted.
- [ ] Cancellation and **refund** policy written in **Pengaturan → Kebijakan
      & kontak**; a refund procedure agreed for rejected bookings.
- [ ] Payment gateway live keys, webhook URL registered and verified.
- [ ] Email sender domain verified (SPF/DKIM); templates reviewed.
- [ ] Object storage for uploads; `StorePhoto` switched to real URLs.
- [ ] Admin auth on; admin accounts created.
- [ ] Privacy policy and terms pages published.
- [ ] Last of all: `SITE_URL` set to the real domain on the production
      deployment. Until then every page is noindex and robots.txt turns
      crawlers away, which is right for a demo. See SEO.md.
