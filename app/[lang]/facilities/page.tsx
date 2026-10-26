import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Showcase from "@/components/Showcase";
import { facilityIcon } from "@/components/Icons";
import { listedFacilities } from "@/content/site";
import { getDict } from "@/content/dict";
import { isLocale, locales } from "@/content/i18n";
import JsonLd from "@/components/JsonLd";
import { breadcrumbs, pageMetadata } from "@/lib/seo";

/**
 * Facilities, in the same alternating rows as the rooms (ref:
 * adhisthanahotel.com/facilities), with the owner's own copy for each. The
 * shop is listed in the brief as "kalau ada" and stays off the page until it
 * is confirmed (SHOP_CONFIRMED in content/site.ts).
 */

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
        <div className="sv-wrap">
          <h1 className="sr-only">{t.seo.facilities.title}</h1>

          <div className="sv-rows">
            {listedFacilities.map((f, i) => (
              <Showcase
                key={f.id}
                id={f.id}
                index={i}
                locale={lang}
                name={t.facilities.names[f.id]}
                photos={f.photos}
                panel={{ Icon: facilityIcon[f.id], word: t.facilities.names[f.id], note: "" }}
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
