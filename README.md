# Suka Village

Website Suka Village (villa dan kabin keluarga di Sukalarang, Sukabumi), dua
bahasa (Indonesia di `/id`, Inggris di `/en`), plus prototipe booking tamu dan
CMS admin.

- **Tampilan dan alur:** final. Semua halaman, layar booking, dan layar admin
  sudah jadi.
- **Booking dan CMS:** masih prototipe. Semua data (booking, harga, konten CMS)
  tersimpan di browser lewat `localStorage`. Belum ada database, payment
  gateway, email, atau login admin sungguhan. Itu pekerjaan developer, dan
  kontraknya sudah ditulis di [BOOKING.md](BOOKING.md).
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

Saat ini hanya satu variabel:

| Variabel | Isi |
|---|---|
| `SITE_URL` | Domain asli, misalnya `https://sukavillage.com` (tanpa garis miring di akhir). **Isi hanya di deployment produksi, dan paling akhir.** Selama kosong, semua halaman `noindex` dan robots.txt menolak crawler; di luar Vercel, link share dan canonical juga mengarah ke localhost. Detail di [SEO.md](SEO.md) §1. |

Kunci database, payment gateway, dan email ditambahkan developer saat backend
dibangun. Tidak ada secret di repo ini.

## Dokumen, urutan baca

| File | Isi |
|---|---|
| [HANDOFF.md](HANDOFF.md) | Status proyek, aturan yang selalu berlaku, riwayat revisi, peta kode. **Baca dulu.** |
| [PRODUCT.md](PRODUCT.md) | Brief klien yang mengikat, aturan desain, identitas brand. |
| [BOOKING.md](BOOKING.md) | Kontrak backend: model data, status booking, endpoint, payment, email, akses admin, checklist go-live (§10). |
| [REPLACE.md](REPLACE.md) | Data yang masih menunggu owner (harga, kebijakan, foto, dll.). Tidak boleh live sebelum terisi. |
| [SEO.md](SEO.md) | SEO, saklar `SITE_URL`, hasil Lighthouse. |
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

Desain dijaga oleh aturan di HANDOFF.md ("Aturan yang selalu berlaku") dan
PRODUCT.md. Untuk perubahan tampilan, libatkan desainer (Reza) dan kirim link
preview deploy supaya tampilannya bisa dicek sebelum live.
