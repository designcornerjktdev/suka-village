"use client";

import { useMemo, useState } from "react";
import { Info, Plus, Shuffle, TicketPercent } from "lucide-react";
import { Badge, ConfirmDelete, Empty, PageHeader, RowActions, Sheet, SheetFooter, Toggle, toast } from "./ui";
import { useBookings, usePromos, useRoomName, useRooms } from "@/lib/booking/hooks";
import { createPromo, deletePromo, savePromo, type PromoInput, type PromoSaveError } from "@/lib/booking/api";
import { fmtDate, idr, randomCode, todayISO } from "@/lib/booking/format";
import { normalizeCode, promoLabel, promoUses } from "@/lib/booking/promo";
import { DEMO } from "@/lib/booking/config";
import type { Booking, Promo } from "@/lib/booking/types";

/**
 * Promo codes: what a guest types at the last step of the booking to get a
 * discount. Each code is a percent (with an optional cap) or an amount in
 * rupiah, and can be limited by dates, minimum nights, rooms and how many
 * bookings may use it.
 *
 * A code in use can still be edited or deleted: bookings that already used it
 * keep the discount they got, because the quote froze it.
 */

const EMPTY: PromoInput = { code: "", note: "", kind: "percent", value: 10, minNights: 1, units: [], active: true };

const SAVE_ERROR: Record<PromoSaveError, string> = {
  code: "Kode 3 sampai 20 karakter: huruf, angka, atau tanda hubung, tanpa spasi.",
  duplicate: "Kode ini sudah dipakai promo lain.",
  value: "Isi besar potongannya. Persen antara 1 dan 100.",
};

type State = { tone: "ok" | "warn" | "off" | "neutral"; label: string };

function stateOf(p: Promo, uses: number, today: string): State {
  if (!p.active) return { tone: "off", label: "Nonaktif" };
  if (p.validTo && today > p.validTo) return { tone: "off", label: "Berakhir" };
  if (p.validFrom && today < p.validFrom) return { tone: "neutral", label: "Terjadwal" };
  if (p.quota != null && uses >= p.quota) return { tone: "warn", label: "Kuota habis" };
  return { tone: "ok", label: "Aktif" };
}

export default function PromosEditor() {
  const promos = usePromos();
  const bookings = useBookings();
  const roomName = useRoomName();
  const today = todayISO();
  const [editing, setEditing] = useState<{ promo: Promo | null; n: number } | null>(null);
  const [removing, setRemoving] = useState<Promo | null>(null);

  const uses = useMemo(() => new Map(promos.map((p) => [p.id, promoUses(p, bookings)])), [promos, bookings]);
  const open = (promo: Promo | null) => setEditing((e) => ({ promo, n: (e?.n ?? 0) + 1 }));

  const add = (
    <button type="button" className="ad-btn ad-btn--primary" onClick={() => open(null)}>
      <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
      Tambah promo
    </button>
  );

  return (
    <>
      <PageHeader title="Promo" lead="Kode yang tamu ketik di langkah terakhir booking untuk mendapat potongan harga." actions={add} />

      {DEMO ? (
        <p className="ad-note">
          <Info size={15} strokeWidth={1.6} aria-hidden="true" />
          Dua kode berlabel &quot;Contoh&quot; sudah disiapkan untuk mencoba. Hapus atau ubah sebelum situs dibuka untuk umum.
        </p>
      ) : null}

      {promos.length ? (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">Kode</th>
                <th scope="col">Potongan</th>
                <th scope="col">Berlaku</th>
                <th scope="col">Dipakai</th>
                <th scope="col">Status</th>
                <th scope="col" className="ad-num">
                  <span className="sr-only">Tindakan</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => {
                const used = uses.get(p.id) ?? 0;
                const state = stateOf(p, used, today);
                return (
                  <tr key={p.id}>
                    <td data-label="Kode">
                      <button type="button" className="ad-code ad-code--btn tnum" onClick={() => open(p)}>
                        {p.code}
                      </button>
                      {p.note ? <small className="ad-wrap">{p.note}</small> : null}
                    </td>
                    <td data-label="Potongan">
                      <strong className="tnum">{promoLabel(p, idr)}</strong>
                      <small>
                        {p.units.length ? p.units.map(roomName).join(", ") : "Semua kamar"}
                        {p.minNights > 1 ? ` · min ${p.minNights} malam` : ""}
                      </small>
                    </td>
                    <td data-label="Berlaku" className="tnum">
                      {validity(p)}
                    </td>
                    <td data-label="Dipakai" className="tnum">
                      {p.quota != null ? `${used} dari ${p.quota}` : `${used} kali`}
                    </td>
                    <td data-label="Status">
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </td>
                    <td data-label="Tindakan" className="ad-num">
                      <RowActions label={p.code} onEdit={() => open(p)} onDelete={() => setRemoving(p)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty action={add}>Belum ada kode promo.</Empty>
      )}

      {editing ? <PromoSheet key={editing.n} promo={editing.promo} bookings={bookings} onClose={() => setEditing(null)} /> : null}

      <ConfirmDelete
        open={!!removing}
        title={`Hapus kode ${removing?.code ?? ""}?`}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          await deletePromo(removing.id);
          toast(`Kode ${removing.code} dihapus`);
          setRemoving(null);
        }}
      >
        Tamu tidak bisa memakai kode ini lagi. Booking yang sudah memakainya tetap mendapat potongannya.
        {removing && (uses.get(removing.id) ?? 0) > 0 ? " Kalau hanya ingin berhenti sementara, matikan saja lewat Ubah." : ""}
      </ConfirmDelete>
    </>
  );
}

function validity(p: Promo) {
  if (!p.validFrom && !p.validTo) return "Tanpa batas waktu";
  if (p.validFrom && p.validTo) return `${fmtDate(p.validFrom, "id", "short")} → ${fmtDate(p.validTo, "id", "short")}`;
  return p.validFrom ? `Mulai ${fmtDate(p.validFrom, "id", "short")}` : `Sampai ${fmtDate(p.validTo!, "id", "short")}`;
}

function PromoSheet({ promo, bookings, onClose }: { promo: Promo | null; bookings: Booking[]; onClose: () => void }) {
  const rooms = useRooms();
  const [form, setForm] = useState<PromoInput>(() => (promo ? { ...promo, note: promo.note ?? "" } : { ...EMPTY, code: randomCode(6) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof PromoInput>(k: K, v: PromoInput[K]) => {
    setError(null);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const used = promo ? promoUses(promo, bookings) : 0;

  const save = async () => {
    if (form.validFrom && form.validTo && form.validTo < form.validFrom) return setError("Tanggal akhir harus sama atau setelah tanggal mulai.");
    setBusy(true);
    const clean: PromoInput = {
      ...form,
      note: form.note?.trim() || undefined,
      maxDiscount: form.kind === "percent" ? form.maxDiscount || undefined : undefined,
      validFrom: form.validFrom || undefined,
      validTo: form.validTo || undefined,
      quota: form.quota || undefined,
    };
    const res = promo ? await savePromo({ ...promo, ...clean }) : await createPromo(clean);
    setBusy(false);
    if (!res.ok) return setError(SAVE_ERROR[res.error]);
    toast(promo ? `Kode ${res.promo.code} disimpan` : `Kode ${res.promo.code} dibuat`);
    onClose();
  };

  /* What a guest would save on a typical stay, so the numbers read as money. */
  const sample = 3_000_000;
  const off = form.kind === "percent" ? Math.min(Math.floor((sample * form.value) / 100), form.maxDiscount || Infinity) : Math.min(form.value, sample);

  return (
    <Sheet
      open
      onClose={onClose}
      title={promo ? `Ubah ${promo.code}` : "Promo baru"}
      lead={promo ? `Sudah dipakai ${used} kali.` : "Tamu mengetik kode ini di langkah pembayaran."}
      footer={<SheetFooter busy={busy} onCancel={onClose} onSave={save} saveLabel={promo ? "Simpan" : "Buat promo"} />}
    >
      <section className="ad-form-sec">
        <h3>Kode</h3>
        <div className="sv-input">
          <label htmlFor="p-code">Kode promo</label>
          <div className="ad-input-action">
            <input
              id="p-code"
              value={form.code}
              onChange={(e) => set("code", normalizeCode(e.target.value))}
              maxLength={20}
              autoComplete="off"
              spellCheck={false}
              className="ad-code-input"
              placeholder="LIBURAN10"
            />
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => set("code", randomCode(6))}>
              <Shuffle size={15} strokeWidth={1.6} aria-hidden="true" />
              Acak
            </button>
          </div>
          <p className="ad-hint">Huruf besar, angka, atau tanda hubung. Misal LIBURAN10.</p>
        </div>
        <div className="sv-input">
          <label htmlFor="p-note">Catatan (hanya admin)</label>
          <input id="p-note" value={form.note ?? ""} onChange={(e) => set("note", e.target.value)} placeholder="Misal: untuk pengikut Instagram, Desember" />
        </div>
      </section>

      <section className="ad-form-sec">
        <h3>Potongan</h3>
        <div className="ad-segmented" role="radiogroup" aria-label="Jenis potongan">
          {(
            [
              ["percent", "Persen (%)"],
              ["amount", "Nominal (Rp)"],
            ] as const
          ).map(([kind, label]) => (
            <label key={kind} data-checked={form.kind === kind ? "true" : undefined}>
              <input
                type="radio"
                name="p-kind"
                className="sr-only"
                checked={form.kind === kind}
                onChange={() => {
                  setForm((f) => ({ ...f, kind, value: kind === "percent" ? 10 : 200_000 }));
                  setError(null);
                }}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="ad-grid-2">
          {form.kind === "percent" ? (
            <>
              <div className="sv-input">
                <label htmlFor="p-value">Besar potongan</label>
                <div className="ad-affix">
                  <input id="p-value" type="number" inputMode="numeric" min={1} max={100} value={form.value || ""} onChange={(e) => set("value", Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
                  <span aria-hidden="true">%</span>
                </div>
              </div>
              <Money id="p-max" label="Potongan maksimal (opsional)" value={form.maxDiscount ?? 0} onChange={(n) => set("maxDiscount", n || undefined)} placeholder="Tanpa batas" />
            </>
          ) : (
            <Money id="p-value" label="Besar potongan" value={form.value} onChange={(n) => set("value", n)} />
          )}
        </div>
        <p className="ad-preview">
          Contoh: menginap seharga <strong className="tnum">{idr(sample)}</strong>, tamu hemat <strong className="tnum">{idr(off)}</strong> dan membayar{" "}
          <strong className="tnum">{idr(sample - off)}</strong>.
        </p>
      </section>

      <section className="ad-form-sec">
        <h3>Syarat</h3>
        <div className="ad-grid-2">
          <div className="sv-input">
            <label htmlFor="p-from">Bisa dipakai mulai</label>
            <input id="p-from" type="date" value={form.validFrom ?? ""} onChange={(e) => set("validFrom", e.target.value || undefined)} />
          </div>
          <div className="sv-input">
            <label htmlFor="p-to">Sampai</label>
            <input id="p-to" type="date" value={form.validTo ?? ""} min={form.validFrom} onChange={(e) => set("validTo", e.target.value || undefined)} />
          </div>
        </div>
        <p className="ad-hint">Tanggal pemesanan, bukan tanggal menginap. Kosongkan kalau tanpa batas.</p>
        <div className="ad-grid-2">
          <div className="sv-input">
            <label htmlFor="p-min">Minimal malam</label>
            <input id="p-min" type="number" inputMode="numeric" min={1} max={30} value={form.minNights} onChange={(e) => set("minNights", Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div className="sv-input">
            <label htmlFor="p-quota">Kuota pemakaian (opsional)</label>
            <input id="p-quota" type="number" inputMode="numeric" min={1} value={form.quota ?? ""} placeholder="Tanpa batas" onChange={(e) => set("quota", e.target.value ? Math.max(1, Number(e.target.value)) : undefined)} />
          </div>
        </div>
        <fieldset className="ad-fieldset">
          <legend>Berlaku untuk kamar</legend>
          <div className="ad-checks">
            {rooms.map((r) => (
              <label key={r.unit} className="ad-check">
                <input type="checkbox" checked={form.units.includes(r.unit)} onChange={(e) => set("units", e.target.checked ? [...form.units, r.unit] : form.units.filter((u) => u !== r.unit))} />
                {r.name}
              </label>
            ))}
          </div>
          <p className="ad-hint">{form.units.length ? "Hanya kamar yang dicentang yang mendapat potongan." : "Tidak ada yang dicentang: berlaku untuk semua kamar."}</p>
        </fieldset>
      </section>

      <section className="ad-form-sec">
        <Toggle checked={form.active} onChange={(v) => set("active", v)} label="Aktif" hint={form.active ? "Tamu bisa memakai kode ini" : "Kode disimpan tapi tidak bisa dipakai"} />
      </section>

      {error ? (
        <p className="sv-bk-alert" role="alert">
          <TicketPercent size={15} strokeWidth={1.6} aria-hidden="true" /> {error}
        </p>
      ) : null}
    </Sheet>
  );
}

function Money({ id, label, value, onChange, placeholder }: { id: string; label: string; value: number; onChange: (n: number) => void; placeholder?: string }) {
  return (
    <div className="sv-input">
      <label htmlFor={id}>{label}</label>
      <div className="ad-money">
        <span aria-hidden="true">Rp</span>
        <input id={id} inputMode="numeric" value={value ? value.toLocaleString("id-ID") : ""} placeholder={placeholder} onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)} />
      </div>
    </div>
  );
}
