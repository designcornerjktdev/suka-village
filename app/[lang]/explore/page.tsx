import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import Showcase from "@/components/Showcase";
import { explore } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import { isLocale, locales } from "@/content/i18n";
import JsonLd from "@/components/JsonLd";
import PageNav from "@/components/PageNav";
import { breadcrumbs, pageMetadata } from "@/lib/seo";

/**
 * Explore: three places near the estate (Situ Gunung, Gunung Padang, and
 * Bukit Sabak since the 21 October 2026 revision), in the same rows as every
 * other page. The estate's own address is on the Contact page, so it is not
 * repeated here.
 *
 * The photographs are public landmarks, not the property. The owner asked for
 * no credit line under each place (revision of 28 October 2026), so the only
 * credits left are the ones a licence requires (CC BY-SA), in one small line
 * at the foot of the page. Unsplash and CC0 pictures need none.
 */

type ExplorePhoto = (typeof explore)[number]["photos"][number];
const mustCredit = explore.flatMap((spot): readonly ExplorePhoto[] => spot.photos).filter((p) => p.credit.license.startsWith("CC BY"));

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
        <h1 className="sr-only">{t.seo.explore.title}</h1>
        <PageNav title={t.nav.explore} label={t.common.onThisPage} items={explore.map((spot) => ({ id: spot.id, label: spot.name }))} />
        <div className="sv-wrap">

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
              </Showcase>
            ))}
          </div>

          {mustCredit.length ? (
            <p className="sv-page-credits">
              {mustCredit.map((photo, i) => (
                <span key={photo.src}>
                  {i ? " · " : null}
                  <a href={photo.credit.href} target="_blank" rel="noopener noreferrer">
                    {fill(t.common.photoBy, photo.credit)}
                  </a>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </section>
      <JsonLd data={breadcrumbs(lang, [{ name: t.nav.explore, path: "explore" }])} />
    </>
  );
}
