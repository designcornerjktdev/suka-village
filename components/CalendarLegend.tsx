import { getDict } from "@/content/dict";
import type { Locale } from "@/content/i18n";

/** What the colours in a booking calendar mean, right under it. */
export default function CalendarLegend({ locale, few = true }: { locale: Locale; few?: boolean }) {
  const a = getDict(locale).avail;
  return (
    <ul className="sv-cal-legend">
      <li>
        <i data-kind="free" aria-hidden="true" />
        {a.free}
      </li>
      {few ? (
        <li>
          <i data-kind="few" aria-hidden="true" />
          {a.few}
        </li>
      ) : null}
      <li>
        <i data-kind="full" aria-hidden="true" />
        {a.full}
      </li>
      <li>
        <i data-kind="picked" aria-hidden="true" />
        {a.picked}
      </li>
    </ul>
  );
}
