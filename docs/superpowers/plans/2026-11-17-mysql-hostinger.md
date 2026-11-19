# Pindah ke MySQL/MariaDB untuk Hostinger Web App: Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the user chose Native execution for the backend plan). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend yang sama berjalan di MariaDB (database bawaan Hostinger Web
dan Cloud), dengan semua jaminan yang sudah teruji di Postgres tetap berlaku.

**Architecture:** Tidak ada perubahan arsitektur. Hanya provider Prisma,
tipe kolom, isolasi transaksi, test infrastructure, dan panduan deploy.

**Tech Stack:** Prisma `mysql` provider, MariaDB 10.11 (lokal via Docker, sama
dengan yang dilaporkan untuk Hostinger), Next.js 16 (Hostinger Node.js Web App).

**Spec:** `docs/superpowers/specs/2026-11-17-backend-design.md` (§3 batasan
portabilitas, §6 penjaga double booking) dan `docs/DEPLOY.md` §8. Keputusan user
17 Nov 2026: deploy di Hostinger Web App, database MySQL/MariaDB.

## Global Constraints

- Versi lokal: **MariaDB 10.11** (`mariadb:10.11`), port host **3307**.
  Bila `SELECT VERSION();` di hPanel menunjukkan versi lain, samakan image-nya.
- Database dibuat dengan `utf8mb4` / `utf8mb4_unicode_ci` (nama tamu bisa
  memuat huruf non-Latin dan emoji).
- Semua kolom yang bisa lebih dari 191 karakter memakai `@db.Text`.
- Transaksi yang menghitung atau menjaga sesuatu (booking, promo, transisi)
  memakai `isolationLevel: ReadCommitted`, eksplisit, di Postgres maupun MariaDB.
- Tidak ada perubahan tampilan.
- Seluruh test (217) harus lulus di MariaDB, **termasuk `concurrent create` dan
  `promo quota race`, dijalankan 5 kali berturut-turut**.

## Review Focus

1. **Teks panjang:** URL e-wallet DOKU (~900 karakter, terlihat di sandbox),
   string QRIS, URL halaman kartu, alasan tolak, catatan internal 5000
   karakter. Semua tersimpan utuh. (Task 1, `long values survive`)
2. **Kuota promo berkuota 1 dipakai dua booking bersamaan** di MariaDB: hanya
   satu yang dapat. (Task 2, test yang sudah ada)
3. **Deadlock saat banyak booking bersamaan:** tidak ada booking yang gagal
   dengan error 500; yang kalah dijawab `unavailable`. (Task 2,
   `concurrent create under deadlock retry`)
4. **Kode booking dan kode promo tidak peka huruf besar-kecil** (collation
   MariaDB `_ci`): pencarian tetap benar dan unik tetap terjaga. (Task 1)
5. **Build Hostinger tanpa akses database:** halaman publik tetap bisa
   dibangun dan terisi saat diminta pertama kali. (Task 3)

---

### Task 1: Skema dan infrastruktur MariaDB

**Files:**
- Modify: `prisma/schema.prisma` (provider, `@db.Text`), `docker-compose.yml`
  (mariadb:10.11, port 3307, init `suka_test`), `docker/init-test-db.sql`,
  `.env.example`, `vitest.config.ts` (URL test), `tests/setup.ts` (`resetDb`
  untuk MariaDB)
- Delete: `prisma/migrations/` (migrasi Postgres), lalu buat `init` baru
- Test: `tests/server/mariadb.test.ts`

Kolom yang menjadi `@db.Text`: `Booking.notes`, `Booking.internalNote`,
`Booking.rejectReason`, `Payment.reference`, `BookingEvent.event`,
`Block.note`, `Promo.note`, `Notification.to`, `WebhookEvent.id`,
`RateHit.key` (yang terakhir dua: `@db.VarChar(255)` karena primary key).

- [ ] Step 1: test `long values survive` (reference 2000 karakter, catatan
  5000 karakter, alasan tolak 1000 karakter tersimpan dan terbaca utuh) dan
  `codes are found in any case` (booking `SV-ABC123` ditemukan lewat
  `sv-abc123`; promo `HEMAT` dan `hemat` tidak bisa dua-duanya dibuat).
- [ ] Step 2: jalankan di Postgres dulu (harus lulus), lalu pindah provider
  dan lihat test lama + baru di MariaDB. Expected sebelum `@db.Text`: FAIL
  di `long values survive`.
- [ ] Step 3: `@db.Text`, migrasi `init` baru, `resetDb` versi MariaDB
  (`SET FOREIGN_KEY_CHECKS=0` + `TRUNCATE` per tabel dari
  `information_schema`).
- [ ] Step 4: seluruh test di MariaDB. Expected: semua lulus kecuali yang
  ditangani Task 2 (dicatat).
- [ ] Step 5: commit `feat(db): MariaDB for Hostinger`.

### Task 2: Isolasi transaksi dan retry deadlock

**Files:**
- Create: `lib/server/tx.ts` (tambah `runTx(fn)`: `$transaction` dengan
  `ReadCommitted` dan maksimal 3 percobaan ulang untuk P2034)
- Modify: `lib/server/bookings.ts`, `lib/server/blocks.ts`,
  `lib/server/jobs.ts`, `lib/server/payments/notify.ts`, route yang memanggil
  `db.$transaction` langsung
- Test: `tests/server/create-booking.test.ts` (tambah
  `concurrent create under deadlock retry`: 10 booking bersamaan untuk kamar
  dan malam berbeda-beda yang beririsan; semua menjawab ok/unavailable, tidak
  ada yang melempar)

- [ ] Step 1: tulis test, jalankan di MariaDB. Expected: FAIL atau flaky
  (P2034 / quota race).
- [ ] Step 2: `runTx`, ganti semua `db.$transaction(async ...)`.
- [ ] Step 3: jalankan `create-booking` dan `transitions` 5 kali berturut-turut.
  Expected: semua lulus setiap kali.
- [ ] Step 4: seluruh test di MariaDB. Expected: 100% lulus.
- [ ] Step 5: commit `fix(db): read committed and deadlock retry`.

### Task 3: Build tanpa database (Hostinger)

**Files:**
- Modify: `lib/server/content.ts`, `app/[lang]/rooms/[unit]/page.tsx`,
  `app/sitemap.ts`
- Test: `tests/server/content.test.ts` (tambah `build without a database`)

Bila database tidak terjangkau saat build (`NEXT_PHASE ===
"phase-production-build"`), halaman berbasis database tidak diprerender:
`generateStaticParams` kamar mengembalikan `[]` dan halaman `[lang]` dirender
saat permintaan pertama lalu di-cache (ISR, tag yang sama). Di luar fase
build, error database tetap dilempar (tidak disembunyikan).

- [ ] Step 1: test: loader dengan DB mati di fase build → `[]` / null,
  bukan throw; di luar fase build → throw.
- [ ] Step 2: implementasi, `npm run build` dengan Docker database dimatikan.
  Expected: build sukses; lalu `npm start` dengan database hidup, halaman
  `/id/rooms` dan `/id/rooms/main-villa` 200 dan berisi data.
- [ ] Step 3: commit `fix(build): build without database access`.

### Task 4: Panduan deploy Hostinger + MariaDB, verifikasi akhir

**Files:**
- Modify: `docs/DEPLOY.md` (database di hPanel: buat DB + user, charset
  utf8mb4, `DATABASE_URL=mysql://...@localhost:3306/...`, langkah build
  Hostinger, cara menjalankan `prisma migrate deploy` dan seed di server,
  backup lewat phpMyAdmin/`mysqldump`), `README.md`, `.env.example`,
  `docs/superpowers/specs/2026-11-17-backend-design.md` (catatan keputusan)
- Hapus bagian "Ke MySQL" di docs/DEPLOY.md §8 (sekarang default), pertahankan
  "Ke Vercel".

- [ ] Step 1: seluruh test di MariaDB 2 kali; `tsc`, `eslint`, `npm run build`,
  `npm start` + uji asap (halaman publik, admin login, satu booking VA BNI ke
  sandbox DOKU dari server lokal, upload foto).
- [ ] Step 2: commit `docs: deploy on Hostinger Web App with MariaDB`.

### Setelah rencana ini

**Review menyeluruh atas seluruh branch** (rencana backend + rencana ini),
yang tertunda dari rencana backend.
