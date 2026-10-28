/**
 * Suka Village — facts, not copy.
 *
 * Everything here is language neutral and every entry is tagged:
 *   BRIEF   — the owner's website brief (Google Slides, "Suka Village Website
 *             Design") and the Drive folders it links
 *   OWNER   — published by the property itself (Airbnb, Instagram, Linktree)
 *   PENDING — placeholder, must be confirmed or replaced before launch
 *
 * Display strings live in content/dict.ts. Never promote a PENDING entry to the
 * page as fact without the owner confirming it. The running list of what still
 * needs replacing lives in REPLACE.md.
 */

/* OWNER — Instagram bio and post artwork */
export const brand = {
  name: "Suka Village",
} as const;

/* OWNER — Linktree, "Reservation Villa & Resto Here" */
export const whatsapp = { number: "6287726100010" } as const;

export function waHref(message: string) {
  return `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(message)}`;
}

/* --- Photography ----------------------------------------------------------
   BRIEF — every photograph of the property comes from the owner's Drive
   folders linked in the brief, resized for the web and nothing else. The only
   pictures that are not the property are the two places on the Explore page,
   which are public landmarks and are credited where they appear.
-------------------------------------------------------------------------- */

export type Photo = { src: string; alt: { id: string; en: string } };

const shot = (folder: string, n: string, id: string, en: string): Photo => ({
  src: `/photos/${folder}/${n}.jpg`,
  alt: { id, en },
});

export const photos = {
  home: [
    shot("home", "02", "Halaman berkabut dengan kolam ikan dan kabin beratap segitiga", "A misty courtyard with a fish pond and A-frame cabins"),
    shot("home", "01", "Villa bergaya rumah pedesaan berwarna hijau di antara pepohonan", "A green cottage-style villa among the trees"),
  ],
  mainVilla: [
    shot("main-villa", "03", "Ruang keluarga Main Villa dengan sofa dan tangga kayu", "The Main Villa living room with a sofa and wooden stairs"),
    shot("main-villa", "02", "Dapur Main Villa dengan kabinet hijau dan meja kayu", "The Main Villa kitchen with green cabinets and a wooden counter"),
    shot("main-villa", "09", "Ruang keluarga Main Villa dilihat dari lantai atas", "The Main Villa living room seen from upstairs"),
    shot("main-villa", "11", "Ruang tengah dengan TV dan lorong menuju kamar", "The family room with a TV and the hallway to the bedrooms"),
    shot("main-villa", "04", "Kamar tidur dengan double bed dan kepala ranjang kayu", "A bedroom with a double bed and a wooden headboard"),
    shot("main-villa", "05", "Kamar tidur dengan jendela lebar dan cahaya pagi", "A bedroom with wide windows and morning light"),
    shot("main-villa", "06", "Kamar tidur dengan kepala ranjang abu-abu", "A bedroom with a grey upholstered headboard"),
    shot("main-villa", "07", "Kamar tidur putih yang terang", "A bright white bedroom"),
    shot("main-villa", "08", "Kamar tidur dengan dinding hijau tua", "A bedroom with a deep green wall"),
    shot("main-villa", "10", "Kamar di bawah atap miring", "A room under the sloping roof"),
    shot("main-villa", "12", "Balkon Main Villa menghadap taman", "The Main Villa balcony overlooking the garden"),
    shot("main-villa", "01", "Tampak luar Main Villa, rumah dua lantai berwarna hijau", "The Main Villa from outside, a two-storey green house"),
  ],
  familyCabin: [
    shot("family-cabin", "09", "Ruang duduk Family Cabin dengan TV, di bawah atap segitiga", "The Family Cabin sitting room with a TV, under the A-frame roof"),
    shot("family-cabin", "10", "Kamar tidur dengan double bed dan bantal bergaris", "A bedroom with a double bed and striped pillows"),
    shot("family-cabin", "08", "Kamar tidur di bawah atap segitiga", "A bedroom under the A-frame roof"),
    shot("family-cabin", "06", "Tangga ke lantai atas dan meja makan kecil", "Stairs to the upper floor and a small dining table"),
    shot("family-cabin", "05", "Kamar mandi dengan shower kaca", "The bathroom with a glass shower"),
    shot("family-cabin", "07", "Wastafel dengan cermin bulat", "A washbasin with a round mirror"),
    shot("family-cabin", "04", "Teras Family Cabin dengan pintu kaca", "The Family Cabin terrace with glass doors"),
    shot("family-cabin", "01", "Tampak depan Family Cabin di antara tanaman", "The front of the Family Cabin among the plants"),
    shot("family-cabin", "11", "Kabin beratap segitiga di bawah pepohonan", "An A-frame cabin under the trees"),
  ],
  singleCabin: [
    shot("single-cabin", "03", "Kamar Single Cabin di bawah jendela segitiga", "The Single Cabin bedroom beneath its triangular window"),
    shot("single-cabin", "02", "Ruang di bawah loteng dengan TV dan tangga", "The space under the loft with a TV and stairs"),
    shot("single-cabin", "06", "Kamar tidur dengan lantai kayu", "A bedroom with a wooden floor"),
    shot("single-cabin", "07", "Meja kerja kecil dan TV", "A small desk and the TV"),
    shot("single-cabin", "04", "Kamar mandi berubin hijau dengan cermin bulat", "A green-tiled bathroom with a round mirror"),
    shot("single-cabin", "08", "Shower berubin hijau", "The green-tiled shower"),
    shot("single-cabin", "01", "Tampak depan Single Cabin dengan balkon", "The front of the Single Cabin with its balcony"),
    shot("single-cabin", "05", "Single Cabin beratap segitiga dari samping", "The A-frame Single Cabin from the side"),
  ],
  pool: [
    shot("pool", "03", "Kolam renang dengan kabin dan pepohonan di sekelilingnya", "The swimming pool with cabins and trees around it"),
    shot("pool", "02", "Dek kayu dengan kursi santai di tepi kolam", "A wooden deck with loungers beside the pool"),
    shot("pool", "01", "Tangga masuk kolam renang", "The steps into the swimming pool"),
  ],
  dining: [
    shot("dining", "01", "Restoran berdinding kaca dengan kursi kuning", "The glass-walled restaurant with yellow chairs"),
    shot("dining", "09", "Sepiring nasi, ayam bakar, dan sambal", "A plate of rice, grilled chicken and sambal"),
    shot("dining", "06", "Deretan sofa di sepanjang jendela restoran", "A row of sofas along the restaurant windows"),
    shot("dining", "10", "Nasi, sate, jagung, dan sayuran di atas piring", "Rice, satay, corn and vegetables on a plate"),
    shot("dining", "04", "Meja bar restoran dengan pemandangan taman", "The restaurant bar with a view of the garden"),
    shot("dining", "02", "Dapur terbuka di balik meja bar", "The open kitchen behind the bar"),
    shot("dining", "03", "Meja-meja restoran dengan cahaya alami", "Restaurant tables in natural light"),
    shot("dining", "05", "Lorong restoran dengan meja di kedua sisi", "The restaurant aisle with tables on both sides"),
    shot("dining", "07", "Ruang makan dengan langit-langit tinggi", "The dining room under a high ceiling"),
    shot("dining", "08", "Meja panjang untuk rombongan", "A long table for groups"),
  ],
  meeting: [
    shot("meeting", "01", "Ruang pertemuan beratap kayu dengan meja tersusun", "The meeting hall under a timber roof with tables set out"),
    shot("meeting", "02", "Ruang pertemuan dengan kursi tersusun berbaris", "The meeting hall with chairs set in rows"),
    shot("meeting", "03", "Meja panjang di ruang pertemuan", "Long tables in the meeting hall"),
  ],
  playground: [
    shot("playground", "01", "Ayunan dan perosotan kayu di atas rumput", "A wooden swing and slide on the grass"),
    shot("playground", "03", "Taman bermain dengan ayunan dan perosotan", "The playground with its swings and slide"),
    shot("playground", "02", "Ring gantung dari kayu", "Wooden hanging rings"),
  ],
  farm: [
    shot("farm", "07", "Seorang anak menyapa sapi di peternakan", "A child greeting a cow at the farm"),
    shot("farm", "08", "Sapi merumput di balik pagar kayu", "Cows grazing behind a wooden fence"),
    shot("farm", "04", "Kambing mengunyah rumput segar", "A goat chewing fresh grass"),
    shot("farm", "05", "Sapi di kandang, dari dekat", "A cow in its stall, up close"),
    shot("farm", "02", "Kandang panjang beratap genteng", "A long barn with a tiled roof"),
    shot("farm", "09", "Bangunan peternakan di tengah rumput", "Farm buildings on the grass"),
    shot("farm", "10", "Jalan setapak hijau di antara kandang", "A green path between the barns"),
    shot("farm", "11", "Deretan kandang dan menara kayu di tepi jalan berumput", "A row of barns and a wooden tower beside the grassy path"),
  ],
  atv: [
    shot("atv", "04", "Dua ATV melintasi padang rumput", "Two ATVs crossing a grassy field"),
    shot("atv", "01", "ATV di jalur tanah di antara rumput", "An ATV on a dirt trail through the grass"),
    shot("atv", "02", "Pengendara ATV di jalur hijau", "An ATV rider on a green trail"),
    shot("atv", "03", "Dua orang berkendara ATV", "Two people riding an ATV"),
  ],
  garden: [
    shot("garden", "01", "Tangan bersarung memegang nanas di kebun", "A gloved hand holding a pineapple in the garden"),
    shot("garden", "02", "Memetik jeruk dari pohonnya dengan gunting", "Cutting a citrus fruit from the tree"),
    shot("garden", "03", "Bedengan sayuran berbaris di kebun", "Rows of vegetable beds in the garden"),
  ],
  bbq: [
    shot("bbq", "02", "Api menyala di atas panggangan berisi daging", "Flames rising over a grill of meat"),
    shot("bbq", "03", "Tamu makan malam di meja kayu di bawah lampu gantung", "Guests at wooden tables under string lights in the evening"),
  ],
  gift: [
    shot("gift", "02", "Tas kain hijau Suka Village diserahkan di depan papan nama", "A green Suka Village tote handed over in front of the sign"),
  ],
  corporate: [
    shot("corporate", "03", "Rombongan kantor makan bersama di taman", "A company group sharing a meal in the garden"),
    shot("corporate", "04", "Permainan tim di halaman berumput", "Team games on the lawn"),
    shot("corporate", "05", "Peserta bermain bersama di lapangan", "Participants playing together on the field"),
    shot("corporate", "06", "Foto bersama rombongan perusahaan", "A group photo of a company outing"),
    shot("corporate", "01", "Acara malam di bawah tenda yang terang", "An evening event under a lit marquee"),
    shot("corporate", "02", "Berkumpul di sekitar api unggun", "Gathering around a bonfire"),
  ],
} satisfies Record<string, Photo[]>;

/* --- Rooms ------------------------------------------------------------------
   BRIEF — sizes, bedrooms, bathrooms and the amenity list are the owner's own,
   word for word. The brief gives the Main Villa three bedrooms; the Airbnb
   listing said four. The brief is newer and is what the site shows
   (REPLACE.md #7).
-------------------------------------------------------------------------- */

export type Feature =
  | "living"
  | "balcony"
  | "terrace"
  | "ac"
  | "tv"
  | "shower"
  | "amenities"
  | "kitchen"
  | "teaCoffee"
  | "wifi"
  | "noSmoking";

const cabinFeatures: Feature[] = ["balcony", "terrace", "ac", "tv", "shower", "amenities", "teaCoffee", "wifi", "noSmoking"];

export const units = [
  {
    id: "mainVilla",
    slug: "main-villa",
    name: "Main Villa",
    size: 150,
    bedrooms: 3,
    bathrooms: 2,
    features: ["living", "balcony", "terrace", "ac", "tv", "shower", "amenities", "kitchen", "teaCoffee", "wifi", "noSmoking"] as Feature[],
    photos: photos.mainVilla,
    /* The outside of the house, for cards where the building is the point. */
    cover: photos.mainVilla[11],
  },
  {
    id: "familyCabin",
    slug: "family-cabin",
    name: "Family Cabin",
    size: 60,
    bedrooms: 2,
    bathrooms: 1,
    features: cabinFeatures,
    photos: photos.familyCabin,
    cover: photos.familyCabin[8],
  },
  {
    id: "singleCabin",
    slug: "single-cabin",
    name: "Single Cabin",
    size: 30,
    bedrooms: 1,
    bathrooms: 1,
    features: cabinFeatures,
    photos: photos.singleCabin,
    cover: photos.singleCabin[7],
  },
] as const;

export type UnitId = (typeof units)[number]["id"];

export const totalBedrooms = units.reduce((n, u) => n + u.bedrooms, 0);

/* --- Facilities -------------------------------------------------------------
   BRIEF — the shop is listed as "kalau ada" (if there is one). Until the owner
   confirms it exists it stays off the page: a guest who plans around a shop
   that is not there has been misled (REPLACE.md #13).
-------------------------------------------------------------------------- */

export const SHOP_CONFIRMED = false;

/* Padel Court and Equestrian House are being built (MoM 26 Oct 2026): listed
   as coming soon, with their icon until there are photographs of them. */

export const facilities = [
  { id: "pool", photos: photos.pool },
  { id: "dining", photos: [photos.dining[0], photos.dining[6], photos.dining[4]] },
  { id: "meeting", photos: photos.meeting },
  { id: "playground", photos: photos.playground },
  { id: "padel", photos: [] as Photo[], soon: true },
  { id: "equestrian", photos: [] as Photo[], soon: true },
  { id: "shop", photos: [] as Photo[] },
] as const;

export type FacilityId = (typeof facilities)[number]["id"];

export const listedFacilities = facilities.filter((f) => f.id !== "shop" || SHOP_CONFIRMED);

/* --- Experiences ------------------------------------------------------------
   BRIEF — the 21 October 2026 revision linked a Drive folder for Garden, Farm,
   BBQ and the parting gift; each shows the photographs in its folder.
-------------------------------------------------------------------------- */

export const experiences = [
  { id: "garden", photos: photos.garden },
  { id: "farm", photos: photos.farm },
  { id: "atv", photos: photos.atv },
  { id: "bbq", photos: photos.bbq },
  { id: "gift", photos: photos.gift },
] as const;

export type ExperienceId = (typeof experiences)[number]["id"];

/* --- Events -----------------------------------------------------------------
   BRIEF — Family Gathering photographs are "menyusul" (to follow). Until they
   arrive it shows the real rooms a family gathering uses: the villa's living
   room, the restaurant, the playground and the pool, captioned as what they
   are (REPLACE.md #14).
-------------------------------------------------------------------------- */

export const events = [
  { id: "corporate", photos: photos.corporate },
  {
    id: "family",
    photos: [photos.mainVilla[0], photos.dining[0], photos.playground[0], photos.pool[0]],
  },
] as const;

export type EventId = (typeof events)[number]["id"];

/* --- Explore ----------------------------------------------------------------
   BRIEF names the first two places and the 21 October 2026 revision the third;
   the descriptions are ours and avoid distances
   the owner has not given. The photographs are of the landmarks, not the
   property. Only CC BY-SA ones are credited, in one line at the foot of the
   Explore page (the owner asked for no credit under each place).
-------------------------------------------------------------------------- */

export type Credit = { by: string; source: string; license: string; href: string };

export const explore = [
  {
    id: "situGunung",
    name: "Situ Gunung",
    mapHref: "https://maps.google.com/?q=Situ+Gunung+Suspension+Bridge+Sukabumi",
    photos: [
      {
        src: "/photos/explore/situ-gunung.jpg",
        alt: { id: "Jembatan gantung Situ Gunung melintas di atas hutan berkabut", en: "The Situ Gunung suspension bridge crossing a misty forest" },
        credit: { by: "Azinumoto", source: "Unsplash", license: "Unsplash License", href: "https://unsplash.com/photos/bg_OOc1HjEA" },
      },
    ],
  },
  {
    id: "gunungPadang",
    name: "Gunung Padang",
    mapHref: "https://maps.google.com/?q=Situs+Megalitikum+Gunung+Padang+Cianjur",
    photos: [
      {
        src: "/photos/explore/gunung-padang.jpg",
        alt: { id: "Teras batu situs megalitikum Gunung Padang di bawah langit biru", en: "The stone terraces of the Gunung Padang megalithic site under a blue sky" },
        credit: { by: "Arie Basuki", source: "Wikimedia Commons", license: "CC BY-SA 4.0", href: "https://commons.wikimedia.org/wiki/File:Situs_Gunung_Padang.jpg" },
      },
      {
        src: "/photos/explore/gunung-padang-terrace.jpg",
        alt: { id: "Teras teratas Gunung Padang dengan perbukitan di kejauhan", en: "The top terrace of Gunung Padang with hills in the distance" },
        credit: { by: "Beeyan", source: "Wikimedia Commons", license: "CC BY-SA 3.0", href: "https://commons.wikimedia.org/wiki/File:Gunung_Padang_5th_terrace.jpeg" },
      },
    ],
  },
  {
    /* Added in the 21 October 2026 revision. Facts from visitsukabumi.com:
       Desa Semplak, Kec. Sukalarang, about 1,000 m, pine forest, camping. */
    id: "bukitSabak",
    name: "Bukit Sabak",
    mapHref: "https://maps.google.com/?q=Bukit+Sabak+Sukalarang+Sukabumi",
    photos: [
      {
        src: "/photos/explore/bukit-sabak.jpg",
        alt: { id: "Gunung Gede dilihat dari Bukit Sabak", en: "Mount Gede seen from Bukit Sabak" },
        credit: { by: "Afrogindahood", source: "Wikimedia Commons", license: "CC0", href: "https://commons.wikimedia.org/wiki/File:Mount_Gede_Sabak_Hill_2018.jpg" },
      },
    ],
  },
] as const;

export type ExploreId = (typeof explore)[number]["id"];

/* OWNER — Linktree location entry and Airbnb listing. */
export const place = {
  address:
    "Kp. Cikereteuw, RT.02/RW.04, Sukalarang, Kec. Sukalarang, Kabupaten Sukabumi, Jawa Barat",
  /* The same address in parts, for structured data. There is no postal code
     and no coordinates because the owner has given neither (REPLACE.md #31). */
  street: "Kp. Cikereteuw, RT.02/RW.04, Sukalarang",
  regency: "Kabupaten Sukabumi",
  province: "Jawa Barat",
  country: "ID",
  plusCode: "42C5+CV5",
  mapHref: "https://maps.google.com/?q=42C5%2BCV5+Sukalarang+Sukabumi",
} as const;

/* OWNER — Instagram and Threads */
export const social = {
  instagram: "https://www.instagram.com/sukavillage/",
  handle: "@sukavillage",
} as const;

/** The gallery: the property only, in the order a visit tends to run. */
export const gallery: Photo[] = [
  photos.home[0],
  photos.mainVilla[11],
  photos.mainVilla[0],
  photos.mainVilla[1],
  photos.mainVilla[4],
  photos.mainVilla[10],
  photos.familyCabin[8],
  photos.familyCabin[0],
  photos.familyCabin[1],
  photos.singleCabin[6],
  photos.singleCabin[0],
  photos.singleCabin[4],
  photos.pool[0],
  photos.pool[1],
  photos.dining[0],
  photos.dining[1],
  photos.dining[3],
  photos.meeting[0],
  photos.playground[0],
  photos.garden[0],
  photos.garden[1],
  photos.farm[0],
  photos.farm[1],
  photos.farm[2],
  photos.atv[0],
  photos.atv[1],
  photos.bbq[0],
  photos.bbq[1],
  photos.gift[0],
  photos.corporate[1],
  photos.corporate[4],
  photos.home[1],
];

/**
 * The photograph that stands for each page when its link is shared (og:image).
 * scripts/og-images.mjs crops each one to 1200×630 as public/og/<key>.jpg; run
 * it again after changing an entry. The Explore page shows the estate rather
 * than a landmark, so a shared link never passes a public place off as the
 * property.
 */
export const share = {
  home: photos.home[0],
  rooms: photos.home[1],
  mainVilla: photos.mainVilla[11],
  familyCabin: photos.familyCabin[8],
  singleCabin: photos.singleCabin[7],
  facilities: photos.pool[0],
  experience: photos.atv[0],
  explore: photos.pool[1],
  event: photos.meeting[0],
  gallery: photos.dining[0],
} satisfies Record<string, Photo>;

export type ShareKey = keyof typeof share;
