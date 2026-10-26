import type { NextConfig } from "next";
import { INDEXABLE } from "./lib/site-url";

/* The brief renamed "Stay" to "Rooms" and gave rooms readable slugs. The old
   paths still land somewhere useful. Temporary until launch, so a browser
   that has seen them does not cache the move forever. */
const movedRooms = [
  ["mainVilla", "main-villa"],
  ["familyCabin", "family-cabin"],
  ["singleCabin", "single-cabin"],
] as const;

/* Pages a search engine must never list say so in a header as well as in
   their own metadata, so it holds for anything served under the path: a 404,
   a redirect, a file. */
const hidden = (value: string) => [{ key: "X-Robots-Tag", value }];

const nextConfig: NextConfig = {
  /* AVIF where the browser takes it (most phones now), WebP otherwise: the
     same photographs at a fraction of the bytes. */
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
  },
  headers() {
    return [
      { source: "/admin/:path*", headers: hidden("noindex, nofollow") },
      /* Order status and booking lookup. /[lang]/booking itself stays open. */
      { source: "/:lang(id|en)/booking/:rest+", headers: hidden("noindex") },
      /* Without SITE_URL this is a preview, and nothing on it is indexed. */
      ...(INDEXABLE ? [] : [{ source: "/:path*", headers: hidden("noindex, nofollow") }]),
    ];
  },
  redirects() {
    return [
      /* The admin has no dashboard: it opens on the bookings. */
      { source: "/admin", destination: "/admin/bookings", permanent: false },
      { source: "/:lang(id|en)/stay", destination: "/:lang/rooms", permanent: false },
      ...movedRooms.map(([from, to]) => ({
        source: `/:lang(id|en)/stay/${from}`,
        destination: `/:lang/rooms/${to}`,
        permanent: false,
      })),
    ];
  },
};

export default nextConfig;
