import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import BookingFlow from "@/components/booking/BookingFlow";
import { plain } from "@/components/tokens";
import { getDict } from "@/content/dict";
import { isLocale, locales } from "@/content/i18n";
import JsonLd from "@/components/JsonLd";
import { breadcrumbs, pageMetadata } from "@/lib/seo";

/**
 * The booking flow: dates, rooms, the guest's details, payment. No account.
 * Everything it writes goes through lib/booking/api.ts (see docs/BOOKING.md).
 */

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/booking">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "id";
  const t = getDict(locale);
  /* The canonical URL carries no query, so /booking?unit=...&in=... (the
     links from the room pages and the header) all count as this one page. */
  return pageMetadata({ locale, path: "booking", ...t.seo.booking, image: "home" });
}

export default async function BookingPage({ params }: PageProps<"/[lang]/booking">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);

  return (
    <>
      <section className="sv-page">
        <div className="sv-wrap">
          <h1 className="sr-only">{plain(t.checkout.title)}</h1>

          {/* useSearchParams needs a boundary on a statically generated page:
              the dates from the header only exist in the browser. */}
          <Suspense fallback={<div className="sv-bk-skeleton" aria-hidden="true" />}>
            <BookingFlow locale={lang} />
          </Suspense>
        </div>
      </section>
      <JsonLd data={breadcrumbs(lang, [{ name: t.nav.booking, path: "booking" }])} />
    </>
  );
}
