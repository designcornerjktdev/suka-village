import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import Showcase from "@/components/Showcase";
import type { explore } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import { isLocale, locales } from "@/content/i18n";
import JsonLd from "@/components/JsonLd";
import PageNav from "@/components/PageNav";
import { breadcrumbs, pageMetadata } from "@/lib/seo";
import { getSection, paragraphs } from "@/lib/server/content";

/**
 * Explore: places near the estate, in the same rows as every other page,
 * from Admin → Konten → Jelajah (map link per place). The estate's own
 * address is on the Contact page, so it is not repeated here.
 *
 * The photographs are public landmarks, not the property. The owner asked for
 * no credit line under each place (revision of 28 October 2026), so the only
 * credits left are the ones a licence requires (CC BY-SA), in one small line
 * at the foot of the page. Unsplash and CC0 pictures need none.
 */

type ExplorePhoto = (typeof explore)[number]["photos"][number];
const hasCredit = (p: object): p is ExplorePhoto => "credit" in p;

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
  const spots = await getSection("explore");
  /* Licence credits for the photographs on the page that need one. */
  const mustCredit = spots.flatMap((s) => s.photos).filter(hasCredit).filter((p) => p.credit.license.startsWith("CC BY"));

  return (
    <>
      <section className="sv-page">
        <h1 className="sr-only">{t.seo.explore.title}</h1>
        <PageNav title={t.nav.explore} label={t.common.onThisPage} items={spots.map((spot) => ({ id: spot.id, label: spot.name[lang] }))} />
        <div className="sv-wrap">

          <div className="sv-rows">
            {spots.map((spot, i) => (
              <Showcase
                key={spot.id}
                id={spot.id}
                index={i}
                locale={lang}
                name={spot.name[lang]}
                photos={spot.photos}
                actions={
                  spot.link ? (
                    <a href={spot.link} target="_blank" rel="noopener noreferrer" className="sv-btn sv-btn--ghost sv-btn--sm">
                      <span>{t.common.openMap}</span>
                      <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" />
                    </a>
                  ) : undefined
                }
              >
                <div className="sv-row-copy">
                  {paragraphs(spot.body[lang]).map((p) => (
                    <p key={p}>{p}</p>
                  ))}
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
