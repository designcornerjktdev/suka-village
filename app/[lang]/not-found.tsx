"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Emph from "@/components/Emph";
import { getDict } from "@/content/dict";
import { isLocale, localePath } from "@/content/i18n";

/**
 * The site's own 404, inside its header and footer. A not-found page gets no
 * params, so the language is read from the address.
 */
export default function NotFound() {
  const first = usePathname()?.split("/")[1] ?? "";
  const locale = isLocale(first) ? first : "id";
  const t = getDict(locale);

  return (
    <section className="sv-page">
      <div className="sv-wrap sv-utility">
        <h1 className="sv-statement">
          <Emph text={t.common.missingTitle} />
        </h1>
        <p className="sv-lead">{t.common.missingLead}</p>
        <div className="sv-actions">
          <Link href={localePath(locale, "")} className="sv-btn sv-btn--primary">
            <span>{t.nav.home}</span>
          </Link>
          <Link href={localePath(locale, "rooms")} className="sv-btn sv-btn--ghost">
            <span>{t.nav.rooms}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
