import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Showcase from "@/components/Showcase";
import { experiences } from "@/content/site";
import { getDict } from "@/content/dict";
import { isLocale, locales } from "@/content/i18n";
import JsonLd from "@/components/JsonLd";
import PageNav from "@/components/PageNav";
import { breadcrumbs, pageMetadata } from "@/lib/seo";

/**
 * Experience: a slider and a column of text per activity, alternating sides.
 * No Book now under them: the owner asked for it to go (21 October 2026), so
 * an activity is not mistaken for something booked on its own. Booking stays
 * in the header.
 */

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/experience">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "id";
  const t = getDict(locale);
  return pageMetadata({ locale, path: "experience", ...t.seo.experience, image: "experience" });
}

export default async function ExperiencePage({ params }: PageProps<"/[lang]/experience">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);

  return (
    <>
      <section className="sv-page">
        <h1 className="sr-only">{t.seo.experience.title}</h1>
        <PageNav title={t.nav.experience} label={t.common.onThisPage} items={experiences.map((x) => ({ id: x.id, label: t.experience.names[x.id] }))} />
        <div className="sv-wrap">

          <div className="sv-rows">
            {experiences.map((x, i) => (
              <Showcase
                key={x.id}
                id={x.id}
                index={i}
                locale={lang}
                name={t.experience.names[x.id]}
                photos={x.photos}
              >
                <div className="sv-row-copy">
                  <p>{t.experience.copy[x.id]}</p>
                </div>
              </Showcase>
            ))}
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbs(lang, [{ name: t.nav.experience, path: "experience" }])} />
    </>
  );
}
