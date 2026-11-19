# User management (admin) — design

Approved by the user, 19 November 2026. Scope A only (no roles).

## Why

Admin accounts can only be made from a terminal (`npm run admin:create`).
The owner should manage accounts from the CMS. All admins keep the same
rights; roles (Pemilik/Staf) are a non-goal for now.

## Approaches

- **Chosen: extend the existing `Admin` table and admin patterns.** New
  columns, a "Pengguna" menu built like the other CRUD menus (list, Tambah,
  ⋯ row menu, side sheet), `/api/admin/users` endpoints guarded by
  `requireAdmin`, reusing `createAdmin`/`MIN_PASSWORD` in `lib/server/admins.ts`.
- Rejected: an auth library (NextAuth etc.): replaces working sessions for no
  gain at this size.
- Rejected: separate user/profile table: one table is enough.

## Decisions

**Data:** `Admin` gains `username String? @unique` and `displayName String`.
Migration fills `displayName` of existing rows from the email's local part;
`username` stays empty for them.

**Login:** one field "Email atau username". Contains `@` → look up by email,
else by username (lowercased). Same error and same timing for unknown
account or wrong password: "Email/username atau kata sandi salah".

**Username:** required for new accounts, unique, lowercase, `[a-z0-9._-]`,
3–32 characters, no `@`. Existing accounts log in by email until a username
is set through Ubah.

**Display name:** required, shown in the sidebar (instead of the email) and
in booking history ("Pesanan diterima · <display name>"), using the
`adminId` the history already stores. A deleted admin's events fall back to
"admin".

**Pengguna menu** (group Sistem, `/admin/users`):
- Table: display name, username, email, created date.
- Tambah / Ubah sheet: display name, username, email; password only on Tambah
  (min `MIN_PASSWORD`).
- Row ⋯: Ubah, Reset kata sandi (sets a new one; that admin is logged out
  everywhere), Hapus (confirm; never one's own account, so one always remains;
  their sessions go with them).
- Own row: Ganti kata sandi (needs the current one; other sessions end, the
  current one stays).

**Errors:** email or username taken, invalid formats, password too short,
wrong current password, deleting self — each a clear Indonesian message.

## Left to the builder

Exact endpoint shapes, component split, test layout; follow the existing
admin API and `admin.css` conventions.
