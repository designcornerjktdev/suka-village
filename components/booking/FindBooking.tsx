"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { getDict } from "@/content/dict";
import { localePath, type Locale } from "@/content/i18n";
import { findBooking } from "@/lib/booking/api";

/**
 * Finding a booking without an account: the code from the confirmation and
 * the email it was made with. Both are needed, so a guessed code alone shows
 * nothing.
 */
export default function FindBooking({ locale }: { locale: Locale }) {
  const o = getDict(locale).order;
  const router = useRouter();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !email.trim()) return;
    setBusy(true);
    setMissing(false);
    const found = await findBooking(code, email);
    if (found) {
      router.push(localePath(locale, `booking/${found.code}`));
      return;
    }
    setBusy(false);
    setMissing(true);
  };

  return (
    <form className="sv-find" onSubmit={submit} noValidate>
      <div className="sv-input">
        <label htmlFor="find-code">{o.checkCode}</label>
        <input
          id="find-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SV-XXXXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
        />
      </div>
      <div className="sv-input">
        <label htmlFor="find-email">{o.checkEmail}</label>
        <input id="find-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </div>
      {missing ? (
        <p className="sv-bk-alert" role="alert">
          {o.checkNotFound}
        </p>
      ) : null}
      <button type="submit" className="sv-btn sv-btn--primary" disabled={busy} aria-busy={busy}>
        {busy ? <LoaderCircle className="sv-spin" size={16} strokeWidth={1.8} aria-hidden="true" /> : null}
        <span>{o.checkGo}</span>
        {!busy ? <ArrowRight size={16} strokeWidth={1.6} aria-hidden="true" /> : null}
      </button>
    </form>
  );
}
