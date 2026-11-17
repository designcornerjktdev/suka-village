import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shapes } from "lucide-react";
import Showcase from "@/components/Showcase";
import { facilityIcon } from "@/components/Icons";
import { getDict } from "@/content/dict";
import { isLocale, locales } from "@/content/i18n";
import JsonLd from "@/components/JsonLd";
import PageNav from "@/components/PageNav";
import { breadcrumbs, pageMetadata } from "@/lib/seo";
import { getSection, paragraphs } from "@/lib/server/content";

/**
 * Facilities, in the same alternating rows as the rooms (ref:
 * adhisthanahotel.com/facilities), with the owner's own copy for each. What
 * is listed, in what order, and what is marked "Segera hadir" is edited in
 * Admin → Konten → Fasilitas (the shop starts hidden until it is confirmed).
 */

/* A facility added in the CMS has no drawn icon: the playground's shapes stand in. */
const iconFor = (id: string) => facilityIcon[id as keyof typeof facilityIcon] ?? Shapes;

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
  const items = await getSection("facilities");

  return (
    <>
      <section className="sv-page">
        <h1 className="sr-only">{t.seo.facilities.title}</h1>
        <PageNav title={t.nav.facilities} label={t.common.onThisPage} items={items.map((f) => ({ id: f.id, label: f.name[lang] }))} />
        <div className="sv-wrap">

          <div className="sv-rows">
            {items.map((f, i) => (
              <Showcase
                key={f.id}
                id={f.id}
                index={i}
                locale={lang}
                name={f.name[lang]}
                photos={f.photos}
                panel={{ Icon: iconFor(f.id), word: f.name[lang], note: f.soon ? t.common.soon : "" }}
                soon={f.soon ? t.common.soon : undefined}
              >
                <div className="sv-row-copy">
                  {paragraphs(f.body[lang]).map((p) => (
                    <p key={p}>{p}</p>
                  ))}
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
