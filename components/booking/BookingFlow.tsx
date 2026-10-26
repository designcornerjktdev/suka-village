"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DayPicker, type DateRange } from "react-day-picker";
import { id as idLocale, enUS } from "react-day-picker/locale";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Info, LoaderCircle, Minus, Plus, Users } from "lucide-react";
import { photos, waHref } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import { localePath, type Locale } from "@/content/i18n";
import { DEMO } from "@/lib/booking/config";
import { createBooking } from "@/lib/booking/api";
import { useOccupancy, useRates, useRoomName, useRooms, useSettings } from "@/lib/booking/hooks";
import { anyTaken, fullFor, stayMatcher, unitStatus } from "@/lib/booking/occupancy";
import { fromRate, quote } from "@/lib/booking/pricing";
import { GUEST_GROUPS, METHODS } from "@/lib/booking/payments";
import { day, fmtDate, formatPhone, idr, iso, isValidEmail, normalizePhone } from "@/lib/booking/format";
import type { PaymentMethodId, UnitId } from "@/lib/booking/types";
import { useMedia } from "../useMedia";
import StorePhoto from "../StorePhoto";
import MethodMark from "./MethodMark";
import { startOfToday } from "../dates";

/**
 * The booking, as four short steps instead of one long form.
 *
 *   1  dates and party size
 *   2  rooms (several, for a group), each showing whether it is free and
 *      what the stay costs
 *   3  the guest: name, email and a WhatsApp number, all required, and no
 *      account. Email is where every message goes; the number is a contact.
 *   4  payment method, then "Pay", which creates the booking and opens its
 *      order page with the payment instructions. The step says what happens
 *      next: the property reviews the booking and confirms it by email.
 *
 * A summary follows the guest down the page on a wide screen, as information
 * only; on a phone it collapses into a bar along the bottom with the total.
 * There is exactly one "next" button at any width: at the end of the step on
 * a wide screen, in that bar on a phone.
 *
 * Steps already reached can be revisited from the step list. Nothing is sent
 * anywhere until the last button: every write goes through lib/booking/api.ts.
 */

type Field = "name" | "email" | "phone";

export default function BookingFlow({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const c = t.checkout;
  const router = useRouter();
  const params = useSearchParams();
  const wide = useMedia("(min-width: 900px)");
  const occ = useOccupancy();
  const rates = useRates();
  /* Rooms as the admin has edited them: names, sizes and photographs here are
     the CMS's, not the code's. */
  const rooms = useRooms();
  const roomName = useRoomName();
  const settings = useSettings();
  const today = startOfToday();
  const top = useRef<HTMLDivElement>(null);

  /* --- State, seeded from the URL (header fields, room pages) ------------ */

  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = parseDay(params.get("in"));
    const to = parseDay(params.get("out"));
    return from && from >= today ? { from, to: to && to > from ? to : undefined } : undefined;
  });
  const [guests, setGuests] = useState(() => {
    const g = Number(params.get("guests"));
    return Number.isFinite(g) && g >= 1 && g <= 40 ? g : 2;
  });
  const [picked, setPicked] = useState<UnitId[]>(() => {
    const wanted = params.get("unit");
    return wanted && rooms.some((r) => r.unit === wanted) ? [wanted] : [];
  });
  const [step, setStep] = useState(() => (range?.from && range?.to ? 1 : 0));
  const [reached, setReached] = useState(step);
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState<Record<Field, boolean>>({ name: false, email: false, phone: false });
  const [method, setMethod] = useState<PaymentMethodId>("qris");
  const [nudge, setNudge] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* --- Derived ------------------------------------------------------------ */

  const checkIn = range?.from ? iso(range.from) : null;
  const checkOut = range?.to ? iso(range.to) : null;
  const complete = !!(checkIn && checkOut);

  const roomState = useMemo(
    () =>
      rooms.map((u) => {
        const rate = rates.find((r) => r.unit === u.unit);
        const s = complete ? unitStatus(occ, u.unit, checkIn!, checkOut!) : null;
        const q = complete ? quote(rates, checkIn!, checkOut!, [u.unit]) : null;
        const tooShort = !!(complete && rate && q && q.nights < rate.minNights);
        const ok = !!(s?.status === "available" && rate?.bookable && !tooShort);
        return { unit: u, rate, status: s, subtotal: q?.total ?? 0, tooShort, ok };
      }),
    [rooms, rates, occ, complete, checkIn, checkOut],
  );

  const pickedOk = picked.length > 0 && picked.every((id) => roomState.find((r) => r.unit.unit === id)?.ok);
  const q = useMemo(
    () => (complete && picked.length ? quote(rates, checkIn!, checkOut!, picked) : null),
    [complete, picked, rates, checkIn, checkOut],
  );

  const phone = normalizePhone(guest.phone);
  const fieldError: Record<Field, string | null> = {
    name: guest.name.trim().length < 2 ? c.errName : null,
    email: isValidEmail(guest.email) ? null : c.errEmail,
    phone: phone ? null : c.errPhone,
  };
  const guestOk = !fieldError.name && !fieldError.email && !fieldError.phone;

  const enabledMethods = METHODS.filter((m) => m.group !== "manual" && settings.methods[m.id]);

  const isTaken = picked.length ? anyTaken(occ, picked) : fullFor(occ, rooms.map((r) => r.unit));
  const matcher = stayMatcher(range, today, isTaken);

  /* --- Navigation ---------------------------------------------------------- */

  const scrollTop = () =>
    top.current?.scrollIntoView({ block: "start" });

  const go = (to: number) => {
    setNudge(null);
    setError(null);
    setStep(to);
    setReached((r) => Math.max(r, to));
    scrollTop();
  };

  const next = async () => {
    if (step === 0) return complete ? go(1) : setNudge(c.pickDates);
    if (step === 1) return pickedOk ? go(2) : setNudge(c.pickRoom);
    if (step === 2) {
      setTouched({ name: true, email: true, phone: true });
      return guestOk ? go(3) : setNudge(c.errSummary);
    }
    if (!q || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await createBooking({
      checkIn: checkIn!,
      checkOut: checkOut!,
      units: picked,
      guests,
      guest: { name: guest.name, email: guest.email, phone: phone ?? guest.phone },
      notes,
      method,
      locale,
    });
    if (res.ok) {
      router.push(localePath(locale, `booking/${res.booking.code}`));
      return;
    }
    setSubmitting(false);
    if (res.error === "unavailable") {
      const names = (res.units ?? []).map(roomName).join(", ");
      setError(fill(c.errUnavailable, { rooms: names }));
      setStep(1);
      scrollTop();
    } else {
      setError(c.errGeneric);
    }
  };

  const toggle = (id: UnitId) => {
    setNudge(null);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const selectRange = (r: DateRange | undefined) => {
    setNudge(null);
    setRange(r);
  };

  /* --- Pieces ------------------------------------------------------------- */

  const nightsCount = q?.nights ?? (complete ? Math.round((range!.to!.getTime() - range!.from!.getTime()) / 86_400_000) : 0);
  const cta =
    step === 3 ? (submitting ? c.paying : fill(c.pay, { total: idr(q?.total ?? 0) })) : c.next;

  const primary = (className: string) => (
    <button type="button" className={`sv-btn sv-btn--primary ${className}`} onClick={next} disabled={submitting} aria-busy={submitting}>
      {submitting ? <LoaderCircle className="sv-spin" size={16} strokeWidth={1.8} aria-hidden="true" /> : null}
      <span>{cta}</span>
      {!submitting ? <ArrowRight size={16} strokeWidth={1.6} aria-hidden="true" /> : null}
    </button>
  );

  const breakdown = q ? (
    <div className="sv-bk-breakdown">
      <p className="sv-label">{c.breakdown}</p>
      <ul>
        {q.lines.map((line) => {
          const name = roomName(line.unit);
          return (
            <li key={line.unit}>
              <span>
                {name}
                <small className="tnum">{fill(c.nightsN, { n: line.nights.length })}</small>
              </span>
              <span className="tnum">{idr(line.subtotal)}</span>
            </li>
          );
        })}
      </ul>
      <p className="sv-bk-total">
        <span>{c.total}</span>
        <strong className="tnum">{idr(q.total)}</strong>
      </p>
      {DEMO ? <p className="sv-bk-demo">{c.demoPrice}</p> : null}
    </div>
  ) : null;

  const field = (key: Field, label: string, input: ReactNode, hint?: string) => {
    const err = touched[key] ? fieldError[key] : null;
    return (
      <div className="sv-input" data-invalid={err ? "true" : undefined}>
        <label htmlFor={`bk-${key}`}>
          {label} <span aria-hidden="true">*</span>
        </label>
        {input}
        {err ? (
          <p className="sv-input-err" id={`bk-${key}-err`}>
            {err}
          </p>
        ) : hint ? (
          <p className="sv-input-hint" id={`bk-${key}-hint`}>
            {hint}
          </p>
        ) : null}
      </div>
    );
  };

  const describe = (key: Field, hasHint = false) =>
    touched[key] && fieldError[key] ? `bk-${key}-err` : hasHint ? `bk-${key}-hint` : undefined;

  /* --- Steps -------------------------------------------------------------- */

  const steps = [
    /* 1. Dates ------------------------------------------------------------ */
    <div key="dates" className="sv-bk-step">
      <h2 className="sv-bk-title">{c.datesTitle}</h2>
      <div className="sv-bk-ends">
        <div data-active={!range?.from || range?.to ? "true" : undefined}>
          <span className="sv-dock-seg-label">{t.bar.checkIn}</span>
          <span className="tnum" data-empty={checkIn ? undefined : "true"}>
            {checkIn ? fmtDate(checkIn, locale, "day") : t.bar.pick}
          </span>
        </div>
        <div data-active={range?.from && !range?.to ? "true" : undefined}>
          <span className="sv-dock-seg-label">{t.bar.checkOut}</span>
          <span className="tnum" data-empty={checkOut ? undefined : "true"}>
            {checkOut ? fmtDate(checkOut, locale, "day") : t.bar.pick}
          </span>
        </div>
        {nightsCount ? <span className="sv-dock-nights tnum">{fill(c.nightsN, { n: nightsCount })}</span> : null}
      </div>

      <DayPicker
        mode="range"
        selected={range}
        onSelect={selectRange}
        numberOfMonths={wide ? 2 : 1}
        startMonth={today}
        disabled={matcher}
        modifiers={{ full: isTaken }}
        modifiersClassNames={{ full: "sv-day-full" }}
        resetOnSelect
        min={1}
        weekStartsOn={1}
        locale={locale === "id" ? idLocale : enUS}
        className="sv-cal sv-cal--wide"
      />

      {DEMO ? (
        <p className="sv-demo" role="note">
          <Info size={16} strokeWidth={1.6} aria-hidden="true" />
          {t.avail.demo}
        </p>
      ) : null}

      <div className="sv-bk-guests">
        <div className="sv-stepper">
          <span className="sv-stepper-label">
            <Users size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>
              {c.guests}
              <small>{c.guestsHint}</small>
            </span>
          </span>
          <button type="button" onClick={() => setGuests((g) => Math.max(1, g - 1))} aria-label="−" disabled={guests <= 1}>
            <Minus size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <output className="tnum" aria-live="polite">
            {guests}
          </output>
          <button type="button" onClick={() => setGuests((g) => Math.min(40, g + 1))} aria-label="+" disabled={guests >= 40}>
            <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>,

    /* 2. Rooms ------------------------------------------------------------ */
    <div key="rooms" className="sv-bk-step">
      <h2 className="sv-bk-title">{c.roomsTitle}</h2>
      <p className="sv-bk-lead">{c.roomsLead}</p>
      <ul className="sv-bk-rooms">
        {roomState.map(({ unit, rate, status, subtotal, tooShort, ok }) => {
          const isPicked = picked.includes(unit.unit);
          const why = !status
            ? null
            : status.status === "booked"
              ? c.taken
              : status.status === "partial"
                ? fill(c.partly, { free: status.free, total: status.total })
                : !rate?.bookable
                  ? c.notBookable
                  : tooShort
                    ? fill(c.minNights, { n: rate.minNights })
                    : null;
          return (
            <li key={unit.unit}>
              <label className="sv-bk-room" data-picked={isPicked ? "true" : undefined} data-off={!ok ? "true" : undefined}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isPicked}
                  disabled={!ok && !isPicked}
                  onChange={() => toggle(unit.unit)}
                />
                <span className="sv-bk-room-media">
                  {unit.photos[0] ? <StorePhoto src={unit.photos[0]} alt="" sizes="(min-width: 900px) 160px, 30vw" /> : null}
                </span>
                <span className="sv-bk-room-info">
                  <span className="sv-bk-room-name">{unit.name}</span>
                  <span className="sv-bk-room-meta tnum">
                    {unit.size} m² · {unit.bedrooms} {t.rooms.bedroomsShort}
                  </span>
                  {why ? <span className="sv-bk-room-why">{why}</span> : null}
                  {rate ? (
                    <span className="sv-bk-room-price tnum">
                      {ok && subtotal ? (
                        <>
                          <strong>{idr(subtotal)}</strong>
                          <small>{fill(c.nightsN, { n: nightsCount })}</small>
                        </>
                      ) : (
                        <>
                          <strong>{idr(fromRate(rate))}</strong>
                          <small>{c.perNight}</small>
                        </>
                      )}
                    </span>
                  ) : null}
                </span>
                <span className="sv-bk-room-check" aria-hidden="true">
                  {isPicked ? <Check size={16} strokeWidth={2} /> : <Plus size={16} strokeWidth={1.6} />}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {DEMO ? <p className="sv-bk-demo">{c.demoPrice}</p> : null}
    </div>,

    /* 3. Guest ------------------------------------------------------------ */
    <div key="guest" className="sv-bk-step">
      <h2 className="sv-bk-title">{c.detailsTitle}</h2>
      <p className="sv-bk-lead">{c.detailsLead}</p>
      <div className="sv-bk-form">
        {field(
          "name",
          c.name,
          <input
            id="bk-name"
            value={guest.name}
            onChange={(e) => setGuest((g) => ({ ...g, name: e.target.value }))}
            onBlur={() => setTouched((x) => ({ ...x, name: true }))}
            placeholder={c.namePh}
            autoComplete="name"
            required
            aria-invalid={touched.name && !!fieldError.name}
            aria-describedby={describe("name")}
          />,
        )}
        {field(
          "email",
          c.email,
          <input
            id="bk-email"
            type="email"
            inputMode="email"
            value={guest.email}
            onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))}
            onBlur={() => setTouched((x) => ({ ...x, email: true }))}
            placeholder={c.emailPh}
            autoComplete="email"
            required
            aria-invalid={touched.email && !!fieldError.email}
            aria-describedby={describe("email")}
          />,
        )}
        {field(
          "phone",
          c.phone,
          <div className="sv-input-phone">
            <span aria-hidden="true">+62</span>
            <input
              id="bk-phone"
              type="tel"
              inputMode="tel"
              value={guest.phone}
              onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))}
              onBlur={() => setTouched((x) => ({ ...x, phone: true }))}
              placeholder={c.phonePh}
              autoComplete="tel-national"
              required
              aria-invalid={touched.phone && !!fieldError.phone}
              aria-describedby={describe("phone", true)}
            />
          </div>,
          c.phoneHint,
        )}
        <div className="sv-input">
          <label htmlFor="bk-notes">{c.notes}</label>
          <textarea id="bk-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={c.notesPh} />
        </div>
      </div>
    </div>,

    /* 4. Payment ------------------------------------------------------------ */
    <div key="pay" className="sv-bk-step">
      <h2 className="sv-bk-title">{c.payTitle}</h2>
      <p className="sv-bk-lead">{c.payLead}</p>
      <div className="sv-pay" role="radiogroup" aria-label={c.payTitle}>
        {GUEST_GROUPS.map((group) => {
          const options = enabledMethods.filter((m) => m.group === group);
          if (!options.length) return null;
          return (
            <fieldset key={group} className="sv-pay-group">
              <legend>
                <span>{c.groups[group as keyof typeof c.groups]}</span>
                <small>{c.groupHints[group as keyof typeof c.groupHints]}</small>
              </legend>
              <div className="sv-pay-opts">
                {options.map((m) => (
                  <label key={m.id} className="sv-pay-opt" data-checked={method === m.id ? "true" : undefined}>
                    <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="sr-only" />
                    <span className="sv-pay-radio" aria-hidden="true" />
                    <MethodMark method={m} label={m.id === "card" ? c.groups.card : m.label} />
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="sv-bk-only-narrow">{breakdown}</div>

      <p className="sv-bk-after">
        <Info size={16} strokeWidth={1.6} aria-hidden="true" />
        {c.payAfter}
      </p>

      <div className="sv-bk-policy">
        <p className="sv-label">{c.policy}</p>
        <p>{settings.cancellationPolicy[locale]}</p>
      </div>
      <p className="sv-bk-terms">{c.terms}</p>
    </div>,
  ];

  const cover = rooms.find((r) => r.unit === picked[0])?.photos[0] ?? photos.home[0].src;

  return (
    <div ref={top} className="sv-bk">
      {/* --- Step list ---------------------------------------------------- */}
      <ol className="sv-bk-steps">
        {c.steps.map((label, i) => {
          const state = i === step ? "current" : i < step || i <= reached ? "done" : "todo";
          return (
            <li key={label} data-state={state}>
              <button type="button" onClick={() => go(i)} disabled={i > reached || submitting} aria-current={i === step ? "step" : undefined}>
                <span className="sv-bk-steps-num tnum" aria-hidden="true">
                  {i < step ? <Check size={13} strokeWidth={2.2} /> : i + 1}
                </span>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {fill(c.stepOf, { n: step + 1, total: 4 })}: {c.steps[step]}
      </p>

      <div className="sv-bk-grid">
        <div className="sv-bk-main">
          {error ? (
            <p className="sv-bk-alert" role="alert">
              {error}
            </p>
          ) : null}

          <div key={step} className="sv-step-in">
            {steps[step]}
          </div>

          {nudge ? (
            <p className="sv-bk-nudge" role="status">
              {nudge}
            </p>
          ) : null}

          <div className="sv-bk-nav">
            {step > 0 ? (
              <button type="button" className="sv-btn sv-btn--ghost" onClick={() => go(step - 1)} disabled={submitting}>
                <ArrowLeft size={16} strokeWidth={1.6} aria-hidden="true" />
                <span>{c.back}</span>
              </button>
            ) : (
              <span />
            )}
            {primary("sv-bk-nav-next")}
          </div>
        </div>

        {/* --- Summary: wide screens ---------------------------------------- */}
        <aside className="sv-bk-summary" aria-label={c.summary}>
          <div className="sv-bk-summary-media">
            <StorePhoto src={cover} alt="" sizes="360px" />
          </div>
          <div className="sv-bk-summary-body">
            <p className="sv-label">{c.summary}</p>
            <dl className="sv-bk-summary-list">
              <div>
                <dt>{t.order.stay}</dt>
                <dd>
                  {complete ? (
                    <>
                      {fmtDate(checkIn!, locale, "short")} → {fmtDate(checkOut!, locale, "short")}
                      <small className="tnum">
                        {fill(c.nightsN, { n: nightsCount })} · {guests} {t.bar.guestUnit}
                      </small>
                    </>
                  ) : (
                    <span data-empty="true">{c.noDates}</span>
                  )}
                </dd>
                {reached > 0 && step !== 0 ? (
                  <button type="button" className="sv-bk-edit" onClick={() => go(0)} disabled={submitting}>
                    {c.edit}
                  </button>
                ) : null}
              </div>
              <div>
                <dt>{t.order.rooms}</dt>
                <dd>
                  {picked.length ? picked.map(roomName).join(", ") : <span data-empty="true">{c.noRooms}</span>}
                </dd>
                {reached > 1 && step !== 1 ? (
                  <button type="button" className="sv-bk-edit" onClick={() => go(1)} disabled={submitting}>
                    {c.edit}
                  </button>
                ) : null}
              </div>
              {step === 3 ? (
                <div>
                  <dt>{t.order.contactLabel}</dt>
                  <dd>
                    {guest.name}
                    <small>{guest.email}</small>
                    <small className="tnum">{phone ? formatPhone(phone) : ""}</small>
                  </dd>
                  <button type="button" className="sv-bk-edit" onClick={() => go(2)} disabled={submitting}>
                    {c.edit}
                  </button>
                </div>
              ) : null}
            </dl>

            {breakdown}

            {/* No button here: the one way forward sits at the end of the
                step, where the reader finishes, and in the bar on a phone. */}
            <div className="sv-bk-help">
              <a href={waHref(t.common.waHello)} target="_blank" rel="noopener noreferrer">
                {c.help}
                <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </a>
              <Link href={localePath(locale, "booking/check")}>{c.findBooking}</Link>
            </div>
          </div>
        </aside>
      </div>

      {/* --- Bottom bar: phones -------------------------------------------- */}
      <div className="sv-bk-bar">
        <div className="sv-bk-bar-sum">
          {q ? (
            <>
              <strong className="tnum">{idr(q.total)}</strong>
              <small className="tnum">
                {fill(c.nightsN, { n: q.nights })} · {picked.length} {t.order.rooms.toLowerCase()}
              </small>
            </>
          ) : (
            <small>{complete ? c.noRooms : c.noDates}</small>
          )}
        </div>
        {primary("sv-bk-bar-go")}
      </div>
    </div>
  );
}

function parseDay(s: string | null) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  return day(s);
}
