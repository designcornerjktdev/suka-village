import argon2 from "argon2";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { createAdmin } from "@/lib/server/admins";
import { seedFirstAdmin } from "@/lib/server/seed-admin";
import { resetDb } from "../setup";

beforeEach(resetDb);

describe("seedFirstAdmin", () => {
  it("with no admins: creates admin with the given password and returns no generated one", async () => {
    const r = await seedFirstAdmin(db, { SEED_ADMIN_PASSWORD: "kata-sandi-panjang" });
    expect(r).toEqual({ created: true, username: "admin", email: "admin@sukavillage.com", generatedPassword: null });
    const row = await db.admin.findUniqueOrThrow({ where: { username: "admin" } });
    expect(await argon2.verify(row.passwordHash, "kata-sandi-panjang")).toBe(true);
  });

  it("without a password: defaults admin / admin@sukavillage.com and a random password it returns once", async () => {
    const r = await seedFirstAdmin(db, {});
    expect(r).toMatchObject({ created: true, username: "admin", email: "admin@sukavillage.com" });
    if (!r.created) throw new Error("not created");
    expect(r.generatedPassword).toMatch(/^.{16,}$/);
    const row = await db.admin.findUniqueOrThrow({ where: { username: "admin" } });
    expect(await argon2.verify(row.passwordHash, r.generatedPassword!)).toBe(true);
    expect(row.displayName).toBe("Admin");
  });

  it("does nothing when any admin exists, so a second seed never adds one", async () => {
    await createAdmin(db, { email: "owner@x.co", username: "owner", displayName: "Owner", password: "kata-sandi-panjang" });
    expect(await seedFirstAdmin(db, {})).toEqual({ created: false });
    expect(await db.admin.count()).toBe(1);
  });

  it("a bad value is refused with the reason, nothing created", async () => {
    await expect(seedFirstAdmin(db, { SEED_ADMIN_PASSWORD: "pendek" })).rejects.toThrow(/password/);
    expect(await db.admin.count()).toBe(0);
  });
});
