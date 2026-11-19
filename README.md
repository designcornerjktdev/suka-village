# Suka Village

Website Suka Village (villa dan kabin keluarga di Sukalarang, Sukabumi), dua
bahasa (Indonesia di `/id`, Inggris di `/en`), plus prototipe booking tamu dan
CMS admin.

- **Tampilan dan alur:** final. Semua halaman, layar booking, dan layar admin
  sudah jadi.
- **Booking dan CMS:** tersambung ke backend (November 2026): database
  MariaDB/MySQL (Prisma), pembayaran DOKU (VA, QRIS, DANA, ShopeePay, kartu),
  email otomatis, login admin, upload foto, dan cron. Halaman publik membaca
  kamar dan konten dari database. Cara pasang di [docs/DEPLOY.md](docs/DEPLOY.md); yang
  masih ditanyakan di [docs/open-questions.md](docs/open-questions.md).
- **Demo:** https://villa-landing-eight.vercel.app (akun Vercel desainer, hanya
  untuk demo; produksi di-deploy dari hosting owner).

## Menjalankan

Butuh Node.js 20.9 atau lebih baru (dikembangkan di Node 24) dan npm.

```bash
npm ci
npm run dev        # http://localhost:3000
```

Admin: `/admin/login`, email dan kata sandi apa saja (prototipe).

Build produksi, di hosting apa pun yang menjalankan Next.js (Vercel, VPS,
Docker):

```bash
npm run build
npm start
```

Cek sebelum deploy (`next typegen` membuat tipe rute seperti `PageProps`;
tanpa itu `tsc` gagal di salinan yang belum pernah di-build):

```bash
npx next typegen
npx tsc --noEmit
npx eslint app components lib content
npm run build
```

Lalu lihat di lebar HP (390px) dan desktop (1440px).

## Environment

Semua variabel ada di `.env.example` (salin ke `.env`) dan dijelaskan di
[docs/DEPLOY.md](docs/DEPLOY.md) §2: database, DOKU, SMTP, folder upload, cron.
Tidak ada secret di repo ini; `.env` dan `keys/` tidak di-commit.

`SITE_URL` tetap saklar SEO: **isi hanya di produksi, dan paling akhir.**
Selama kosong, semua halaman `noindex` dan robots.txt menolak crawler. Detail
di [docs/SEO.md](docs/SEO.md) §1.

## Menjalankan dengan backend (lokal)

```bash
docker compose up -d          # MariaDB 10.11 di port 3307 (suka + suka_test), sama dengan Hostinger
cp .env.example .env          # lalu isi DOKU_* dan CRON_SECRET
npm ci
npx prisma migrate dev        # tabel
npm run db:seed               # kamar, konten, pengaturan, admin pertama (kata sandi tampil sekali)
npm run dev
npm test                      # test backend (vitest, database suka_test)
npm run doku:check -- va_bni  # cek koneksi sandbox DOKU
```

## Dokumen, urutan baca

| File | Isi |
|---|---|
| [docs/HANDOFF.md](docs/HANDOFF.md) | Status proyek, aturan yang selalu berlaku, riwayat revisi, peta kode. **Baca dulu.** |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Brief klien yang mengikat, aturan desain, identitas brand. |
| [docs/BOOKING.md](docs/BOOKING.md) | Kontrak backend: model data, status booking, endpoint, payment, email, akses admin, checklist go-live (§10). |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Memasang di Hostinger Web App dengan MySQL/MariaDB: env, database, build, cron, DOKU, email, backup. |
| [docs/open-questions.md](docs/open-questions.md) | Pertanyaan yang masih menunggu DOKU, owner, dan desainer. |
| [docs/superpowers/](docs/superpowers/) | Desain dan rencana implementasi backend. |
| [docs/REPLACE.md](docs/REPLACE.md) | Data yang masih menunggu owner (harga, kebijakan, foto, dll.). Tidak boleh live sebelum terisi. |
| [docs/SEO.md](docs/SEO.md) | SEO, saklar `SITE_URL`, hasil Lighthouse. |
| [AGENTS.md](AGENTS.md) | Next.js 16 berbeda dari versi lama. Baca `node_modules/next/dist/docs/` sebelum memakai API yang belum dikenal. |

Information architecture (sitemap website dan CMS, inventaris halaman, alur
booking) ada di PDF terpisah, `IA Suka Village v1.0.pdf`, yang dikirim bersama
source code ini.

## Teknologi

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4,
react-day-picker (kalender), lucide-react (ikon).

| Di mana | Apa |
|---|---|
| `content/site.ts` | Fakta dan foto: kamar, fasilitas, pengalaman, acara, Jelajah, galeri, alamat. |
| `content/dict.ts` | Semua teks situs, Indonesia dan Inggris. |
| `app/[lang]/` | Halaman publik. `app/admin/` untuk CMS. |
| `app/globals.css` | Gaya situs publik. `app/admin/admin.css` untuk admin. |
| `components/` | Komponen situs. `components/booking/` dan `components/admin/` untuk booking dan CMS. |
| `lib/booking/` | Prototipe booking dan CMS. `api.ts` (tulis) dan `hooks.ts` (baca) adalah dua titik yang diganti dengan backend. |
| `public/photos/` | Foto properti dari owner, sisi terpanjang 1800px. |

## Perubahan tampilan

Desain dijaga oleh aturan di docs/HANDOFF.md ("Aturan yang selalu berlaku") dan
docs/PRODUCT.md. Untuk perubahan tampilan, libatkan desainer (Reza) dan kirim link
preview deploy supaya tampilannya bisa dicek sebelum live.
