# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router) + TypeScript, Tailwind CSS v4. Chosen by the owner at project setup.
No deploy target has been decided yet.

## Users

**Primary — the family trip organiser.** One adult arranging a stay for a group, not a solo
traveller. They are deciding on a phone, often while relaying questions from the rest of the
group: how many people fit, what it costs, **what everyone will actually do all day**, whether
children and older relatives will be occupied. The realistic booking is an extended family, two
families travelling together, or, per the owner's brief, a company outing. (An earlier figure of
"about 25 guests at peak" is unverified against the brief's room counts and is not shown.)

What they are buying is not a room. It is a day that runs itself — somewhere the children are
busy, the older relatives are comfortable, and the organiser is not responsible for filling the
hours.

The guests' home market (Jabodetabek, Bandung, local Sukabumi) is **not confirmed** and must not
be asserted until the owner says so.

**Secondary — restaurant and day visitors.** The restaurant is open to the public, so some
visitors arrive with no intention of staying overnight. Real, but subordinate: the page's job is
the overnight stay.

## Product Purpose

Suka Village is a **farm stay** — the owner's own Airbnb listing categorises it as "Room in a
farm stay", not a villa — set in a working garden in Sukalarang, Sukabumi. Three separate
lodgings, a public restaurant, and a programme of things to do share one compound.

The landing page exists to take a stranger who has just heard of the place — usually via
Instagram or TikTok — and give them enough certainty to open a WhatsApp conversation.

Success is a WhatsApp message from someone who already understands what they are booking.
A message that begins "ini di mana ya? muat berapa orang? ngapain aja di sana?" is a page that
failed.

## Positioning

**"SATU KAWASAN, BANYAK CERITA"** is the owner's own line and it is literal, not poetic. The
inventory in the owner's brief backs it: a swimming pool, a restaurant cooking with vegetables
from its own garden, a meeting room, a playground, the garden and its harvest, a farm with cows,
goats, chickens and peacocks, ATV rides, BBQ evenings, and a parting gift of produce from the
garden. A neighbouring villa rents a building. Suka Village rents a day with things in it.

The owner separately names **location and view** as the reason a guest picks Suka Village — the
property describes itself as *"Surga Villa & Resto Tersembunyi di Kebun Sukalarang"*, hidden in a
garden, with Mount Gede Pangrango in view. Treat the two as one claim: a hidden place that is
also full of things to do.

## Operating Context

- Reservations run through WhatsApp today: `wa.me/6287726100010`.
- The three units are listed individually on Airbnb, and the property is on Booking.com. The
  owner has chosen **not** to surface those on this page for now.
- Discovery is social-first. Instagram (@sukavillage, verified, ~6.2k followers) and TikTok carry
  the property's reach; the landing page receives traffic that already has some warmth.
- Instagram highlights indicate recurring programming — **SV Harvest Day**, SV Promo, Ramadan
  Menu, SV Spot, Resto Info. Harvest Day is consistent with the farm-stay category and with the
  restaurant sourcing from the property's own garden.
- **The owner's website brief** (Google Slides, "Suka Village Website Design") is the binding
  source for structure and content. It sets six tabs, after yats.co: Home, Rooms, Facilities,
  Explore, Event, Experience. Rooms and Facilities follow adhisthanahotel.com's alternating rows;
  Experience, Explore and Event follow greenhosthotel.com's slider blocks. Each section links a
  Drive folder of the owner's own photographs.
- The garden and its harvest are confirmed by the brief (Garden & Harvest, Dining, the parting
  gift). Guests picking vegetables themselves is not stated and the site does not say it.
- Distances published by the owner: 22 minutes from Sukabumi city, about one hour from a
  suspension-bridge attraction.

## Capabilities and Constraints

**Accommodation — from the owner's brief:**

| Unit | Size | Bedrooms (double bed) | Bathrooms | Also |
|---|---|---|---|---|
| Main Villa | 150 m² | 3 | 2 | living room, kitchen |
| Family Cabin | 60 m² | 2 | 1 | |
| Single Cabin | 30 m² | 1 | 1 | |

All three: balcony, terrace with mountain view, air-conditioning, flat-screen TV, shower, basic
amenities, tea and coffee maker, free WiFi, no smoking. Six bedrooms across the compound. The
Airbnb listing gave the Main Villa **4** bedrooms; the brief's 3 is what the site shows until
the owner settles it (REPLACE.md #7).

**Facilities, experiences and events — from the owner's brief:**

- Facilities: swimming pool · dining · meeting room · playground · shop (*"kalau ada"*, hidden
  until confirmed)
- Experience: Garden & Harvest · Farm · ATV · BBQ Party · A Little Something to Take Home
- Event: Corporate · Family Gathering
- Explore: Situ Gunung · Gunung Padang

The Airbnb listing's fishing pond, jogging track and bicycle track are not in the brief and are
no longer on the site. This inventory is the product's centre of gravity, not a footnote. A page
that presents Suka Village as lodging with amenities has misread it.

**Constraints that bind this build:**

- **Built-in booking, decided by the owner.** Guests book and pay on the site without an
  account: dates, rooms (several for a group), name + email + WhatsApp number (all required),
  then a payment method (QRIS, virtual account, e-wallet, card through an Indonesian gateway).
- **Money first, then a person.** After the guest pays, the booking is *waiting for
  confirmation*: an admin accepts or rejects it, and only then is it a stay. The guest's page
  says so plainly (a three step tracker: made, paid, confirmed) and says the answer comes by
  email. A rejection states its reason and that the payment is refunded.
- **Automatic messages are email only.** Automatic WhatsApp needs the paid Business Platform,
  so it is out. The WhatsApp number is a contact: the admin can open a chat with a guest by
  hand from the booking. WhatsApp also stays on the site as "hubungi kami" / "contact us" for
  questions. Events are still arranged on WhatsApp because they are quoted, not booked.
- **No sync with Airbnb or Booking.com, a manual calendar instead.** When a room sells on
  another platform, marketing closes those dates by hand in the admin calendar so the website
  stops offering them. Those platforms stay off the site.
- **A built-in admin and CMS** at `/admin` (Indonesian only), opening straight on the list of
  bookings (no dashboard): accept or reject, manual bookings, the manual calendar, rooms (added,
  removed, and their facts, description, photographs, rates and rules), page content in ID/EN
  with photo upload where items can be added, removed and ordered, payment methods, email
  templates and the cancellation policy. The flow and the admin exist as a working prototype on
  demo data; BOOKING.md is the developer handoff.
- **Prices come only from the admin.** The booking flow needs them, so the prototype runs on
  example rates labelled "harga contoh" wherever they appear; the owner enters real ones before
  launch. Room pages still show no price. A "start from 1,5jt/night" figure circulates on
  third-party TikTok posts; it is **not owner-confirmed** and must not be used.
- **Client brief, binding (revised October 2026, four times; latest 21 October):** clean and square on a white
  page, coloured from the brand guideline's "Calm Garden" palette so it is not monotone. The home
  page is one screen and does not scroll: the white header (reference: yatscolony.com), then one still
  photograph of the Main Villa filling the rest of the screen edge to edge, no title, no
  slideshow, no caption, and only WhatsApp and Instagram in the line at its foot. Every other page
  starts straight on its content. Rooms, Facilities, Experience, Event and Explore share one row
  layout (photographs on one side, words on the other, alternating), with no cut-outs in the
  photographs. No rounded corners on the site, except the booking calendar (round days and a rounded stay band, allowed by the owner on 28 October 2026). Motion is calm: a page's first row is there at
  once and the rows below fade in as they scroll into view (on a phone only the words fade, the
  photographs are simply there); no zooms, no hover micro-movements. The Rooms page shows each
  room's first three photographs in a slider, as on Facilities, with Book now beside Discover. A
  room's own page has every photograph in one wide slider under the header and the details below
  it (reference: adhisthanahotel.com/rooms/deluxe-king). Experience rows carry no Book now. Explore lists Situ Gunung, Gunung Padang and
  Bukit Sabak, with no travel times. Contact uses the same rows, unnumbered: Reservasi (WhatsApp,
  Instagram) beside a photograph, then Lokasi (address, directions) beside the map; no travel
  times. The gallery is photographs only, no captions. Each experience, Dining and the Family
  Cabin show the photographs in the Drive folder the 21 October revision links. Header: slim,
  plain white on every page, the owner's full logo (palm, "suka", VILLAGE; not typed text), tabs centred in the order Beranda, Kamar, Fasilitas,
  Pengalaman, Acara, Jelajah, Galeri, Kontak. Footer: one thin line (logo, place, WhatsApp,
  Instagram, language) and the copyright, nothing more. On a phone the menu fits one screen, the
  gallery runs two photographs across, and a room's page keeps Book now in a bar at the foot of
  the screen. The admin is the exception to "square": soft radii, a light sidebar and
  rounded controls, as a calm daily tool. A pinned brief beats any generated direction.

- **UX copy: no em dashes.** Owner's instruction. They read as machine written and the owner's
  own material does not use them. Commas, periods and colons do the same work.

## Brand Commitments

An identity already exists and this build inherits it rather than inventing one.

- **Name:** Suka Village (styled *Sukavillage* in some places; both appear in the property's own
  material)
- **Tagline:** SATU KAWASAN, BANYAK CERITA
- **Descriptor:** Surga Villa & Resto Tersembunyi di Kebun Sukalarang, Sukabumi
- **Logo:** the owner's logo folder (Drive, linked in the 21 October 2026 revision): a palm-tree
  mark over the "suka" lettering over VILLAGE, plus cuts without the mark and the mark alone, in
  green, black and white. PNG only; the site's SVGs (components/Logo.tsx, public/brand/) are
  traced from it, with the mark from the owner's own earlier vector file.
- **Colour:** from the owner's brand guideline (October 2026, p. 13), palette **A "Calm Garden"**,
  the default: Garden Green `#1F5C44` (the brand; calls to action, titles, the footer field), Tea
  Leaf `#7D9A72`, Misty Sage `#C9D3BE`, Rice Cream `#F3EEE4`, Wood Brown `#6E4B33`. The page ground
  stays white `#ffffff` with a charcoal-green ink `#1F2A24`; the palette sits on it in blocks
  (cards, panels, the footer). Clay `#9C4E2C` is kept for errors only. The guideline's other two
  palettes (B "Joyful Suka" for campaigns, C "Sukalarang Earth" for heritage) are not used on the
  site.
- **Type (21 October 2026, "dicoba dulu"):** Helvetica for headings, from the visitor's system
  (Helvetica Neue on Apple devices, Arial on Windows; no web licence bought), and Poppins for
  everything else.
- **Channels:** Instagram and Threads @sukavillage, Linktree `linktr.ee/sukavillage`

## Evidence on Hand

**Available:**

- The owner's website brief, with Drive folders of the property's own photographs for the
  home page, all three rooms, the pool, dining, meeting room, playground, farm, ATV, BBQ, the
  parting gift and corporate events.

- The owner's Airbnb listing for the 2BR Family Cabin, carrying the property type, unit
  configuration, facility list, and distances recorded above.
- Instagram @sukavillage — 254 posts, ~6,248 followers, verified. Room tours for Family Cabin,
  Single Cabin, and Main Villa; pool and interior footage; the SV Harvest Day highlight.
- Linktree carrying WhatsApp, map location, restaurant menu, Booking.com, and three Airbnb
  listings.
- Address: Kp. Cikereteuw, RT.02/RW.04, Sukalarang, Kec. Sukalarang, Kabupaten Sukabumi,
  Jawa Barat. Plus Code `42C5+CV5`.
- **Host-level** reputation on Airbnb: Superhost, 777 reviews, 4.83/5, seven years hosting.
  This belongs to the host profile, **not to this property**. It may not be presented as the
  villa's rating. Confirm with the owner before using it in any form.

**Not on hand — must not be fabricated:**

- Verified nightly rates for any unit.
- Guest testimonials, property-level review scores, star ratings, occupancy claims.
- Restaurant menu contents and pricing (the menu lives in a Google Drive document that has not
  been read).
- Activity details: what an ATV session costs or how long it runs, how BBQ is arranged or
  charged, how many the meeting room seats, whether harvest is scheduled or on demand.
- Travel times to Situ Gunung or Gunung Padang.
- Awards, press quotes, or partnership claims.

**Do not confuse with another property.** Public search results for "Sukabumi farm stay vegetable
picking" surface **Sukasantai Farmstay**, a different business with its own activities, rates, and
fish ponds. None of its facts belong to Suka Village.

## Product Principles

1. **Sell the day, not the room.** The compound's programme — ATV, fishing, animals, tracks,
   garden, kitchen — is the offer. Lodging is where the day sleeps.
2. **Answer before asking.** Every question the organiser would otherwise have to ask on
   WhatsApp — where, how many, what does everyone do — is answered on the page first.
3. **One clear way to book.** "Pesan sekarang" leads into one booking flow on every route;
   WhatsApp is there for questions. Competing calls to action are a defect, and so is
   pressure: no countdown banners, no fake scarcity. The only timer is the real payment hold.
4. **The kawasan is the product.** Three lodgings, a restaurant, and a working garden in one
   area. The page's structure should make that legible without explanation.
5. **Never invent a number.** Rates, capacities beyond those confirmed here, ratings, and review
   counts are either sourced from the owner or absent.
6. **The backend is swappable.** The booking flow and admin talk to the data only through
   `lib/booking/api.ts` and `lib/booking/hooks.ts`. No shortcut may bypass them.

## Accessibility & Inclusion

- **Mobile-first is not a preference, it is the scene.** The audience discovers on Instagram and
  TikTok and converts into WhatsApp. The phone is where this page lives or dies.
- **Language:** bilingual, Indonesian and English, decided on the owner's instruction and built.
  Indonesian is the default and the fallback, matching the owner's own material; the visitor's
  `Accept-Language` picks the first route and the locale then lives in the URL (`/id`, `/en`) so
  a choice is shareable. Indonesian copy is the source of truth; English is a translation of it,
  not a separate voice.
- **Mixed-age audience is a product fact.** The group includes children and older relatives, so
  legibility at arm's length and generous touch targets are not optional refinements.
- No specific accessibility standard has been established by the owner. General WCAG 2.1 AA
  practice applies as the floor.
