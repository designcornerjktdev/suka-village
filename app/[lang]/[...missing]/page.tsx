import { notFound } from "next/navigation";

/**
 * Any address under /id or /en that is not a page. Sends it to not-found.tsx
 * in this folder's parent, which keeps the site's header and footer, instead
 * of Next's own unbranded 404.
 */
export default function Missing() {
  notFound();
}
