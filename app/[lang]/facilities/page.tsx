import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Showcase from "@/components/Showcase";
import { facilityIcon } from "@/components/Icons";
import { listedFacilities } from "@/content/site";
import { getDict } from "@/content/dict";
import { isLocale, locales } from "@/content/i18n";
import JsonLd from "@/components/JsonLd";
import PageNav from "@/components/PageNav";
import { breadcrumbs, pageMetadata } from "@/lib/seo";

/**
 * Facilities, in the same alternating rows as the rooms (ref:
 * adhisthanahotel.com/facilities), with the owner's own copy for each. The
 * shop is listed in the brief as "kalau ada" and stays off the page until it
 * is confirmed (SHOP_CONFIRMED in content/site.ts). Facilities still being
 * built (Padel Court, Equestrian House) are listed, marked "Segera hadir".
 */

const soon = (f: (typeof listedFacilities)[number]) => "soon" in f && f.soon;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/facilities">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "id";
  const t = getDict(locale);
  return pageMetadata({ locale, path: "facilities", ...t.seo.facilities, image: "facilities" });
}

export default async function FacilitiesPage({ params }: PageProps<"/[lang]/facilities">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);

  return (
    <>
      <section className="sv-page">
        <h1 className="sr-only">{t.seo.facilities.title}</h1>
        <PageNav
          title={t.nav.facilities}
          label={t.common.onThisPage}
          items={listedFacilities.map((f) => ({ id: f.id, label: t.facilities.names[f.id] }))}
        />
        <div className="sv-wrap">

          <div className="sv-rows">
            {listedFacilities.map((f, i) => (
              <Showcase
                key={f.id}
                id={f.id}
                index={i}
                locale={lang}
                name={t.facilities.names[f.id]}
                photos={f.photos}
                panel={{ Icon: facilityIcon[f.id], word: t.facilities.names[f.id], note: soon(f) ? t.common.soon : "" }}
                soon={soon(f) ? t.common.soon : undefined}
              >
                <div className="sv-row-copy">
                  <p>{t.facilities.copy[f.id]}</p>
                </div>
              </Showcase>
            ))}
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbs(lang, [{ name: t.nav.facilities, path: "facilities" }])} />
    </>
  );
}
