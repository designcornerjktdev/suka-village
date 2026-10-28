"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Eye, EyeOff, ImageOff, Info, Plus } from "lucide-react";
import StorePhoto from "../StorePhoto";
import PhotoManager from "./PhotoManager";
import { Badge, Card, ConfirmDelete, Empty, PageHeader, RowActions, SaveBar, Sheet, SheetFooter, Toggle, toast } from "./ui";
import { useContent } from "@/lib/booking/hooks";
import { saveContent } from "@/lib/booking/api";
import { DEMO } from "@/lib/booking/config";
import { uid } from "@/lib/booking/format";
import type { ContentItem, ContentSection } from "@/lib/booking/types";

/**
 * The CMS: one tab per page of the public site, holding exactly what that
 * page shows, in both languages side by side, so a change in one language is
 * never made without seeing the other.
 *
 * Three shapes, as the pages are built:
 *   photos   Beranda (one photograph) and Galeri (photographs only, in order)
 *   list     Fasilitas, Pengalaman, Acara, Jelajah: a list of items, each
 *            added, edited (in a panel), hidden, moved and deleted on its
 *            own, saved as soon as it is done; Jelajah also has its map link
 *            and photo credits
 *   contact  Kontak: its two fixed rows, Reservasi and Lokasi, edited the same
 *            way; the page always has exactly these two, so none is added
 *
 * Rooms are not here: a room's text and photographs live with its facts and
 * its price, under Kamar & harga. The WhatsApp number is under Pengaturan.
 */

type Kind = "photos" | "list" | "contact";

type Meta = { id: ContentSection; label: string; page: string; hint: string; kind: Kind; noun?: string; empty?: string };

const SECTIONS: Meta[] = [
  { id: "home", label: "Beranda", page: "", kind: "photos", hint: "Satu foto Main Villa di halaman utama, di bawah header. Yang tampil adalah foto pertama.", empty: "Belum ada foto. Halaman utama butuh satu foto." },
  { id: "facilities", label: "Fasilitas", page: "facilities", kind: "list", hint: "Kolam renang, restoran, ruang pertemuan, taman bermain, toko.", noun: "fasilitas" },
  { id: "experiences", label: "Pengalaman", page: "experience", kind: "list", hint: "Kegiatan untuk tamu yang menginap.", noun: "pengalaman" },
  { id: "events", label: "Acara", page: "event", kind: "list", hint: "Corporate dan family gathering.", noun: "acara" },
  { id: "explore", label: "Jelajah", page: "explore", kind: "list", hint: "Tempat menarik di sekitar Suka Village, masing-masing dengan link peta.", noun: "tempat" },
  { id: "gallery", label: "Galeri", page: "gallery", kind: "photos", hint: "Foto saja, tanpa keterangan. Urutan di sini sama dengan urutan di halaman Galeri.", empty: "Belum ada foto di galeri." },
  { id: "contact", label: "Kontak", page: "contact", kind: "contact", hint: "Dua baris di halaman Kontak: Reservasi dan Lokasi. Nomor WhatsApp diatur di Pengaturan, bagian Kontak." },
];

export default function ContentEditor() {
  const content = useContent();
  const [section, setSection] = useState<ContentSection>("home");
  const meta = SECTIONS.find((s) => s.id === section)!;

  /* What the tab counts: rows for a list, photographs for the gallery. */
  const count = (s: Meta) =>
    s.kind === "list" ? content[s.id].length : s.id === "gallery" ? (content.gallery[0]?.photos.length ?? 0) : null;

  return (
    <>
      <PageHeader title="Konten" lead="Teks dan foto di setiap halaman, dalam bahasa Indonesia dan Inggris. Untuk kamar, buka Kamar & harga." />
      {DEMO ? (
        <p className="ad-note">
          <Info size={15} strokeWidth={1.6} aria-hidden="true" />
          Prototipe: perubahan tersimpan di browser ini, tapi situs publik masih membaca konten dari kode sampai developer
          menyambungkannya ke database.
        </p>
      ) : null}

      <div className="ad-tabs" role="tablist" aria-label="Bagian situs">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={section === s.id} className="ad-tab" onClick={() => setSection(s.id)}>
            {s.label}
            {count(s) === null ? null : <span className="tnum">{count(s)}</span>}
          </button>
        ))}
      </div>

      {meta.kind === "photos" ? (
        <PhotosEditor key={section} section={section} items={content[section]} meta={meta} />
      ) : (
        <ListEditor key={section} section={section} items={content[section]} meta={meta} />
      )}
    </>
  );
}

/* --- Shared ----------------------------------------------------------------- */

function SectionHead({ meta, action }: { meta: Meta; action?: ReactNode }) {
  return (
    <div className="ad-section-head">
      <div>
        <h2 className="ad-section-title">{meta.label}</h2>
        <p className="ad-muted">{meta.hint}</p>
      </div>
      <div className="ad-section-actions">
        <Link href={`/id${meta.page ? `/${meta.page}` : ""}`} target="_blank" className="ad-btn ad-btn--ghost">
          Lihat halaman <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden="true" />
        </Link>
        {action}
      </div>
    </div>
  );
}

function useDraft(items: ContentItem[]) {
  const [draft, setDraft] = useState(items);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(items);
  const change = (update: (d: ContentItem[]) => ContentItem[]) => {
    setSaved(false);
    setDraft(update);
  };
  const patch = (id: string, p: Partial<ContentItem>) => change((d) => d.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const save = async (section: ContentSection, message: string) => {
    setSaving(true);
    await saveContent(section, draft);
    setSaving(false);
    setSaved(true);
    toast(message);
  };
  return { draft, setDraft, dirty, saving, saved, change, patch, save };
}

function Bilingual({
  id,
  label,
  value,
  onChange,
  rows,
}: {
  id: string;
  label: string;
  value: { id: string; en: string };
  onChange: (next: { id: string; en: string }) => void;
  rows?: number;
}) {
  return (
    <>
      {(["id", "en"] as const).map((l) => (
        <div key={l} className="sv-input">
          <label htmlFor={`${id}-${l}`}>
            {label} · {l === "id" ? "Indonesia" : "English"}
          </label>
          {rows ? (
            <textarea id={`${id}-${l}`} rows={rows} value={value[l]} onChange={(e) => onChange({ ...value, [l]: e.target.value })} />
          ) : (
            <input id={`${id}-${l}`} value={value[l]} onChange={(e) => onChange({ ...value, [l]: e.target.value })} />
          )}
        </div>
      ))}
    </>
  );
}

function Field({ id, label, value, onChange, placeholder, type = "text" }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="sv-input">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const NO_DASH = "Hindari tanda pisah panjang; pakai koma atau titik.";

/* --- Beranda, Galeri: photographs only ------------------------------------- */

function PhotosEditor({ section, items, meta }: { section: ContentSection; items: ContentItem[]; meta: Meta }) {
  const { draft, setDraft, dirty, saving, saved, patch, save } = useDraft(items);
  const item = draft[0];
  return (
    <>
      <SectionHead meta={meta} />
      {item ? (
        <Card>
          <PhotoManager photos={item.photos} onChange={(next) => patch(item.id, { photos: next })} emptyHint={meta.empty} />
        </Card>
      ) : null}
      <SaveBar dirty={dirty} saving={saving} saved={saved} onReset={() => setDraft(items)} onSave={() => save(section, section === "home" ? "Foto beranda disimpan" : "Galeri disimpan")} />
    </>
  );
}

/* --- Fasilitas, Pengalaman, Acara, Jelajah, Kontak: a list of items ------- */

/**
 * The list is what the page shows, in order. Every change is saved the moment
 * it is made (moved, hidden, deleted, or Simpan in the panel), so there is
 * never a half saved list to remember.
 */
function ListEditor({ section, items, meta }: { section: ContentSection; items: ContentItem[]; meta: Meta }) {
  const fixed = meta.kind === "contact";
  const [editing, setEditing] = useState<{ item: ContentItem | null; n: number } | null>(null);
  const [removing, setRemoving] = useState<ContentItem | null>(null);
  const [busy, setBusy] = useState(false);

  const commit = async (next: ContentItem[], message: string) => {
    setBusy(true);
    await saveContent(section, next);
    setBusy(false);
    toast(message);
  };
  const move = (index: number, by: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    return commit(next, "Urutan disimpan");
  };
  const open = (item: ContentItem | null) => setEditing((e) => ({ item, n: (e?.n ?? 0) + 1 }));

  const add = fixed ? undefined : (
    <button type="button" className="ad-btn ad-btn--primary" onClick={() => open(null)}>
      <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
      Tambah {meta.noun}
    </button>
  );

  return (
    <>
      <SectionHead meta={meta} action={add} />

      {items.length ? (
        <ol className="ad-records" aria-busy={busy}>
          {items.map((item, index) => {
            const title = item.name.id || "(tanpa judul)";
            return (
              <li key={item.id} className="ad-record" data-hidden={item.visible ? undefined : "true"}>
                {fixed ? null : (
                  <div className="ad-record-order">
                    <button type="button" className="ad-icon-btn ad-icon-btn--quiet" onClick={() => move(index, -1)} disabled={index === 0 || busy} aria-label={`Naikkan ${title}`}>
                      <ArrowUp size={15} strokeWidth={1.7} aria-hidden="true" />
                    </button>
                    <button type="button" className="ad-icon-btn ad-icon-btn--quiet" onClick={() => move(index, 1)} disabled={index === items.length - 1 || busy} aria-label={`Turunkan ${title}`}>
                      <ArrowDown size={15} strokeWidth={1.7} aria-hidden="true" />
                    </button>
                  </div>
                )}
                <button type="button" className="ad-record-main" onClick={() => open(item)}>
                  <span className="ad-record-thumb">
                    {item.photos[0] ? <StorePhoto src={item.photos[0]} alt="" sizes="72px" /> : <ImageOff size={18} strokeWidth={1.4} aria-hidden="true" />}
                  </span>
                  <span className="ad-record-text">
                    <strong>{title}</strong>
                    <small>
                      {item.id === "location" ? item.body.id.split("\n")[0] : item.name.en || "Judul Inggris belum diisi"}
                      {item.id === "location" ? "" : ` · ${item.photos.length} foto`}
                    </small>
                  </span>
                </button>
                <span className="ad-record-state">{fixed ? null : <Badge tone={item.visible ? "ok" : "off"}>{item.visible ? "Tampil" : "Disembunyikan"}</Badge>}</span>
                <RowActions label={title} onEdit={() => open(item)} onDelete={fixed ? undefined : () => setRemoving(item)}>
                  {fixed ? null : (
                    <button
                      type="button"
                      className="ad-icon-btn"
                      disabled={busy}
                      onClick={() => commit(items.map((x) => (x.id === item.id ? { ...x, visible: !x.visible } : x)), item.visible ? `${title} disembunyikan` : `${title} ditampilkan`)}
                      aria-label={item.visible ? `Sembunyikan ${title}` : `Tampilkan ${title}`}
                      title={item.visible ? "Sembunyikan" : "Tampilkan"}
                    >
                      {item.visible ? <EyeOff size={16} strokeWidth={1.6} aria-hidden="true" /> : <Eye size={16} strokeWidth={1.6} aria-hidden="true" />}
                    </button>
                  )}
                </RowActions>
              </li>
            );
          })}
        </ol>
      ) : (
        <Empty action={add}>Belum ada {meta.noun} di halaman {meta.label}.</Empty>
      )}

      {editing ? (
        <ItemSheet
          key={editing.n}
          section={section}
          meta={meta}
          item={editing.item}
          onClose={() => setEditing(null)}
          onSave={async (saved) => {
            const exists = items.some((x) => x.id === saved.id);
            await saveContent(section, exists ? items.map((x) => (x.id === saved.id ? saved : x)) : [...items, saved]);
            toast(exists ? `${saved.name.id} disimpan` : `${saved.name.id} ditambahkan ke ${meta.label}`);
            setEditing(null);
          }}
        />
      ) : null}

      <ConfirmDelete
        open={!!removing}
        title={`Hapus ${removing?.name.id || meta.noun}?`}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          await saveContent(section, items.filter((x) => x.id !== removing.id));
          toast(`${removing.name.id || "Item"} dihapus`);
          setRemoving(null);
        }}
      >
        Item ini hilang dari halaman {meta.label}, beserta teks dan daftar fotonya. Kalau hanya ingin menyembunyikan sementara, pakai tombol mata di barisnya.
      </ConfirmDelete>
    </>
  );
}

/** Add or edit one item, in a panel. */
function ItemSheet({
  section,
  meta,
  item,
  onClose,
  onSave,
}: {
  section: ContentSection;
  meta: Meta;
  item: ContentItem | null;
  onClose: () => void;
  onSave: (item: ContentItem) => Promise<void>;
}) {
  const place = section === "explore";
  const [draft, setDraft] = useState<ContentItem>(
    () => item ?? { id: uid(), name: { id: "", en: "" }, body: { id: "", en: "" }, photos: [], visible: true, ...(place ? { link: "", credit: "" } : {}) },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patch = (p: Partial<ContentItem>) => {
    setError(null);
    setDraft((d) => ({ ...d, ...p }));
  };

  const save = async () => {
    if (!draft.name.id.trim()) return setError("Isi judul (Indonesia) dulu.");
    setBusy(true);
    await onSave({ ...draft, name: { id: draft.name.id.trim(), en: draft.name.en.trim() } });
    setBusy(false);
  };

  const location = draft.id === "location";
  const reserve = draft.id === "reserve";

  return (
    <Sheet
      open
      onClose={onClose}
      title={item ? `Ubah ${item.name.id || meta.noun}` : `Tambah ${meta.noun}`}
      lead={`Halaman ${meta.label}`}
      footer={<SheetFooter busy={busy} onCancel={onClose} onSave={save} saveLabel={item ? "Simpan" : "Tambahkan"} />}
    >
      <section className="ad-form-sec">
        <h3>Teks</h3>
        <div className="ad-bilingual ad-bilingual--stack">
          <Bilingual id="it-n" label="Judul" value={draft.name} onChange={(v) => patch({ name: v })} />
        </div>
        {location ? (
          <div className="sv-input">
            <label htmlFor="it-addr">Alamat</label>
            <textarea id="it-addr" rows={3} value={draft.body.id} onChange={(e) => patch({ body: { id: e.target.value, en: e.target.value } })} />
          </div>
        ) : (
          <div className="ad-bilingual ad-bilingual--stack">
            <Bilingual id="it-b" label="Teks" rows={5} value={draft.body} onChange={(v) => patch({ body: v })} />
          </div>
        )}
        <p className="ad-hint">{NO_DASH}</p>
      </section>

      {place || reserve || location ? (
        <section className="ad-form-sec">
          <h3>Link</h3>
          {place ? (
            <>
              <Field id="it-map" label="Link Google Maps (Buka di peta)" type="url" value={draft.link ?? ""} onChange={(v) => patch({ link: v })} />
              <div className="sv-input">
                <label htmlFor="it-credit">Kredit foto, satu baris per foto</label>
                <textarea id="it-credit" rows={3} value={draft.credit ?? ""} placeholder="Nama, sumber, lisensi" onChange={(e) => patch({ credit: e.target.value })} />
              </div>
            </>
          ) : null}
          {reserve ? <Field id="it-ig" label="Link Instagram" type="url" value={draft.link ?? ""} placeholder="https://www.instagram.com/…" onChange={(v) => patch({ link: v })} /> : null}
          {location ? (
            <>
              <Field id="it-plus" label="Plus code" value={draft.plusCode ?? ""} placeholder="42C5+CV5" onChange={(v) => patch({ plusCode: v })} />
              <Field id="it-gmap" label="Link Google Maps (Petunjuk arah)" type="url" value={draft.link ?? ""} onChange={(v) => patch({ link: v })} />
              <p className="ad-hint">Peta di halaman Kontak dicari dari plus code ini.</p>
            </>
          ) : null}
        </section>
      ) : null}

      {location ? null : (
        <section className="ad-form-sec">
          <h3>Foto</h3>
          <PhotoManager
            photos={draft.photos}
            onChange={(next) => patch({ photos: next })}
            emptyHint={reserve ? "Belum ada foto. Yang tampil di samping Reservasi adalah foto pertama." : "Belum ada foto. Tambahkan setidaknya satu; di situs, foto tampil sebagai slider di samping teks."}
          />
        </section>
      )}

      {meta.kind === "list" ? (
        <section className="ad-form-sec">
          <Toggle checked={draft.visible} onChange={(v) => patch({ visible: v })} label="Tampilkan di situs" hint={draft.visible ? "Terlihat oleh pengunjung" : "Disembunyikan dari pengunjung"} />
        </section>
      ) : null}

      {error ? (
        <p className="sv-bk-alert" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
