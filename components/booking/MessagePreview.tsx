"use client";

import { Mail } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { Locale } from "@/content/i18n";
import type { Booking, Settings, TemplateId } from "@/lib/booking/types";
import { render, variablesFor } from "@/lib/booking/notifications";
import { useRoomName } from "@/lib/booking/hooks";

/**
 * The email the guest actually receives, rendered from the same template the
 * admin edits. Shown to the guest on the order page (so the owner can see
 * what goes out) and in the admin.
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
  const tpl = settings.templates[template];
  const vars = variablesFor(booking, locale, origin, roomName);

  return (
    <figure className="sv-msg sv-msg--email">
      <figcaption>
        <Mail size={14} strokeWidth={1.6} aria-hidden="true" />
        <span>{booking.guest.email || "(tanpa email)"}</span>
      </figcaption>
      <p className="sv-msg-subject">{render(tpl.subject[locale], vars)}</p>
      <pre>{render(tpl.email[locale], vars)}</pre>
    </figure>
  );
}
