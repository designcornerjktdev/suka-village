import argon2 from "argon2";
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { changeOwnPassword, createAdmin, deleteAdmin, listAdmins, resetPassword, updateAdmin } from "@/lib/server/admins";
import { resetDb } from "../setup";

const base = { email: "a@b.co", username: "anna", displayName: "Anna", password: "kata-sandi-panjang" };
const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");
const session = (adminId: string, token: string) =>
  db.session.create({ data: { tokenHash: tokenHash(token), adminId, expiresAt: new Date(Date.now() + 3600_000) } });

async function make(over: Partial<typeof base> = {}) {
  const r = await createAdmin(db, { ...base, ...over });
  if (!r.ok) throw new Error(r.error);
  return r.admin;
}

beforeEach(resetDb);

describe("createAdmin", () => {
  it("creates with username and display name; username and email lower-cased; argon2 hash only", async () => {
    const r = await createAdmin(db, { email: " Owner@X.com ", username: " RahmatT ", displayName: " Rahmat Tomy ", password: "kata-sandi-panjang" });
    expect(r).toMatchObject({ ok: true, admin: { email: "owner@x.com", username: "rahmatt", displayName: "Rahmat Tomy" } });
    const row = await db.admin.findUniqueOrThrow({ where: { email: "owner@x.com" } });
    expect(row.passwordHash).not.toContain("kata-sandi-panjang");
    expect(await argon2.verify(row.passwordHash, "kata-sandi-panjang")).toBe(true);
  });

  it("refuses bad username, empty display name, short password, bad email, taken email or username", async () => {
    expect(await createAdmin(db, { ...base, username: "an" })).toEqual({ ok: false, error: "username" });
    expect(await createAdmin(db, { ...base, username: "a@b" })).toEqual({ ok: false, error: "username" });
    expect(await createAdmin(db, { ...base, displayName: "  " })).toEqual({ ok: false, error: "displayName" });
    expect(await createAdmin(db, { ...base, password: "pendek" })).toEqual({ ok: false, error: "password" });
    expect(await createAdmin(db, { ...base, email: "bukan-email" })).toEqual({ ok: false, error: "email" });
    await make();
    expect(await createAdmin(db, { ...base, username: "lain" })).toEqual({ ok: false, error: "exists" });
    expect(await createAdmin(db, { ...base, email: "c@d.co", username: "ANNA" })).toEqual({ ok: false, error: "exists" });
  });
});

describe("unique races", () => {
  it("two creates with the same username at once: one ok, the other exists, never a thrown error", async () => {
    const settle = (p: Promise<{ ok: boolean; error?: string }>) => p.then((r) => (r.ok ? "ok" : r.error), (e: Error) => `threw ${e.message.slice(0, 40)}`);
    const results = await Promise.all([settle(createAdmin(db, base)), settle(createAdmin(db, { ...base, email: "c@d.co" }))]);
    expect(results.sort()).toEqual(["exists", "ok"]);
  });
});

describe("listAdmins and updateAdmin", () => {
  it("lists oldest first without password hashes", async () => {
    await make();
    await make({ email: "c@d.co", username: "budi", displayName: "Budi" });
    const list = await listAdmins(db);
    expect(list.map((a) => a.username)).toEqual(["anna", "budi"]);
    expect(JSON.stringify(list)).not.toContain("argon2");
  });

  it("refuses another admin's email or username, accepts its own unchanged", async () => {
    const a = await make();
    await make({ email: "c@d.co", username: "budi", displayName: "Budi" });
    expect(await updateAdmin(db, a.id, { email: "C@D.co", username: "anna", displayName: "Anna" })).toEqual({ ok: false, error: "exists" });
    expect(await updateAdmin(db, a.id, { email: "a@b.co", username: "Budi", displayName: "Anna" })).toEqual({ ok: false, error: "exists" });
    expect(await updateAdmin(db, a.id, { email: "a@b.co", username: "anna", displayName: "Anna W" })).toMatchObject({ ok: true, admin: { displayName: "Anna W" } });
    expect(await updateAdmin(db, "nope", { email: "x@y.co", username: "xyz", displayName: "X" })).toEqual({ ok: false, error: "notFound" });
  });

  it("an admin created before usernames (username null) can be given one through update", async () => {
    const old = await db.admin.create({ data: { email: "old@x.co", passwordHash: await argon2.hash("kata-sandi-panjang"), displayName: "old" } });
    expect((await listAdmins(db))[0].username).toBeNull();
    expect(await updateAdmin(db, old.id, { email: "old@x.co", username: "lama", displayName: "Lama" })).toMatchObject({ ok: true, admin: { username: "lama" } });
  });
});

describe("deleteAdmin, resetPassword, changeOwnPassword", () => {
  it("delete refuses self, removes the other and their sessions", async () => {
    const a = await make();
    const b = await make({ email: "c@d.co", username: "budi", displayName: "Budi" });
    await session(b.id, "tok-b");
    expect(await deleteAdmin(db, a.id, a.id)).toEqual({ ok: false, error: "self" });
    expect(await deleteAdmin(db, b.id, a.id)).toEqual({ ok: true });
    expect(await db.admin.count()).toBe(1);
    expect(await db.session.count({ where: { adminId: b.id } })).toBe(0);
    expect(await deleteAdmin(db, b.id, a.id)).toEqual({ ok: false, error: "notFound" });
  });

  it("reset password sets the new one and ends every session of that admin", async () => {
    const a = await make();
    await session(a.id, "t1");
    await session(a.id, "t2");
    expect(await resetPassword(db, a.id, "pendek")).toEqual({ ok: false, error: "password" });
    expect(await resetPassword(db, a.id, "sandi-baru-panjang")).toEqual({ ok: true });
    const row = await db.admin.findUniqueOrThrow({ where: { id: a.id } });
    expect(await argon2.verify(row.passwordHash, "sandi-baru-panjang")).toBe(true);
    expect(await db.session.count({ where: { adminId: a.id } })).toBe(0);
  });

  it("change own password needs the current one and keeps only the given session", async () => {
    const a = await make();
    await session(a.id, "keep");
    await session(a.id, "other");
    expect(await changeOwnPassword(db, a.id, "salah-sandinya", "sandi-baru-panjang", tokenHash("keep"))).toEqual({ ok: false, error: "current" });
    expect(await changeOwnPassword(db, a.id, "kata-sandi-panjang", "pendek", tokenHash("keep"))).toEqual({ ok: false, error: "password" });
    expect(await changeOwnPassword(db, a.id, "kata-sandi-panjang", "sandi-baru-panjang", tokenHash("keep"))).toEqual({ ok: true });
    const left = await db.session.findMany({ where: { adminId: a.id } });
    expect(left.map((s) => s.tokenHash)).toEqual([tokenHash("keep")]);
  });
});
