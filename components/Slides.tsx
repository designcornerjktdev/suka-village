"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import type { Locale } from "@/content/i18n";

/* The full screen view loads when a photograph is first opened (or a moment
   before, when the slider is hovered, touched or focused). */
const loadViewer = () => import("./PhotoViewer");
const PhotoViewer = dynamic(loadViewer, { ssr: false });

/**
 * A photo slider, as the brief's references draw it: chevrons on either side
 * of the picture, dots along its foot.
 *
 * Underneath it is a native scroller with CSS snap, the same as the room row.
 * Touch swipes, trackpads and arrow keys all move it with the platform's own
 * physics, and the controls only call scrollTo. The current slide is read back
 * from the scroll position, so the dots are right however the slider moved.
 *
 * The chevrons wrap from the last photo to the first. A single photograph gets
 * no controls at all rather than controls that do nothing.
 *
 * Only the first photograph loads with the page. The rest wait until the page
 * has finished loading, or until the slider is touched, hovered or focused,
 * whichever comes first: on a phone on a slow connection the photograph on
 * screen then has the bandwidth to itself, and the next ones are ready by the
 * time a thumb gets to them.
 *
 * `stage` (a room's own page) is the same slider the full width of the page,
 * at 16:9, so the photographs are cropped (Reza, 31 Oct 2026). A click or tap
 * on one opens it whole, in its own shape, full screen (PhotoViewer); closing
 * it leaves the slider on the photograph last seen there.
 */

/* From one slide to the next: the width of a slide. */
const stepOf = (el: HTMLElement) => {
  const a = el.children[0] as HTMLElement | undefined;
  const b = el.children[1] as HTMLElement | undefined;
  return a && b ? b.offsetLeft - a.offsetLeft : el.clientWidth || 1;
};

export default function Slides({
  photos,
  locale,
  name,
  sizes,
  priority = false,
  stage = false,
  className = "",
}: {
  photos: readonly Photo[];
  locale: Locale;
  name: string;
  sizes: string;
  priority?: boolean;
  stage?: boolean;
  className?: string;
}) {
  const t = getDict(locale).common;
  const track = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [armed, setArmed] = useState(false);
  const count = photos.length;
  const many = count > 1;
  const arm = () => {
    setArmed(true);
    if (stage) void loadViewer();
  };

  useEffect(() => {
    if (!many || armed) return;
    let idle = 0;
    const later = () => {
      idle = window.setTimeout(() => setArmed(true), 400);
    };
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
    return () => {
      window.removeEventListener("load", later);
      window.clearTimeout(idle);
    };
  }, [many, armed]);

  useEffect(() => {
    const el = track.current;
    if (!el || !many) return;
    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setIndex(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / stepOf(el)))));
      });
    };
    el.addEventListener("scroll", read, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", read);
    };
  }, [count, many]);

  const go = (to: number, jump = false) => {
    const el = track.current;
    if (!el) return;
    arm();
    const next = (to + count) % count;
    const still = jump || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: next * stepOf(el), behavior: still ? "auto" : "smooth" });
  };

  const label = fill(t.photosOf, { name });

  const slider = (
    <div
      className={`sv-slides ${stage ? "sv-slides--stage" : ""} ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onPointerEnter={many ? arm : undefined}
      onTouchStart={many ? arm : undefined}
      onFocus={many ? arm : undefined}
    >
      <div ref={track} className="sv-slides-track" tabIndex={many ? 0 : undefined} aria-label={many ? label : undefined}>
        {photos.map((photo, i) => (
          <div
            key={photo.src}
            className="sv-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
          >
            {i === 0 || armed ? (
              <Image
                src={photo.src}
                alt={photo.alt[locale]}
                fill
                sizes={sizes}
                loading={priority && i === 0 ? "eager" : "lazy"}
                fetchPriority={priority && i === 0 ? "high" : "auto"}
                className="sv-photo"
              />
            ) : null}
            {stage ? (
              <button
                type="button"
                className="sv-slide-open"
                tabIndex={i === index ? 0 : -1}
                onClick={() => setOpen(i)}
                aria-label={fill(t.openPhoto, { n: i + 1 })}
              />
            ) : null}
          </div>
        ))}
      </div>

      {many ? (
        <>
          <button type="button" className="sv-slides-arrow sv-slides-prev" onClick={() => go(index - 1)} aria-label={t.prevPhoto}>
            <ChevronLeft size={22} strokeWidth={1.6} aria-hidden="true" />
          </button>
          <button type="button" className="sv-slides-arrow sv-slides-next" onClick={() => go(index + 1)} aria-label={t.nextPhoto}>
            <ChevronRight size={22} strokeWidth={1.6} aria-hidden="true" />
          </button>

          <span className="sv-slides-count tnum" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
            <span> / {String(count).padStart(2, "0")}</span>
          </span>

          <div className="sv-slides-dots">
            {photos.map((photo, i) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => go(i)}
                aria-label={fill(t.goToPhoto, { n: i + 1 })}
                aria-current={i === index ? "true" : undefined}
              >
                <span />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );

  if (!stage) return slider;

  return (
    <>
      {slider}
      {open !== null ? (
        <PhotoViewer
          photos={photos}
          locale={locale}
          label={label}
          start={open}
          onClose={(at) => {
            setOpen(null);
            go(at, true);
            const back = track.current?.children[at]?.querySelector("button");
            back?.focus({ preventScroll: true });
          }}
        />
      ) : null}
    </>
  );
}
