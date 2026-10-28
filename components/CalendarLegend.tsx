import { getDict } from "@/content/dict";
import type { Locale } from "@/content/i18n";

/** What the shapes in a booking calendar mean, right under it. */
export default function CalendarLegend({ locale }: { locale: Locale }) {
  const a = getDict(locale).avail;
  return (
    <ul className="sv-cal-legend">
      <li>
        <i data-kind="free" aria-hidden="true" />
        {a.free}
      </li>
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
