"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Info, LoaderCircle } from "lucide-react";
import Logo from "../Logo";
import { adminLogin } from "@/lib/booking/api";
import { DEMO } from "@/lib/booking/config";

/**
 * The admin sign in. In the prototype any filled in email and password opens
 * the panel, and the page says so. The developer replaces adminLogin with real
 * authentication (BOOKING.md, "Admin access").
 */
export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const ok = await adminLogin(email, password);
    if (ok) {
      router.replace("/admin/bookings");
      return;
    }
    setBusy(false);
    setError(true);
  };

  return (
    <main className="ad-login">
      <form className="ad-login-card" onSubmit={submit} noValidate>
        <div className="ad-login-brand">
          <Logo variant="full" className="ad-login-logo" title="Suka Village" />
          <p className="ad-login-sub">Panel admin</p>
        </div>

        <h1 className="ad-title">Masuk</h1>

        <div className="sv-input">
          <label htmlFor="ad-email">Email</label>
          <input id="ad-email" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="sv-input">
          <label htmlFor="ad-pass">Kata sandi</label>
          <input id="ad-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error ? (
          <p className="sv-bk-alert" role="alert">
            Isi email dan kata sandi.
          </p>
        ) : null}

        <button type="submit" className="ad-btn ad-btn--primary ad-btn--block" disabled={busy}>
          {busy ? <LoaderCircle className="sv-spin" size={16} strokeWidth={1.8} aria-hidden="true" /> : null}
          Masuk
        </button>

        {DEMO ? (
          <p className="ad-note">
            <Info size={15} strokeWidth={1.6} aria-hidden="true" />
            Prototipe: email dan kata sandi apa saja bisa dipakai. Login sungguhan dipasang developer.
          </p>
        ) : null}
      </form>
    </main>
  );
}
