# Keputusan selama implementasi backend

Setiap keputusan yang diambil developer (Claude) atas nama pemilik proyek saat
mengerjakan dua rencana di folder ini, apa adanya dari ledger kerja, dengan
alasannya dan akibatnya bila keputusan itu salah ("cost"). Urut sesuai waktu.

## Rencana backend (2026-11-17-backend.md)

- Pre-flight: Task3 consumes CreateInput/CreateResult from client api.ts — Ruling: move types to lib/booking/types.ts in Task 3 (server must not import "use client" file).
- Task 1: Ruling: repo already had git history; skipped git init, worked on new branch `backend` — cost if wrong: none.
- Task 1: Ruling: @types/node ^20 → ^22 (vitest peer) — local Node is 22, README floor 20.9 unaffected at runtime — cost: none.
- Task 1: Ruling: Docker Postgres on host port 5433 — a native Windows Postgres already owns 5432 — cost: none.
- Task 2: Ruling: seed logic in lib/server/seed-db.ts and admin creation in lib/server/admins.ts (not named in plan) — makes both testable; prisma/seed.ts and scripts/create-admin.ts are thin wrappers — cost: none.
- Task 2: Ruling: tests/setup.ts resetDb() uses Postgres pg_tables — test-only helper; must be rewritten if tests ever run on MySQL — cost: small.
- Task 2: Ruling: added Room.position and ContentItem @@id([section,id]) — admin order is page order (docs/BOOKING.md §7.4); content ids are only unique per section — cost: none.
- Task 3: Ruling: added Booking.promoId column (migration booking_promo_id) — quota counted by column, not by reading quote JSON (portable to MySQL) — cost: none.
- Task 3: Ruling: server "today" = jakartaToday() in lib/server/time.ts, not format.todayISO() (machine-local) — server may run in UTC — cost: none.
- Task 3: Ruling: promo row lock via no-op update; uses counted after lock under READ COMMITTED (Postgres). On MySQL (REPEATABLE READ) the count may read a stale snapshot — re-run "promo quota race" test after any MySQL switch — cost: quota overrun by one on MySQL if not checked.
- Task 3: Ruling: payment.reference stored "" at create; filled by the DOKU step (Task 7) — charge must open after commit — cost: none.
- Task 3: Ruling: createBooking also rejects guests < 1 and dedupes units — prototype did not; harmless tightening — cost: none.
- Task 4: Ruling: one TransitionResult shape {ok,booking,templates}|{ok:false,error:"state"|"not_found"|"invalid"} for every transition — plan said "Booking | {error:state}"; templates needed by Task 6 — cost: none.
- Task 4: Ruling: admin cancel of a paid/confirmed booking sets refundOwed (spec: "refund outside") — makes the owed refund visible — cost: none.
- Task 4: Ruling: markPaidByGateway on expired/cancelled returns {error:"state"}; Task 7 webhook turns that into refundOwed — cost: none.
- Task 5: Ruling: guest responses strip internalNote (guestView) and promos strip the admin note (publicPromo); public availability returns dates only, no booking codes — spec silent; leaking either would be a privacy bug — cost: none.
- Task 5: Ruling: GET /api/rooms returns {rooms, rates} in one call (useRooms + useRates) — one fetch for both hooks — cost: none.
- Task 5: Ruling: emails for guest cancel are not sent yet; Task 6 wires sendTemplates into the route handlers — cost: none if Task 6 does it.
- Task 5: Ruling: business refusals of POST /api/bookings (unavailable, promo, min_nights) answer 200 with {ok:false}; only malformed input is 400 — matches the CreateResult contract the client reads — cost: none.
- Task 6: Ruling: added optional `token` param to variablesFor() and bookingEmail() — the shared {link} had no token; admin preview passes none and is unchanged — cost: none.
- Task 6: Ruling: without SMTP_URL (local dev) mail uses nodemailer jsonTransport and logs status "sent" — keeps dev runnable; production must set SMTP_URL (docs/DEPLOY.md, Task 14) — cost: an unset SMTP_URL in production would look "sent" in the admin while nothing is delivered.
- Task 6: Ruling: sender = settings.contact.senderEmail when set, else MAIL_FROM — owner edits it in Pengaturan — cost: none.
- Task 6: Ruling: awaiting_payment for new website bookings is sent in Task 7 after the DOKU charge exists (the email shows the VA number) — cost: none if Task 7 does it.
- Task 7: Ruling: proxy.ts matcher now excludes api|authorization|uploads — found while routing DOKU: every /api route would have been redirected to /id/api in a real server (tests call handlers directly so missed it) — cost: none.
- Task 7: Ruling: Task 7 split into 7a (SNAP signing, token, VA, webhook, change method, check status), 7b QRIS, 7c e-wallet DANA/ShopeePay/OVO, 7d card (Non-SNAP Payment Page); GoPay switched off (not in DOKU SNAP Direct API) — approved by user 17 Nov 2026 — cost: GoPay unavailable until DOKU confirms a route.
- Task 7: Ruling: signing follows DOKU's official Node library (github PTNUSASATUINTIARTHA-DOKU/doku-nodejs-library 1.0.52): token SHA256withRSA(clientId|ts), transactions HMAC-SHA512 base64 over JSON.stringify body, ts Jakarta +07:00; notifications = DOKU fetches a JWT from us (/authorization/v1/access-token/b2b, verified with DOKU public key), then posts with Bearer; we verify the JWT and do NOT check the notification X-SIGNATURE yet (DOKU docs ambiguous on which token it signs with) — cost: must confirm in sandbox; JWT already proves the caller holds DOKU's private key.
- Task 7: Ruling: new CreateError "payment" (gateway could not open a charge / method not built yet); booking route cancels the booking by "system" so nights are freed — client must show a message for it (Task 12) — cost: UI shows a generic error until then.
- Task 7: Ruling: VA = merchant-generated number: DOKU_VA_<BANK> company code padded to 8 + 10 random digits; trx type C; trxId = code-<8 hex> per charge — DGPC vs MGPC must be confirmed in sandbox — cost: create-va may need customerNo/virtualAccountNo omitted under DGPC.
- Task 7: Ruling: VA status "paid" when paymentFlagStatus === "00" (SNAP convention) — unverified in sandbox — cost: "Saya sudah bayar" waits for the webhook if wrong.
- Task 7: Ruling: transition() runs expireLapsed inside its transaction, which rolls back on a refused change; the webhook now expires lapsed holds in its own transaction first — other callers only lose a no-op (next read expires again) — cost: none.
- Task 7: Ruling: admin-created bookings get no gateway charge (admin records payment by hand) — spec silent — cost: admin cannot send a VA for a manual booking.
- Task 7a: Ruling: VA switched to DGPC (DOKU makes the number; we send partnerServiceId only and read virtualAccountNo from the answer) — sandbox dashboard shows DGPC, FIX_BILL, Doku General BIN, Partner Service ID 84923, customer prefix 8492 — replaces the earlier MGPC guess — cost: none.
- Task 7a: Ruling: DGPC in the real sandbox still requires customerNo (10 digits, starting with the dashboard "Prefix Customer No") and virtualAccountNo = psid + customerNo, else 4032715; DOKU then returns its OWN number, which we store and use for delete/status — verified 17 Nov 2026: create + delete of BNI VA OK — new env DOKU_VA_<BANK>_CUSTOMER_PREFIX — cost: none.
- Task 7a: Ruling: scripts used top-level await, which tsx (CJS) rejects; create-admin.ts and doku-sandbox-check.ts now wrap in main() — create-admin had never been run — cost: none.
- Task 7b: Ruling: new column Payment.gatewayRef (migration payment_gateway_ref) for DOKU's QRIS referenceNo, needed by query and expire; gatewayId stays our partnerReferenceNo — cost: none.
- Task 7b: Ruling: QRIS notification shape taken from the SNAP standard (service 52: originalPartnerReferenceNo, latestTransactionStatus "00" = paid, answer 2005200) — DOKU docs give no sample (site unreachable at the time; other SNAP providers agree) — cost: must confirm with a real sandbox notification.
- Task 7b: Ruling: QRIS postal code is an env value DOKU_QRIS_POSTAL_CODE with no default — not guessing the property's postal code — cost: none.
- Task 7b: Ruling: QrisCode replaces DemoQR only when DEMO is false; the prototype keeps its labelled CONTOH placeholder (HANDOFF rule: demo data always labelled) — cost: none.
- Task 7c: Ruling: OVO not offered — DOKU SNAP OVO requires account binding (phone, OTP, PIN) before paying, and the booking flow has no screen for it; OVO refused up front like GoPay — needs user/Reza approval to hide OVO in the payment list — cost: one fewer e-wallet.
- Task 7c: Ruling: e-wallet body uses `urlParam` (DOKU SDK, DANA docs) not `urlParams` (ShopeePay docs) — sandbox accepted it for both on 17 Nov 2026 — cost: none.
- Task 7c: Ruling: direct-debit calls send no CHANNEL-ID and send X-IP-ADDRESS (guest IP), per DANA docs and DOKU SDK; dokuRequest gained {channelId, ip} options — cost: none.
- Task 7c: Ruling: the wallet return URL is the order page WITHOUT the access token (not handing our token to DOKU/wallets); the guest's browser keeps the token (Task 12) — cost: a guest returning in another browser lands on "Cek pesanan".
- Task 7c: Ruling: e-wallet payment link validUpTo = min(hold end, now + 24h) (DOKU max) — cost: none.
- Task 7c: Ruling: debit status request serviceCode "54" (the original payment service) — unverified — cost: "Saya sudah bayar" waits for the webhook if wrong.
- Task 7c: Ruling: rewrote the guest-api rate limit test to prefill the counter (it crossed a minute boundary once bookings got slower with DOKU calls) — the limiter itself is pinned by its unit test — cost: none.
- Task 7c: Ruling: OVO and GoPay switched off in the seeded settings (and in the dev DB) — user decision 17 Nov 2026; questions for DOKU/owner/Reza in docs/open-questions.md — cost: none.
- Task 7d: Ruling: cards via DOKU Non-SNAP Credit Card Payment Page (POST /credit-card/v1/payment-page, HMAC-SHA256 component signature, same Client ID/Secret), SALE, one line item = the stay, auto_redirect back to the order page; status GET /orders/v1/status/{invoice} SUCCESS = paid — sandbox answer has the URL at the top level (credit_card_payment_page.url), not under "response" as first assumed — cost: none.
- Task 7d: Ruling: card notifications verified by recomputing the Non-SNAP signature with Request-Target = the path DOKU posted to; routed by the `Signature: HMACSHA256=` header on the same /api/webhooks/doku — unverified against a real card notification — cost: if DOKU signs another target, every card notification 401s (visible in logs; check-payment still works).
- Task 8: Ruling: session = random token in httpOnly cookie sv_admin (SameSite=Lax, 14 days, Secure in production), SHA-256 in Session table; argon2 verify against a dummy hash for unknown emails (no timing hint) — cost: none.
- Task 8: Ruling: adminLogin/adminLogout/useAdminSession switched to the real endpoints now (plan had all client seams in Task 12) — otherwise the server guard would lock the admin out until Task 12; admin data stays on the mock store until Task 12 — cost: none.
- Task 8: Ruling: proxy now matches /admin and only checks the cookie exists (no DB in the proxy); validity is checked in the (panel) layout and requireAdmin — cost: none.
- Task 8: Ruling: login page copy changed: removed "Prototipe: email dan kata sandi apa saja" note (now false), error split into empty vs wrong credentials — listed for Reza in docs/open-questions.md #15 — cost: copy may need Reza's wording.
- Task 9: Ruling: every admin route goes through withAdmin() (lib/server/admin-route.ts); a test loops over all 30 handlers without a session — mutation check: disabling the guard fails all 30 — cost: none.
- Task 9: Ruling: admin booking list returns all non-deleted bookings (effective status) + paidCount, no paging — a single property, and the list screen groups/filters client side (docs/BOOKING.md said paginate) — cost: response grows ~1 KB per booking; revisit past a few thousand.
- Task 9: Ruling: an unpaid manual (admin) booking opens no DOKU charge and sends no email (prototype sent awaiting_payment with a mock reference) — the admin follows up by hand and marks it paid — cost: none.
- Task 9: Ruling: public GET /api/settings keeps the email templates (the order page previews the emails the guest got) and drops only contact.senderEmail — cost: none.
- Task 9: Ruling: revalidateTag(tag, { expire: 0 }) — the owner sees a CMS save on the next load; "max" would serve the old page once — cost: one blocking render after a save.
- Task 9: Ruling: media alt text saved at PUT /api/admin/media {src, meta} instead of /media/:id — src is itself a path — client seam adapts in Task 12 — cost: none.
- Task 9: Ruling: mark-paid and admin cancel close the open DOKU charge so the guest cannot pay twice — cost: none.
- Task 10: Ruling: client putUpload/isUpload/StorePhoto switched to the server now (as with auth in Task 8) — the IndexedDB store had to go with the upload contract; srcs are /uploads/<year>/<id>.jpg — cost: none.
- Task 10: Ruling: uploads drawn as plain <img> (already 1800px JPEG), not next/image — avoids configuring the image optimizer for an app-served path; same classes as the prototype's uploaded photos — cost: no AVIF/WebP for uploaded photos.
- Task 10: Ruling: sharp .rotate() honours EXIF orientation and drops EXIF (incl. GPS) — spec silent; privacy — cost: none.
- Task 10: Ruling: limit 20 MB (the prototype's), not the plan's 15 MB — keeps the UI's error text right — cost: none.
- Task 11: Ruling: runExpire emails EVERY expired booking without an `expired` notification (not only the ones it expired itself) — a booking transaction can expire a hold first, and that guest must still be told — cost: an expired booking whose email failed is not retried (a failed Notification row counts).
- Task 11: Ruling: cron routes accept GET (Vercel Cron) and POST (curl); a CRON_SECRET shorter than 16 characters (or unset) refuses every call — cost: none.
- Task 11: Ruling: reminder "tomorrow" = jakartaToday(now) + 1 — cost: none.
- Task 12: Ruling: hooks pick the admin or public API from the path (/admin...), instead of an SWR provider in the admin shell — no component or layout had to change — cost: a hook used outside /admin never sees admin data (by design).
- Task 12: Ruling: guest tokens kept in localStorage per booking (sv-booking-token:<code>), read from ?t= first — survives the trip to DOKU/wallet pages and new tabs; sessionStorage would not — cost: a shared computer keeps the token until cleared (the token opens one booking's order page only).
- Task 12: Ruling: after every write, refreshAll() revalidates every SWR key — a small app; never stale — cost: a few extra GETs per save.
- Task 12: Ruling: before the settings arrive, FALLBACK_SETTINGS (OVO/GoPay off, empty policy) is shown — cost: the payment list can redraw once on load.
- Task 12: Ruling: removed the prototype-only UI with the store: order page "simulate payment / simulate admin" panels, admin "Mode demo" banner and "Reset data contoh"; DEMO=false; store.ts deleted; seed.ts reduced to the first-import data (seedRooms, seedContent, seedSettings, DEMO_RATES) — cost: none.
- Task 12: Ruling: a block refusal without a clash date (e.g. room archived meanwhile) is reported on the first night asked for, since the calendar form only shows a clash message — cost: slightly misleading text in a rare case.
- Task 12: Ruling: storage.ts fs calls carry /*turbopackIgnore: true*/ — the build traced the whole project (public/ included) into the server output because UPLOAD_DIR is a run-time path — cost: none.
- Task 12: Ruling: hooks never call Date.now() in render (react-hooks/purity); until useNow ticks, the server's status stands — cost: none.
- Task 13: Ruling: unstable_cache with tags (rooms, content, settings), not "use cache" — the Next 16 replacement needs cacheComponents: true, which changes how the whole app renders — cost: unstable_cache is marked replaced; migrate when the designer's pages are moved to Cache Components.
- Task 13: Ruling: public pages are statically generated FROM THE DATABASE, so `npm run build` needs the database reachable (docs/DEPLOY.md must say so) — cost: a build without DB access fails.
- Task 13: Ruling: rooms listed publicly = not archived AND at least one photo (not filtered by bookable: prices are still pending and every room starts off sale) — cost: a room shown with photos but not yet bookable online (as on the prototype).
- Task 13: Ruling: new CMS items get fallbacks: facility icon Shapes, event WhatsApp message "Halo Suka Village, saya ingin bertanya tentang {name}." (EN likewise), room SEO title "{name} · Suka Village" + its description, room share image = the Rooms one — cost: Reza may want other wording (open question).
- Task 13: Ruling: Experience and Event now honour "Segera hadir" (HANDOFF says the CMS sets it for both; the pages ignored it) — cost: none.
- Task 13: Ruling: Contact WhatsApp number from Settings (IA: "nomor WhatsApp di C6"); the header/footer/other wa.me links still use the number in content/site.ts — cost: changing the number in Pengaturan changes the Contact page only (open question).
- Task 13: Ruling: RoomSpecs/KeySpecs and lib/seo roomMeta/roomSchema take structural room types so a CMS room fits — cost: none.
- Task 14: Ruling: channel seam is setChannel/notifyChannel (an adapter object, none at launch) rather than pushBooking/pullBlocks no-ops — testable, and BookandLink's direction is still unknown — events: booking holds true (created) / false (rejected, cancelled, expired via runExpire), block holds true/false — cost: archiveRoom's dropped blocks are not reported (no OTA impact: an archived room is off sale everywhere).
- Task 14: Ruling: docs in Indonesian (README/HANDOFF language); docs/BOOKING.md §10 ticked where code is done; HANDOFF status line updated so later sessions do not read "prototype" — cost: none.

## DOKU sandbox, 19 November 2026 (branch fix/doku-va-status)

- Ruling: VA status reads DOKU's real answer — the sandbox omits paymentFlagStatus and answers paymentFlagReason "Success" with paidAmount; both count as paid — verified: "Saya sudah bayar" settled BNI and BCA — cost: none.
- Ruling: VA customerNo length = 15 − Merchant BIN length — sandbox refuses BIN + customerNo over 15 digits (4032715); BNI (5-digit BIN) passed with 10, BRI/BCA/Mandiri (6-digit BIN) only with 9 — verified by create-va for all four — cost: none.
- Ruling: SNAP notifications are not sent by DOKU for this account — VA BNI and BCA paid in the simulator, HTTP Notification history empty, no request reached the server; Non-SNAP (Checkout, card) notifications to the same URL arrive; a self-issued Bearer token through the tunnel is accepted (2002500), so our side works — ticket open with DOKU support — cost: SNAP payments settle only via "Saya sudah bayar" until DOKU fixes it.
- Ruling: VA through DOKU Checkout (Non-SNAP), DOKU_VA_CHECKOUT=1, switched on — user decision 19 Nov 2026. The guest still picks the bank on our site; Checkout opens for that bank only (payment_method_types), as DOKU's pop-up over the order page (jokul-checkout-1.0.0.js), automatically once per charge, and from the "Bayar" button. Notification and status are the card's Non-SNAP ones; a charge keeps its route (Checkout reference = URL) — DOKU documents Non-SNAP VA only through Checkout — cost: the VA number shows on DOKU's page, not ours.
- Ruling: the pop-up script is the production one (jokul.doku.com) for sandbox too — the sandbox URL in DOKU's docs answers with a web page; the script only frames the given URL and listens to staging/sandbox origins — cost: none.
- Ruling: QrisCode draws nothing when the QR string is empty — a failed QRIS charge took the whole order page down — cost: none (QRIS creation itself still fails, see open-questions).

## User management, 19 November 2026 (feat/user-management)

- Ruling: migration SQL written by hand (no shadow database for migrate diff; migrate dev is interactive) — checked with migrate diff from the database to the schema: empty — cost: none.
- Ruling: admin names appear only in the admin booking detail, not the list or the guest view — guests must not see who handled their booking — cost: none.
- Ruling: the users client (useAdmins and the writes) lives in lib/booking/admins.ts, not the big api.ts/hooks.ts — cost: none.
- Ruling: browser check by curl only (login by username, /me, users list, page 200, wrong current password) — no browser tool in this session; layout at 390/1440 not seen — cost: a layout flaw in Pengguna would show on first use.

## Rencana MariaDB / Hostinger (2026-11-17-mysql-hostinger.md) dan review akhir

- Task 1: Ruling: dev and test databases moved to MariaDB 10.11 in Docker (port 3307, utf8mb4_unicode_ci); the Postgres container was replaced, its volume (pgdata) left in place, not deleted — cost: none.
- Task 1: Ruling: one fresh `init` migration for MariaDB (the Postgres migrations removed; no production data exists yet) — cost: none.
- Task 1: Ruling: @db.Text on Booking.notes/internalNote/rejectReason, Payment.reference, Notification.to, BookingEvent.event, Block.note, Promo.note; @db.VarChar(255) on WebhookEvent.id and RateHit.key (primary keys) — RED seen: a 2000-char payment URL failed on VARCHAR(191) — cost: none.
- Task 1: Ruling: committed with `promo quota race` still failing on MariaDB (the REPEATABLE READ overrun predicted in backend Task 3's ruling) — fixed in Task 2 of this plan — cost: the branch is red on one test between these two commits.
- Task 2: Ruling: runTx() in lib/server/tx.ts — READ COMMITTED explicitly + up to 3 retries on P2034 / deadlock / lock wait (MariaDB 1213/1205), with a small random backoff; maxWait 10 s, timeout 20 s — every interactive transaction uses it (bookings, blocks, jobs, notify, payment-method, promo check); array batches left as is (plain writes) — RED seen: promo quota race failed and concurrent create threw from night.createMany — cost: none.
- Task 3: Ruling: orEmpty() in lib/server/content.ts — during `next build` (NEXT_PHASE) a DB error makes the page call connection() so it renders on request instead of being prerendered empty; outside the build the error is thrown; room generateStaticParams uses roomSlugs() → [] when the build has no DB — cost: on a DB-less build those pages are dynamic (rendered per request, data still cached by tag) until the next build with DB access.
- Task 4: Ruling: the VA partnerServiceId is the dashboard's "Merchant BIN" (84923), not "Partner Service ID" (8492, refused 4032701); customerNo is any 10 digits (11 refused 4032715), the prefix is NOT required — the 17 Nov finding "must start with 8492" was wrong (the failing try then was 11 digits). DOKU_VA_<BANK>_CUSTOMER_PREFIX removed; .env set to DOKU_VA_BNI="84923" from the user's screenshot (Merchant BIN 84923 / Partner Service ID 8492 / Prefix 3) — cost: none.
- Task 4: Ruling: tests/doku-fake.ts now deletes DOKU_* values not its own — Prisma loads the developer's .env into process.env and a real prefix had leaked into tests (they passed when they should have failed) — cost: none.
- Final: Ruling: reviewer did not read the client seam, hooks, content pages, build fallback or tests — those were verified by the executor end to end (production server smoke, DB-less build, sandbox booking, 224 tests) — cost if wrong: a client-side bug the smoke did not click through (browser not available this session; user asked to click through).
- Final: Ruling: local Docker DB user gets ALL PRIVILEGES (Prisma's shadow database needs ALTER) — development container only; production users are per database — cost: none.

## Temuan review akhir yang belum dikerjakan (Minor)

- Payment.gatewayId has no index/unique (moot after I1's charge table for lookups).
- an amount-mismatch webhook writes a history event on every DOKU retry.
- payment-method route reads pending then updates outside a status-guarded transaction (narrow race with a paid webhook).
- handleTokenRequest does not check X-TIMESTAMP freshness (replay of a token request).
- ~~without SMTP_URL in production, mail is logged "sent"~~ fixed 20 Nov 2026: logged "unsent", shown in the booking detail as "tidak terkirim (SMTP belum diatur)".

## Hasil review akhir yang diperbaiki

- I1 (old charge paid after a method change was lost) — Charge history table; settle falls back to it, records the paid method and closes the newer charge — test "the payment is still matched to the booking" RED (404) → GREEN, suite 230/230.
- I2 (payment in the last seconds marked expired) — DOKU charge closes CHARGE_GRACE_MS (5 min) before the hold — test "DOKU's charge ends 5 minutes before the hold" RED → GREEN, suite 230/230.
- I3 (rate limits bypassable via X-Forwarded-For) — clientIp takes the last (proxy-appended) hop; docs/DEPLOY.md note — test "takes the address the host's proxy appended" RED (6.6.6.6) → GREEN, suite 230/230.
- I4 (late payment refund was silent) — every admin emailed once (refundOwed guards it), history line added — test "every admin is emailed, once" RED → GREEN, suite 230/230.
