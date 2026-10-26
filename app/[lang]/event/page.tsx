import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Showcase from "@/components/Showcase";
import { events, waHref } from "@/content/site";
import { getDict } from "@/content/dict";
import { isLocale, localePath, locales } from "@/content/i18n";
import JsonLd from "@/components/JsonLd";
import { breadcrumbs, pageMetadata } from "@/lib/seo";

/**
 * Event (ref: greenhosthotel.com): corporate and family gatherings, with the
 * owner's copy. An event is arranged in conversation, so the action here is a
 * question on WhatsApp with the event already named, not a booking form.
 */

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/event">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "id";
  const t = getDict(locale);
  return pageMetadata({ locale, path: "event", ...t.seo.event, image: "event" });
}

export default async function EventPage({ params }: PageProps<"/[lang]/event">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);

  return (
    <>
      <section className="sv-page">
        <div className="sv-wrap">
          <h1 className="sr-only">{t.seo.event.title}</h1>

          <div className="sv-rows">
            {events.map((e, i) => (
              <Showcase
                key={e.id}
                id={e.id}
                index={i}
                locale={lang}
                name={t.event.names[e.id]}
                photos={e.photos}
                actions={
                  <>
                    <a href={waHref(t.event.message[e.id])} target="_blank" rel="noopener noreferrer" className="sv-btn sv-btn--primary sv-btn--sm">
                      <span>{t.event.ask}</span>
                      <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" />
                    </a>
                    {e.id === "corporate" ? (
                      <Link href={`${localePath(lang, "facilities")}#meeting`} className="sv-textlink">
                        {t.facilities.names.meeting}
                        <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
                      </Link>
                    ) : null}
                  </>
                }
              >
                <div className="sv-row-copy">
                  {t.event.copy[e.id].map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                </div>
              </Showcase>
            ))}
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbs(lang, [{ name: t.nav.event, path: "event" }])} />
    </>
  );
}
