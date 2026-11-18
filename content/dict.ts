import type { Locale } from "./i18n";
import type { EventId, ExperienceId, ExploreId, FacilityId, Feature, UnitId } from "./site";
import type { PromoError } from "@/lib/booking/types";

/**
 * Every user-facing string on the site, in both languages.
 *
 * Three rules hold across all of it:
 *
 *  1. No em dashes. They read as machine-written, and the owner's own material
 *     does not use them. Commas, periods and colons do the same work.
 *  2. The owner's brief is the source. Where it gives English copy (rooms,
 *     facilities, experiences, events) the English here is that copy, word for
 *     word, and the Indonesian is a translation of it, not a rewrite.
 *  3. "Book now" leads to the availability page, which composes a WhatsApp
 *     message the guest reads before sending. WhatsApp itself is offered as
 *     "contact us", never as pressure.
 *
 * Facts live in site.ts and are never translated. `{n}` style placeholders are
 * filled by `fill()` at the call site so a number is never typed into copy.
 */

type Meta = { title: string; description: string };

type Copy = {
  /* What search engines and link previews show: one title and one description
     per public page. Written from what is on the page, never beyond it. Titles
     take " · Suka Village" from the layout, except home, which is whole. */
  seo: {
    home: Meta;
    rooms: Meta;
    room: Record<UnitId, Meta>;
    facilities: Meta;
    experience: Meta;
    explore: Meta;
    event: Meta;
    gallery: Meta;
    booking: Meta;
    contact: Meta;
  };
  nav: {
    home: string;
    rooms: string;
    facilities: string;
    explore: string;
    event: string;
    experience: string;
    gallery: string;
    booking: string;
    contact: string;
  };
  contact: {
    reserveTitle: string;
    reserveCopy: string;
    chat: string;
    location: string;
    route: string;
    mapTitle: string;
  };
  common: {
    contact: string;
    contactShort: string;
    skip: string;
    menu: string;
    close: string;
    bookNow: string;
    /** The label on a facility (or anything else) that is not open yet. */
    soon: string;
    missingTitle: string;
    missingLead: string;
    bookShort: string;
    details: string;
    prev: string;
    next: string;
    prevPhoto: string;
    nextPhoto: string;
    goToPhoto: string;
    photosOf: string;
    openPhoto: string;
    zoomIn: string;
    zoomOut: string;
    onThisPage: string;
    photoBy: string;
    openMap: string;
    waHello: string;
  };
  hero: { place: string; tagline: string; lead: string };
  rooms: {
    title: string;
    lead: string;
    size: string;
    bedroomsOne: string;
    bedroomsMany: string;
    bathroomsOne: string;
    bathroomsMany: string;
    bedroomsShort: string;
    bedroomShortOne: string;
    /* The three facts set large on a phone: the number over its word. */
    keySize: string;
    keyBedrooms: string;
    keyBathrooms: string;
    features: Record<Feature, string>;
    notes: Record<UnitId, string>;
    specsTitle: string;
    priceTitle: string;
    priceBody: string;
    all: string;
    others: string;
    ask: string;
    askMessage: string;
    discover: string;
  };
  facilities: {
    title: string;
    lead: string;
    names: Record<FacilityId, string>;
    copy: Record<FacilityId, string>;
  };
  experience: {
    title: string;
    lead: string;
    names: Record<ExperienceId, string>;
    copy: Record<ExperienceId, string>;
  };
  explore: {
    title: string;
    lead: string;
    copy: Record<ExploreId, string>;
  };
  event: {
    title: string;
    lead: string;
    names: Record<EventId, string>;
    copy: Record<EventId, string[]>;
    ask: string;
    message: Record<EventId, string>;
  };
  gallery: { title: string; statement: string; pageLead: string };
  bar: {
    label: string;
    checkIn: string;
    checkOut: string;
    pick: string;
    guests: string;
    guestUnit: string;
    nights: string;
    night: string;
    cta: string;
  };
  avail: {
    demo: string;
    clear: string;
    free: string;
    full: string;
    picked: string;
    /* Above the calendar: what to pick next, then what the dates mean. */
    pickIn: string;
    pickOut: string;
    allFree: string;
    someFree: string;
    lastRoom: string;
    noneFree: string;
    moreMonths: string;
  };
  checkout: {
    title: string;
    lead: string;
    steps: string[];
    stepOf: string;
    datesTitle: string;
    guests: string;
    guestsHint: string;
    roomsTitle: string;
    roomsLead: string;
    perNight: string;
    payShort: string;
    /** Under every price a guest sees (MoM 26 Oct 2026: prices include tax). */
    taxIncluded: string;
    choose: string;
    chosen: string;
    taken: string;
    partly: string;
    pickDates: string;
    pickRoom: string;
    minNights: string;
    notBookable: string;
    demoPrice: string;
    detailsTitle: string;
    detailsLead: string;
    name: string;
    namePh: string;
    email: string;
    emailPh: string;
    phone: string;
    phonePh: string;
    phoneHint: string;
    notes: string;
    notesPh: string;
    errName: string;
    errEmail: string;
    errPhone: string;
    errSummary: string;
    payTitle: string;
    payLead: string;
    payAfter: string;
    groups: Record<"qris" | "va" | "ewallet" | "card", string>;
    groupHints: Record<"qris" | "va" | "ewallet" | "card", string>;
    breakdown: string;
    nightsN: string;
    subtotal: string;
    promo: string;
    promoPh: string;
    promoApply: string;
    promoChecking: string;
    promoRemove: string;
    promoApplied: string;
    promoOff: string;
    promoErr: Record<PromoError, string>;
    total: string;
    policy: string;
    terms: string;
    next: string;
    back: string;
    pay: string;
    paying: string;
    summary: string;
    noDates: string;
    noRooms: string;
    edit: string;
    errUnavailable: string;
    errGeneric: string;
    help: string;
    findBooking: string;
  };
  order: {
    code: string;
    copy: string;
    copied: string;
    status: Record<"pending" | "paid" | "confirmed" | "rejected" | "checked_in" | "completed" | "cancelled" | "expired", string>;
    track: string[];
    waitTitle: string;
    waitLead: string;
    waitNote: string;
    receiptSentTo: string;
    confirmedTitle: string;
    rejectedTitle: string;
    rejectedLead: string;
    reason: string;
    refund: string;
    demoWaitLead: string;
    simulateAccept: string;
    simulateReject: string;
    openAdmin: string;
    pendingTitle: string;
    pendingLead: string;
    timeLeft: string;
    payBefore: string;
    amount: string;
    vaTitle: string;
    vaSteps: string[];
    /** VA opened through DOKU Checkout: the number is shown on DOKU's page. */
    vaCheckoutTitle: string;
    vaCheckoutGo: string;
    vaCheckoutSteps: string[];
    qrisTitle: string;
    qrisSteps: string[];
    /** QRIS opened through DOKU Checkout: the code shows in DOKU's pop-up. */
    qrisCheckoutSteps: string[];
    ewalletTitle: string;
    ewalletOpen: string;
    ewalletSteps: string[];
    cardTitle: string;
    cardGo: string;
    cardNote: string;
    demoRef: string;
    paidCheck: string;
    checking: string;
    notYet: string;
    changeMethod: string;
    keepMethod: string;
    cancel: string;
    cancelConfirm: string;
    cancelYes: string;
    keep: string;
    demoTitle: string;
    demoLead: string;
    simulatePaid: string;
    simulateExpire: string;
    paidTitle: string;
    paidLead: string;
    stayingTitle: string;
    completedTitle: string;
    sentTo: string;
    viewMessages: string;
    addCalendar: string;
    directions: string;
    contact: string;
    expiredTitle: string;
    expiredLead: string;
    bookAgain: string;
    cancelledTitle: string;
    cancelledLead: string;
    notFoundTitle: string;
    notFoundLead: string;
    /** Prototype only: the bookings this browser holds, so a demo never dead-ends. */
    recentTitle: string;
    details: string;
    stay: string;
    rooms: string;
    guests: string;
    contactLabel: string;
    method: string;
    paidAt: string;
    loading: string;
    checkTitle: string;
    checkLead: string;
    checkCode: string;
    checkEmail: string;
    checkGo: string;
    checkNotFound: string;
  };
  footer: {
    reach: string;
  };
  booking: {
    title: string;
    name: string;
    namePlaceholder: string;
    unit: string;
    checkIn: string;
    checkOut: string;
    guests: string;
    notes: string;
    notesPlaceholder: string;
    submit: string;
    disclaimer: string;
  };
};

const id: Copy = {
  seo: {
    home: {
      title: "Suka Village · Villa & Kabin Keluarga di Sukabumi",
      description:
        "Villa dan kabin keluarga di Sukalarang, Sukabumi, di kaki Gunung Gede Pangrango. Satu kawasan dengan kebun, peternakan, restoran, dan kolam renang.",
    },
    rooms: {
      title: "Villa & Kabin di Sukabumi",
      description:
        "Tiga pilihan menginap di Suka Village, Sukabumi: Main Villa {villa} kamar tidur, Family Cabin {family} kamar tidur, dan Single Cabin untuk berdua. Semua berteras menghadap gunung.",
    },
    room: {
      mainVilla: {
        title: "Main Villa: Villa {bedrooms} Kamar Tidur di Sukabumi",
        description:
          "Main Villa di Suka Village, Sukabumi: rumah {size} m² dengan {bedrooms} kamar tidur, {bathrooms} kamar mandi, dapur, ruang keluarga, dan teras menghadap gunung.",
      },
      familyCabin: {
        title: "Family Cabin: Kabin {bedrooms} Kamar Tidur di Sukabumi",
        description:
          "Family Cabin di Suka Village, Sukabumi: kabin beratap segitiga {size} m² dengan {bedrooms} kamar tidur, balkon, dan teras menghadap gunung. Pas untuk satu keluarga.",
      },
      singleCabin: {
        title: "Single Cabin: Kabin untuk Berdua di Sukabumi",
        description:
          "Single Cabin di Suka Village, Sukabumi: kabin beratap segitiga {size} m² dengan {bedrooms} kamar tidur, balkon, dan teras menghadap gunung. Pas untuk berdua.",
      },
    },
    facilities: {
      title: "Fasilitas: Kolam Renang & Restoran",
      description:
        "Fasilitas Suka Village di Sukabumi: kolam renang, restoran dengan sayuran dari kebun sendiri, ruang pertemuan, dan taman bermain anak. Semua dalam satu kawasan.",
    },
    experience: {
      title: "Aktivitas: Kebun, Peternakan, ATV & BBQ",
      description:
        "Aktivitas selama menginap di Suka Village, Sukabumi: menyusuri kebun, bertemu hewan di peternakan, berkeliling dengan ATV, dan BBQ malam bersama rombongan.",
    },
    explore: {
      title: "Wisata Sekitar: Situ Gunung & Gunung Padang",
      description:
        "Wisata di sekitar Suka Village: Situ Gunung dan Curug Sawer, situs megalitikum Gunung Padang di Cianjur, serta hutan pinus Bukit Sabak di Sukalarang.",
    },
    event: {
      title: "Gathering Kantor & Keluarga di Sukabumi",
      description:
        "Tempat gathering kantor, outing tim, rapat, retreat, dan kumpul keluarga besar di Sukabumi. Ruang dan kegiatan di Suka Village diatur mengikuti rombongan Anda.",
    },
    gallery: {
      title: "Galeri Foto Villa, Kabin & Kebun",
      description:
        "Foto-foto Suka Village di Sukabumi: Main Villa, kabin beratap segitiga, kolam renang, restoran, peternakan, dan kebun. Semua diambil di lokasi.",
    },
    booking: {
      title: "Pesan Menginap di Sukabumi",
      description:
        "Pesan villa atau kabin di Suka Village, Sukabumi, langsung dari website. Pilih tanggal dan kamar, isi data, lalu bayar. Tidak perlu membuat akun.",
    },
    contact: {
      title: "Kontak & Lokasi di Sukalarang, Sukabumi",
      description:
        "Hubungi Suka Village lewat WhatsApp untuk reservasi dan pertanyaan. Alamat lengkap di Sukalarang, Sukabumi, dengan peta dan petunjuk menuju lokasi.",
    },
  },
  nav: {
    home: "Beranda",
    rooms: "Kamar",
    facilities: "Fasilitas",
    explore: "Jelajah",
    event: "Acara",
    experience: "Pengalaman",
    gallery: "Galeri",
    booking: "Reservasi",
    contact: "Kontak",
  },
  contact: {
    reserveTitle: "Reservasi",
    reserveCopy: "Pemesanan, pertanyaan, dan rencana rombongan kami jawab lewat WhatsApp. Foto dan kabar terbaru ada di Instagram.",
    chat: "Chat di WhatsApp",
    location: "Lokasi",
    route: "Petunjuk arah",
    mapTitle: "Peta lokasi Suka Village di Sukalarang, Sukabumi",
  },
  common: {
    contact: "Hubungi kami",
    contactShort: "Hubungi",
    skip: "Langsung ke konten",
    menu: "Menu",
    close: "Tutup",
    bookNow: "Pesan sekarang",
    soon: "Segera hadir",
    missingTitle: "Halaman *tidak ditemukan*",
    missingLead: "Alamatnya mungkin salah ketik, atau halamannya sudah dipindah. Mulai lagi dari beranda, atau langsung lihat kamar.",
    bookShort: "Pesan",
    details: "Lihat detail",
    prev: "Sebelumnya",
    next: "Berikutnya",
    prevPhoto: "Foto sebelumnya",
    nextPhoto: "Foto berikutnya",
    goToPhoto: "Foto {n}",
    photosOf: "Foto {name}",
    openPhoto: "Perbesar foto {n}",
    zoomIn: "Perbesar",
    zoomOut: "Perkecil",
    onThisPage: "Di halaman ini",
    photoBy: "Foto: {by}, {source}, {license}",
    openMap: "Buka di peta",
    waHello: "Halo Suka Village, saya ingin bertanya tentang menginap di sana.",
  },
  hero: {
    place: "Sukalarang, Sukabumi",
    tagline: "Satu kawasan, banyak cerita",
    lead: "Sebuah kebun yang masih dikerjakan tiap pagi, di kaki Gede Pangrango. Satu villa, dua kabin, satu meja panjang untuk berkumpul, dan hari yang tidak perlu Anda isi sendiri.",
  },
  rooms: {
    title: "Tempat untuk *beristirahat*",
    lead: "Tiga bangunan terpisah yang berbagi satu kebun. Pilih yang paling pas untuk rombongan Anda, sisanya bisa kita bicarakan.",
    size: "Luas {n} m²",
    bedroomsOne: "1 kamar tidur dengan double bed",
    bedroomsMany: "{n} kamar tidur dengan double bed",
    bathroomsOne: "1 kamar mandi",
    bathroomsMany: "{n} kamar mandi",
    bedroomsShort: "kamar tidur",
    bedroomShortOne: "kamar tidur",
    keySize: "Luas",
    keyBedrooms: "Kamar tidur",
    keyBathrooms: "Kamar mandi",
    features: {
      living: "Ruang keluarga",
      balcony: "Balkon",
      terrace: "Teras dengan pemandangan gunung",
      ac: "AC",
      tv: "TV layar datar",
      shower: "Shower",
      amenities: "Perlengkapan dasar",
      kitchen: "Dapur",
      teaCoffee: "Perlengkapan teh & kopi",
      wifi: "WiFi gratis",
      noSmoking: "Dilarang merokok",
    },
    notes: {
      mainVilla: "Rumah utama kawasan, dengan dapur sendiri dan ruang keluarga yang cukup untuk semua orang duduk bersama.",
      familyCabin: "Kabin beratap segitiga untuk satu keluarga, dengan dua kamar tidur dan balkon menghadap gunung.",
      singleCabin: "Kabin paling kecil. Untuk berdua, atau untuk yang ingin sedikit jarak dari keramaian.",
    },
    specsTitle: "Isi kamar",
    priceTitle: "Tentang harga",
    priceBody: "Harga menyesuaikan jumlah tamu dan tanggal, jadi belum kami pajang di sini. Kirim tanggal dan jumlah orang, nanti kami hitungkan.",
    all: "Semua kamar",
    others: "Kamar lain",
    ask: "Tanyakan kamar ini",
    askMessage: "Halo Suka Village, saya ingin bertanya tentang {name}.",
    discover: "Jelajahi kamar",
  },
  facilities: {
    title: "Semua di dalam *satu pagar*",
    lead: "Berenang, makan, rapat, bermain. Semuanya ada di kawasan yang sama, tidak perlu ke mana-mana.",
    names: {
      pool: "Kolam Renang",
      dining: "Restoran",
      meeting: "Ruang Pertemuan",
      playground: "Taman Bermain",
      padel: "Lapangan Padel",
      equestrian: "Equestrian House",
      shop: "Toko",
    },
    copy: {
      pool: "Berenang sejenak sambil menikmati hijau yang tenang dan alam di sekeliling Suka Village.",
      dining: "Nikmati hidangan rumahan dari bahan segar, dengan sayuran yang dipetik dari kebun kami dan langsung dibawa ke dapur.",
      meeting: "Ruang yang privat dan nyaman untuk rapat, diskusi, dan pertemuan kecil, jauh dari suasana kantor yang biasa.",
      playground: "Ruang bermain terbuka tempat si kecil bisa berlari, memanjat, dan menikmati petualangan kecilnya sendiri selama menginap.",
      padel: "Lapangan padel di dalam kawasan Suka Village. Sedang disiapkan dan segera bisa dipakai tamu.",
      equestrian: "Equestrian House di dalam kawasan Suka Village. Sedang disiapkan dan segera bisa dikunjungi tamu.",
      shop: "Temukan kebutuhan sehari-hari, produk lokal, dan kenang-kenangan kecil untuk melengkapi masa menginap di Suka Village.",
    },
  },
  experience: {
    title: "Tangan di tanah, *kaki di rumput*",
    lead: "Dari kebun ke kandang, dari jalur ATV sampai panggangan malam hari. Pilih satu, atau biarkan harinya berjalan sendiri.",
    names: {
      garden: "Kebun & Panen",
      farm: "Peternakan",
      atv: "ATV",
      bbq: "BBQ Party",
      gift: "Buah Tangan dari Kebun",
    },
    copy: {
      garden: "Berjalan menyusuri kebun dan kenali beragam tanaman yang tumbuh di sekitar Suka Village. Tergantung musimnya, Anda juga bisa melihat apa yang sudah siap dipanen.",
      farm: "Lebih dekat dengan para hewan dan rasakan sisi lain kehidupan di Suka Village. Temui sapi, kambing, ayam, merak, dan hewan lainnya di sekitar peternakan.",
      atv: "Bawa ATV berkeliling dan jelajahi sekitar dari sudut pandang yang berbeda. Cara seru untuk menambah sedikit petualangan selama menginap.",
      bbq: "Berkumpul di sekitar panggangan dan nikmati BBQ bersama keluarga, teman, atau rombongan Anda. Cara santai melewatkan malam bersama, ditemani makanan yang enak.",
      gift: "Sebelum pulang, bawalah sedikit buah tangan dari Suka Village. Bingkisan perpisahan kami berisi sayur atau buah musiman dari kebun, tergantung apa yang sedang dipanen.",
    },
  },
  explore: {
    title: "Temukan lebih banyak tempat di sekitar *Suka Village*",
    lead: "Kalau ingin keluar pagar sebentar, tiga tempat ini layak dikunjungi. Tanyakan arah dan waktu terbaiknya saat menghubungi kami.",
    copy: {
      situGunung:
        "Danau yang tenang di kawasan Taman Nasional Gunung Gede Pangrango. Di dekatnya, jembatan gantung panjang melintas di atas hutan, dan jalan setapak turun menuju air terjun Curug Sawer.",
      gunungPadang:
        "Situs megalitikum di puncak bukit di Cianjur. Batu-batu andesit tersusun di teras berundak, dengan perbukitan hijau di sekelilingnya. Datanglah pagi, sebelum matahari terlalu tinggi.",
      bukitSabak:
        "Bukit setinggi sekitar 1.000 mdpl di Desa Semplak, masih satu kecamatan dengan Suka Village. Jalan setapak menembus hutan pinus ke puncaknya. Pagi hari ada kabut dan Gunung Gede Pangrango di kejauhan, malamnya lampu kota. Banyak yang datang untuk berkemah.",
    },
  },
  event: {
    title: "Waktu bersama, *di luar rutinitas*",
    lead: "Untuk kantor yang ingin suasana berbeda, dan keluarga yang ingin berkumpul lebih lama. Ceritakan rencananya, kami bantu atur ruang dan kegiatannya.",
    names: { corporate: "Corporate", family: "Family Gathering" },
    copy: {
      corporate: [
        "Suasana yang berbeda bisa mendekatkan orang dengan cara yang berbeda pula.",
        "Dari outing tim dan gathering kantor sampai rapat dan retreat, Suka Village menyediakan ruang dan kegiatan yang bisa diatur sesuai kebutuhan rombongan Anda.",
      ],
      family: [
        "Luangkan waktu untuk seluruh keluarga.",
        "Menginap bersama, makan bersama, biarkan anak-anak menjelajah, dan nikmati beragam kegiatan di sekitar desa. Suka Village memberi ruang bagi keluarga untuk menghabiskan waktu sedikit lebih lama bersama, jauh dari rutinitas biasa.",
      ],
    },
    ask: "Tanyakan acara ini",
    message: {
      corporate: "Halo Suka Village, saya ingin bertanya tentang acara corporate untuk rombongan kami.",
      family: "Halo Suka Village, saya ingin bertanya tentang family gathering untuk keluarga kami.",
    },
  },
  gallery: {
    title: "Galeri",
    statement: "Seperti apa *harinya*, sebelum Anda datang",
    pageLead: "Kamar, kebun, kandang, dan meja panjang. Semua foto di halaman ini diambil di Suka Village.",
  },

  bar: {
    label: "Rencanakan kunjungan",
    checkIn: "Check-in",
    checkOut: "Check-out",
    pick: "Pilih tanggal",
    guests: "Tamu",
    guestUnit: "orang",
    nights: "malam",
    night: "malam",
    cta: "Cek ketersediaan",
  },
  avail: {
    demo: "Ketersediaan di halaman ini masih contoh, bukan data sebenarnya. Pesanan di prototipe ini tidak memesan kamar dan tidak menagih apa pun.",
    clear: "Ulangi",
    free: "Tersedia",
    full: "Penuh",
    picked: "Tanggal Anda",
    pickIn: "Pilih tanggal check-in",
    pickOut: "Sekarang pilih tanggal check-out",
    allFree: "Semua kamar tersedia",
    someFree: "{n} dari {total} kamar tersedia",
    lastRoom: "Tinggal 1 kamar untuk tanggal ini",
    noneFree: "Tidak ada kamar yang kosong di semua malam ini. Coba geser tanggalnya.",
    moreMonths: "Tampilkan bulan berikutnya",
  },
  checkout: {
    title: "Pesan *menginap*",
    lead: "Pilih tanggal dan kamar, isi data, lalu bayar. Tidak perlu membuat akun. Setelah pembayaran masuk, tim kami mengonfirmasi pesanan Anda lewat email.",
    steps: ["Tanggal", "Kamar", "Data tamu", "Pembayaran"],
    stepOf: "Langkah {n} dari {total}",
    datesTitle: "Kapan Anda datang?",
    guests: "Jumlah tamu",
    guestsHint: "Termasuk anak-anak",
    roomsTitle: "Pilih kamar",
    roomsLead: "Untuk rombongan, pilih lebih dari satu.",
    perNight: "/ malam",
    payShort: "Bayar",
    taxIncluded: "Termasuk pajak",
    choose: "Pilih",
    chosen: "Dipilih",
    taken: "Penuh di tanggal ini",
    pickDates: "Pilih tanggal masuk dan keluar dulu.",
    pickRoom: "Pilih minimal satu kamar yang tersedia.",
    partly: "{free} dari {total} malam kosong. Ubah tanggal, atau tanyakan lewat WhatsApp.",
    minNights: "Minimal {n} malam",
    notBookable: "Belum bisa dipesan online. Tanyakan lewat WhatsApp.",
    demoPrice: "Harga di prototipe ini masih contoh. Harga asli diatur pemilik di halaman admin.",
    detailsTitle: "Data pemesan",
    detailsLead: "Tidak perlu membuat akun. Instruksi pembayaran dan konfirmasi dikirim ke email di bawah.",
    name: "Nama lengkap",
    namePh: "Sesuai identitas",
    email: "Email",
    emailPh: "nama@email.com",
    phone: "Nomor WhatsApp",
    phonePh: "812 3456 7890",
    phoneHint: "Dipakai tim kami untuk menghubungi Anda bila perlu.",
    notes: "Catatan",
    notesPh: "Opsional. Bawa anak kecil, ada lansia, perkiraan jam tiba, dan lain-lain",
    errName: "Isi nama lengkap Anda.",
    errEmail: "Email belum valid. Contoh: nama@email.com",
    errPhone: "Nomor belum valid. Contoh: 812 3456 7890",
    errSummary: "Ada data yang perlu diperbaiki.",
    payTitle: "Pilih cara bayar",
    payLead: "Pembayaran diproses oleh penyedia pembayaran resmi. Suka Village tidak menyimpan data kartu Anda.",
    payAfter: "Setelah Anda membayar, tim kami memeriksa lalu mengonfirmasi pesanan. Konfirmasinya dikirim ke email Anda.",
    groups: { qris: "QRIS", va: "Virtual account", ewallet: "E-wallet", card: "Kartu kredit / debit" },
    groupHints: {
      qris: "Scan dari aplikasi bank atau e-wallet apa pun",
      va: "Transfer lewat ATM, m-banking, atau internet banking",
      ewallet: "Bayar langsung dari aplikasinya",
      card: "Diproses di halaman pembayaran yang aman",
    },
    breakdown: "Rincian harga",
    nightsN: "{n} malam",
    subtotal: "Subtotal",
    promo: "Kode promo",
    promoPh: "Masukkan kode",
    promoApply: "Pakai",
    promoChecking: "Memeriksa",
    promoRemove: "Hapus kode",
    promoApplied: "Kode {code} terpasang. Anda hemat {amount}.",
    promoOff: "Promo {code}",
    promoErr: {
      not_found: "Kode promo tidak ditemukan. Periksa lagi ejaannya.",
      inactive: "Kode promo ini sedang tidak berlaku.",
      not_started: "Kode promo ini belum bisa dipakai.",
      ended: "Masa berlaku kode promo ini sudah habis.",
      used_up: "Kuota kode promo ini sudah habis.",
      min_nights: "Kode promo ini butuh lebih banyak malam menginap.",
      rooms: "Kode promo ini tidak berlaku untuk kamar yang Anda pilih.",
    },
    total: "Total",
    policy: "Kebijakan pembatalan",
    terms: "Dengan menekan tombol bayar, Anda menyetujui syarat & ketentuan serta kebijakan privasi Suka Village.",
    next: "Lanjut",
    back: "Kembali",
    pay: "Bayar {total}",
    paying: "Memproses",
    summary: "Ringkasan",
    noDates: "Belum pilih tanggal",
    noRooms: "Belum pilih kamar",
    edit: "Ubah",
    errUnavailable: "Maaf, {rooms} baru saja terisi untuk tanggal ini. Pilih kamar atau tanggal lain.",
    errGeneric: "Pesanan belum bisa dibuat. Coba lagi sebentar, atau hubungi kami lewat WhatsApp.",
    help: "Butuh bantuan? Hubungi kami",
    findBooking: "Sudah pesan? Cek pesanan",
  },
  order: {
    code: "Kode pesanan",
    copy: "Salin",
    copied: "Tersalin",
    status: {
      pending: "Menunggu pembayaran",
      paid: "Menunggu konfirmasi",
      confirmed: "Terkonfirmasi",
      rejected: "Tidak dikonfirmasi",
      checked_in: "Sedang menginap",
      completed: "Selesai",
      cancelled: "Dibatalkan",
      expired: "Kedaluwarsa",
    },
    pendingTitle: "Selesaikan *pembayaran*",
    track: ["Pesanan dibuat", "Pembayaran", "Konfirmasi"],
    pendingLead: "Kamar Anda kami tahan sampai batas waktu di bawah. Instruksi ini juga sudah dikirim ke email Anda.",
    waitTitle: "Pembayaran diterima, *menunggu konfirmasi*",
    waitLead: "Terima kasih, {name}. Tim kami sedang memeriksa pesanan Anda. Begitu dikonfirmasi, kami kirim email ke {email}.",
    waitNote: "Anda tidak perlu menunggu di halaman ini. Kamar tetap kami tahan untuk Anda selama pesanan diperiksa.",
    receiptSentTo: "Bukti pembayaran sudah dikirim ke",
    confirmedTitle: "Pesanan *terkonfirmasi*",
    rejectedTitle: "Pesanan *tidak dapat dikonfirmasi*",
    rejectedLead: "Mohon maaf, {name}. Kami tidak dapat mengonfirmasi pesanan ini.",
    reason: "Alasan",
    refund: "Pembayaran Anda sebesar {total} dikembalikan sepenuhnya. Tim kami akan menghubungi Anda untuk prosesnya.",
    demoWaitLead: "Di versi asli, admin yang menekan Terima atau Tolak di panel admin, dan halaman ini berubah sendiri.",
    simulateAccept: "Simulasikan admin menerima",
    simulateReject: "Simulasikan admin menolak",
    openAdmin: "Buka panel admin",
    timeLeft: "Sisa waktu",
    payBefore: "Bayar sebelum {time}",
    amount: "Jumlah yang dibayar",
    vaTitle: "Nomor virtual account {bank}",
    vaSteps: ["Buka m-banking, internet banking, atau ATM {bank}.", "Pilih transfer ke virtual account, lalu masukkan nomor di atas.", "Pastikan nama Suka Village dan jumlahnya sesuai, lalu bayar."],
    vaCheckoutTitle: "Virtual account {bank}",
    vaCheckoutGo: "Bayar",
    vaCheckoutSteps: ["Ketuk tombol di atas. Nomor virtual account {bank} tampil di halaman pembayaran DOKU.", "Buka m-banking, internet banking, atau ATM {bank}, pilih transfer ke virtual account, lalu masukkan nomornya.", "Pastikan nama Suka Village dan jumlahnya sesuai, lalu bayar."],
    qrisTitle: "Scan kode QRIS",
    qrisSteps: ["Buka aplikasi bank atau e-wallet.", "Pilih bayar dengan QRIS, lalu scan kode ini.", "Pastikan jumlahnya sesuai, lalu bayar."],
    qrisCheckoutSteps: ["Ketuk Bayar. Kode QRIS tampil di halaman pembayaran DOKU.", "Buka aplikasi bank atau e-wallet, pilih bayar dengan QRIS, lalu scan kodenya.", "Pastikan jumlahnya sesuai, lalu bayar."],
    ewalletTitle: "Bayar dengan {wallet}",
    ewalletOpen: "Buka {wallet}",
    ewalletSteps: ["Tekan tombol di atas untuk membuka {wallet}.", "Periksa jumlahnya, lalu konfirmasi pembayaran.", "Kembali ke halaman ini. Status berubah otomatis."],
    cardTitle: "Bayar dengan kartu",
    cardGo: "Lanjut ke halaman pembayaran",
    cardNote: "Anda akan diarahkan ke halaman pembayaran yang aman milik penyedia pembayaran.",
    demoRef: "Nomor dan kode di prototipe ini contoh. Jangan dibayar.",
    paidCheck: "Saya sudah bayar",
    checking: "Mengecek pembayaran",
    notYet: "Pembayaran belum kami terima. Biasanya masuk dalam beberapa menit setelah Anda bayar.",
    changeMethod: "Ganti cara bayar",
    keepMethod: "Tetap pakai cara ini",
    cancel: "Batalkan pesanan",
    cancelConfirm: "Batalkan pesanan ini? Kamar akan kami lepas.",
    cancelYes: "Ya, batalkan",
    keep: "Tidak jadi",
    demoTitle: "Mode demo",
    demoLead: "Di versi asli, halaman ini berubah sendiri saat penyedia pembayaran mengabarkan pembayaran masuk.",
    simulatePaid: "Simulasikan pembayaran berhasil",
    simulateExpire: "Simulasikan waktu habis",
    paidTitle: "Pembayaran *diterima*",
    paidLead: "Terima kasih, {name}. Sampai jumpa di Suka Village.",
    stayingTitle: "Selamat *menginap*",
    completedTitle: "Terima kasih sudah *menginap*",
    sentTo: "Email konfirmasi sudah dikirim ke",
    viewMessages: "Lihat isi email",
    addCalendar: "Tambahkan ke kalender",
    directions: "Petunjuk arah",
    contact: "Hubungi kami",
    expiredTitle: "Waktu pembayaran *habis*",
    expiredLead: "Kamar sudah kami lepas. Tanggal yang sama mungkin masih kosong.",
    bookAgain: "Pesan lagi",
    cancelledTitle: "Pesanan *dibatalkan*",
    cancelledLead: "Pesanan ini sudah dibatalkan dan kamarnya kami lepas. Kalau ini keliru, hubungi kami lewat WhatsApp.",
    notFoundTitle: "Pesanan tidak ditemukan",
    notFoundLead: "Periksa lagi kode pesanannya. Di prototipe ini, pesanan hanya tersimpan di browser tempat pesanan dibuat, dan hilang kalau data contoh direset dari admin.",
    recentTitle: "Pesanan terbaru di browser ini",
    details: "Detail pesanan",
    stay: "Menginap",
    rooms: "Kamar",
    guests: "Tamu",
    contactLabel: "Kontak",
    method: "Cara bayar",
    paidAt: "Dibayar",
    loading: "Memuat pesanan",
    checkTitle: "Cek *pesanan*",
    checkLead: "Masukkan kode pesanan dan email yang dipakai saat memesan. Kodenya ada di email dari kami.",
    checkCode: "Kode pesanan",
    checkEmail: "Email",
    checkGo: "Cek pesanan",
    checkNotFound: "Kode atau email tidak cocok dengan pesanan mana pun.",
  },
  footer: {
    reach: "Hubungi",
  },

  booking: {
    title: "Cek ketersediaan",
    name: "Nama",
    namePlaceholder: "Nama Anda",
    unit: "Kamar",
    checkIn: "Tanggal masuk",
    checkOut: "Tanggal keluar",
    guests: "Jumlah tamu",
    notes: "Catatan",
    notesPlaceholder: "Bawa anak kecil, ada lansia, rencana acara, dan lain-lain",
    submit: "Kirim lewat WhatsApp",
    disclaimer: "Formulir ini tidak memesan kamar dan tidak menagih apa pun. Isian Anda hanya disusun menjadi pesan WhatsApp yang bisa Anda periksa dulu sebelum dikirim.",
  },
};

const en: Copy = {
  seo: {
    home: {
      title: "Suka Village · Family Villa & Cabins in Sukabumi",
      description:
        "A family villa and two cabins in Sukalarang, Sukabumi, below Mount Gede Pangrango. One estate with a working garden, a farm, a restaurant and a swimming pool.",
    },
    rooms: {
      title: "Villa & Cabins in Sukabumi",
      description:
        "Three places to stay at Suka Village, Sukabumi: the {villa}-bedroom Main Villa, the {family}-bedroom Family Cabin and the Single Cabin for two. Each has a mountain-view terrace.",
    },
    room: {
      mainVilla: {
        title: "Main Villa: {bedrooms}-Bedroom Villa in Sukabumi",
        description:
          "The Main Villa at Suka Village, Sukabumi: a {size} m² house with {bedrooms} bedrooms, {bathrooms} bathrooms, a kitchen, a living room and a terrace facing the mountain.",
      },
      familyCabin: {
        title: "Family Cabin: {bedrooms}-Bedroom Cabin in Sukabumi",
        description:
          "The Family Cabin at Suka Village, Sukabumi: a {size} m² A-frame cabin with {bedrooms} bedrooms, a balcony and a terrace facing the mountain. Made for one family.",
      },
      singleCabin: {
        title: "Single Cabin: Cabin for Two in Sukabumi",
        description:
          "The Single Cabin at Suka Village, Sukabumi: a {size} m² A-frame cabin with {bedrooms} bedroom, a balcony and a terrace facing the mountain. Made for two.",
      },
    },
    facilities: {
      title: "Facilities: Swimming Pool & Restaurant",
      description:
        "Facilities at Suka Village in Sukabumi: a swimming pool, a restaurant serving vegetables from its own garden, a meeting room and a children's playground.",
    },
    experience: {
      title: "Things to Do: Garden, Farm, ATV & BBQ",
      description:
        "Things to do while you stay at Suka Village, Sukabumi: walk the garden, meet the farm animals, ride an ATV and share a BBQ in the evening.",
    },
    explore: {
      title: "Nearby: Situ Gunung & Gunung Padang",
      description:
        "Places to visit around Suka Village: Situ Gunung and the Curug Sawer waterfall, the Gunung Padang megalithic site in Cianjur, and the pine forest of Bukit Sabak.",
    },
    event: {
      title: "Corporate & Family Gatherings in Sukabumi",
      description:
        "A venue in Sukabumi for company gatherings, team outings, meetings, retreats and family get-togethers. Spaces and activities are arranged around your group.",
    },
    gallery: {
      title: "Photo Gallery: Villa, Cabins & Garden",
      description:
        "Photographs of Suka Village in Sukabumi: the Main Villa, the A-frame cabins, the pool, the restaurant, the farm and the garden. Every one taken on the estate.",
    },
    booking: {
      title: "Book Your Stay in Sukabumi",
      description:
        "Book a villa or cabin at Suka Village, Sukabumi, directly on the website. Choose your dates and rooms, fill in your details, then pay. No account needed.",
    },
    contact: {
      title: "Contact & Location in Sukalarang, Sukabumi",
      description:
        "Reach Suka Village on WhatsApp for reservations and questions. The full address in Sukalarang, Sukabumi, with a map and directions to the estate.",
    },
  },
  nav: {
    home: "Home",
    rooms: "Rooms",
    facilities: "Facilities",
    explore: "Explore",
    event: "Event",
    experience: "Experience",
    gallery: "Gallery",
    booking: "Availability",
    contact: "Contact",
  },
  contact: {
    reserveTitle: "Reservations",
    reserveCopy: "We answer bookings, questions and group plans on WhatsApp. Photographs and news are on Instagram.",
    chat: "Chat on WhatsApp",
    location: "Location",
    route: "Get directions",
    mapTitle: "Map of Suka Village in Sukalarang, Sukabumi",
  },

  common: {
    contact: "Contact us",
    contactShort: "Contact",
    skip: "Skip to content",
    menu: "Menu",
    close: "Close",
    bookNow: "Book now",
    soon: "Coming soon",
    missingTitle: "Page *not found*",
    missingLead: "The address may be mistyped, or the page has moved. Start again from the home page, or go straight to the rooms.",
    bookShort: "Book",
    details: "View details",
    prev: "Previous",
    next: "Next",
    prevPhoto: "Previous photo",
    nextPhoto: "Next photo",
    goToPhoto: "Photo {n}",
    photosOf: "Photos of {name}",
    openPhoto: "Enlarge photo {n}",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    onThisPage: "On this page",
    photoBy: "Photo: {by}, {source}, {license}",
    openMap: "Open in maps",
    waHello: "Hello Suka Village, I would like to ask about staying with you.",
  },
  hero: {
    place: "Sukalarang, Sukabumi",
    tagline: "One estate, many stories",
    lead: "A garden still worked every morning, under Mount Gede Pangrango. One villa, two cabins, one long table to gather at, and a day you will not have to fill yourself.",
  },
  rooms: {
    title: "A place to *rest*",
    lead: "Three separate buildings sharing one garden. Choose the one that suits your group, and we can talk through the rest.",
    size: "Room size {n} m²",
    bedroomsOne: "1 Bedroom with double bed",
    bedroomsMany: "{n} Bedrooms with double bed",
    bathroomsOne: "1 Bathroom",
    bathroomsMany: "{n} Bathrooms",
    bedroomsShort: "bedrooms",
    bedroomShortOne: "bedroom",
    keySize: "Size",
    keyBedrooms: "Bedrooms",
    keyBathrooms: "Bathrooms",
    features: {
      living: "Living room",
      balcony: "Balcony",
      terrace: "Terrace with Mountain View",
      ac: "Air-conditioning",
      tv: "Flat-screen TV",
      shower: "Shower",
      amenities: "Basic amenities",
      kitchen: "Kitchen",
      teaCoffee: "Tea & coffee maker",
      wifi: "Free WiFi",
      noSmoking: "No Smoking",
    },
    notes: {
      mainVilla: "The main house of the estate, with its own kitchen and a living room big enough for everyone to sit together.",
      familyCabin: "An A-frame cabin for one family, with two bedrooms and a balcony facing the mountain.",
      singleCabin: "The smallest cabin. For two, or for whoever wants a little distance from the noise.",
    },
    specsTitle: "In the room",
    priceTitle: "About rates",
    priceBody: "Rates depend on the size of the group and the dates, so they are not posted here. Send us your dates and numbers and we will work it out with you.",
    all: "All rooms",
    others: "Other rooms",
    ask: "Ask about this room",
    askMessage: "Hello Suka Village, I would like to ask about the {name}.",
    discover: "Discover",
  },
  facilities: {
    title: "All inside *one fence*",
    lead: "A swim, a meal, a meeting, a game. All of it within the same grounds, with nowhere else to drive to.",
    names: {
      pool: "Swimming Pool",
      dining: "Dining",
      meeting: "Meeting Room",
      playground: "Playground",
      padel: "Padel Court",
      equestrian: "Equestrian House",
      shop: "Shop",
    },
    copy: {
      pool: "Take a refreshing swim while enjoying the peaceful greenery and natural surroundings of Suka Village.",
      dining: "Enjoy comforting dishes made with fresh ingredients, with vegetables picked from our garden and brought straight to the kitchen.",
      meeting: "A private and comfortable space for meetings, discussions, and small gatherings away from the usual office setting.",
      playground: "A playful outdoor space where little ones can run, climb, and enjoy their own little adventures during the stay.",
      padel: "A padel court within the grounds of Suka Village. Being prepared now, and open to guests soon.",
      equestrian: "An Equestrian House within the grounds of Suka Village. Being prepared now, and open to guests soon.",
      shop: "Discover everyday essentials, local products, and little keepsakes to complete your stay at Suka Village.",
    },
  },
  experience: {
    title: "Hands in the soil, *feet in the grass*",
    lead: "From the garden to the barn, from the ATV trail to the grill at night. Pick one, or let the day run on its own.",
    names: {
      garden: "Garden & Harvest",
      farm: "Farm",
      atv: "ATV",
      bbq: "BBQ Party",
      gift: "A Little Something to Take Home",
    },
    copy: {
      garden: "Take a walk through the gardens and discover the variety of plants growing around Suka Village. Depending on the season, you may also get to see what's ready to be harvested.",
      farm: "Get closer to the animals and experience a different side of life at Suka Village. Meet the cows, goats, chickens, peacocks, and other animals around the farm.",
      atv: "Take the ATV out for a ride and explore the surroundings from a different perspective. A fun way to add a little adventure to your stay.",
      bbq: "Gather around the grill and enjoy a BBQ with family, friends, or your group. A casual way to spend the evening together over good food.",
      gift: "Before you leave, take home a little something from Suka Village. Our parting gifts are filled with seasonal vegetables or fruits from the garden, depending on what's being harvested.",
    },
  },
  explore: {
    title: "Discover more places around *Suka Village*",
    lead: "If you want to step outside the fence for a while, these three are worth the trip. Ask us for directions and the best time to go.",
    copy: {
      situGunung:
        "A quiet lake inside Mount Gede Pangrango National Park. Nearby, a long suspension bridge crosses above the forest, and a footpath leads down to the Curug Sawer waterfall.",
      gunungPadang:
        "A megalithic site on a hilltop in Cianjur. Andesite stones lie across stepped terraces, with green hills all around. Go early, before the sun climbs too high.",
      bukitSabak:
        "A hill of about 1,000 metres in Desa Semplak, in the same district as Suka Village. A footpath climbs through pine forest to the top. Mornings bring mist and Mount Gede Pangrango in the distance; at night, the lights of the city. Many come to camp.",
    },
  },
  event: {
    title: "Time together, *away from the routine*",
    lead: "For companies wanting a change of setting, and families wanting a little longer together. Tell us the plan and we will help arrange the spaces and the activities.",
    names: { corporate: "Corporate", family: "Family Gathering" },
    copy: {
      corporate: [
        "A change of setting can bring people together in a different way.",
        "From team outings and company gatherings to meetings and retreats, Suka Village offers spaces and activities that can be arranged around the needs of your group.",
      ],
      family: [
        "Make time for the whole family.",
        "Stay together, share a meal, let the kids explore, and enjoy a range of activities around the village. Suka Village gives families space to spend a little more time together, away from the usual routine.",
      ],
    },
    ask: "Ask about this event",
    message: {
      corporate: "Hello Suka Village, I would like to ask about a corporate event for our group.",
      family: "Hello Suka Village, I would like to ask about a family gathering for our family.",
    },
  },
  gallery: {
    title: "Gallery",
    statement: "What the *days* look like, before you arrive",
    pageLead: "Rooms, garden, barns and the long table. Every photograph on this page was taken at Suka Village.",
  },

  bar: {
    label: "Plan a visit",
    checkIn: "Check-in",
    checkOut: "Check-out",
    pick: "Add date",
    guests: "Guests",
    guestUnit: "guests",
    nights: "nights",
    night: "night",
    cta: "Check availability",
  },
  avail: {
    demo: "Availability on this page is an example, not live data. Bookings in this prototype reserve nothing and charge nothing.",
    clear: "Start over",
    free: "Available",
    full: "Fully booked",
    picked: "Your dates",
    pickIn: "Choose your check-in date",
    pickOut: "Now choose your check-out date",
    allFree: "Every room is available",
    someFree: "{n} of {total} rooms available",
    lastRoom: "Only 1 room left for these dates",
    noneFree: "No single room is free for all of these nights. Try moving the dates.",
    moreMonths: "Show more months",
  },
  checkout: {
    title: "Book your *stay*",
    lead: "Choose your dates and rooms, fill in your details, then pay. No account needed. Once your payment arrives, our team confirms your booking by email.",
    steps: ["Dates", "Rooms", "Your details", "Payment"],
    stepOf: "Step {n} of {total}",
    datesTitle: "When are you coming?",
    guests: "Guests",
    guestsHint: "Including children",
    roomsTitle: "Choose your rooms",
    roomsLead: "For a group, choose more than one.",
    perNight: "/ night",
    payShort: "Pay",
    taxIncluded: "Tax included",
    choose: "Choose",
    chosen: "Chosen",
    taken: "Full on these dates",
    pickDates: "Choose a check in and check out date first.",
    pickRoom: "Choose at least one available room.",
    partly: "{free} of {total} nights free. Change your dates, or ask us on WhatsApp.",
    minNights: "Minimum {n} nights",
    notBookable: "Not bookable online yet. Ask us on WhatsApp.",
    demoPrice: "Prices in this prototype are examples. The owner sets the real rates in the admin.",
    detailsTitle: "Your details",
    detailsLead: "No account needed. Payment instructions and your confirmation go to the email below.",
    name: "Full name",
    namePh: "As on your ID",
    email: "Email",
    emailPh: "name@email.com",
    phone: "WhatsApp number",
    phonePh: "812 3456 7890",
    phoneHint: "Used by our team to reach you if needed.",
    notes: "Notes",
    notesPh: "Optional. Young children, older relatives, expected arrival time, anything else",
    errName: "Please enter your full name.",
    errEmail: "This email does not look right. Example: name@email.com",
    errPhone: "This number does not look right. Example: 812 3456 7890",
    errSummary: "Some details need fixing.",
    payTitle: "Choose how to pay",
    payLead: "Payments are handled by a licensed payment provider. Suka Village never stores your card details.",
    payAfter: "After you pay, our team reviews and then confirms the booking. The confirmation is sent to your email.",
    groups: { qris: "QRIS", va: "Virtual account", ewallet: "E-wallet", card: "Credit / debit card" },
    groupHints: {
      qris: "Scan with any banking or e-wallet app",
      va: "Transfer by ATM, mobile banking or internet banking",
      ewallet: "Pay straight from the app",
      card: "Processed on a secure payment page",
    },
    breakdown: "Price breakdown",
    nightsN: "{n} nights",
    subtotal: "Subtotal",
    promo: "Promo code",
    promoPh: "Enter code",
    promoApply: "Apply",
    promoChecking: "Checking",
    promoRemove: "Remove code",
    promoApplied: "Code {code} applied. You save {amount}.",
    promoOff: "Promo {code}",
    promoErr: {
      not_found: "We could not find that promo code. Check the spelling.",
      inactive: "This promo code is not active at the moment.",
      not_started: "This promo code cannot be used yet.",
      ended: "This promo code has expired.",
      used_up: "This promo code has been fully used.",
      min_nights: "This promo code needs a longer stay.",
      rooms: "This promo code does not apply to the rooms you chose.",
    },
    total: "Total",
    policy: "Cancellation policy",
    terms: "By pressing pay you agree to Suka Village's terms and conditions and privacy policy.",
    next: "Continue",
    back: "Back",
    pay: "Pay {total}",
    paying: "Processing",
    summary: "Summary",
    noDates: "No dates yet",
    noRooms: "No rooms yet",
    edit: "Change",
    errUnavailable: "Sorry, {rooms} has just been taken for these dates. Please choose another room or dates.",
    errGeneric: "The booking could not be created. Try again in a moment, or reach us on WhatsApp.",
    help: "Need help? Contact us",
    findBooking: "Already booked? Find your booking",
  },
  order: {
    code: "Booking code",
    copy: "Copy",
    copied: "Copied",
    status: {
      pending: "Awaiting payment",
      paid: "Awaiting confirmation",
      confirmed: "Confirmed",
      rejected: "Not confirmed",
      checked_in: "Staying",
      completed: "Completed",
      cancelled: "Cancelled",
      expired: "Expired",
    },
    pendingTitle: "Complete your *payment*",
    track: ["Booking made", "Payment", "Confirmation"],
    pendingLead: "We are holding your room until the time below. These instructions have also been sent to your email.",
    waitTitle: "Payment received, *awaiting confirmation*",
    waitLead: "Thank you, {name}. Our team is reviewing your booking. As soon as it is confirmed we will email {email}.",
    waitNote: "You do not need to wait on this page. We keep holding the room for you while the booking is reviewed.",
    receiptSentTo: "Your payment receipt has been sent to",
    confirmedTitle: "Booking *confirmed*",
    rejectedTitle: "We could not *confirm* this booking",
    rejectedLead: "We are sorry, {name}. We were not able to confirm this booking.",
    reason: "Reason",
    refund: "Your payment of {total} is refunded in full. Our team will be in touch about the refund.",
    demoWaitLead: "In the real version the admin presses Accept or Reject in the admin panel, and this page updates on its own.",
    simulateAccept: "Simulate the admin accepting",
    simulateReject: "Simulate the admin rejecting",
    openAdmin: "Open the admin panel",
    timeLeft: "Time left",
    payBefore: "Pay before {time}",
    amount: "Amount to pay",
    vaTitle: "{bank} virtual account number",
    vaSteps: ["Open {bank} mobile banking, internet banking or an ATM.", "Choose transfer to virtual account and enter the number above.", "Check that the name reads Suka Village and the amount matches, then pay."],
    vaCheckoutTitle: "{bank} virtual account",
    vaCheckoutGo: "Pay",
    vaCheckoutSteps: ["Tap the button above. Your {bank} virtual account number appears on DOKU's payment page.", "Open {bank} mobile banking, internet banking or an ATM, choose transfer to virtual account and enter the number.", "Check that the name reads Suka Village and the amount matches, then pay."],
    qrisTitle: "Scan the QRIS code",
    qrisSteps: ["Open your banking or e-wallet app.", "Choose pay with QRIS and scan this code.", "Check the amount, then pay."],
    qrisCheckoutSteps: ["Tap Pay. The QRIS code appears on DOKU's payment page.", "Open your banking or e-wallet app, choose pay with QRIS and scan the code.", "Check the amount, then pay."],
    ewalletTitle: "Pay with {wallet}",
    ewalletOpen: "Open {wallet}",
    ewalletSteps: ["Press the button above to open {wallet}.", "Check the amount and confirm the payment.", "Come back to this page. The status updates on its own."],
    cardTitle: "Pay by card",
    cardGo: "Continue to the payment page",
    cardNote: "You will be taken to the payment provider's secure payment page.",
    demoRef: "Numbers and codes in this prototype are examples. Do not pay them.",
    paidCheck: "I have paid",
    checking: "Checking your payment",
    notYet: "We have not received the payment yet. It usually arrives within a few minutes of paying.",
    changeMethod: "Change payment method",
    keepMethod: "Keep this method",
    cancel: "Cancel booking",
    cancelConfirm: "Cancel this booking? We will release the room.",
    cancelYes: "Yes, cancel",
    keep: "Keep it",
    demoTitle: "Demo mode",
    demoLead: "In the real version this page updates on its own when the payment provider reports the payment.",
    simulatePaid: "Simulate a successful payment",
    simulateExpire: "Simulate running out of time",
    paidTitle: "Payment *received*",
    paidLead: "Thank you, {name}. See you at Suka Village.",
    stayingTitle: "Enjoy your *stay*",
    completedTitle: "Thank you for *staying*",
    sentTo: "Your confirmation email has been sent to",
    viewMessages: "See the email",
    addCalendar: "Add to calendar",
    directions: "Directions",
    contact: "Contact us",
    expiredTitle: "Payment time has *run out*",
    expiredLead: "The room has been released. The same dates may still be open.",
    bookAgain: "Book again",
    cancelledTitle: "Booking *cancelled*",
    cancelledLead: "This booking has been cancelled and the room released. If this is a mistake, reach us on WhatsApp.",
    notFoundTitle: "Booking not found",
    notFoundLead: "Check the booking code again. In this prototype, bookings are only stored in the browser they were made in, and are gone if the example data is reset from the admin.",
    recentTitle: "Latest bookings in this browser",
    details: "Booking details",
    stay: "Stay",
    rooms: "Rooms",
    guests: "Guests",
    contactLabel: "Contact",
    method: "Payment method",
    paidAt: "Paid",
    loading: "Loading your booking",
    checkTitle: "Find your *booking*",
    checkLead: "Enter your booking code and the email you booked with. The code is in the email we sent you.",
    checkCode: "Booking code",
    checkEmail: "Email",
    checkGo: "Find booking",
    checkNotFound: "That code and email do not match any booking.",
  },
  footer: {
    reach: "Reach us",
  },

  booking: {
    title: "Check availability",
    name: "Name",
    namePlaceholder: "Your name",
    unit: "Room",
    checkIn: "Check in",
    checkOut: "Check out",
    guests: "Guests",
    notes: "Notes",
    notesPlaceholder: "Young children, older relatives, plans for the stay, anything else",
    submit: "Send on WhatsApp",
    disclaimer: "This form does not reserve a room and does not charge anything. It only arranges your answers into a WhatsApp message for you to review before sending.",
  },
};

export const dict: Record<Locale, Copy> = { id, en };

export function getDict(locale: Locale) {
  return dict[locale];
}

/** Fills `{key}` placeholders. Numbers are formatted by the caller. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}
