# SEO: what is in place, what was checked, what is left

Audit and implementation of 12 October 2026, against the production build of
this repository. Nothing visible on the site changed: screenshots of eleven
pages at desktop and phone width were compared before and after, and the only
pixels that differ are the clock in the footer.

**Updated 15 October 2026, after the owner's design revision** (white, square,
no motion, a one-screen home page, no title block on any page, a Contact page).
What that changed for search:

- **24 public URLs** now: `/id/contact` and `/en/contact` joined the sitemap,
  with their own titles, descriptions and breadcrumb.
- **Headings.** Pages no longer show a title block, so each page's `h1` is
  visually hidden but still in the HTML for screen readers and Google (the
  page's search title; on a room page, the room's name is a visible `h1`).
- **The home page has almost no text** now: one photograph and a footer. Its
  title, description and structured data still say what the place is, but
  Google learns most of what the site is about from the inner pages. That is
  the cost of the one-screen home; it is acceptable because the Rooms,
  Facilities and Experience pages carry the words.
- **Lighter and faster.** The animation and smooth-scroll libraries are gone
  from every page, and Lighthouse's accessibility score went to 100 on every
  page (the scroll-filled headings it flagged no longer exist).

## 1. The one switch

Search engines are let in by one environment variable, set on the
**production** deployment only (Vercel → Project → Settings → Environment
Variables), followed by a redeploy:

| Variable | Value | Effect |
|---|---|---|
| `SITE_URL` | `https://<the real domain>`, no trailing slash | Public pages become indexable. Canonical URLs, hreflang, the sitemap, share images and structured data all use this domain. |
| `GOOGLE_SITE_VERIFICATION` | the token from Search Console's "HTML tag" method | Adds the verification meta tag. Optional: DNS verification needs no variable. |

**Without `SITE_URL` the site hides itself**: every page answers `noindex`
(meta tag and `X-Robots-Tag` header) and `/robots.txt` says `Disallow: /`.
That is the state of the prototype today, and it is deliberate: the booking
flow takes example bookings and example payments (`DEMO` in
`lib/booking/config.ts`), and a real guest must not find it on Google. Set
`SITE_URL` last, after everything in BOOKING.md §10.

Logic: `lib/site-url.ts`.

## 2. Where things live

| What | File |
|---|---|
| Titles and descriptions, ID and EN | `content/dict.ts` → `seo` |
| Canonical, hreflang, Open Graph, X card, robots rules | `lib/seo.ts` → `pageMetadata`, `siteRobots` |
| Shared defaults (title template, base URL, verification) | `app/[lang]/layout.tsx` |
| Structured data | `lib/seo.ts` → `siteGraph`, `roomSchema`, `breadcrumbs`; rendered by `components/JsonLd.tsx` |
| `/sitemap.xml`, `/robots.txt` | `app/sitemap.ts`, `app/robots.ts` |
| `X-Robots-Tag` headers | `next.config.ts` → `headers()` |
| Share images, 1200×630 | `public/og/`, made by `node scripts/og-images.mjs` from `share` in `content/site.ts` |

To add a public page: add its path to `PUBLIC_PATHS` in `lib/seo.ts` (that
puts it in the sitemap), give it a `seo` entry in both languages, and return
`pageMetadata(...)` from its `generateMetadata`.

## 3. Audit checklist

"Before" is the build as it stood when the audit started.

### On-page

| Check | Before | Now |
|---|---|---|
| Unique title on every public page, per language | FAIL: home had the same title in both languages; inner pages were one word ("Kamar · Suka Village") | **PASS**: 24 of 24 unique, 40 to 60 characters |
| Unique meta description on every public page | PASS, but taken from page leads with no place name | **PASS**: 24 of 24 unique, 138 to 166 characters, each names what is on the page and where |
| One `h1` per page, no skipped heading levels | PASS | **PASS** (unchanged; visible headings were not edited) |
| Keywords used naturally | n/a | **PASS**: villa, kabin, penginapan keluarga, Sukabumi and each page's own subject, in titles and descriptions only. No keyword tag, no hidden text |
| Descriptive `alt` on images | PASS | **PASS**: 326 images across the public pages, none missing. Decorative thumbnails in the booking flow keep an empty `alt`, which is correct |
| Canonical URL | **FAIL: every inner page declared the home page as its canonical**, so Google would have treated the whole site as one page | **PASS**: each page is its own canonical, absolute URL, no query string |

### Technical

| Check | Before | Now |
|---|---|---|
| `/sitemap.xml` | FAIL (404) | **PASS**: 24 URLs, each with its hreflang alternates |
| `/robots.txt` | FAIL (404) | **PASS**: public pages open, `/admin` and `/*/booking/` closed, sitemap listed |
| Public pages crawlable and indexable | PASS by accident (no rules at all) | **PASS with `SITE_URL` set**; blocked by design without it (§1) |
| Admin, login and private booking pages kept out | Partial (meta tag only) | **PASS**: meta `noindex`, `X-Robots-Tag` header and robots.txt, on `/admin/*`, `/[lang]/booking/check` and `/[lang]/booking/[code]` |
| Open Graph and X card | FAIL: one generic title for every page, no image, no URL | **PASS**: per page title, description, URL, locale, and a 1200×630 photograph of the property with alt text |
| Metadata present in the server HTML `<head>` | PASS | **PASS**: checked on raw HTML with a Googlebot user agent, no JavaScript |
| Static generation | PASS | **PASS**: every public page is prerendered at build time |
| HTTP status codes | PASS | **PASS**: unknown paths return 404, `/` redirects (307) to `/id` or `/en` by browser language |

### Structured data

| Check | Before | Now |
|---|---|---|
| Valid JSON-LD | Partial: a bare `LodgingBusiness` with a name and address | **PASS**: `WebSite` and `LodgingBusiness` on every public page (URL, photographs, phone, address, map, Instagram, facilities, the three rooms); `BreadcrumbList` on every inner page; `Accommodation` on each room page (floor size, bedrooms, bathrooms, bed type, amenities, no smoking) |
| Only facts the owner has given | PASS | **PASS**: no price range, rating, opening hours, postal code or coordinates, because no source gives them (REPLACE.md #31, #34) |
| Google Rich Results Test | not run | **NOT RUN**: it needs a public URL. See §5 |

### Multilingual

| Check | Before | Now |
|---|---|---|
| ID and EN metadata | Partial | **PASS** |
| hreflang | FAIL: inner pages pointed at the two home pages; no `x-default` | **PASS**: `id`, `en` and `x-default` (Indonesian) on every public page and in the sitemap, each pair pointing at each other |
| Canonical per language | FAIL | **PASS**: `/id/...` and `/en/...` are each their own canonical |
| `<html lang>` | PASS | **PASS** |

### Performance (Lighthouse 12.8, production build, local)

| Check | Before | Now |
|---|---|---|
| CLS | PASS | **PASS**: 0 to 0.007 |
| INP | n/a | Cannot be measured in a lab. Its proxy, Total Blocking Time, is 10 to 60 ms: **PASS** |
| LCP, desktop | n/a | **PASS**: 1.1 s on the home page |
| LCP, phone on simulated slow 4G | 3.6 to 5.0 s | **NOT YET**: 3.1 to 4.1 s. Better, still above Google's 2.5 s. See §5 |
| Images sized and lazy-loaded | PASS | **PASS**: `next/image` everywhere, responsive `srcset`, everything below the first screen lazy |
| Leading image fetched first | FAIL: Next 16 deprecated `priority`, which no longer sets `fetchpriority` | **PASS**: `loading="eager"` and `fetchPriority="high"` on the hero and on each page's first slide |
| Font weight | 131 KB for the main face | **PASS**: 77 KB, by dropping a width axis no style used |
| Render-blocking resources | one 16 KB stylesheet | unchanged: one 16 KB stylesheet, no third-party scripts at all |

Lighthouse scores, phone profile, on the build of 22 October 2026 (after the
revision that framed the home photograph, moved the header calendar to load
on demand, served AVIF/WebP and held back each slider's later photographs
until the page has loaded):

| Page | Performance | SEO | Accessibility | Best practices | LCP | CLS |
|---|---|---|---|---|---|---|
| `/id` | 97 | 100 | 100 | 100 | 2.7 s | 0 |
| `/id/rooms` | 95 | 100 | 100 | 100 | 2.9 s | 0 |
| `/id/rooms/family-cabin` | 95 | 100 | 100 | 100 | 3.0 s | 0 |
| `/id/facilities` | 95 | 100 | 100 | 100 | 2.9 s | 0 |
| `/id/experience` | 93 | 100 | 100 | 100 | 3.2 s | 0 |
| `/id/event` | 96 | 100 | 100 | 100 | 2.8 s | 0 |
| `/en/explore` | 96 | 100 | 100 | 100 | 2.8 s | 0 |
| `/id/gallery` | 91 | 100 | 100 | 100 | 3.4 s | 0 |
| `/id/contact` | 96 | 100 | 100 | 100 | 2.7 s | 0 |

Simulated runs vary by a few points between runs on the same build.

All ten SEO audits pass on every page: crawlable, title, description, status
code, link text, crawlable links, robots.txt, image alt, hreflang, canonical.
Without `SITE_URL` the same run scores 66 to 69 because "page is blocked from
indexing" fails, which is the switch in §1 doing its job.

Two accessibility items found in the first audit were fixed: the step
buttons of the booking flow had no name for screen readers on a phone, and
gallery captions were read out twice. The third, low contrast on headings
that filled in as the reader scrolled, went with the revision.

## 4. What changed in the code

- New: `lib/site-url.ts`, `lib/seo.ts`, `components/JsonLd.tsx`,
  `app/sitemap.ts`, `app/robots.ts`, `scripts/og-images.mjs`, `public/og/*`.
- `content/dict.ts`: a `seo` section in both languages. `content/site.ts`:
  the address in parts, and `share` (the photograph each page is shared with).
- `app/[lang]/layout.tsx` and every public `page.tsx`: metadata through
  `pageMetadata`, structured data through `JsonLd`.
- `next.config.ts`: `X-Robots-Tag` headers.
- `components/HeroFrame.tsx`, `Slides.tsx`, `Figure.tsx`: image loading
  priority. `app/fonts.ts`: one unused font axis removed.
- `components/GalleryGrid.tsx`, `app/globals.css` (step labels on a phone):
  the two screen reader fixes.

## 5. Still to do, by hand

1. **Domain and `SITE_URL`** (§1). In Vercel, make the real domain the primary
   one so the `vercel.app` address redirects to it.
2. **Google Search Console**: add the domain, verify it (DNS, or the HTML tag
   through `GOOGLE_SITE_VERIFICATION`), submit `https://<domain>/sitemap.xml`,
   then use URL Inspection on `/id` and one room page.
3. **Rich Results Test** (search.google.com/test/rich-results) and the Schema
   Markup Validator on the live `/id`, `/id/rooms` and `/id/rooms/main-villa`.
   The JSON-LD parses and uses valid types, but only Google's own tool
   confirms what it will show.
4. **Google Business Profile**. For searches like "villa keluarga Sukabumi"
   the map results sit above the websites, and they come from the Business
   Profile, not from this site. Use exactly the name, address and phone the
   site uses.
5. **Facts the structured data is missing** (REPLACE.md #31, #34): postal
   code, coordinates, check-in and check-out times, price range.
6. **LCP on phones.** Lighthouse's simulated slow phone still puts it at 3.1
   to 4.1 s; on the same machine without throttling every page paints in
   well under a second. What is left is mostly React and the header's date
   picker (about 22 KB, which could load only when opened) and the photograph
   sizes; serving AVIF would shave the images further. Real visitors' numbers
   in Search Console are what count (point 7).
7. **Real-user data.** Lighthouse is a simulation. Google ranks on field data
   (Core Web Vitals in Search Console), which appears about four weeks after
   launch. Run PageSpeed Insights on the live URL as well.
8. **"Resort"** (REPLACE.md #33): the titles do not use the word. The owner
   decides.
9. **Links to the site.** Put the domain in the Instagram bio and the
   Linktree. A new domain with no links to it is slow to be found.
10. **Privacy policy and terms** pages do not exist yet (BOOKING.md §9).
