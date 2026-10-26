/**
 * Where the site lives, and whether search engines are let in.
 *
 * One switch: SITE_URL, the real domain (https://..., no trailing slash). Set
 * it on the production deployment at launch and nowhere else. With it set,
 * the public pages are indexable and every canonical URL, hreflang link,
 * sitemap entry and share image points at that domain.
 *
 * Without it the site is treated as a preview: every page is noindex and
 * robots.txt turns crawlers away. That is the right state for the prototype,
 * whose bookings and payments are examples (lib/booking/config.ts), and it is
 * the default so a forgotten variable hides the site instead of publishing it.
 *
 * Read on the server only, and at build time for the static pages, so a change
 * needs a new deployment. No imports here on purpose: next.config.ts loads
 * this file too.
 */

const configured = process.env.SITE_URL?.trim().replace(/\/+$/, "") ?? "";

/* Vercel's own name for the production deployment, so share images and links
   still resolve on the prototype before a domain exists. */
const fallback = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const SITE_URL = configured || fallback;

/** False on previews and on any deployment that has no SITE_URL. */
export const INDEXABLE = configured !== "" && process.env.VERCEL_ENV !== "preview";
