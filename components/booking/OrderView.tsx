"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CalendarPlus,
  Check,
  Clock,
  Copy,
  CreditCard,
  Hourglass,
  Info,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { place, waHref } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import { localePath, type Locale } from "@/content/i18n";
import Emph from "../Emph";
import StorePhoto from "../StorePhoto";
import DemoQR from "./DemoQR";
import MethodMark from "./MethodMark";
import MessagePreview from "./MessagePreview";
import { DEMO } from "@/lib/booking/config";
import { cancelBooking, changePaymentMethod, checkPayment, confirmBooking, rejectBooking, simulateGateway } from "@/lib/booking/api";
import { useBooking, useNow, useRooms, useSettings } from "@/lib/booking/hooks";
import { GUEST_GROUPS, METHODS, methodInfo } from "@/lib/booking/payments";
import { fmtDate, fmtDateTime, formatPhone, idr } from "@/lib/booking/format";
import type { Booking, BookingStatus } from "@/lib/booking/types";

/**
 * One page per booking, and the page every message links to.
 *
 * It is the whole after-sales journey in one place, and a three step tracker
 * at the top says where the booking is: made, paid, confirmed.
 *
 *   pending    how to pay, while the hold is running
 *   paid       WAITING: the money is in, and someone at the property is
 *              reviewing the booking. The page says so, says the room is
 *              still held, and says the answer comes by email.
 *   confirmed  the stay is on: calendar file, directions
 *   rejected   why, and that the payment is refunded
 *   expired / cancelled
 *
 * The guest can come back to it any time from the link in their email; no
 * account is involved.
 */
export default function OrderView({ locale, code }: { locale: Locale; code: string }) {
  const t = getDict(locale);
  const o = t.order;
  const booking = useBooking(code);
  const now = useNow(1000);

  if (booking === undefined) {
    return (
      <div className="sv-order-loading" role="status">
        <LoaderCircle className="sv-spin" size={20} strokeWidth={1.6} aria-hidden="true" />
        {o.loading}
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="sv-order-empty">
        <h1 className="sv-statement">{o.notFoundTitle}</h1>
        <p className="sv-lead">{o.notFoundLead}</p>
        <div className="sv-actions">
          <Link href={localePath(locale, "booking/check")} className="sv-btn sv-btn--primary">
            <span>{o.checkGo}</span>
          </Link>
          <Link href={localePath(locale, "booking")} className="sv-btn sv-btn--ghost">
            <span>{t.common.bookNow}</span>
          </Link>
        </div>
      </div>
    );
  }

  const status: BookingStatus =
    booking.status === "pending" && now && Date.parse(booking.payment.expiresAt) <= now ? "expired" : booking.status;

  return <Order booking={booking} status={status} locale={locale} now={now} />;
}

function Order({ booking, status, locale, now }: { booking: Booking; status: BookingStatus; locale: Locale; now: number }) {
  const t = getDict(locale);
  const o = t.order;
  const c = t.checkout;
  const settings = useSettings();
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "check" | "cancel" | "method" | "paid" | "expire" | "accept" | "reject">(null);
  const rooms = useRooms();
  const [notYet, setNotYet] = useState(false);
  const [changing, setChanging] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const method = methodInfo(booking.payment.method);
  const firstName = booking.guest.name.split(" ")[0];
  const waiting = status === "paid";
  const accepted = status === "confirmed" || status === "checked_in" || status === "completed";
  const rejected = status === "rejected";
  /* Tracker: which of the three steps are done, and which one is live. */
  const paidStep = waiting || accepted || rejected;
  const track: ("done" | "now" | "todo" | "fail")[] = [
    "done",
    paidStep ? "done" : status === "pending" ? "now" : "fail",
    accepted ? "done" : waiting ? "now" : rejected ? "fail" : "todo",
  ];

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((k) => (k === key ? null : k)), 1800);
    } catch {
      /* Clipboard refused: the number is still on screen to select by hand. */
    }
  };

  const run = async (kind: NonNullable<typeof busy>, task: () => Promise<unknown>) => {
    setBusy(kind);
    await task();
    setBusy(null);
  };

  const onCheck = () =>
    run("check", async () => {
      const b = await checkPayment(booking.code);
      setNotYet(!!b && b.status === "pending");
    });

  /* `now` is 0 until the clock has ticked once in the browser: show the full
     window rather than a guess. */
  const left = now ? Math.max(0, Date.parse(booking.payment.expiresAt) - now) : Date.parse(booking.payment.expiresAt) - Date.parse(booking.createdAt);
  const clock = formatLeft(left);

  const title =
    status === "pending"
      ? o.pendingTitle
      : waiting
        ? o.waitTitle
        : status === "confirmed"
          ? o.confirmedTitle
          : status === "checked_in"
            ? o.stayingTitle
            : status === "completed"
              ? o.completedTitle
              : rejected
                ? o.rejectedTitle
                : status === "expired"
                  ? o.expiredTitle
                  : o.cancelledTitle;

  const lead =
    status === "pending"
      ? o.pendingLead
      : waiting
        ? fill(o.waitLead, { name: firstName, email: booking.guest.email })
        : accepted
          ? fill(o.paidLead, { name: firstName })
          : rejected
            ? fill(o.rejectedLead, { name: firstName })
            : status === "expired"
              ? o.expiredLead
              : o.cancelledLead;

  const again = `${localePath(locale, "booking")}?unit=${booking.units[0]}&guests=${booking.guests}`;

  return (
    <div className="sv-order" data-status={status}>
      {/* --- Head ------------------------------------------------------- */}
      <header className="sv-order-head">
        <div className="sv-order-code">
          <span className="sv-label">{o.code}</span>
          <button type="button" className="sv-copy tnum" onClick={() => copy(booking.code, "code")}>
            {booking.code}
            {copied === "code" ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.6} aria-hidden="true" />}
            <span className="sr-only">{copied === "code" ? o.copied : o.copy}</span>
          </button>
        </div>
        <span className="sv-pill" data-status={status}>
          {o.status[status]}
        </span>
      </header>

      <ol className="sv-track" aria-label={o.status[status]}>
        {o.track.map((label, i) => (
          <li key={label} data-state={track[i]} aria-current={track[i] === "now" ? "step" : undefined}>
            <span className="sv-track-dot" aria-hidden="true">
              {track[i] === "done" ? <Check size={13} strokeWidth={2.4} /> : i + 1}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      {accepted ? (
        <span className="sv-order-tick" aria-hidden="true">
          <svg viewBox="0 0 52 52">
            <path d="M14 27 L23 36 L39 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" />
          </svg>
        </span>
      ) : null}
      {waiting ? (
        <span className="sv-order-tick sv-order-tick--wait" aria-hidden="true">
          <Hourglass size={24} strokeWidth={1.5} />
        </span>
      ) : null}

      <h1 className="sv-statement sv-order-title">
        <Emph text={title} />
      </h1>
      <p className="sv-lead sv-order-lead">{lead}</p>

      <div className="sv-order-grid">
        <div className="sv-order-main">
          {/* --- Pending: how to pay ------------------------------------- */}
          {status === "pending" ? (
            <section className="sv-pay-card">
              <div className="sv-pay-card-top">
                <div>
                  <span className="sv-label">{o.timeLeft}</span>
                  <p className="sv-countdown tnum" aria-live="off">
                    <Clock size={18} strokeWidth={1.6} aria-hidden="true" />
                    {clock}
                  </p>
                  <p className="sv-pay-card-due">{fill(o.payBefore, { time: fmtDateTime(booking.payment.expiresAt, locale) })}</p>
                </div>
                <div className="sv-pay-card-amount">
                  <span className="sv-label">{o.amount}</span>
                  <button type="button" className="sv-copy sv-copy--big tnum" onClick={() => copy(String(booking.payment.amount), "amount")}>
                    {idr(booking.payment.amount)}
                    {copied === "amount" ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.6} aria-hidden="true" />}
                    <span className="sr-only">{copied === "amount" ? o.copied : o.copy}</span>
                  </button>
                </div>
              </div>

              <div className="sv-pay-card-body">
                <MethodMark method={method} label={method.id === "card" ? c.groups.card : method.label} />
                {method.group === "va" ? (
                  <>
                    <p className="sv-pay-card-title">{fill(o.vaTitle, { bank: method.bank ?? "" })}</p>
                    <button type="button" className="sv-copy sv-copy--va tnum" onClick={() => copy(booking.payment.reference, "ref")}>
                      {booking.payment.reference.replace(/(\d{4})(?=\d)/g, "$1 ")}
                      {copied === "ref" ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : <Copy size={16} strokeWidth={1.6} aria-hidden="true" />}
                      <span className="sr-only">{copied === "ref" ? o.copied : o.copy}</span>
                    </button>
                    <ol className="sv-pay-steps">
                      {o.vaSteps.map((s) => (
                        <li key={s}>{fill(s, { bank: method.bank ?? "" })}</li>
                      ))}
                    </ol>
                  </>
                ) : method.group === "qris" ? (
                  <>
                    <p className="sv-pay-card-title">{o.qrisTitle}</p>
                    <DemoQR seed={booking.payment.reference} label={o.qrisTitle} />
                    <ol className="sv-pay-steps">
                      {o.qrisSteps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </>
                ) : method.group === "ewallet" ? (
                  <>
                    <p className="sv-pay-card-title">{fill(o.ewalletTitle, { wallet: method.label })}</p>
                    <a className="sv-btn sv-btn--primary" href={booking.payment.reference} target="_blank" rel="noopener noreferrer">
                      <span>{fill(o.ewalletOpen, { wallet: method.label })}</span>
                      <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" />
                    </a>
                    <ol className="sv-pay-steps">
                      {o.ewalletSteps.map((s) => (
                        <li key={s}>{fill(s, { wallet: method.label })}</li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="sv-pay-card-title">{o.cardTitle}</p>
                    <a className="sv-btn sv-btn--primary" href={booking.payment.reference} target="_blank" rel="noopener noreferrer">
                      <CreditCard size={16} strokeWidth={1.6} aria-hidden="true" />
                      <span>{o.cardGo}</span>
                    </a>
                    <p className="sv-pay-note">{o.cardNote}</p>
                  </>
                )}
                {DEMO ? <p className="sv-bk-demo">{o.demoRef}</p> : null}
              </div>

              <div className="sv-pay-card-actions">
                <button type="button" className="sv-btn sv-btn--primary" onClick={onCheck} disabled={!!busy} aria-busy={busy === "check"}>
                  {busy === "check" ? <LoaderCircle className="sv-spin" size={16} strokeWidth={1.8} aria-hidden="true" /> : <Check size={16} strokeWidth={1.8} aria-hidden="true" />}
                  <span>{busy === "check" ? o.checking : o.paidCheck}</span>
                </button>
                <button type="button" className="sv-textlink" onClick={() => setChanging((v) => !v)} aria-expanded={changing}>
                  {changing ? o.keepMethod : o.changeMethod}
                </button>
              </div>
              {notYet ? (
                <p className="sv-bk-nudge" role="status">
                  {o.notYet}
                </p>
              ) : null}

              {changing ? (
                <div className="sv-pay sv-pay--compact" role="radiogroup" aria-label={o.changeMethod}>
                  {GUEST_GROUPS.map((group) => {
                    const options = METHODS.filter((m) => m.group === group && settings.methods[m.id]);
                    if (!options.length) return null;
                    return (
                      <fieldset key={group} className="sv-pay-group">
                        <legend>
                          <span>{c.groups[group as keyof typeof c.groups]}</span>
                        </legend>
                        <div className="sv-pay-opts">
                          {options.map((m) => (
                            <label key={m.id} className="sv-pay-opt" data-checked={booking.payment.method === m.id ? "true" : undefined}>
                              <input
                                type="radio"
                                name="method-change"
                                className="sr-only"
                                checked={booking.payment.method === m.id}
                                disabled={!!busy}
                                onChange={() =>
                                  run("method", async () => {
                                    await changePaymentMethod(booking.code, m.id);
                                    setChanging(false);
                                    setNotYet(false);
                                  })
                                }
                              />
                              <span className="sv-pay-radio" aria-hidden="true" />
                              <MethodMark method={m} label={m.id === "card" ? c.groups.card : m.label} />
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
              ) : null}
            </section>
          ) : null}

          {/* --- Waiting: paid, being reviewed ---------------------------- */}
          {waiting ? (
            <section className="sv-sent sv-sent--wait">
              <p className="sv-wait-note">
                <Clock size={18} strokeWidth={1.5} aria-hidden="true" />
                {o.waitNote}
              </p>
              <p className="sv-label">{o.receiptSentTo}</p>
              <ul>
                <li>
                  <Mail size={15} strokeWidth={1.7} aria-hidden="true" />
                  {booking.guest.email}
                </li>
              </ul>
              <details className="sv-sent-preview">
                <summary>{o.viewMessages}</summary>
                <MessagePreview booking={booking} template="payment_received" settings={settings} locale={locale} />
              </details>
            </section>
          ) : null}

          {/* --- Confirmed: where the confirmation went ------------------- */}
          {accepted ? (
            <section className="sv-sent">
              <p className="sv-label">{o.sentTo}</p>
              <ul>
                <li>
                  <Check size={15} strokeWidth={2} aria-hidden="true" />
                  {booking.guest.email}
                </li>
              </ul>
              <details className="sv-sent-preview">
                <summary>{o.viewMessages}</summary>
                <MessagePreview booking={booking} template="confirmed" settings={settings} locale={locale} />
              </details>
              <div className="sv-actions">
                <button type="button" className="sv-btn sv-btn--primary" onClick={() => downloadIcs(booking, rooms.filter((r) => booking.units.includes(r.unit)).map((r) => r.name).join(", "))}>
                  <CalendarPlus size={16} strokeWidth={1.6} aria-hidden="true" />
                  <span>{o.addCalendar}</span>
                </button>
                <a className="sv-btn sv-btn--ghost" href={place.mapHref} target="_blank" rel="noopener noreferrer">
                  <MapPin size={16} strokeWidth={1.6} aria-hidden="true" />
                  <span>{o.directions}</span>
                </a>
              </div>
            </section>
          ) : null}

          {/* --- Rejected: why, and the refund ---------------------------- */}
          {rejected ? (
            <section className="sv-sent sv-sent--rejected">
              {booking.rejectReason ? (
                <>
                  <p className="sv-label">{o.reason}</p>
                  <p className="sv-reject-reason">{booking.rejectReason}</p>
                </>
              ) : null}
              <p className="sv-refund">{fill(o.refund, { total: idr(booking.payment.amount) })}</p>
              <div className="sv-actions">
                <Link href={again} className="sv-btn sv-btn--primary">
                  <RotateCcw size={16} strokeWidth={1.6} aria-hidden="true" />
                  <span>{o.bookAgain}</span>
                </Link>
                <a className="sv-btn sv-btn--ghost" href={waHref(`${t.common.waHello} (${booking.code})`)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={16} strokeWidth={1.6} aria-hidden="true" />
                  <span>{o.contact}</span>
                </a>
              </div>
            </section>
          ) : null}

          {status === "expired" || status === "cancelled" ? (
            <div className="sv-actions">
              <Link href={again} className="sv-btn sv-btn--primary">
                <RotateCcw size={16} strokeWidth={1.6} aria-hidden="true" />
                <span>{o.bookAgain}</span>
              </Link>
            </div>
          ) : null}

          {/* --- Prototype: stand-in for the gateway's webhook ----------- */}
          {DEMO && status === "pending" ? (
            <section className="sv-demo-panel">
              <p className="sv-demo-panel-title">
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                {o.demoTitle}
              </p>
              <p>{o.demoLead}</p>
              <div className="sv-demo-panel-actions">
                <button
                  type="button"
                  className="sv-btn sv-btn--primary sv-btn--sm"
                  disabled={!!busy}
                  onClick={() => run("paid", () => simulateGateway(booking.code, "paid"))}
                >
                  {busy === "paid" ? <LoaderCircle className="sv-spin" size={15} strokeWidth={1.8} aria-hidden="true" /> : null}
                  <span>{o.simulatePaid}</span>
                </button>
                <button
                  type="button"
                  className="sv-btn sv-btn--ghost sv-btn--sm"
                  disabled={!!busy}
                  onClick={() => run("expire", () => simulateGateway(booking.code, "expired"))}
                >
                  <span>{o.simulateExpire}</span>
                </button>
              </div>
            </section>
          ) : null}

          {/* --- Prototype: stand-in for the admin's decision ------------- */}
          {DEMO && waiting ? (
            <section className="sv-demo-panel">
              <p className="sv-demo-panel-title">
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                {o.demoTitle}
              </p>
              <p>{o.demoWaitLead}</p>
              <div className="sv-demo-panel-actions">
                <button type="button" className="sv-btn sv-btn--primary sv-btn--sm" disabled={!!busy} onClick={() => run("accept", () => confirmBooking(booking.code))}>
                  {busy === "accept" ? <LoaderCircle className="sv-spin" size={15} strokeWidth={1.8} aria-hidden="true" /> : null}
                  <span>{o.simulateAccept}</span>
                </button>
                <button
                  type="button"
                  className="sv-btn sv-btn--ghost sv-btn--sm"
                  disabled={!!busy}
                  onClick={() => run("reject", () => rejectBooking(booking.code, locale === "id" ? "Tanggal tidak tersedia." : "The dates are not available."))}
                >
                  <span>{o.simulateReject}</span>
                </button>
                <Link href={`/admin/bookings/${booking.code}`} target="_blank" className="sv-textlink">
                  {o.openAdmin}
                  <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden="true" />
                </Link>
              </div>
            </section>
          ) : null}
        </div>

        {/* --- Details ------------------------------------------------------ */}
        <aside className="sv-order-details" aria-label={o.details}>
          <p className="sv-label">{o.details}</p>
          <ul className="sv-order-rooms">
            {booking.units.map((id) => {
              const room = rooms.find((x) => x.unit === id);
              if (!room) return null;
              return (
                <li key={id}>
                  <span className="sv-order-thumb">{room.photos[0] ? <StorePhoto src={room.photos[0]} alt="" sizes="64px" /> : null}</span>
                  <span>
                    <strong>{room.name}</strong>
                    <small className="tnum">
                      {room.size} m² · {room.bedrooms} {t.rooms.bedroomsShort}
                    </small>
                  </span>
                </li>
              );
            })}
          </ul>
          <dl className="sv-order-list">
            <div>
              <dt>{o.stay}</dt>
              <dd>
                {fmtDate(booking.checkIn, locale, "day")} → {fmtDate(booking.checkOut, locale, "day")}
                <small className="tnum">{fill(c.nightsN, { n: booking.quote.nights })}</small>
              </dd>
            </div>
            <div>
              <dt>{o.guests}</dt>
              <dd className="tnum">
                {booking.guests} {t.bar.guestUnit}
              </dd>
            </div>
            <div>
              <dt>{o.contactLabel}</dt>
              <dd>
                {booking.guest.name}
                <small>{booking.guest.email}</small>
                <small className="tnum">{formatPhone(booking.guest.phone)}</small>
              </dd>
            </div>
            <div>
              <dt>{o.method}</dt>
              <dd>
                <span className="sv-order-method">
                  {method.logos.length ? <MethodMark method={method} size="sm" label={method.label} /> : null}
                  <span>{method.id === "card" ? c.groups.card : method.label}</span>
                </span>
                {booking.payment.paidAt ? (
                  <small>
                    {o.paidAt} {fmtDateTime(booking.payment.paidAt, locale)}
                  </small>
                ) : null}
              </dd>
            </div>
          </dl>
          <div className="sv-bk-breakdown">
            <ul>
              {booking.quote.lines.map((line) => (
                <li key={line.unit}>
                  <span>
                    {rooms.find((r) => r.unit === line.unit)?.name ?? line.unit}
                    <small className="tnum">{fill(c.nightsN, { n: line.nights.length })}</small>
                  </span>
                  <span className="tnum">{idr(line.subtotal)}</span>
                </li>
              ))}
            </ul>
            <p className="sv-bk-total">
              <span>{c.total}</span>
              <strong className="tnum">{idr(booking.quote.total)}</strong>
            </p>
          </div>

          {status === "pending" ? (
            confirmCancel ? (
              <div className="sv-confirm" role="alertdialog" aria-label={o.cancel}>
                <p>{o.cancelConfirm}</p>
                <div>
                  <button
                    type="button"
                    className="sv-btn sv-btn--clay sv-btn--sm"
                    disabled={!!busy}
                    onClick={() => run("cancel", () => cancelBooking(booking.code, "guest"))}
                  >
                    {o.cancelYes}
                  </button>
                  <button type="button" className="sv-btn sv-btn--ghost sv-btn--sm" onClick={() => setConfirmCancel(false)}>
                    {o.keep}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="sv-order-cancel" onClick={() => setConfirmCancel(true)}>
                {o.cancel}
              </button>
            )
          ) : null}

          <a className="sv-order-help" href={waHref(`${t.common.waHello} (${booking.code})`)} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={15} strokeWidth={1.6} aria-hidden="true" />
            {o.contact}
            <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </aside>
      </div>
    </div>
  );
}

function formatLeft(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}

/** An all-day calendar event for the stay, built in the browser. */
function downloadIcs(b: Booking, rooms: string) {
  const d = (s: string) => s.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (s: string) => s.replace(/[,;\\]/g, (m) => `\\${m}`);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Suka Village//Booking//ID",
    "BEGIN:VEVENT",
    `UID:${b.code}@sukavillage`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d(b.checkIn)}`,
    `DTEND;VALUE=DATE:${d(b.checkOut)}`,
    `SUMMARY:${escape(`Suka Village · ${b.code}`)}`,
    `LOCATION:${escape(place.address)}`,
    `DESCRIPTION:${escape(`${rooms} · ${b.guests}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `suka-village-${b.code}.ics`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
