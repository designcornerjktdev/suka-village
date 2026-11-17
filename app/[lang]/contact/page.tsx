import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import PageNav from "@/components/PageNav";
import Showcase from "@/components/Showcase";
import { photos, place, social, waHref, whatsapp } from "@/content/site";
import { getDict } from "@/content/dict";
import { isLocale, locales } from "@/content/i18n";
import { formatPhone } from "@/lib/booking/format";
import { breadcrumbs, pageMetadata } from "@/lib/seo";
import { getSection, getWhatsapp, paragraphs } from "@/lib/server/content";

/**
 * Contact, in the same rows as every other page but unnumbered (two rows are
 * not a list): one for reaching the estate (WhatsApp, which the owner answers
 * for bookings and questions, and Instagram), one for finding it, with the
 * map where a photograph would be. No form: there is no inbox for one to land
 * in yet.
 *
 * The map is Google's embed, searched by the estate's plus code, so it needs
 * no API key. It loads lazily, only when the reader reaches it, and is set a
 * little high in its frame so the place card Google draws in its corner sits
 * out of view; the button beside it opens the full map.
 */

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "id";
  const t = getDict(locale);
  return pageMetadata({ locale, path: "contact", ...t.seo.contact, image: "home" });
}


export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const c = t.contact;
  /* The two rows as edited in Admin → Konten → Kontak; the site's own text and
     photograph stand in for anything the CMS leaves empty. */
  const items = await getSection("contact");
  const reserve = items.find((i) => i.id === "reserve");
  const location = items.find((i) => i.id === "location");
  const welcome = reserve?.photos[0] ?? photos.home[1];
  const instagram = reserve?.link || social.instagram;
  const plusCode = location?.plusCode || place.plusCode;
  const mapHref = location?.link || place.mapHref;
  const MAP_QUERY = `${plusCode} Sukalarang, Sukabumi`;
  /* The WhatsApp number is set in Admin → Pengaturan (IA: C6). */
  const phone = (await getWhatsapp()) || `+${whatsapp.number}`;

  return (
    <>
      <section className="sv-page">
        <h1 className="sr-only">{t.seo.contact.title}</h1>
        <PageNav
          title={t.nav.contact}
          label={t.common.onThisPage}
          items={[
            { id: "reservasi", label: reserve?.name[lang] || c.reserveTitle },
            { id: "lokasi", label: location?.name[lang] || c.location },
          ]}
        />
        <div className="sv-wrap">
          <div className="sv-rows">
            <Showcase
              id="reservasi"
              index={0}
              numbered={false}
              locale={lang}
              name={reserve?.name[lang] || c.reserveTitle}
              media={
                <Image
                  src={welcome.src}
                  alt={welcome.alt[lang]}
                  fill
                  loading="eager"
                  fetchPriority="high"
                  sizes="(min-width: 900px) 56vw, 100vw"
                  className="sv-photo"
                />
              }
              actions={
                <>
                  <a href={waHref(t.common.waHello)} target="_blank" rel="noopener noreferrer" className="sv-btn sv-btn--primary sv-btn--sm">
                    <span>{c.chat}</span>
                    <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" />
                  </a>
                  <a href={instagram} target="_blank" rel="noopener noreferrer" className="sv-textlink">
                    Instagram {social.handle}
                    <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
                  </a>
                </>
              }
            >
              <div className="sv-row-copy">
                {paragraphs(reserve?.body[lang] || c.reserveCopy).map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <a href={waHref(t.common.waHello)} target="_blank" rel="noopener noreferrer" className="sv-contact-number tnum">
                {formatPhone(phone)}
              </a>
            </Showcase>

            <Showcase
              id="lokasi"
              index={1}
              numbered={false}
              locale={lang}
              name={location?.name[lang] || c.location}
              media={
                <div className="sv-contact-map">
                  <iframe
                    title={c.mapTitle}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&z=14&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              }
              actions={
                <a href={mapHref} target="_blank" rel="noopener noreferrer" className="sv-btn sv-btn--primary sv-btn--sm">
                  <span>{c.route}</span>
                  <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" />
                </a>
              }
            >
              <div className="sv-row-copy">
                {paragraphs(location?.body[lang] || place.address).map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <p className="sv-contact-plus tnum">Plus code {plusCode}</p>
            </Showcase>
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbs(lang, [{ name: t.nav.contact, path: "contact" }])} />
    </>
  );
}
