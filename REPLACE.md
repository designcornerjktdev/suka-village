# Replace before launch

Everything below is either a placeholder or an unconfirmed claim. The layout is
final; only these contents change. Nothing marked open may go live as-is.

The owner's website brief (Google Slides, "Suka Village Website Design", with
Drive folders of photographs) is now the primary source. Where it disagrees
with the Airbnb listings, the site follows the brief and the conflict is
recorded here.

## Must come from the owner

| # | What | Where it lives | Status |
|---|------|----------------|--------|
| 1 | **Logo vector** (updated 21 October 2026) | `components/Logo.tsx`, `public/brand/`, `app/icon.svg`, `app/favicon.ico` | The revision asks for the full logo (mark, "suka", VILLAGE) in place of the mark plus typed name. The owner's logo folder holds PNGs only, so "suka" and VILLAGE are traced from `Logo Suka Village-02.png`; the mark is the owner's earlier vector file, scaled into place. Checked against the PNG: edges agree to within a pixel. The full logo (palm, "suka", VILLAGE) is used everywhere, as the owner asked: header (taller on desktop, 76px, to give it room), phone menu, footer and admin; the mark alone is the favicon. In the bar VILLAGE is small (about 5px tall), which the owner accepted. **Ask the designer for the original SVG or AI** and swap the paths in; nothing else changes. |
| 2 | ~~**Photography**~~ **RESOLVED** | `public/photos/<folder>/`, `content/site.ts` → `photos` | Every photograph of the property now comes from the owner's Drive folders linked in the brief (75 files), resized to 1800px for the web and otherwise untouched. The Unsplash set and its footer disclaimer are gone. The only pictures that are not the property are the two landmarks on Explore (#17). |
| 3 | **The day's rundown** | `content/dict.ts` → `home.parts` | Grouped Pagi / Siang / Sore / Malam, never clock times. Rebuilt from the brief's own lists: garden and farm in the morning, the restaurant and pool at midday, ATV in the afternoon, BBQ at night. The ORDER is our illustration. |
| 4 | ~~**Vegetable picking**~~ **CONFIRMED by the brief** | `content/dict.ts` → `experience`, `facilities.copy.dining` | The brief's Garden & Harvest ("see what's ready to be harvested"), Dining ("vegetables picked from our garden") and parting gift copy confirm the garden and the harvest. Guests picking vegetables themselves is still not stated, so the site does not say it. |
| 5 | **Rates** | `content/dict.ts` → `rooms.priceBody` | Withheld at launch by choice. The Rooms page and each room page say plainly why no figure is shown. A "start from 1,5jt/night" figure on third-party TikTok is **not** owner-confirmed and must not be used. |
| 6 | ~~**Brand green**~~ **RESOLVED** | `app/globals.css` → `@theme` | The owner's brand guideline (October 2026, p. 13) gives the palette: Garden Green `#1F5C44` replaces the `#0e4032` measured from the logo, with Tea Leaf, Misty Sage, Rice Cream and Wood Brown (palette A, Calm Garden). |
| 7 | **Main Villa bedrooms: 3 or 4?** | `content/site.ts` → `units` | The brief says **3 bedrooms with double bed, 150 m², 2 bathrooms**; the Airbnb listing said **4**. The site shows the brief's 3, which makes six bedrooms on the estate, not seven. Confirm with the owner. |
| 8 | **Booking backend** | `lib/booking/api.ts`, `lib/booking/hooks.ts`, BOOKING.md | The owner chose a **built-in** booking flow and CMS. The guest flow (dates, rooms, details, payment, order page) and the admin panel (`/admin`) are built as a working prototype on a mock store in the browser. After paying, a booking waits for the admin to accept or reject it. A developer replaces the two seam files with a real backend, payment gateway and email; BOOKING.md is the handoff. Nothing is charged or sent today. |
| 9 | **English and Indonesian copy** | `content/dict.ts` | Where the brief gives copy (rooms, facilities, experiences, events) the English is the brief's, word for word, and the Indonesian is our translation of it. Everything else (home, page intros, Explore) is ours in both languages. Neither has been reviewed by the owner. |
| 10 | ~~**Unit photography**~~ **RESOLVED** | `content/site.ts` → `units[].photos` | Each room now shows its own interior as slides, as the brief asks, with the exterior as the last slide and as the card cover elsewhere. |
| 11 | **Availability and bookings are DEMO** | `lib/booking/seed.ts`, `lib/booking/store.ts` | Every booking, guest name, phone, email and closed date in the prototype is generated (addresses use example.com). Labelled as an example beside the calendar and in a banner across the admin. **Must be replaced by real data before launch**, along with turning `DEMO` off in `lib/booking/config.ts`. |
| 12 | ~~**Hero film**~~ **RETIRED** | `components/HeroFrame.tsx` | The brief asks for a photograph "untuk saat ini", so the Mixkit stock film and its files were removed. The hero is the owner's misty courtyard photograph. When the owner supplies drone footage, the frame and its scroll opening are ready for it. |
| 13 | **Shop: does it exist?** | `content/site.ts` → `SHOP_CONFIRMED` | The brief lists "SHOP (kalau ada)" with copy but no photographs. It is **hidden** until confirmed, because a guest who plans around a shop that is not there has been misled. Flip `SHOP_CONFIRMED` to `true` and it appears on Facilities and in the home band with the brief's copy. |
| 14 | **Family Gathering photographs** | `content/site.ts` → `events` | Marked "menyusul" in the brief. Until they arrive, the slider shows real rooms a family gathering uses (the Main Villa living room, the restaurant, the playground, the pool), each captioned as what it is. Replace with the owner's own when supplied. |
| 15 | ~~**Garden & Harvest photographs**~~ **RESOLVED** | `public/photos/garden/` | Three photographs from the Garden folder in the 21 October 2026 revision. One (`SV---Garden.jpg`) is only 589px wide and looks soft at full width; a larger copy would help. |
| 16 | **ATV photographs** | `public/photos/atv/` | The brief says "gambar menyusul", but its folder already holds four real photographs, and those are used. Confirm they are the ones the owner wants. |
| 17 | **Explore: copy and pictures** | `content/site.ts` → `explore`, `content/dict.ts` → `explore` | The brief names Situ Gunung and Gunung Padang only. The descriptions are ours and give **no travel times**, because the owner has not given any. The photographs are third party and credited beside them: Situ Gunung by Azinumoto (Unsplash License); Gunung Padang by Arie Basuki (CC BY-SA 4.0) and Beeyan (CC BY-SA 3.0), Wikimedia Commons. On 28 October 2026 the owner asked for no credit line under each place, so the two CC BY-SA credits (Gunung Padang) are now one small line at the foot of the Explore page; the Unsplash and CC0 pictures need none. To drop that line too, replace the two Gunung Padang photographs with the owner's own or with Unsplash/CC0 ones. |
| 18 | **"About 25 guests at peak"** | removed from the page | The old home page said the estate sleeps around 25. With the brief's bedroom counts that number is unverified, so it no longer appears. Restore only with the owner's figure. |
| 19 | **People in the event photographs** | `public/photos/corporate/` | The corporate folder shows identifiable guests and staff. Supplied by the owner for this purpose, but confirm the people in them agreed to appear on the website. |
| 20 | **Family Cabin breakfast** | removed from the page | The Airbnb listing promised breakfast for four; the brief does not mention it, so the site no longer does. Confirm before restoring. |
| 21 | **Room rates** | Admin → Kamar & harga (`DEMO_RATES` in `lib/booking/seed.ts`) | The prices the booking flow charges are **examples** so the flow can be demonstrated, labelled "harga contoh" wherever they show. The owner enters real weekday, weekend and season rates before launch. The TikTok "1,5jt" figure is still not a source. |
| 22 | **Cancellation policy** | Admin → Pengaturan → Kebijakan & kontak | Shown right before the guest pays. Currently says the owner has not set one and points to WhatsApp. Needs the owner's real policy (refunds, deadlines). |
| 23 | **Payment gateway and email** | BOOKING.md §3–4 | Need accounts: an Indonesian gateway (Xendit or Midtrans, business documents required) and a transactional email sender with a verified domain. Automatic WhatsApp was dropped by the owner (it is paid); the WhatsApp number is only a contact. |
| 24 | **Admin sign in** | `/admin/login` | Prototype accepts any email and password, and says so. Real authentication is a launch blocker. |
| 25 | **Check-in time, house rules** | not on the site | Not in any source. The confirmation and reminder messages deliberately say nothing about check-in time until the owner gives one. |
| 26 | **ShopeePay logo, logo check** | `public/payments/`, `lib/booking/payments.ts` | Bank, QRIS and e-wallet logos come from Wikimedia Commons (public domain / CC0 files; the marks stay their owners' trademarks), Visa from Simple Icons (CC0). ShopeePay has no freely licensed logo, so it shows as text. When the payment gateway is chosen, replace all of them with the gateway's official merchant logo kit, which also settles which versions the banks want shown. |
| 27 | **Refunds for rejected bookings** | Admin → Booking → Tolak | Guests pay before the admin accepts, so a rejection means money has to go back. The system flags it and tells the guest the payment is refunded; the refund itself is manual. The owner needs a refund procedure (who does it, how fast) and should say so in the cancellation policy (#22). |
| 28 | **Are the website's rooms sold anywhere else?** | Admin → Kalender | Yes: the MoM of 26 Oct 2026 says the SV team runs a channel manager for the OTAs (all 6 rooms open; a Booking.com sale closes one automatically). The **developer** connects the website to it through the channel manager's API, which the SV team is requesting; until then there is no sync with Airbnb or Booking.com. If a room is also sold there, someone must close those dates in the admin calendar every time it sells (click the day, or "Tutup tanggal"), or double bookings will happen. Who does this, and how fast, needs agreeing with marketing. |
| 29 | **Photo storage** | `lib/booking/uploads.ts` | Photos uploaded in the admin are stored in the browser (IndexedDB) in the prototype and do not reach the public site. Needs object storage. |
| 30 | **Production domain** | `SITE_URL` (environment variable), `lib/site-url.ts` | The site hides itself from search engines until `SITE_URL` is set to the real domain on the production deployment: every page is noindex and robots.txt turns crawlers away. That is deliberate while the booking flow is a demo. At launch, with the backend live and `DEMO` off, set `SITE_URL=https://<the domain>` and redeploy; canonical URLs, hreflang, the sitemap and share images all follow it. The domain itself is not known yet. See SEO.md. |
| 31 | **Postal code and map coordinates** | `content/site.ts` → `place` | The structured data gives the address as the owner published it, without a postal code or latitude and longitude, because neither is in any source. Both help local search and Google Maps. Add them to `place` once the owner confirms them; do not look them up and guess. |
| 32 | **Google Search Console and Business Profile** | `GOOGLE_SITE_VERIFICATION` (environment variable), SEO.md | Needs the owner's Google account. Verify the domain in Search Console and submit `/sitemap.xml`; claim or create the Google Business Profile for the property, with the same name, address and phone as the site. Nothing in the code can do this. |
| 33 | **"Resort" as a word** | `content/dict.ts` → `seo` | The search titles and descriptions say villa, cabin and "penginapan keluarga" in Sukabumi, because that is how the owner's own material describes the place. They do not call it a resort. If the owner wants to be found for "resort keluarga Sukabumi", it is a one line change per page, but it is the owner's call how the property is described. |
| 34 | **Check-in and check-out times, price range, reviews** | `lib/seo.ts` → `siteGraph` | Left out of the structured data because no source gives them. Google shows them for lodging when they are present. Add `checkinTime`, `checkoutTime` and `priceRange` once real ones exist (#21, #25). Never add a rating that is not the property's own, verifiable one. |
| 35 | **Rooms added in the admin have no public page yet** | `content/site.ts` → `units`, BOOKING.md §7 | A room added under Kamar & harga can be booked straight away, but the Rooms page and the room pages still list the three rooms in the code until the developer connects the pages to the database. Same for facilities, experiences, events and places added under Konten. |
| 36 | **Contact page map** | `app/[lang]/contact/page.tsx` | Google Maps' embed, searched by the plus code 42C5+CV5. Check the pin sits on the estate; if not, give the exact map link and it will be used instead. The embed loads Google's own scripts and cookies when it scrolls into view; mention it in the privacy policy. |
| 37 | **Page titles and leads no longer shown** | `content/dict.ts` | The owner asked for no title at the top of any page. The headings and lead lines each page used to open with are still in the dictionary, unused, in case they come back. Each page keeps a heading that only screen readers and search engines see. |
| 38 | **Helvetica** | `app/globals.css` → `--font-head`, `app/fonts.ts` | The revision asks for Helvetica headings ("dicoba dulu"). Helvetica has no free web licence, so headings use the visitor's own copy: Helvetica Neue on Mac and iPhone, Arial on Windows (same widths, slightly different shapes), the system sans on Android. For Helvetica on every device, buy a web licence (Monotype, Helvetica Now) and load it in `app/fonts.ts`. |
| 39 | **Bukit Sabak** | `content/site.ts` → `explore`, `content/dict.ts` → `explore.copy.bukitSabak` | Added on Explore as asked. The description is ours, from visitsukabumi.com (Desa Semplak, Kec. Sukalarang, about 1,000 m, pine forest, camping). The photograph is Mount Gede seen from Bukit Sabak, CC0 on Wikimedia Commons, credited. Replace it with the owner's own if there is one. |
| 41 | **Tax** (MoM 26 Oct 2026) | `content/dict.ts` → `checkout.taxIncluded`, Admin → Kamar & harga | The meeting asked for prices to show that tax is included. Every price and total on the booking page, the order page and in the emails now says "Termasuk pajak", and the admin price form tells the owner to enter prices with tax. **The rate (and whether service charge is separate) is not known**, so no percentage or tax line is shown. If the owner wants the tax broken out, give the rate and it is added to the breakdown. |
| 42 | **Padel Court and Equestrian House** (MoM 26 Oct 2026) | `content/site.ts` → `facilities`, Admin → Konten → Fasilitas | Listed on Facilities as "Segera hadir", with a drawn icon in place of a photograph. The one line descriptions are ours and say only that they are being prepared. When one opens: set its status to Tampil in the admin, and send photographs and the owner's own description. |
| 40 | **Photo sets cut to the revision's folders** | `content/site.ts` → `photos` | Family Cabin shows the nine photographs in its folder (two near duplicates out: a second sitting room view and a second bathroom view). Farm shows the eight in its folder (three that were not in it are out). Dining shows three. The files that are no longer shown stay in `public/photos/`. |

## Dropped by the brief

The Airbnb listing's **fishing pond, jogging track and cycling trail** are not in
the brief's Facilities or Experience tabs, so they are no longer on the site.
If they still exist and the owner wants them shown, they need a place in the
brief first.

## On imagery that is not the property's

The rule is unchanged: **nothing on this site may be presented as a photograph
of Suka Village unless it is one.** The two Explore pictures are of public
landmarks, named as such and credited beside them. The interim Family Gathering
slides (#14) are the property's own rooms, captioned as those rooms.

## Deliberately absent — do not add without a source

- Guest testimonials, property-level review scores, star ratings.
- The host's Airbnb reputation (777 reviews, 4.83/5, Superhost). That belongs to
  the **host profile**, not this property.
- Restaurant menu contents and pricing.
- Activity details: what an ATV session costs or how long it runs, how BBQ is
  arranged or charged, how many guests the meeting room seats.
- Travel times to Situ Gunung or Gunung Padang.
- Awards, press quotes, partnership claims.

## Do not confuse with another property

Public searches for "Sukabumi farm stay petik sayur" surface **Sukasantai
Farmstay**, a different business with its own activities, rates and fish ponds.
None of its facts belong to Suka Village.
