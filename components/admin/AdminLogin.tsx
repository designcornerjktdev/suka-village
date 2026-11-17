"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import Logo from "../Logo";
import { adminLogin } from "@/lib/booking/api";

/**
 * The admin sign in, against real accounts (lib/server/auth.ts; accounts are
 * made with `npm run admin:create`).
 */
export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"empty" | "wrong" | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("empty");
      return;
    }
    setBusy(true);
    setError(null);
    const ok = await adminLogin(email, password);
    if (ok) {
      router.replace("/admin/bookings");
      return;
    }
    setBusy(false);
    setError("wrong");
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
            {error === "empty" ? "Isi email dan kata sandi." : "Email atau kata sandi salah."}
          </p>
        ) : null}

        <button type="submit" className="ad-btn ad-btn--primary ad-btn--block" disabled={busy}>
          {busy ? <LoaderCircle className="sv-spin" size={16} strokeWidth={1.8} aria-hidden="true" /> : null}
          Masuk
        </button>
      </form>
    </main>
  );
}
