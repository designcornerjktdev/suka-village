# Deploy ke produksi

Panduan memasang website + backend Suka Village di hosting. Target:
**Hostinger Business atau Cloud, sebagai Node.js Web App, dengan database
MySQL dari hPanel** (Hostinger menjalankan MariaDB; keputusan 17 Nov 2026).
VPS biasa juga bisa dengan langkah yang sama. Paket Single/Premium (tanpa
Node.js) tidak bisa.

Urutan go-live yang lengkap (termasuk data dari owner) ada di
[BOOKING.md §10](BOOKING.md). Pertanyaan yang masih terbuka ada di
[docs/open-questions.md](docs/open-questions.md).

## 1. Yang dibutuhkan

- Node.js **20.9 ke atas** (dikembangkan di Node 22 dan 24).
- **MariaDB 10.11** (database MySQL bawaan Hostinger; MySQL 8 juga bisa),
  dengan charset **utf8mb4**. Cek versinya di phpMyAdmin: `SELECT VERSION();`.
  Lokal, `docker compose up -d` menjalankan MariaDB 10.11 yang sama.
- **Disk yang permanen** untuk foto upload (`UPLOAD_DIR`). Hostinger dan VPS
  punya. Vercel tidak (butuh object storage, lihat §8).
- Domain `sukavillage.com` dengan **akses DNS** (untuk SPF/DKIM email).
- Akun DOKU produksi: Client ID, Secret Key, VA BIN per bank, QRIS merchant.

## 2. Variabel environment

Salin `.env.example` menjadi `.env` di server (atau isi di panel hosting).
Jangan pernah meng-commit `.env` atau folder `keys/`.

| Variabel | Isi |
|---|---|
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:3306/NAMA_DB` (dari hPanel → Databases; HOST biasanya `localhost` atau alamat yang tertulis di sana). Karakter khusus di password harus di-URL-encode, misalnya `@` jadi `%40` |
| `SESSION_SECRET` | String acak panjang (cadangan; session admin memakai token acak di database) |
| `CRON_SECRET` | String acak **minimal 16 karakter**. Kosong = semua cron ditolak |
| `DOKU_ENV` | `production` (atau `sandbox` untuk staging) |
| `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY` | Dashboard DOKU → Integration → API Keys |
| `DOKU_PRIVATE_KEY_PATH` | Path kunci privat RSA merchant, misalnya `./keys/doku-private.pem` |
| `DOKU_PUBLIC_KEY_PATH` | Path kunci publik **milik DOKU** (disalin dari dashboard) |
| `DOKU_VA_<BANK>` | Kolom **Merchant BIN** di tabel VA dashboard DOKU (misalnya `84923`), **bukan** kolom Partner Service ID atau Prefix Customer No: DOKU menolak keduanya (diuji di sandbox 18 Nov 2026). Bank yang tidak dipakai dibiarkan kosong |
| `DOKU_VA_CHECKOUT` | `1` (keputusan 19 Nov 2026): VA dibuka lewat DOKU Checkout (Non-SNAP). Tamu tetap memilih bank di situs; nomor VA tampil di pop-up DOKU. Alasannya: notifikasi VA SNAP tidak pernah dikirim DOKU di akun sandbox, sedangkan Non-SNAP terkirim. Kosong = SNAP (nomor VA di halaman pesanan) |
| `DOKU_QRIS_CHECKOUT` | `1`: QRIS lewat DOKU Checkout (Non-SNAP); kode QR tampil di pop-up DOKU, tanpa perlu merchant/terminal id QRIS. Kosong = QRIS SNAP, yang butuh tiga variabel di bawah |
| `DOKU_EWALLET_CHECKOUT` | `1`: DANA, ShopeePay, dan OVO lewat DOKU Checkout (pop-up). OVO hanya bisa lewat jalur ini (SNAP butuh account binding); nyalakan di Admin → Pengaturan bila ingin dipakai. GoPay tidak tersedia di Checkout |
| `DOKU_CARD_CHECKOUT` | `1`: kartu lewat DOKU Checkout (pop-up, notifikasi format Checkout). Kosong = Credit Card Payment Page di tab baru. Kalau 3DS/OTP bank gagal di dalam pop-up, kosongkan |
| `DOKU_QRIS_MERCHANT_ID`, `DOKU_QRIS_TERMINAL_ID`, `DOKU_QRIS_POSTAL_CODE` | Dari DOKU setelah QRIS disetujui, dan kode pos properti |
| `SMTP_URL` | Misalnya `smtps://resend:API_KEY@smtp.resend.com:465`, atau SMTP email Hostinger. **Wajib di produksi**: tanpa ini email hanya dicatat, tidak terkirim, padahal admin melihatnya "terkirim" |
| `MAIL_FROM` | `Suka Village <reservasi@sukavillage.com>` (dipakai bila alamat pengirim di Pengaturan kosong) |
| `UPLOAD_DIR` | Folder foto upload, **di luar folder aplikasi** (misalnya `/home/<user>/suka-uploads`), supaya tidak terhapus saat deploy ulang |
| `SITE_URL` | `https://sukavillage.com`. **Isi paling akhir** (SEO.md §1): selama kosong semua halaman `noindex` |

### Alamat pengunjung dan rate limit

Batas percobaan (login admin, cek promo, booking, cek pesanan) memakai
alamat **terakhir** di header `X-Forwarded-For`, yaitu yang ditambahkan proxy
hosting; alamat sebelumnya bisa ditulis sendiri oleh pengunjung. Setelah
deploy, cek sekali: dua permintaan dari jaringan berbeda harus terhitung
terpisah. Bila hosting memakai lebih dari satu proxy di depan aplikasi,
sesuaikan `clientIp` di `lib/server/http.ts`.

### Kunci RSA untuk DOKU (SNAP)

Kunci di `keys/` di laptop developer adalah kunci **sandbox**. Untuk produksi
buat pasangan baru di server:

```bash
mkdir -p keys
node -e "const {generateKeyPairSync}=require('crypto');const fs=require('fs');const k=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});fs.writeFileSync('keys/doku-private.pem',k.privateKey,{mode:0o600});fs.writeFileSync('keys/doku-public.pem',k.publicKey)"
```

Unggah `keys/doku-public.pem` ke dashboard DOKU produksi sebagai Merchant
Public Key, dan simpan DOKU Public Key dari dashboard ke
`keys/doku-server-public.pem`.

## 3. Pasang dan build

### Database di hPanel

1. hPanel → Databases → **Management** → buat database dan user baru
   (catat nama database, user, password, dan host).
2. phpMyAdmin → pilih database itu → Operations → Collation:
   **`utf8mb4_unicode_ci`** (nama tamu bisa memuat huruf non-Latin).
3. Susun `DATABASE_URL` dari nilai itu (§2).

### Build

Halaman publik dibuat statis dari isi database (kamar, konten) dan diperbarui
sendiri saat admin menyimpan. **Bila langkah build tidak bisa menjangkau
database**, build tetap berhasil: halaman itu dirender saat dibuka (log build
menulis `database not reachable during the build`). Build ulang setelah
database bisa dijangkau untuk kembali ke halaman statis.

```bash
npm ci                          # juga menjalankan prisma generate
npx prisma migrate deploy       # membuat / memperbarui tabel
npm run db:seed                 # SEKALI di database kosong: kamar, konten, pengaturan
npm run admin:create -- owner@sukavillage.com    # ulangi untuk akun kedua
npm run build
npm start                       # port dari env PORT, standar 3000
```

`db:seed` aman dijalankan ulang: hanya mengisi yang belum ada dan tidak pernah
menimpa editan owner. Setelah seed, **semua kamar belum bisa dipesan** sampai
owner mengisi harga dan menyalakannya di Admin → Kamar & harga.

### Hostinger Node.js Web App

Di hPanel → Websites → Node.js (Web App):

- Deploy dari GitHub (branch produksi) atau upload.
- Node.js versi 22 (atau 20/24).
- Build command: `npm ci && npx prisma migrate deploy && npm run build`
  (`migrate deploy` hanya menjalankan migrasi yang belum ada; aman diulang).
- Start command: `npm start`
- **Seed dan akun admin, sekali:** dari Terminal/SSH Hostinger di folder
  aplikasi: `npm run db:seed`, lalu `npm run admin:create -- <email>` untuk
  tiap admin. Tanpa SSH, jalankan keduanya dari laptop dengan `DATABASE_URL`
  menunjuk ke database Hostinger (aktifkan Remote MySQL untuk IP laptop di
  hPanel, lalu matikan lagi).
- Isi semua variabel di §2 pada bagian Environment Variables.
- Pastikan `UPLOAD_DIR` menunjuk ke folder di home, bukan di folder aplikasi.
- Batas memori dan proses per paket ada di halaman limits Hostinger; pantau
  setelah launch.

## 4. Cron (dua tugas terjadwal)

| Endpoint | Jadwal | Isi |
|---|---|---|
| `/api/cron/expire` | **setiap menit** | Mengakhiri hold yang lewat batas bayar, email `expired` |
| `/api/cron/reminder` | **setiap hari pukul 09.00 WIB** (02.00 UTC) | Email pengingat H-1 untuk booking terkonfirmasi |

Di hPanel → Advanced → Cron Jobs (atau crontab di VPS):

```
* * * * *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://sukavillage.com/api/cron/expire > /dev/null
0 2 * * *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://sukavillage.com/api/cron/reminder > /dev/null
```

Ganti `$CRON_SECRET` dengan nilainya bila panel tidak mendukung variabel.
Kalau cron terlambat, tidak ada malam yang terkunci: setiap transaksi booking
juga mengakhiri hold yang lewat waktu.

## 5. DOKU produksi

Di dashboard DOKU produksi:

1. Unggah Merchant Public Key (§2) dan salin DOKU Public Key.
2. **Notification URL** (VA, QRIS, e-wallet, kartu):
   `https://sukavillage.com/api/webhooks/doku`
   (sub-path yang ditambahkan DOKU juga diterima). URL ini diisi **per
   metode**: tombol Configure di tiap baris bank/metode punya kolom Payment
   Notification URL sendiri. Dengan `DOKU_VA_CHECKOUT=1`, isi di baris
   **Non-SNAP** keempat bank VA (dan Credit Card). Jangan salin dari address
   bar situs: `/id/api/...` ditolak 404.
3. DOKU meminta token ke `https://sukavillage.com/authorization/v1/access-token/b2b`
   sebelum mengirim notifikasi SNAP. Pastikan path itu tidak diblokir.
4. Aktifkan hanya metode yang dipakai. Metode yang mati di Admin → Pengaturan
   juga harus mati di DOKU. **OVO dan GoPay tidak dipakai** (lihat
   open-questions #1, #2).
5. Uji sebelum dibuka ke publik: `npm run doku:check` (menolak berjalan bila
   `DOKU_ENV=production`, jadi lakukan di staging/sandbox), lalu satu booking
   nyata bernominal kecil dan refund manual di dashboard DOKU.

## 6. Email

- Verifikasi domain di provider (Resend atau email Hostinger) dan pasang
  record **SPF** dan **DKIM** di DNS `sukavillage.com` (biasanya juga DMARC).
- Isi alamat pengirim di Admin → Pengaturan → Kebijakan & kontak.
- Kirim satu email uji: buat booking manual berstatus dibayar, atau pakai
  "Kirim ulang email" di detail booking. Status pengiriman tercatat di
  detail booking (terkirim/gagal).

## 7. Backup

Yang **wajib** di-backup, minimal harian:

1. **Database** (`mysqldump`, atau Export di phpMyAdmin; Hostinger juga
   menyimpan backup otomatis sesuai paket), berisi booking, pembayaran,
   konten, dan pengaturan.
2. **Folder `UPLOAD_DIR`**, berisi semua foto yang diunggah admin. Database
   hanya menyimpan alamatnya, jadi tanpa folder ini foto hilang.
3. **`keys/` dan `.env`**, disimpan terpisah dan aman (berisi rahasia).

Contoh crontab di VPS:

```
30 3 * * *  mysqldump --single-transaction -h HOST -u USER -pPASSWORD NAMA_DB | gzip > /home/<user>/backup/db-$(date +\%F).sql.gz
45 3 * * *  tar czf /home/<user>/backup/uploads-$(date +\%F).tgz -C /home/<user> suka-uploads
```

Uji pemulihan sekali sebelum launch.

## 8. Pindah platform

### Kembali ke PostgreSQL

Skema tetap portabel. Ganti `provider` di `prisma/schema.prisma` ke
`"postgresql"`, hapus `prisma/migrations/`, buat migrasi `init` baru, dan
ganti `resetDb()` di `tests/setup.ts` dengan versi `pg_tables` (ada di riwayat
git). Isolasi READ COMMITTED (`lib/server/tx.ts`) berlaku untuk keduanya.

### Ke Vercel

Vercel tidak punya disk permanen. Ganti tiga fungsi di
`lib/server/storage.ts` (`putUpload`, `readUpload`, `removeUpload`) dengan
object storage (misalnya Cloudflare R2), dan jadwalkan cron di `vercel.json`
(Vercel Cron memanggil dengan GET dan header Bearer `CRON_SECRET`).

## 9. Setelah live

- Isi `SITE_URL` paling akhir dan daftarkan ke Google Search Console (SEO.md).
- Nonaktifkan link demo `villa-landing-eight.vercel.app`.
- Pantau log aplikasi untuk `[payments]`, `[mail]`, dan `[channel]`.
