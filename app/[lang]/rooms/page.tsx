import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import RoomSpecs from "@/components/RoomSpecs";
import Showcase from "@/components/Showcase";
import JsonLd from "@/components/JsonLd";
import { units } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import { isLocale, localePath, locales } from "@/content/i18n";
import { breadcrumbs, pageMetadata } from "@/lib/seo";

/**
 * Rooms: one row per room, its first three photographs in a slider (as on
 * Facilities), the facts, and two ways on: Book now, and Discover for the
 * room's own page with every photograph.
 */

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/rooms">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "id";
  const t = getDict(locale);
  const bedrooms = Object.fromEntries(units.map((u) => [u.id, u.bedrooms]));
  return pageMetadata({
    locale,
    path: "rooms",
    title: t.seo.rooms.title,
    description: fill(t.seo.rooms.description, { villa: bedrooms.mainVilla, family: bedrooms.familyCabin }),
    image: "rooms",
  });
}

export default async function RoomsPage({ params }: PageProps<"/[lang]/rooms">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);

  return (
    <>
      <section className="sv-page">
        <h1 className="sr-only">{t.seo.rooms.title}</h1>

        <div className="sv-wrap">
          <div className="sv-rows">
            {units.map((unit, i) => {
              const href = localePath(lang, `rooms/${unit.slug}`);
              /* The outside of the building first, then two rooms inside. */
              const three = [unit.cover, ...unit.photos.filter((p) => p !== unit.cover)].slice(0, 3);
              return (
                <Showcase
                  key={unit.id}
                  id={unit.slug}
                  index={i}
                  locale={lang}
                  name={unit.name}
                  photos={three}
                  actions={
                    <>
                      <Link href={`${localePath(lang, "booking")}?unit=${unit.id}`} className="sv-btn sv-btn--primary sv-btn--sm">
                        <span>{t.common.bookNow}</span>
                        <ArrowRight size={16} strokeWidth={1.6} aria-hidden="true" />
                      </Link>
                      <Link href={href} className="sv-btn sv-btn--ghost sv-btn--sm">
                        <span>{t.rooms.discover}</span>
                        <ArrowRight size={16} strokeWidth={1.6} aria-hidden="true" />
                      </Link>
                    </>
                  }
                >
                  <div className="sv-row-copy">
                    <p>{t.rooms.notes[unit.id]}</p>
                  </div>
                  <RoomSpecs unit={unit} locale={lang} />
                </Showcase>
              );
            })}
          </div>
        </div>

        <div className="sv-wrap">
          <div className="sv-note">
            <Info size={18} strokeWidth={1.4} aria-hidden="true" />
            <div>
              <p className="sv-note-title">{t.rooms.priceTitle}</p>
              <p>{t.rooms.priceBody}</p>
            </div>
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbs(lang, [{ name: t.nav.rooms, path: "rooms" }])} />
    </>
  );
}
