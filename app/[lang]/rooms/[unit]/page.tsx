import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Info } from "lucide-react";
import RoomSpecs from "@/components/RoomSpecs";
import Slides from "@/components/Slides";
import JsonLd from "@/components/JsonLd";
import { units, waHref } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import { isLocale, localePath, locales } from "@/content/i18n";
import { breadcrumbs, pageMetadata, roomMeta, roomSchema } from "@/lib/seo";

/**
 * One room, reached from "Discover". As on the owner's reference
 * (adhisthanahotel.com/rooms/deluxe-king): every photograph in one wide
 * slider under the header, moved sideways, and the room's details below it,
 * the description and the two ways forward (Book now, or a question on
 * WhatsApp) on one side, what is in the room and the note on rates on the
 * other.
 */

export function generateStaticParams() {
  return locales.flatMap((lang) => units.map((unit) => ({ lang, unit: unit.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/rooms/[unit]">): Promise<Metadata> {
  const { lang, unit } = await params;
  const found = units.find((u) => u.slug === unit);
  if (!found) return {};
  const locale = isLocale(lang) ? lang : "id";
  return pageMetadata({ locale, path: `rooms/${found.slug}`, ...roomMeta(locale, found), image: found.id });
}

export default async function RoomPage({ params }: PageProps<"/[lang]/rooms/[unit]">) {
  const { lang, unit } = await params;
  if (!isLocale(lang)) notFound();
  const found = units.find((u) => u.slug === unit);
  if (!found) notFound();
  const t = getDict(lang);
  const others = units.filter((u) => u.id !== found.id);
  const ask = fill(t.rooms.askMessage, { name: found.name });
  const all = [found.cover, ...found.photos.filter((p) => p !== found.cover)];

  return (
    <>
      <section className="sv-page">
        <div className="sv-wrap">
          <Link href={localePath(lang, "rooms")} className="sv-backlink">
            <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
            {t.rooms.all}
          </Link>

          <div className="sv-room-slider">
            <Slides photos={all} locale={lang} name={found.name} sizes="(min-width: 900px) 70vw, 100vw" priority peek />
          </div>

          <div className="sv-room">
            <div className="sv-room-main">
              <h1 className="sv-row-title">{found.name}</h1>
              <p className="sv-room-facts tnum">
                {found.size} m² · {found.bedrooms} {found.bedrooms === 1 ? t.rooms.bedroomShortOne : t.rooms.bedroomsShort}
              </p>
              <div className="sv-row-copy">
                <p>{t.rooms.notes[found.id]}</p>
              </div>
              <div className="sv-show-actions">
                <Link href={`${localePath(lang, "booking")}?unit=${found.id}`} className="sv-btn sv-btn--primary">
                  <span>{t.common.bookNow}</span>
                  <ArrowRight size={16} strokeWidth={1.6} aria-hidden="true" />
                </Link>
                <a href={waHref(ask)} target="_blank" rel="noopener noreferrer" className="sv-btn sv-btn--ghost">
                  <span>{t.rooms.ask}</span>
                  <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="sv-room-side">
              <h2 className="sv-label sv-room-specs-title">{t.rooms.specsTitle}</h2>
              <RoomSpecs unit={found} locale={lang} />
              <div className="sv-note sv-note--inline">
                <Info size={18} strokeWidth={1.4} aria-hidden="true" />
                <div>
                  <p className="sv-note-title">{t.rooms.priceTitle}</p>
                  <p>{t.rooms.priceBody}</p>
                </div>
              </div>
            </div>
          </div>

          {/* On a phone the details run long under the slider, so the way to
              book this room rides along at the foot of the screen. */}
          <div className="sv-room-dock">
            <div>
              <p className="sv-room-dock-name">{found.name}</p>
              <p className="sv-room-dock-meta tnum">
                {found.size} m² · {found.bedrooms} {found.bedrooms === 1 ? t.rooms.bedroomShortOne : t.rooms.bedroomsShort}
              </p>
            </div>
            <Link href={`${localePath(lang, "booking")}?unit=${found.id}`} className="sv-btn sv-btn--primary sv-btn--sm">
              <span>{t.common.bookNow}</span>
              <ArrowRight size={16} strokeWidth={1.6} aria-hidden="true" />
            </Link>
          </div>

          <div className="sv-others">
            <h2 className="sv-label">{t.rooms.others}</h2>
            <ul className="sv-around">
              {others.map((other) => (
                <li key={other.id}>
                  <Link href={localePath(lang, `rooms/${other.slug}`)} className="sv-tile sv-tile--wide">
                    <span className="sv-tile-media">
                      <Image src={other.cover.src} alt={other.cover.alt[lang]} fill sizes="(min-width: 900px) 44vw, 92vw" className="sv-photo" />
                    </span>
                    <span className="sv-tile-name">
                      {other.name}
                      <span className="sv-tile-meta tnum">
                        {other.size} m² · {other.bedrooms} {other.bedrooms === 1 ? t.rooms.bedroomShortOne : t.rooms.bedroomsShort}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <JsonLd
        data={breadcrumbs(lang, [
          { name: t.nav.rooms, path: "rooms" },
          { name: found.name, path: `rooms/${found.slug}` },
        ])}
      />
      <JsonLd data={roomSchema(lang, found)} />
    </>
  );
}
