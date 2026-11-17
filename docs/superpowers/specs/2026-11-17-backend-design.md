# Desain Backend Suka Village

> **Pembaruan 17 Nov 2026:** keputusan akhir hosting adalah **Hostinger Web
> App dengan MySQL (MariaDB 10.11)**. Postgres dipakai selama pengembangan,
> lalu dipindah (rencana `plans/2026-11-17-mysql-hostinger.md`): kolom teks
> panjang `@db.Text`, transaksi READ COMMITTED + retry deadlock
> (`lib/server/tx.ts`), dan build yang tetap jalan tanpa akses database.

Tanggal: 17 November 2026 · Status: draf, menunggu persetujuan

## 1. Tujuan dan alasan

Frontend (situs publik, alur booking, CMS admin) sudah final, tapi semua data
masih di `localStorage` lewat mock store. Backend menggantikan mock itu dengan
sistem sungguhan supaya tamu bisa memesan dan membayar, dan tim Suka Village
bisa mengurus booking dan konten.

Kontrak yang mengikat: `lib/booking/types.ts` (model data), BOOKING.md
(endpoint, status, aturan server), dan IA Suka Village v1.0.pdf (struktur).

## 2. Goals, non-goals, anti-goals

**Goals**
- Semua endpoint di BOOKING.md §2 berjalan. `api.ts` dan `hooks.ts` memanggil
  endpoint itu, dengan nama fungsi dan bentuk data yang tetap sama.
- Pembayaran sungguhan lewat **DOKU**: QRIS, VA (BCA, BNI, BRI, Mandiri),
  e-wallet, dan kartu (hosted checkout).
- 7 email otomatis terkirim dalam bahasa booking, dan tiap pengiriman dicatat.
- Login admin sungguhan untuk **2 akun**, tanpa sistem peran.
- Konten CMS dan kamar dibaca halaman publik dari database, tanpa deploy ulang.
- Bisa di-deploy ke Vercel, VPS, atau **Hostinger Business/Cloud (Node.js Web
  App)** tanpa menulis ulang.

**Non-goals (untuk sekarang)**
- Sinkronisasi dengan booking engine **BookandLink** (yang sudah terhubung ke
  OTA). Ini direncanakan sebagai **tahap berikutnya**, dan caranya masih
  ditanyakan ke pihak Suka Village. Saat launch, tanggal yang terjual di
  platform lain ditutup manual di Kalender (BOOKING.md §8). Lihat §14.
- WhatsApp otomatis (dibatalkan owner).
- Refund otomatis. Refund dilakukan manual di dashboard DOKU.
- Peran admin (owner atau staf).

**Anti-goals (gagal walau "jalan")**
- Double booking pada malam yang sama.
- Harga atau diskon dihitung dari angka yang dikirim browser.
- Pembayaran tercatat dua kali karena webhook datang berulang.
- Halaman pesanan bisa dibuka orang yang hanya menebak kode.
- Terkunci ke satu vendor sehingga pindah ke MySQL atau Hostinger butuh
  penulisan ulang.

## 3. Batasan

- Next.js 16.3, React 19, TypeScript. Baca `node_modules/next/dist/docs/`
  sebelum memakai API Next yang belum dikenal (AGENTS.md).
- Tanggal menginap berupa `yyyy-mm-dd` dalam zona Asia/Jakarta. Uang dalam
  rupiah bilangan bulat.
- Hosting final belum pasti. Kandidat termurahnya Hostinger, yang di shared
  hosting **hanya menyediakan MySQL**.
- Domain: `sukavillage.com`, sudah dibeli di Hostinger.
- UI tidak boleh berubah tampilannya (HANDOFF.md, aturan desain).

## 4. Pendekatan yang dipertimbangkan

| | Pendekatan | Trade-off |
|---|---|---|
| **A (dipilih)** | **Prisma + Postgres biasa**. Auth, upload, dan cron dibangun di dalam aplikasi | Pindah ke MySQL cukup mengganti `provider`. Tidak memakai fitur khas Postgres |
| B | Drizzle + Postgres | Lebih ringan, tapi file skema harus ditulis ulang kalau pindah ke MySQL |
| C | Supabase penuh (DB, Auth, Storage, cron) | Paling cepat jalan, tapi terkunci dan bertentangan dengan opsi Hostinger |

Repo: **satu repo** (proyek `villa-landing` yang ada). Alasannya, `pricing.ts`,
`promo.ts`, `occupancy.ts`, `format.ts`, `notifications.ts`, dan `email.ts`
sudah murni TypeScript dan bisa langsung dipakai di server. Repo terpisah hanya
menambah duplikasi.

## 5. Arsitektur

```
Browser (komponen yang ada, tidak berubah)
   │  api.ts (tulis) / hooks.ts (baca)  ← diganti: fetch + SWR
   ▼
app/api/**  Route Handlers  ── lib/server/**  (logika domain)
   │                              ├─ db.ts        Prisma client
   │                              ├─ bookings.ts  create, transisi status
   │                              ├─ availability.ts
   │                              ├─ payments/doku.ts
   │                              ├─ mail.ts      kirim + catat
   │                              ├─ storage.ts   adapter upload
   │                              └─ auth.ts
   ▼
Postgres (dev: Docker; staging: Neon/Supabase sebagai DB saja)
```

- Aturan bisnis yang sudah ada (`pricing.ts`, `promo.ts`, `occupancy.ts`)
  dipakai ulang di server sebagai **sumber kebenaran**. Browser tetap memakainya
  hanya untuk pratinjau.
- `api.ts` dan `hooks.ts` tetap `"use client"`, dengan nama fungsi dan bentuk
  hasil yang sama.
- Validasi input di server memakai **zod**.

## 6. Data

Tabel (Prisma), mengikuti saran BOOKING.md §1:

`bookings`, `booking_units`, `booking_nights`, `payments`, `notifications`,
`booking_events`, `blocks`, `rooms`, `rates`, `seasons`, `promos`, `settings`
(satu baris JSON), `content_items`, `media`, `admins`, `sessions`,
`webhook_events`.

Aturan portabilitas, supaya tetap jalan di MySQL:
- Tidak memakai partial index, tipe array, `RETURNING` di SQL mentah, atau
  `jsonb`-only operator. Kolom JSON (`quote`, teks bilingual, `templates`)
  memakai tipe `Json` Prisma.
- `date` untuk tanggal menginap dan `DateTime` (UTC) untuk waktu kejadian.

**Penjaga double booking:**
- `booking_nights(unit, date, booking_id)` dengan **UNIQUE (unit, date)**.
- Baris dibuat dalam transaksi yang sama dengan booking. Saat booking
  dilepas (cancelled, expired, rejected), barisnya **dihapus**.
- Blok tanggal (`blocks`) juga menulis ke `booking_nights`, dengan `block_id`
  sebagai pengganti `booking_id`. Jadi satu index menjaga keduanya.
- Insert yang bentrok memicu error unik dan dijawab dengan `unavailable`
  beserta daftar unit yang bentrok.

**Kuota promo:** dihitung dari booking yang masih memegang malam (`HOLDING`),
di dalam transaksi yang sama. Promo dikunci dengan `SELECT ... FOR UPDATE`
(lewat `$transaction` interaktif Prisma), supaya kuota 1 tidak terpakai dua
kali.

**Seed awal:** `seedRooms()` dan `seedContent()` dari `seed.ts` diimpor sekali
lewat `prisma db seed`. Data booking contoh tidak ikut.

## 7. Endpoint

Semua endpoint di BOOKING.md §2 dibuat apa adanya. Tambahan yang khusus untuk
DOKU dan cron:

| Endpoint | Fungsi |
|---|---|
| `POST /api/webhooks/doku` | HTTP Notification DOKU. Verifikasi signature (header `Signature`, HMAC-SHA256 dengan Secret Key). Idempoten lewat `webhook_events` (unik per request id). Paid menjadi `paid`, lalu email `payment_received`. Expired atau failed menjadi `expired`, lalu email `expired` |
| `POST /api/cron/expire` | Tiap 1 menit. Mengakhiri hold yang lewat waktu, menghapus `booking_nights`-nya, dan mengirim email `expired`. Dilindungi `CRON_SECRET` |
| `POST /api/cron/reminder` | Harian pukul 09.00 WIB. Email `reminder` untuk booking `confirmed` dengan check-in besok |

Cron dipanggil oleh penjadwal hosting: Vercel Cron, cron job di hPanel
Hostinger, atau crontab di VPS. Karena status juga dicek ulang di setiap
pembacaan (`effectiveStatus`), cron yang terlambat beberapa menit tidak
membuat malam terkunci di mata tamu.

**Rate limit** pada `promos/check`, `bookings` (POST), dan `bookings/lookup`
memakai tabel sederhana di DB (per IP per menit), supaya tidak butuh Redis.

## 8. Pembayaran (DOKU)

- **Keputusan: DOKU Direct API**, supaya tampilan checkout dan halaman pesanan
  (`OrderView.tsx`) yang sudah didesain tetap sama. Tamu tidak dialihkan ke
  halaman DOKU untuk VA, QRIS, dan e-wallet.
  - **VA (BCA, BNI, BRI, Mandiri):** buat VA per booking.
    `payment.reference` berisi nomor VA, yang ditampilkan di halaman pesanan.
  - **QRIS:** buat QR dinamis. `payment.reference` berisi string QR, yang
    di-render sebagai QR asli dan menggantikan `DemoQR.tsx`.
  - **E-wallet (GoPay, OVO, DANA, ShopeePay):** charge lewat Direct API.
    `payment.reference` berisi deeplink atau URL redirect dari DOKU, sesuai
    yang dikembalikan tiap e-wallet.
  - **Kartu:** data kartu **tidak boleh** dimasukkan di situs ini (PCI).
    `payment.reference` berisi URL halaman kartu yang di-host DOKU. Ini
    sudah sesuai desain ("Diproses di halaman pembayaran yang aman").
  - Satu adapter `payments/doku.ts` dengan fungsi per kelompok metode
    (`createVa`, `createQris`, `createEwallet`, `createCard`, `cancel`,
    `status`). Kalau suatu metode belum aktif di akun DOKU, metode itu
    dimatikan di Pengaturan.
- Masa berlaku charge sama dengan `expiresAt` (`settings.holdMinutes`).
- Ganti metode: charge lama dibatalkan, charge baru dibuat dengan `expiresAt`
  yang sama.
- `check-payment`: menanyakan status ke DOKU, tapi webhook tetap sumber
  kebenaran.
- Kunci API dari env: `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`, `DOKU_ENV`
  (sandbox/production).
- Logo metode bayar diganti dengan kit resmi DOKU (REPLACE.md #26).

## 9. Email

- Rendering memakai `bookingEmail()` dari `email.ts`, apa adanya.
- Provider: **SMTP** lewat nodemailer, dengan adapter yang bisa diganti.
  - Default: Resend (SMTP atau API).
  - Bisa juga memakai email hosting Hostinger.
- Pengirim: `reservasi@sukavillage.com`. SPF dan DKIM diatur di DNS Hostinger.
- Setiap pengiriman ditulis ke `notifications` dengan status `sent` atau
  `failed`. Email dikirim **setelah** transaksi commit, supaya kegagalan email
  tidak membatalkan booking.

## 10. Akses

**Admin**
- Tabel `admins` (2 akun, dibuat lewat seed atau script CLI), password dengan
  hash **argon2**.
- Session cookie httpOnly yang disimpan di tabel `sessions`.
- Library: Auth.js Credentials, atau session manual yang sederhana. Saya pilih
  session manual, karena hanya 2 akun dan tidak ada OAuth.
- Semua `/api/admin/*` diperiksa di server. Halaman `/admin/*` dijaga di
  `proxy.ts` dan layout admin.
- Setiap tulisan admin dicatat ke `booking_events` beserta id admin.

**Tamu**
- Link di email membawa token acak (32 byte) yang disimpan sebagai hash di
  booking: `/[lang]/booking/SV-XXXXXX?t=…`.
- Tanpa token, tamu diarahkan ke `/booking/check` (kode + email).

## 11. CMS ke situs publik

- Halaman publik membaca kamar dan konten dari DB lewat server component
  dengan tag cache, dan tetap statis.
- `saveRoom` dan `saveContent` memanggil `revalidateTag`, sehingga perubahan
  tampil tanpa deploy.
- **Upload foto: disk lokal dulu** (keputusan). File disimpan di folder
  `UPLOAD_DIR` (env, di luar folder build supaya tidak hilang saat deploy
  ulang), lalu disajikan lewat route `/uploads/[...path]`.
  - Resize ke 1800px di server memakai `sharp`.
  - `StorePhoto` diganti menjadi `next/image`.
  - Folder upload **wajib ikut backup**, bersama database.
  - Semua akses lewat adapter `storage.ts` (`put`, `delete`, `url`). Kalau
    nanti deploy ke Vercel (disknya tidak permanen), cukup tambah
    implementasi S3-compatible (R2) di adapter yang sama.

## 12. Yang diserahkan ke builder

- Detail request, signature, dan format notifikasi DOKU Direct API per metode.
  Verifikasi di dokumentasi resmi dan sandbox DOKU, karena desain ini belum
  mengeceknya.
- Mengganti `hooks.ts` ke SWR. Hook saat ini mengembalikan data **sinkron**.
  Pastikan setiap hook punya nilai awal aman (`[]`, `undefined` untuk
  `useBooking` yang sudah menangani "loading") supaya komponen tidak berubah.
  Hook yang dipakai di banyak tempat (`useRooms`, `useRates`, `useSettings`)
  bisa diisi awal dari server lewat `SWRConfig fallback`.
- Polling halaman pesanan setiap sekitar 5 detik selama `pending`.
- Struktur folder detail di `lib/server/`.

## 13. Pertanyaan terbuka (ke owner atau desainer)

1. Paket Hostinger yang dipakai sekarang. Ini menentukan target deploy dan
   apakah harus pindah ke MySQL.
2. Refund untuk booking yang ditolak: manual saja (asumsi desain ini)?
3. BookandLink: API apa yang tersedia (webhook, API untuk dicek berkala, atau
   iCal), dan apakah harga juga ikut disinkronkan. Lihat §14.

## 14. Tahap berikutnya: BookandLink

Suka Village memakai BookandLink sebagai booking engine yang terhubung ke OTA.
Website nanti tersambung ke sana supaya ketersediaan otomatis. Belum
dikerjakan sekarang, tapi desain ini menyiapkan tempatnya:

- **BookandLink → website.** Malam yang terjual di OTA ditulis ke
  `booking_nights` sebagai blok bersumber `bookandlink`, dengan id eksternal
  untuk update atau hapus. Penjaga double booking tetap satu index.
- **Website → BookandLink.** Booking website dikirim ke engine lewat satu
  titik, `lib/server/channel.ts` (saat launch berupa no-op), yang dipanggil
  setelah transisi status. Kapan dikirim (saat `pending` atau setelah `paid`)
  diputuskan saat API-nya jelas.
- Sinkronisasi yang gagal dicatat dan dicoba ulang lewat cron, supaya tidak
  memblok booking tamu.
