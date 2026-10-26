import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/site-url";

/**
 * /robots.txt.
 *
 * On the real domain: everything public may be crawled; the admin and the
 * private booking pages (order status, booking lookup) may not. Those pages
 * also answer with noindex (next.config.ts and their own metadata), so they
 * stay out of search results even if a link to one turns up somewhere.
 * /[lang]/booking itself, the start of the flow, stays open.
 *
 * Anywhere else (the prototype, previews) crawlers are turned away entirely.
 */
export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/*/booking/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
