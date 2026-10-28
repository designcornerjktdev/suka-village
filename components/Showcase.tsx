import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Slides from "./Slides";
import type { Photo } from "@/content/site";
import type { Locale } from "@/content/i18n";

/**
 * One row of a page: photographs on one side, words on the other.
 *
 * Every content page uses this same row (Rooms, Facilities, Experience,
 * Event, Explore, Contact), so the site reads as one place: the picture takes the
 * larger share, rows alternate sides, and each opens with its number in the
 * list. Each row fades in as it scrolls into view, the first one on load
 * (see "Motion" in globals.css). No zoom, by the owner's choice.
 *
 * Where there are no photographs yet the picture is replaced by a sage panel
 * with a drawn icon, rather than by a photograph of something else.
 *
 * Something not open yet (a facility being built) carries a "Segera hadir"
 * label over its title, and the same words on its panel.
 */

export type Panel = { Icon: LucideIcon; word: string; note: string };

export default function Showcase({
  id,
  index,
  numbered = true,
  locale,
  name,
  photos,
  media,
  panel,
  soon,
  children,
  actions,
}: {
  id?: string;
  /** Position in the page's list, from 0. Sets the side and the number. */
  index: number;
  /** Shows "01", "02" over the title. Off where the rows are not a list. */
  numbered?: boolean;
  locale: Locale;
  name: string;
  photos?: readonly Photo[];
  /** Something other than a slider in the picture's place (the rooms' mosaic). */
  media?: ReactNode;
  panel?: Panel;
  /** Not open yet: this label ("Segera hadir") sits over the title. */
  soon?: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const first = index === 0;

  const picture = media ? (
    media
  ) : photos?.length ? (
    <Slides photos={photos} locale={locale} name={name} sizes="(min-width: 900px) 56vw, 100vw" priority={first} />
  ) : panel ? (
    <div className="sv-panel">
      <panel.Icon className="sv-panel-icon" size={52} strokeWidth={0.9} aria-hidden="true" />
      <p className="sv-panel-word">{panel.word}</p>
      {panel.note ? <p className="sv-panel-note">{panel.note}</p> : null}
    </div>
  ) : null;

  return (
    <article
      id={id}
      className="sv-row"
      data-flip={index % 2 === 1 ? "true" : undefined}
      data-first={first ? "true" : undefined}
    >
      <div className="sv-row-media">{picture}</div>

      <div className="sv-row-body">
        {numbered ? (
          <p className="sv-row-index tnum" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </p>
        ) : null}
        {soon ? <p className="sv-soon">{soon}</p> : null}
        <h2 className="sv-row-title">{name}</h2>
        {children}
        {actions ? <div className="sv-show-actions">{actions}</div> : null}
      </div>
    </article>
  );
}
