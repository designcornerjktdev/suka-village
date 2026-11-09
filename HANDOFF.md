# Handoff: Suka Village

Status per 9 November 2026. Untuk siapa pun (atau sesi Claude mana pun) yang
melanjutkan proyek ini: baca ini dulu, lalu PRODUCT.md.

## Ringkas

- **Apa:** website Suka Village (villa dan kabin keluarga di Sukalarang,
  Sukabumi) plus prototipe booking dan CMS admin.
- **Teknologi:** Next.js 16 (App Router), Tailwind v4, TypeScript. Dua bahasa:
  Indonesia (default, `/id`) dan Inggris (`/en`).
- **Live:** https://villa-landing-eight.vercel.app (proyek Vercel
  `rsp2/villa-landing`). Link ini selalu menampilkan deploy terbaru; link
  `villa-landing-<kode>-rsp2.vercel.app` per deploy dikunci login Vercel.
- **Masih prototipe:** booking dan CMS memakai data contoh yang tersimpan di
  browser (localStorage), belum ada database, payment gateway, atau email
  sungguhan. Semua halaman `noindex` sampai `SITE_URL` diisi (SEO.md §1).

## Menjalankan dan deploy

```bash
npm install
npm run dev            # http://localhost:3000
npx vercel --prod      # publish ke link live
```

Admin: `/admin/login`, email dan kata sandi apa saja (prototipe).

Cek sebelum deploy: `npx tsc --noEmit`, `npx eslint app components lib content`,
`npm run build`, lalu lihat di lebar HP (390px) dan desktop (1440px).

## Peta dokumen

| File | Isi |
|---|---|
| PRODUCT.md | Brief klien yang mengikat, aturan desain, identitas brand. **Baca dulu.** |
| REPLACE.md | Yang masih menunggu owner atau belum dikonfirmasi. |
| BOOKING.md | Cara kerja booking dan CMS, dan langkah ke produksi. |
| SEO.md | SEO, saklar `SITE_URL`, skor Lighthouse terakhir. |
| AGENTS.md | Next.js 16 berbeda dari versi lama: baca `node_modules/next/dist/docs/` sebelum memakai API yang belum dikenal. |

## Aturan yang selalu berlaku

- Komunikasi dengan Reza dalam bahasa Indonesia.
- Jangan mengarang angka, harga, atau rating. Foto yang ditampilkan sebagai
  properti harus foto properti sungguhan (sumbernya folder Drive owner).
- Tanpa tanda pisah panjang (em dash) di teks situs.
- Mobile first, target sentuh minimal 44px, kontras WCAG AA.
- Data contoh selalu diberi label.
- Situs publik bersudut kotak (tanpa radius); admin boleh membulat. Pengecualian:
  kalender booking boleh bulat (izin Reza, 28 Oktober 2026).
- Animasi tenang: fade saja, tanpa zoom, tanpa gerak saat hover.
- Font: judul Helvetica (dari sistem pengunjung), teks Poppins.
- Revisi klien datang sebagai Google Slides berisi tangkapan layar, catatan,
  dan link folder Drive. Deck bisa diunduh lewat `/export/pdf`; folder Drive
  publik bisa didaftar lewat `drive.google.com/embeddedfolderview?id=...`.

## Yang sudah selesai (Oktober 2026)

- Desain putih, kotak, palet "Calm Garden"; semua halaman isi memakai satu
  pola baris (foto 7 bagian, teks 5, bergantian).
- Logo baru dari folder owner, sebagai SVG (`components/Logo.tsx`,
  `public/brand/`); logo lengkap di header, menu, footer, admin; favicon dari
  ikon pohon.
- Home: header putih, satu foto Main Villa penuh di bawahnya, tanpa slideshow
  dan tanpa keterangan.
- Kamar: slider 3 foto per kamar, tombol Pesan sekarang dan Jelajahi kamar.
  Halaman kamar: slider besar semua foto, keterangan di bawahnya.
- Pengalaman tanpa Book now; foto Garden, BBQ, Buah Tangan dari Drive.
- Jelajah: Situ Gunung, Gunung Padang, Bukit Sabak; tanpa jarak tempuh dan
  tanpa blok alamat.
- Galeri foto saja; Kontak tanpa nomor baris dan tanpa jarak.
- Footer satu baris, lokasi tepat di tengah (layar 1024px ke atas).
- Optimasi HP: kalender header dimuat saat dibuka, gambar AVIF/WebP, foto
  slider berikutnya dimuat setelah halaman siap, tanpa blur. Lighthouse HP
  91 sampai 97, aksesibilitas/SEO 100.
- CMS mengikuti situs: Beranda, Fasilitas, Pengalaman, Acara, Jelajah (link
  peta, kredit foto), Galeri, Kontak; Kamar & harga; Pengaturan.
- Kode promo (28 Okt): tamu mengetik kode di langkah pembayaran; potongan
  persen (bisa diberi batas) atau nominal, dengan masa berlaku, minimal malam,
  kamar tertentu, dan kuota. Diatur di menu admin **Promo**. Dua kode contoh:
  `CONTOH10`, `CABIN200`.
- CRUD di semua menu admin (28 Okt): daftar dengan Ubah dan Hapus per baris,
  Tambah di kanan atas, form di panel kanan. Booking: data tamu bisa diubah,
  booking batal/kedaluwarsa/ditolak bisa dihapus. Kalender: tanggal ditutup
  bisa diubah dan ada daftarnya. Sidebar admin dikelompokkan (Operasional,
  Website, Sistem).
- Audit dan rapikan UI admin (28 Okt): satu sistem di `app/admin/admin.css`
  (Poppins saja, ukuran teks 12 sampai 24px, ikon 16px stroke 1.75, kontrol
  40px atau 44px di layar sentuh). Dropdown sendiri (`Select`), menu tindakan
  "⋯" per baris (`RowActions`/`Menu`), checkbox digambar, tab garis untuk
  bagian halaman. Kalender booking: hari bulat, masa menginap satu pita
  utuh, pratinjau saat memilih check-out (`components/RangeCalendar.tsx`).

- MoM 26 Oktober (28 Okt): foto halaman kamar 4:3; setiap harga dan total
  diberi "Termasuk pajak" (booking, halaman pesanan, email); Padel Court dan
  Equestrian House di Fasilitas sebagai "Segera hadir". Status "Segera hadir"
  bisa diatur sendiri di CMS untuk Fasilitas, Pengalaman, dan Acara (Status di
  panel edit, atau menu ⋯). Desain email HTML untuk semua pesan otomatis
  (`lib/booking/email.ts`), pratinjaunya di Pengaturan → Email otomatis.

- Audit UI dan bug (28 Okt, lanjutan): footer selalu di dasar layar walau
  halamannya pendek; detail kamar: latar putih, satu foto 4:3 di tengah
  tanpa foto lain mengintip, nomor foto besar di kiri dan dua tombol kotak
  berdampingan di kanan (di luar foto, sejajar dasar foto); di HP nomor dan
  tombol satu baris di bawah foto (`stage` di `Slides.tsx`). Klik/tap foto
  membuka layar penuh putih dengan zoom: tombol − +, klik/tap foto untuk
  zoom di titik itu, geser untuk melihat bagian lain, panah dan swipe untuk
  foto lain, Esc atau × untuk menutup (`components/PhotoViewer.tsx`); hierarki teks
  dirapikan untuk HP dan desktop; Jelajah tanpa kredit di bawah tiap tempat
  (kredit CC BY-SA yang wajib jadi satu baris kecil di kaki halaman); 404 bermerek (`app/[lang]/not-found.tsx`); halaman Cek
  pesanan diberi judul; "Pesanan tidak ditemukan" menampilkan pesanan terbaru
  di browser itu (demo); Reset data contoh di admin kini minta konfirmasi
  (sebelumnya langsung menghapus, dan link pesanan lama jadi tidak ditemukan);
  tinggi kolom form admin seragam; toolbar, bar Simpan, kartu tabel di HP,
  target sentuh 44px dirapikan.

- Revisi 29 Okt:
  - **CMS:** isi halaman memakai lebar penuh sampai 100rem lalu ke tengah
    (`--ad-max`), tepi kanan sejajar dengan banner demo. Tabel booking lebih
    lega; status dan "menunggu x jam" bertumpuk, bukan berdampingan.
  - **Kalender CMS:** tiap status beda warna dan ikon (dipakai juga di
    legenda):
    - Perlu dikonfirmasi: oranye tanah.
    - Menunggu bayar: garis putus-putus.
    - Terkonfirmasi: hijau.
    - Sedang menginap: biru.
    - Selesai: abu-abu.
    - Ditutup manual: arsir.
    Hari yang sudah lewat jadi warna datar, jadi arsir hanya berarti ditutup.
  - **Kalender booking:**
    - Tanpa titik "sisa sedikit" per hari. Gantinya satu baris di atas
      kalender: "4 malam · 2 dari 3 kamar tersedia", "Tinggal 1 kamar", atau
      "Tidak ada kamar yang kosong di semua malam ini".
    - Check-in dan check-out sebagai dua tombol (`components/StayEnds.tsx`).
    - Rentang tanggal berbentuk kapsul bulat; kedua ujungnya diberi bayangan.
    - Tanggal penuh berupa lingkaran tanah liat dengan coretan.
    - Di HP, bulan disusun ke bawah: 3 bulan dulu, tombol "Tampilkan bulan
      berikutnya" sampai 12 bulan. Minggu yang sudah lewat disembunyikan.
    - Sheet Pesan di HP: judul, check-in/out, dan tombol tetap di tempat;
      hanya bulan yang di-scroll.
  - **HP (di bawah 900px) dan tablet:**
    - Navigasi halaman di bawah header (`components/PageNav.tsx`), tampil di
      bawah 1100px: nama halaman, lalu bagian-bagiannya yang bisa digeser.
      Ikut menandai bagian yang sedang dibaca, dan sekali ketuk langsung ke
      bagian itu.
    - Nomor 01/02 di atas judul hilang di HP. Teks sedikit lebih besar dan
      tidak setipis desktop.
    - Kamar: tiga fakta besar (Luas, Kamar tidur, Kamar mandi, `KeySpecs`).
      Daftar fasilitas lengkap ada di halaman kamar.
    - Dua tombol sejajar sama lebar.
    - Di layar sentuh foto di-swipe, tanpa panah.
    - "Kamar lain" berupa rel geser.
    - Menu berupa kata besar tanpa nomor.
    - Setiap tombol memberi umpan balik saat ditekan.
  - **Galeri:** memakai viewer yang sama dengan halaman kamar (putih, swipe,
    zoom); lightbox gelap lama dihapus.

- Revisi 31 Okt (detail kamar, menggantikan susunan 4:3 di tengah):
  - Foto kamar selebar halaman, rasio 16:9 dan boleh terpotong. Panah ada di
    dalam foto, titik di bawahnya. Di HP foto tetap 4:3 dari tepi ke tepi,
    di-swipe, dengan titik.
  - Perbaikan 2 Nov: tinggi foto dihitung dari lebar halaman, bukan lewat
    `aspect-ratio`. Sebelumnya di jendela browser yang pendek (laptop klien)
    foto ikut menyempit dan menempel ke kiri.
  - Diklik, foto terbuka utuh dalam bentuk aslinya (kebanyakan 3:2; beberapa
    foto Single Cabin potret 4:5). Panah menempel di dalam tepi foto, juga
    saat di-zoom.
  - Di layar sentuh tidak ada panah: foto di-swipe, titik di bawah
    menunjukkan posisi. Kalau foto lebih dari 13 (galeri), deretan titik ikut
    bergeser.

## Menunggu

- **Dari owner** (detail di REPLACE.md): file logo SVG/AI asli, harga, jumlah
  kamar tidur Main Villa (3 atau 4), toko ada atau tidak, foto Family
  Gathering, lisensi web Helvetica (kalau ingin sama di semua perangkat),
  domain asli.
- **Ke produksi, oleh developer** (BOOKING.md): database, payment gateway,
  pengiriman email, login admin sungguhan, integrasi channel manager/OTA lewat
  API (tim SV sedang memintanya); lalu isi `SITE_URL` dan daftarkan ke Google
  Search Console. Reza adalah product designer; bagian ini bukan
  pekerjaannya.
- **Dari owner, MoM 26 Okt:** tarif pajak (kalau ingin ditampilkan terpisah),
  foto dan deskripsi Padel Court dan Equestrian House saat sudah buka.

## Peta kode

| Di mana | Apa |
|---|---|
| `content/site.ts` | Fakta dan foto: kamar, fasilitas, pengalaman, acara, Jelajah, galeri, alamat. |
| `content/dict.ts` | Semua teks situs, Indonesia dan Inggris. |
| `app/[lang]/…/page.tsx` | Halaman publik. |
| `app/globals.css` | Semua gaya situs publik. `app/admin/admin.css` untuk admin. |
| `components/Showcase.tsx`, `Slides.tsx` | Pola baris dan slider foto. |
| `components/SiteHeader.tsx`, `SiteFooter.tsx`, `Logo.tsx` | Header, footer, logo. |
| `components/BookingBar.tsx`, `BookingDates.tsx` | Tombol dan kalender booking di header. |
| `lib/booking/` | Prototipe booking/CMS: `api.ts` (tulis), `hooks.ts` (baca), `store.ts` (localStorage), `seed.ts` (data contoh; naikkan `CONTENT_REV` bila konten situs berubah), `promo.ts` (aturan kode promo). |
| `components/admin/ui.tsx` | Komponen admin bersama: `Sheet` (panel edit), `ConfirmDelete`, `RowActions`, `Badge`. |
| `public/photos/`, `public/brand/` | Foto (sisi terpanjang 1800px) dan file logo SVG. |

## Lingkungan Claude (tidak wajib untuk menjalankan situs)

Skill **impeccable** dan **ui-ux-pro-max** ada di `~/.claude/skills/`, agent
impeccable di `~/.claude/agents/`; keduanya file lokal di Mac, jadi tetap ada
walau akun Claude berganti. Di komputer lain, salin kedua folder itu. Plugin
dan connector (Figma, Notion, dll.) mengikuti akun Claude dan perlu diaktifkan
lagi di akun baru.
