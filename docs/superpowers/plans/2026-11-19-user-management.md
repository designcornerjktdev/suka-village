# User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins manage admin accounts from the CMS ("Pengguna"), log in with email or username, and are shown by display name.

**Architecture:** Extend the `Admin` table (username, displayName). Account rules live in `lib/server/admins.ts`; `lib/server/auth.ts` resolves email-or-username at login and carries displayName in the session. New `/api/admin/users` endpoints follow the existing admin API pattern (`requireAdmin`, zod, `json`). The page follows the existing CRUD editors (`components/admin/ui.tsx`: `Sheet`, `RowActions`, `ConfirmDelete`).

**Tech Stack:** Next.js 16 App Router, Prisma (MariaDB/MySQL), argon2, zod, SWR, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-user-management-design.md`

## Global Constraints

- Username: lowercase, `^[a-z0-9._-]{3,32}$` (so never contains `@`), unique; required for new accounts, optional (null) for existing ones.
- Display name: required, trimmed, 1–80 characters.
- Password minimum: `MIN_PASSWORD` (10) from `lib/server/admins.ts`.
- Login error is the same for unknown account and wrong password, and takes the same time (keep the dummy argon2 verify).
- UI copy in Indonesian, no em dash; admin may round corners; controls follow `app/admin/admin.css`.
- Every `/api/admin/*` handler starts with `requireAdmin`.

## Review Focus

- Login identifier with different case/spaces ("  RahmatT ", "Owner@X.com") → matches lowercased, trimmed.
- An existing admin with no username still logs in by email and can set a username through Ubah.
- Deleting your own account, or resetting with too short a password → refused with a message, nothing changes.
- Changing username/email to one another admin uses → refused ("exists"), case-insensitively.
- History events by a deleted admin → shown as "Admin", page does not break.

---

### Task 1: Account data and rules

**Files:**
- Modify: `prisma/schema.prisma` (model `Admin`)
- Create: `prisma/migrations/<timestamp>_admin_profile/migration.sql` (via `npm run db:migrate -- --name admin_profile`, then edit)
- Modify: `lib/server/admins.ts`
- Modify: `scripts/create-admin.ts`
- Test: `tests/server/admins.test.ts`

**Interfaces:**
- Produces (all in `lib/server/admins.ts`, each taking `db: PrismaClient` first):
  - `type AdminError = "email" | "username" | "displayName" | "password" | "exists" | "self" | "notFound" | "current"`
  - `type AdminRow = { id: string; email: string; username: string | null; displayName: string; createdAt: string }`
  - `normalizeUsername(raw: string): string` (trim + lowercase)
  - `createAdmin(db, input: { email: string; username: string; displayName: string; password: string }): Promise<{ ok: true; admin: AdminRow } | { ok: false; error: AdminError }>`
  - `listAdmins(db): Promise<AdminRow[]>` (oldest first)
  - `updateAdmin(db, id: string, input: { email: string; username: string; displayName: string }): Promise<{ ok: true; admin: AdminRow } | { ok: false; error: AdminError }>`
  - `deleteAdmin(db, id: string, actorId: string): Promise<{ ok: true } | { ok: false; error: "self" | "notFound" }>`
  - `resetPassword(db, id: string, password: string): Promise<{ ok: true } | { ok: false; error: "password" | "notFound" }>` — also deletes all of that admin's sessions
  - `changeOwnPassword(db, id: string, current: string, next: string, keepTokenHash: string): Promise<{ ok: true } | { ok: false; error: "current" | "password" }>` — deletes that admin's sessions except `keepTokenHash`

- [ ] **Step 1: Schema.** `Admin` gains `username String? @unique` and `displayName String @default("")`. Generate the migration, then append to its SQL: `UPDATE \`Admin\` SET \`displayName\` = SUBSTRING_INDEX(\`email\`, '@', 1) WHERE \`displayName\` = '';`

- [ ] **Step 2: Write failing tests** in `tests/server/admins.test.ts` (replace the two existing `createAdmin` tests, keeping their assertions on hash and lowercasing):

```ts
it("creates with username and display name; username and email lower-cased", async () => {
  const r = await createAdmin(db, { email: " Owner@X.com ", username: " RahmatT ", displayName: " Rahmat Tomy ", password: "kata-sandi-panjang" });
  expect(r).toMatchObject({ ok: true, admin: { email: "owner@x.com", username: "rahmatt", displayName: "Rahmat Tomy" } });
});
it("refuses bad username, empty display name, short password, taken email or username", async () => {
  const base = { email: "a@b.co", username: "anna", displayName: "Anna", password: "kata-sandi-panjang" };
  expect(await createAdmin(db, { ...base, username: "an" })).toEqual({ ok: false, error: "username" });
  expect(await createAdmin(db, { ...base, username: "a@b" })).toEqual({ ok: false, error: "username" });
  expect(await createAdmin(db, { ...base, displayName: "  " })).toEqual({ ok: false, error: "displayName" });
  expect(await createAdmin(db, { ...base, password: "pendek" })).toEqual({ ok: false, error: "password" });
  await createAdmin(db, base);
  expect(await createAdmin(db, { ...base, username: "lain" })).toEqual({ ok: false, error: "exists" });
  expect(await createAdmin(db, { ...base, email: "c@d.co", username: "ANNA" })).toEqual({ ok: false, error: "exists" });
});
it("update refuses another admin's email or username, accepts its own unchanged");
it("delete refuses self, removes the other and their sessions");
it("reset password sets the new one and ends every session of that admin");
it("change own password needs the current one and keeps only the given session");
it("an admin created before usernames (username null) can be given one through update");
```

- [ ] **Step 3: Run** `npx vitest run tests/server/admins.test.ts` — expect FAIL.

- [ ] **Step 4: Implement** the functions above. Uniqueness is checked case-insensitively by normalizing before the lookup; `updateAdmin` excludes the row itself.

- [ ] **Step 5: `scripts/create-admin.ts`** asks also for username and display name (same readline), calls the new `createAdmin`, and maps every `AdminError` to an Indonesian message.

- [ ] **Step 6: Run** `npx vitest run tests/server/admins.test.ts` — PASS; `npx tsc --noEmit` — clean.

- [ ] **Step 7: Commit** `feat(admin): admin accounts with username and display name`

### Task 2: Login by email or username; display name in session and history

**Files:**
- Modify: `lib/server/auth.ts`, `app/api/admin/login/route.ts`, `app/api/admin/me/route.ts`
- Modify: `lib/booking/api.ts` (`adminLogin`), `lib/booking/hooks.ts` (`useAdminSession`), `lib/booking/types.ts` (`HistoryEvent`)
- Modify: `lib/server/mappers.ts` (history), the booking query include that feeds `toBooking` (events with admin displayName)
- Modify: `components/admin/AdminLogin.tsx`, `components/admin/AdminShell.tsx`, `components/admin/BookingDetail.tsx`
- Test: `tests/server/auth.test.ts`, `tests/server/admin-api.test.ts`

**Interfaces:**
- Consumes: `normalizeUsername` (Task 1).
- Produces:
  - `AdminUser = { adminId: string; email: string; displayName: string; tokenHash: string }`
  - `login(identifier: string, password: string)` — identifier with `@` → email, else username; returns `{ token, expiresAt, email } | null`
  - `POST /api/admin/login` body `{ login: string, password: string }` (also accept legacy `email` key)
  - `GET /api/admin/me` → `{ id, email, username, displayName }`
  - `HistoryEvent` gains optional `adminName?: string`
  - `adminLogin(login: string, password: string)`; `useAdminSession()` exposes `displayName`

- [ ] **Step 1: Failing tests** in `tests/server/auth.test.ts`:

```ts
it("logs in by username, case-insensitive, and by email");
it("unknown username and wrong password give the same null");
it("an admin without a username still logs in by email");
```
and in `tests/server/admin-api.test.ts`: `"me returns displayName and username"`, `"history names the admin who confirmed; a deleted admin's events show no name"` (expect `history[i].adminName` to be `"Rahmat Tomy"`, then `undefined` after deleting that admin).

- [ ] **Step 2: Run** the two files — FAIL.

- [ ] **Step 3: Implement.** `BookingEvent.adminId` has no relation; resolve names with one `db.admin.findMany({ where: { id: { in: ids } } })` in the booking read path, not a schema relation. `AdminShell` shows `displayName` (email as fallback). `BookingDetail` shows `adminName ?? "Admin"` for `by === "admin"`. Login field label: "Email atau username"; error: "Email/username atau kata sandi salah".

- [ ] **Step 4: Run** `npx vitest run tests` — PASS; `npx tsc --noEmit`, `npx eslint app components lib` — clean.

- [ ] **Step 5: Commit** `feat(admin): log in with email or username; show display names`

### Task 3: Users API

**Files:**
- Create: `app/api/admin/users/route.ts` (GET list, POST create)
- Create: `app/api/admin/users/[id]/route.ts` (PATCH update, DELETE)
- Create: `app/api/admin/users/[id]/password/route.ts` (PUT reset)
- Create: `app/api/admin/me/password/route.ts` (PUT change own)
- Modify: `lib/booking/api.ts` (client calls), `lib/booking/hooks.ts` (`useAdmins()` via SWR on `/api/admin/users`)
- Test: `tests/server/admin-api.test.ts`

**Interfaces:**
- Consumes: Task 1 functions; `requireAdmin` returning `AdminUser` with `tokenHash` (Task 2).
- Produces: JSON `{ ok: true, admin? , admins? }` or `{ ok: false, error: AdminError }` with status 400 (409 for `exists`, 404 for `notFound`); client `createAdminUser`, `updateAdminUser`, `deleteAdminUser`, `resetAdminPassword`, `changeMyPassword`; hook `useAdmins(): AdminRow[] | undefined`.

- [ ] **Step 1: Failing tests:** all five routes return 401 without a session (add them to the existing "every admin route needs a session" list); create → list shows it without `passwordHash`; DELETE own id → 400 `self`; PUT reset with "pendek" → 400 `password`; PUT `/me/password` with wrong current → 400 `current`, with the right one → 200 and the caller's session still works while another session of the same admin is gone.

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npx vitest run tests` — PASS.

- [ ] **Step 5: Commit** `feat(admin): users API`

### Task 4: Pengguna page

**Files:**
- Create: `app/admin/(panel)/users/page.tsx` (metadata title "Pengguna")
- Create: `components/admin/UsersEditor.tsx`
- Modify: `components/admin/AdminShell.tsx` (NAV group "Sistem": add `{ href: "/admin/users", label: "Pengguna", Icon: Users }` before Pengaturan)

**Interfaces:**
- Consumes: `useAdmins`, `useAdminSession`, Task 3 client calls; `Sheet`, `RowActions`, `ConfirmDelete` from `components/admin/ui.tsx`.

- [ ] **Step 1: Build `UsersEditor`** like `PromosEditor`: table (Nama, Username — "—" when empty, Email, Dibuat), "Tambah" top right, sheet with Nama tampilan, Username, Email, Kata sandi (Tambah only, hint "Minimal 10 karakter"). Row ⋯: Ubah, Reset kata sandi (sheet with one password field), Hapus (`ConfirmDelete`; hidden on own row). Own row shows "(Anda)" and ⋯ has "Ganti kata sandi" (current + new). Error messages:
  - email: "Email tidak valid." · username: "Username 3–32 karakter: huruf kecil, angka, titik, garis bawah, tanda hubung." · displayName: "Nama tampilan wajib diisi." · password: "Kata sandi minimal 10 karakter." · exists: "Email atau username sudah dipakai admin lain." · self: "Anda tidak bisa menghapus akun sendiri." · current: "Kata sandi saat ini salah."

- [ ] **Step 2: Verify** `npx tsc --noEmit`, `npx eslint app components lib`, `npx vitest run tests`; then in the browser at 390px and 1440px: add, edit, reset, delete another admin, change own password, log out and in by username.

- [ ] **Step 3: Docs.** `docs/HANDOFF.md` (admin: accounts in Pengguna; `admin:create` still for the first account), `docs/superpowers/decisions.md` (one line per decision taken while building).

- [ ] **Step 4: Commit** `feat(admin): Pengguna menu`
