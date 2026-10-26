"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeLabel, type Locale } from "@/content/i18n";

/**
 * Language switch.
 *
 * It swaps the locale segment of the current path rather than sending everyone
 * home, so a reader on the booking page in Indonesian lands on the booking page
 * in English. Both options are real links, so search engines crawl both
 * hreflang targets.
 *
 * `compact` is the header's version: only the language you are NOT reading,
 * as one small link. The header already carries six tabs and the booking
 * fields, and a two option toggle there cost the room the brand needed.
 */
export default function LangSwitch({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const pathname = usePathname() || `/${locale}`;
  const rest = pathname.split("/").slice(2).join("/");
  const hrefFor = (code: Locale) => (rest ? `/${code}/${rest}` : `/${code}`);

  if (compact) {
    const other = locales.find((code) => code !== locale) ?? locale;
    return (
      <Link
        href={hrefFor(other)}
        className="sv-lang-compact"
        hrefLang={other}
        lang={other}
        aria-label={other === "en" ? "English" : "Bahasa Indonesia"}
      >
        {localeLabel[other]}
      </Link>
    );
  }

  return (
    <div className="sv-lang" role="group" aria-label="Language">
      {locales.map((code) => (
        <Link
          key={code}
          href={hrefFor(code)}
          className="sv-lang-option"
          data-active={code === locale ? "true" : undefined}
          aria-current={code === locale ? "true" : undefined}
          hrefLang={code}
        >
          {localeLabel[code]}
        </Link>
      ))}
    </div>
  );
}
