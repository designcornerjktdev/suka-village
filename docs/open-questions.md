# Pertanyaan terbuka (backend)

Hal yang masih perlu ditanyakan atau diputuskan sebelum go-live. Dikelompokkan
menurut siapa yang bisa menjawab. Coret atau pindahkan ke "Sudah terjawab"
begitu ada jawaban, dan sesuaikan kodenya bila perlu.

Diperbarui: 17 November 2026.

## Ke DOKU (support)

1. **OVO tanpa account binding.** Di SNAP Direct API, OVO wajib account
   binding (nomor HP, OTP, PIN) sebelum bisa bayar. Apakah ada cara bayar OVO
   sekali bayar tanpa binding, seperti DANA dan ShopeePay
   (`payment-host-to-host` dengan redirect)? Kalau tidak ada, OVO tetap
   disembunyikan, atau perlu layar binding baru (lihat pertanyaan ke Reza).
2. **GoPay.** GoPay tidak ada di daftar e-wallet SNAP Direct API DOKU. Lewat
   produk apa GoPay bisa dipakai (Non-SNAP, Checkout, atau QRIS saja)?
3. **QRIS: `merchantId` dan `terminalId`.** Dashboard sandbox hanya
   menampilkan Notify URL. Untuk `POST /snap-adapter/b2b/v1.0/qr/qr-mpm-generate`,
   berapa `merchantId` dan `terminalId` akun kami di sandbox, dan bagaimana
   mendapatkannya untuk produksi?
4. **Signature notifikasi SNAP.** DOKU meminta token dulu ke
   `/authorization/v1/access-token/b2b` lalu mengirim notifikasi dengan
   `Authorization: Bearer <token kami>`. Kami memverifikasi token itu. Apakah
   `X-SIGNATURE` pada notifikasi juga harus diverifikasi, dan string apa yang
   ditandatangani (token mana yang dipakai di stringToSign)?
5. **Format notifikasi QRIS dan e-wallet.** Mohon contoh body asli
   notifikasi pembayaran QRIS dan DANA/ShopeePay di sandbox, dan apakah
   `latestTransactionStatus: "00"` berarti lunas.
6. **Cek status.** Untuk VA (`/orders/v1.0/transfer-va/status`), apakah
   `paymentFlagStatus: "00"` berarti lunas? Untuk e-wallet
   (`/orders/v1.0/debit/status`), `serviceCode` berapa yang benar?
7. **BIN VA bank lain.** Sandbox baru menampilkan BNI (Merchant BIN 84923,
   DGPC, Closed). Berapa Merchant BIN untuk BCA, BRI, dan Mandiri, dan apakah
   sama di produksi?

## Ke owner Suka Village

8. **Hosting.** Paket Hostinger apa yang dipakai (harus Business atau Cloud
   untuk Node.js)? Kalau pindah ke shared hosting dengan MySQL, ada satu test
   yang wajib dijalankan ulang (lihat ledger: "promo quota race").
9. **Kode pos properti** untuk QRIS (`DOKU_QRIS_POSTAL_CODE`).
10. **Refund.** Booking yang ditolak admin, dibatalkan setelah bayar, atau
    dibayar setelah kedaluwarsa ditandai "perlu refund". Refund dilakukan
    manual di dashboard DOKU. Siapa yang mengerjakan, dan berapa lama
    janjinya ke tamu? Isi juga kebijakan pembatalan di Pengaturan.
11. **BookandLink.** Bentuk API-nya (webhook, polling, atau iCal), dan apakah
    harga ikut disinkronkan. Titik sambungnya sudah disiapkan (desain §14).

## Ke Reza (desainer)

12. **OVO dan GoPay disembunyikan** dari pilihan bayar (diputuskan 17 Nov
    2026). Tampilan langkah pembayaran tidak berubah, hanya dua logo yang
    hilang. Kalau OVO ingin tetap ada, perlu layar baru untuk account binding
    (nomor HP OVO, OTP, PIN).
13. **Pesan untuk error `payment`** ("Pembayaran tidak dapat dibuat, coba cara
    bayar lain") di langkah pembayaran. Saat ini UI menampilkan pesan umum.
14. **Kembali dari e-wallet di browser lain.** Tamu yang menyelesaikan
    pembayaran DANA/ShopeePay di browser lain akan kembali ke halaman
    "Cek pesanan" (kode + email), bukan langsung ke halaman pesanannya.
    Apakah itu bisa diterima?

15. **Teks halaman login admin** (diubah 17 Nov 2026, saat login sungguhan
    dipasang): catatan "Prototipe: email dan kata sandi apa saja bisa dipakai"
    dihapus, dan pesan error kini dua: "Isi email dan kata sandi." (kosong)
    dan "Email atau kata sandi salah." (ditolak server). Mohon dicek kata-katanya.

16. **Teks cadangan untuk item baru dari CMS** (17 Nov 2026). Saat owner
    menambah item yang tidak ada di desain awal, situs memakai:
    - fasilitas baru: ikon bentuk (ikon taman bermain);
    - acara baru: pesan WhatsApp "Halo Suka Village, saya ingin bertanya
      tentang {nama acara}." (EN: "Hello Suka Village, I would like to ask
      about {name}.");
    - kamar baru: judul SEO "{nama kamar} · Suka Village", deskripsi dari teks
      kamarnya, gambar share halaman Kamar.
    Mohon dicek kata-katanya.
17. **Nomor WhatsApp di seluruh situs.** Nomor di Admin → Pengaturan kini
    dipakai di halaman Kontak. Tombol WhatsApp lain (header, footer, kamar,
    acara) masih memakai nomor di `content/site.ts`. Apakah semuanya harus
    ikut Pengaturan (IA menyebut "tombol WhatsApp di seluruh website")?

## Sudah terjawab

- **Jenis VA:** DGPC dengan Doku General BIN. Tabel VA BNI di dashboard:
  Merchant BIN 84923, Partner Service ID 8492, Prefix Customer No 3. API SNAP
  memakai **Merchant BIN** sebagai `partnerServiceId` dan `customerNo` 10 digit
  apa saja; DOKU membuat nomor VA-nya sendiri (diuji di sandbox 18 Nov 2026).
- **Skema API DOKU:** SNAP (akun sandbox mendukung, semua metode aktif).
