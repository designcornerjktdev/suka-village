import argon2 from "argon2";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { createAdmin } from "@/lib/server/admins";
import { resetDb } from "../setup";

describe("createAdmin", () => {
  it("stores an argon2 hash, never the password, with the email lower-cased", async () => {
    await resetDb();
    const r = await createAdmin(db, "  Owner@SukaVillage.com ", "kata-sandi-panjang");
    expect(r).toEqual({ ok: true, email: "owner@sukavillage.com" });
    const row = await db.admin.findUniqueOrThrow({ where: { email: "owner@sukavillage.com" } });
    expect(row.passwordHash).not.toContain("kata-sandi-panjang");
    expect(await argon2.verify(row.passwordHash, "kata-sandi-panjang")).toBe(true);
  });

  it("refuses short passwords, bad emails and duplicates", async () => {
    await resetDb();
    expect(await createAdmin(db, "a@b.co", "pendek")).toEqual({ ok: false, error: "password" });
    expect(await createAdmin(db, "bukan-email", "kata-sandi-panjang")).toEqual({ ok: false, error: "email" });
    await createAdmin(db, "a@b.co", "kata-sandi-panjang");
    expect(await createAdmin(db, "A@B.co", "kata-sandi-lainnya")).toEqual({ ok: false, error: "exists" });
  });
});
