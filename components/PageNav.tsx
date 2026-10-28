"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

export type PageNavItem = { id: string; label: string };

/**
 * A page's own short menu on a phone or a tablet, where the header's tabs
 * are folded into the menu button and nothing on screen says which page
 * this is: the page's name, then its parts (the rooms, the facilities) in
 * one line that scrolls sideways. It holds under the header as the page
 * scrolls, marks the part on screen, and a tap goes straight to a part, so
 * a page six photographs long is never a blind scroll.
 *
 * On a wide screen the tabs already say where one is, and it is not shown.
 */
export default function PageNav({ title, items, label }: { title: string; items: PageNavItem[]; label: string }) {
  const [current, setCurrent] = useState(items[0]?.id);
  const list = useRef<HTMLUListElement>(null);

  /* The part crossing a line a little above the middle of the screen is the
     one being read. */
  useEffect(() => {
    const rows = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => !!el);
    if (!rows.length || typeof IntersectionObserver === "undefined") return;
    const watch = new IntersectionObserver(
      (entries) => {
        const on = entries.find((e) => e.isIntersecting);
        if (on) setCurrent(on.target.id);
      },
      { rootMargin: "-40% 0px -59% 0px" },
    );
    rows.forEach((row) => watch.observe(row));
    return () => watch.disconnect();
  }, [items]);

  /* Keep the marked part in view in its own line. */
  useEffect(() => {
    const box = list.current;
    const on = box?.querySelector<HTMLElement>(`[data-id="${current}"]`);
    if (!box || !on) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ left: on.offsetLeft - box.clientWidth / 2 + on.offsetWidth / 2, behavior: still ? "auto" : "smooth" });
  }, [current]);

  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setCurrent(id);
  };

  return (
    <nav className="sv-pnav" aria-label={label}>
      <p className="sv-pnav-title">{title}</p>
      {items.length > 1 ? (
        <ul ref={list} className="sv-pnav-list">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                data-id={item.id}
                aria-current={item.id === current ? "true" : undefined}
                onClick={(e) => go(e, item.id)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}
