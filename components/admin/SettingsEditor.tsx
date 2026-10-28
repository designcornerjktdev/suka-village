"use client";

import { useRef, useState, type FocusEvent } from "react";
import { Mail } from "lucide-react";
import type { Locale } from "@/content/i18n";
import MessagePreview from "../booking/MessagePreview";
import MethodMark from "../booking/MethodMark";
import { Card, PageHeader, SaveBar, Select, Toggle, toast } from "./ui";
import { useBookings, useSettings } from "@/lib/booking/hooks";
import { saveSettings } from "@/lib/booking/api";
import { METHODS } from "@/lib/booking/payments";
import { effectiveStatus } from "@/lib/booking/occupancy";
import { DEFAULT_TEMPLATES, TEMPLATE_LABELS, VARIABLES } from "@/lib/booking/notifications";
import type { PaymentGroup, Settings, TemplateId } from "@/lib/booking/types";

/**
 * How booking works: which payment methods guests see and how long a room is
 * held for payment; which messages go out and what they say; the
 * cancellation policy shown before paying; and the contact details.
 */

const GROUP_LABEL: Record<PaymentGroup, string> = {
  qris: "QRIS",
  va: "Virtual account",
  ewallet: "E-wallet",
  card: "Kartu",
  manual: "Hanya admin",
};

const HOLDS = [
  { v: 15, label: "15 menit" },
  { v: 30, label: "30 menit" },
  { v: 60, label: "1 jam" },
  { v: 120, label: "2 jam" },
  { v: 1440, label: "24 jam" },
];

type Tab = "payment" | "notify" | "policy";

export default function SettingsEditor() {
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>("payment");
  const [draft, setDraft] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const update = (fn: (s: Settings) => Settings) => {
    setSaved(false);
    setDraft(fn);
  };

  return (
    <>
      <PageHeader title="Pengaturan" lead="Cara bayar, email otomatis ke tamu, kebijakan, dan kontak." />

      <div className="ad-tabs ad-tabs--line" role="tablist" aria-label="Pengaturan">
        {(
          [
            ["payment", "Pembayaran"],
            ["notify", "Email otomatis"],
            ["policy", "Kebijakan & kontak"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className="ad-tab" onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "payment" ? <PaymentTab draft={draft} update={update} /> : null}
      {tab === "notify" ? <NotifyTab draft={draft} update={update} /> : null}
      {tab === "policy" ? <PolicyTab draft={draft} update={update} /> : null}

      <SaveBar
        dirty={dirty}
        saving={saving}
        saved={saved}
        onReset={() => setDraft(settings)}
        onSave={async () => {
          setSaving(true);
          await saveSettings(draft);
          setSaving(false);
          setSaved(true);
          toast("Pengaturan disimpan");
        }}
      />
    </>
  );
}

type TabProps = { draft: Settings; update: (fn: (s: Settings) => Settings) => void };

function PaymentTab({ draft, update }: TabProps) {
  const groups = Array.from(new Set(METHODS.map((m) => m.group)));
  return (
    <div className="ad-stack">
      <Card title="Cara bayar yang tampil ke tamu">
        <p className="ad-muted">Yang dimatikan tidak muncul di langkah pembayaran. Penyedia pembayaran (misal Xendit atau Midtrans) harus mengaktifkan metode yang sama.</p>
        <div className="ad-method-groups">
          {groups.map((g) => (
            <div key={g} className="ad-method-group">
              <p className="ad-subtitle">{GROUP_LABEL[g]}</p>
              {METHODS.filter((m) => m.group === g).map((m) => (
                <Toggle
                  key={m.id}
                  checked={draft.methods[m.id]}
                  onChange={(v) => update((s) => ({ ...s, methods: { ...s.methods, [m.id]: v } }))}
                  label={
                    m.group === "manual" ? (
                      m.label
                    ) : (
                    <span className="ad-method-label">
                      {m.logos.length ? <MethodMark method={m} size="sm" /> : <span aria-hidden="true" />}
                      {/* Under the "Virtual account" heading the bank's name is enough. */}
                      <span>{m.bank ?? m.label}</span>
                    </span>
                    )
                  }
                  hint={m.group === "manual" ? "Untuk booking manual dari admin" : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Batas waktu pembayaran">
        <p className="ad-muted">Selama waktu ini kamar ditahan untuk tamu. Lewat dari itu, pesanan kedaluwarsa dan kamar dilepas otomatis.</p>
        <div className="ad-segmented" role="radiogroup" aria-label="Batas waktu pembayaran">
          {HOLDS.map((h) => (
            <label key={h.v} data-checked={draft.holdMinutes === h.v ? "true" : undefined}>
              <input type="radio" name="hold" className="sr-only" checked={draft.holdMinutes === h.v} onChange={() => update((s) => ({ ...s, holdMinutes: h.v }))} />
              {h.label}
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NotifyTab({ draft, update }: TabProps) {
  const bookings = useBookings();
  const [template, setTemplate] = useState<TemplateId>("awaiting_payment");
  const [lang, setLang] = useState<Locale>("id");
  const focused = useRef<{ el: HTMLInputElement | HTMLTextAreaElement; field: "subject" | "email" } | null>(null);
  const tpl = draft.templates[template];
  const wanted = template === "awaiting_payment" ? "pending" : template === "payment_received" ? "paid" : template === "rejected" ? "rejected" : "confirmed";
  const sample = bookings.find((b) => effectiveStatus(b) === wanted) ?? bookings[0];

  const setField = (field: "subject" | "email", value: string) =>
    update((s) => ({
      ...s,
      templates: { ...s.templates, [template]: { ...s.templates[template], [field]: { ...s.templates[template][field], [lang]: value } } },
    }));

  const insert = (variable: string) => {
    const f = focused.current;
    const token = `{${variable}}`;
    if (!f) {
      setField("email", `${tpl.email[lang]}${token}`);
      return;
    }
    const { el, field } = f;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    setField(field, el.value.slice(0, start) + token + el.value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  /* Remembers the last field focused, so a variable chip inserts at its caret. */
  const onFocus = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const field = e.currentTarget.dataset.field as "subject" | "email";
    focused.current = { el: e.currentTarget, field };
  };

  return (
    <div className="ad-stack">
      <p className="ad-note">
        <Mail size={15} strokeWidth={1.6} aria-hidden="true" />
        Semua pesan otomatis dikirim lewat email. Untuk menghubungi tamu di WhatsApp, pakai tombol chat di halaman booking: itu
        dikirim manual dari WhatsApp Anda sendiri, jadi tidak ada biaya per pesan.
      </p>

      <Card title="Isi email">
        <div className="ad-toolbar">
          <Select ariaLabel="Pesan" value={template} onChange={setTemplate} options={(Object.keys(TEMPLATE_LABELS) as TemplateId[]).map((k) => ({ value: k, label: TEMPLATE_LABELS[k] }))} />
          <div className="ad-segmented ad-segmented--sm" role="radiogroup" aria-label="Bahasa">
            {(["id", "en"] as Locale[]).map((l) => (
              <label key={l} data-checked={lang === l ? "true" : undefined}>
                <input type="radio" name="tpl-lang" className="sr-only" checked={lang === l} onChange={() => setLang(l)} />
                {l === "id" ? "Indonesia" : "English"}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="ad-btn ad-btn--ghost"
            onClick={() => update((s) => ({ ...s, templates: { ...s.templates, [template]: structuredClone(DEFAULT_TEMPLATES[template]) } }))}
          >
            Kembalikan teks awal
          </button>
        </div>

        <div className="ad-vars">
          <span className="ad-muted">Sisipkan:</span>
          {VARIABLES.map((v) => (
            <button key={v} type="button" className="ad-var" onClick={() => insert(v)}>
              {`{${v}}`}
            </button>
          ))}
        </div>

        <div className="ad-tpl">
          <div className="ad-stack-sm">
            <div className="sv-input">
              <label htmlFor="tpl-subject">Subjek email</label>
              <input id="tpl-subject" value={tpl.subject[lang]} onChange={(e) => setField("subject", e.target.value)} data-field="subject" onFocus={onFocus} />
            </div>
            <div className="sv-input">
              <label htmlFor="tpl-email">Isi email</label>
              <textarea id="tpl-email" rows={14} value={tpl.email[lang]} onChange={(e) => setField("email", e.target.value)} data-field="email" onFocus={onFocus} />
            </div>
            <p className="ad-hint">Variabel dalam kurung kurawal diganti otomatis dengan data pesanan saat email dikirim.</p>
          </div>
          <div>
            <p className="ad-subtitle">Pratinjau{sample ? ` · contoh ${sample.code}` : ""}</p>
            {sample ? <MessagePreview booking={sample} template={template} settings={draft} locale={lang} /> : <p className="ad-muted">Belum ada booking untuk contoh.</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}

function PolicyTab({ draft, update }: TabProps) {
  return (
    <div className="ad-stack">
      <Card title="Kebijakan pembatalan">
        <p className="ad-muted">Tampil di langkah pembayaran, tepat sebelum tamu menekan tombol bayar.</p>
        <div className="ad-bilingual">
          {(["id", "en"] as Locale[]).map((l) => (
            <div key={l} className="sv-input">
              <label htmlFor={`pol-${l}`}>{l === "id" ? "Indonesia" : "English"}</label>
              <textarea
                id={`pol-${l}`}
                rows={5}
                value={draft.cancellationPolicy[l]}
                onChange={(e) => update((s) => ({ ...s, cancellationPolicy: { ...s.cancellationPolicy, [l]: e.target.value } }))}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Kontak">
        <div className="ad-grid-2">
          <div className="sv-input">
            <label htmlFor="c-wa">Nomor WhatsApp (semua tombol WhatsApp di situs)</label>
            <input id="c-wa" value={draft.contact.whatsapp} onChange={(e) => update((s) => ({ ...s, contact: { ...s.contact, whatsapp: e.target.value } }))} />
          </div>
          <div className="sv-input">
            <label htmlFor="c-email">Email pengirim</label>
            <input
              id="c-email"
              type="email"
              value={draft.contact.senderEmail}
              placeholder="reservasi@domain-anda.com"
              onChange={(e) => update((s) => ({ ...s, contact: { ...s.contact, senderEmail: e.target.value } }))}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
