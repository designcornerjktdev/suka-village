import type { MetadataRoute } from "next";
import { locales, localePath } from "@/content/i18n";
import { PUBLIC_PATHS, abs, sitemapLanguages } from "@/lib/seo";

/**
 * /sitemap.xml: every public page in both languages, each naming its
 * translation (hreflang), which is how Google pairs the two versions.
 *
 * Only pages that may be indexed are listed: no admin, no order pages, no
 * booking lookup. There is no lastmod because nothing here records when a
 * page last changed, and a made-up date teaches crawlers to ignore the field.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.flatMap((path) =>
    locales.map((locale) => ({
      url: abs(localePath(locale, path)),
      alternates: { languages: sitemapLanguages(path) },
    })),
  );
}
