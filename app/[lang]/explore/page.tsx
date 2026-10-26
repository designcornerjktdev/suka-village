import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import Showcase from "@/components/Showcase";
import { explore } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import { isLocale, locales } from "@/content/i18n";
import JsonLd from "@/components/JsonLd";
import { breadcrumbs, pageMetadata } from "@/lib/seo";

/**
 * Explore: three places near the estate (Situ Gunung, Gunung Padang, and
 * Bukit Sabak since the 21 October 2026 revision), in the same rows as every
 * other page. These are public landmarks, not the property, so each picture
 * is credited beside it as its licence asks. The estate's own address is on
 * the Contact page, so it is not repeated here.
 */

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/explore">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "id";
  const t = getDict(locale);
  return pageMetadata({ locale, path: "explore", ...t.seo.explore, image: "explore" });
}

export default async function ExplorePage({ params }: PageProps<"/[lang]/explore">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);

  return (
    <>
      <section className="sv-page">
        <div className="sv-wrap">
          <h1 className="sr-only">{t.seo.explore.title}</h1>

          <div className="sv-rows">
            {explore.map((spot, i) => (
              <Showcase
                key={spot.id}
                id={spot.id}
                index={i}
                locale={lang}
                name={spot.name}
                photos={spot.photos}
                actions={
                  <a href={spot.mapHref} target="_blank" rel="noopener noreferrer" className="sv-btn sv-btn--ghost sv-btn--sm">
                    <span>{t.common.openMap}</span>
                    <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" />
                  </a>
                }
              >
                <div className="sv-row-copy">
                  <p>{t.explore.copy[spot.id]}</p>
                </div>
                <ul className="sv-credits">
                  {spot.photos.map((photo) => (
                    <li key={photo.src}>
                      <a href={photo.credit.href} target="_blank" rel="noopener noreferrer">
                        {fill(t.common.photoBy, photo.credit)}
                      </a>
                    </li>
                  ))}
                </ul>
              </Showcase>
            ))}
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbs(lang, [{ name: t.nav.explore, path: "explore" }])} />
    </>
  );
}
