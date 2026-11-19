"use client";

import { useState } from "react";
import { AlertCircle, KeyRound, Plus } from "lucide-react";
import { Badge, ConfirmDelete, Empty, PageHeader, RowActions, Sheet, SheetFooter, toast } from "./ui";
import { useAdminSession } from "@/lib/booking/hooks";
import {
  type AdminAccount,
  type AdminProfileInput,
  changeMyPassword,
  createAdminUser,
  deleteAdminUser,
  resetAdminPassword,
  updateAdminUser,
  useAdmins,
} from "@/lib/booking/admins";
import { fmtDate } from "@/lib/booking/format";

/**
 * Pengguna: the admin accounts. Every admin may do everything (no roles).
 * Add with a starting password; edit name, username and email; reset another
 * admin's password (they are signed out); delete anyone but yourself; change
 * your own password with the current one.
 */

const MIN_PASSWORD = 10;

const ERROR: Record<string, string> = {
  email: "Email tidak valid.",
  username: "Username 3–32 karakter: huruf kecil, angka, titik, garis bawah, tanda hubung.",
  displayName: "Nama tampilan wajib diisi.",
  password: `Kata sandi minimal ${MIN_PASSWORD} karakter.`,
  exists: "Email atau username sudah dipakai admin lain.",
  self: "Anda tidak bisa menghapus akun sendiri.",
  notFound: "Admin ini sudah tidak ada.",
  current: "Kata sandi saat ini salah.",
};
const errorText = (e: string) => ERROR[e] ?? "Belum tersimpan. Periksa koneksi lalu coba lagi.";

type Open = { kind: "profile"; admin: AdminAccount | null } | { kind: "reset"; admin: AdminAccount } | { kind: "own" };

export default function UsersEditor() {
  const admins = useAdmins();
  const session = useAdminSession();
  const [open, setOpen] = useState<{ what: Open; n: number } | null>(null);
  const [removing, setRemoving] = useState<AdminAccount | null>(null);
  const show = (what: Open) => setOpen((o) => ({ what, n: (o?.n ?? 0) + 1 }));
  const close = () => setOpen(null);

  const add = (
    <button type="button" className="ad-btn ad-btn--primary" onClick={() => show({ kind: "profile", admin: null })}>
      <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
      Tambah pengguna
    </button>
  );

  return (
    <>
      <PageHeader title="Pengguna" lead="Akun yang bisa masuk ke admin. Semua akun punya akses yang sama." actions={add} />

      {admins === undefined ? null : admins.length ? (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">Nama</th>
                <th scope="col">Username</th>
                <th scope="col">Email</th>
                <th scope="col">Dibuat</th>
                <th scope="col" className="ad-num">
                  <span className="sr-only">Tindakan</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => {
                const own = a.id === session?.id;
                return (
                  <tr key={a.id}>
                    <td data-label="Nama">
                      <button type="button" className="ad-link" onClick={() => show({ kind: "profile", admin: a })}>
                        {a.displayName}
                      </button>{" "}
                      {own ? <Badge>Anda</Badge> : null}
                    </td>
                    <td data-label="Username">{a.username ?? "—"}</td>
                    <td data-label="Email" className="ad-wrap">
                      {a.email}
                    </td>
                    <td data-label="Dibuat" className="tnum">
                      {fmtDate(a.createdAt.slice(0, 10), "id", "short")}
                    </td>
                    <td data-label="Tindakan" className="ad-num">
                      <RowActions
                        label={a.displayName}
                        onEdit={() => show({ kind: "profile", admin: a })}
                        extra={[
                          own
                            ? { label: "Ganti kata sandi", icon: <KeyRound aria-hidden="true" />, onSelect: () => show({ kind: "own" }) }
                            : { label: "Reset kata sandi", icon: <KeyRound aria-hidden="true" />, onSelect: () => show({ kind: "reset", admin: a }) },
                        ]}
                        onDelete={own ? undefined : () => setRemoving(a)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty action={add}>Belum ada pengguna.</Empty>
      )}

      {open?.what.kind === "profile" ? <ProfileSheet key={open.n} admin={open.what.admin} onClose={close} /> : null}
      {open?.what.kind === "reset" ? <ResetSheet key={open.n} admin={open.what.admin} onClose={close} /> : null}
      {open?.what.kind === "own" ? <OwnPasswordSheet key={open.n} onClose={close} /> : null}

      <ConfirmDelete
        open={!!removing}
        title={`Hapus ${removing?.displayName ?? ""}?`}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          const r = await deleteAdminUser(removing.id);
          toast(r.ok ? `${removing.displayName} dihapus` : errorText(r.error));
          setRemoving(null);
        }}
      >
        Akun ini tidak bisa masuk lagi dan langsung keluar dari semua perangkat. Riwayat booking yang dikerjakannya tetap ada.
      </ConfirmDelete>
    </>
  );
}

function FormError({ error }: { error: string | null }) {
  return error ? (
    <p className="sv-bk-alert" role="alert">
      <AlertCircle size={15} strokeWidth={1.6} aria-hidden="true" /> {error}
    </p>
  ) : null;
}

function ProfileSheet({ admin, onClose }: { admin: AdminAccount | null; onClose: () => void }) {
  const [form, setForm] = useState<AdminProfileInput & { password: string }>({
    displayName: admin?.displayName ?? "",
    username: admin?.username ?? "",
    email: admin?.email ?? "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => {
    setError(null);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const save = async () => {
    setBusy(true);
    const profile = { displayName: form.displayName, username: form.username, email: form.email };
    const r = admin ? await updateAdminUser(admin.id, profile) : await createAdminUser({ ...profile, password: form.password });
    setBusy(false);
    if (!r.ok) return setError(errorText(r.error));
    toast(admin ? `${form.displayName.trim()} disimpan` : `${form.displayName.trim()} ditambahkan`);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={admin ? `Ubah ${admin.displayName}` : "Pengguna baru"}
      lead={admin ? undefined : "Berikan email atau username dan kata sandi ini kepada orangnya. Ia bisa menggantinya sendiri setelah masuk."}
      footer={<SheetFooter busy={busy} onCancel={onClose} onSave={save} saveLabel={admin ? "Simpan" : "Tambah pengguna"} />}
    >
      <section className="ad-form-sec">
        <div className="sv-input">
          <label htmlFor="u-name">Nama tampilan</label>
          <input id="u-name" value={form.displayName} onChange={(e) => set("displayName", e.target.value)} maxLength={80} autoComplete="off" placeholder="Misal: John Doe" />
          <p className="ad-hint">Tampil di admin dan di riwayat booking.</p>
        </div>
        <div className="sv-input">
          <label htmlFor="u-username">Username</label>
          <input
            id="u-username"
            value={form.username}
            onChange={(e) => set("username", e.target.value.toLowerCase())}
            maxLength={32}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="misal: john.doe"
          />
          <p className="ad-hint">Untuk masuk. Huruf kecil, angka, titik, garis bawah, atau tanda hubung.</p>
        </div>
        <div className="sv-input">
          <label htmlFor="u-email">Email</label>
          <input id="u-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="off" />
        </div>
        {admin ? null : (
          <div className="sv-input">
            <label htmlFor="u-password">Kata sandi awal</label>
            <input id="u-password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
            <p className="ad-hint">Minimal {MIN_PASSWORD} karakter.</p>
          </div>
        )}
      </section>
      <FormError error={error} />
    </Sheet>
  );
}

function ResetSheet({ admin, onClose }: { admin: AdminAccount; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    const r = await resetAdminPassword(admin.id, password);
    setBusy(false);
    if (!r.ok) return setError(errorText(r.error));
    toast(`Kata sandi ${admin.displayName} direset`);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Reset kata sandi ${admin.displayName}`}
      lead="Ia langsung keluar dari semua perangkat dan masuk lagi dengan kata sandi baru ini."
      footer={<SheetFooter busy={busy} onCancel={onClose} onSave={save} saveLabel="Reset kata sandi" />}
    >
      <section className="ad-form-sec">
        <div className="sv-input">
          <label htmlFor="r-password">Kata sandi baru</label>
          <input
            id="r-password"
            type="password"
            value={password}
            onChange={(e) => {
              setError(null);
              setPassword(e.target.value);
            }}
            autoComplete="new-password"
          />
          <p className="ad-hint">Minimal {MIN_PASSWORD} karakter.</p>
        </div>
      </section>
      <FormError error={error} />
    </Sheet>
  );
}

function OwnPasswordSheet({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    const r = await changeMyPassword(current, next);
    setBusy(false);
    if (!r.ok) return setError(errorText(r.error));
    toast("Kata sandi diganti");
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Ganti kata sandi"
      lead="Perangkat lain yang masuk dengan akun ini akan keluar. Perangkat ini tetap masuk."
      footer={<SheetFooter busy={busy} onCancel={onClose} onSave={save} saveLabel="Ganti kata sandi" />}
    >
      <section className="ad-form-sec">
        <div className="sv-input">
          <label htmlFor="o-current">Kata sandi saat ini</label>
          <input
            id="o-current"
            type="password"
            value={current}
            onChange={(e) => {
              setError(null);
              setCurrent(e.target.value);
            }}
            autoComplete="current-password"
          />
        </div>
        <div className="sv-input">
          <label htmlFor="o-next">Kata sandi baru</label>
          <input
            id="o-next"
            type="password"
            value={next}
            onChange={(e) => {
              setError(null);
              setNext(e.target.value);
            }}
            autoComplete="new-password"
          />
          <p className="ad-hint">Minimal {MIN_PASSWORD} karakter.</p>
        </div>
      </section>
      <FormError error={error} />
    </Sheet>
  );
}
