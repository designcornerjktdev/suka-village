"use client";

import { Mail } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Locale } from "@/content/i18n";
import type { Booking, Settings, TemplateId } from "@/lib/booking/types";
import { bookingEmail } from "@/lib/booking/email";
import { useRoomName } from "@/lib/booking/hooks";

/**
 * The email the guest actually receives: the template the admin edits, inside
 * the HTML layout of email.ts, drawn in a frame so its own styles stay its
 * own. Shown to the guest on the order page (so the owner can see what goes
 * out) and in the admin. The frame grows to the email's height; links open in
 * a new tab.
 */

const noop = () => () => {};

export default function MessagePreview({
  booking,
  template,
  settings,
  locale,
}: {
  booking: Booking;
  template: TemplateId;
  settings: Settings;
  locale: Locale;
}) {
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const roomName = useRoomName();
  const [height, setHeight] = useState(640);
  const mail = bookingEmail({ booking, template, settings, locale, origin, roomName });
  const doc = mail.html.replace("<head>", '<head><base target="_blank">');

  return (
    <figure className="sv-msg sv-msg--email">
      <figcaption>
        <Mail size={14} strokeWidth={1.6} aria-hidden="true" />
        <span>{booking.guest.email || "(tanpa email)"}</span>
      </figcaption>
      <p className="sv-msg-subject">{mail.subject}</p>
      {origin ? (
        <iframe
          className="sv-msg-frame"
          title={mail.subject}
          srcDoc={doc}
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          style={{ height }}
          onLoad={(e) => {
            const win = e.currentTarget.contentWindow;
            const body = e.currentTarget.contentDocument?.body;
            if (!win || !body) return;
            /* Measured again whenever the email reflows, not only on load:
               inside a closed <details> the frame loads at height 0, and the
               email stayed hidden after the details were opened. */
            const measure = () => {
              if (body.scrollHeight > 0) setHeight(body.scrollHeight);
            };
            measure();
            /* The frame's own ResizeObserver: the element lives in its document. */
            const RO = (win as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver ?? ResizeObserver;
            new RO(measure).observe(body);
          }}
        />
      ) : null}
    </figure>
  );
}
