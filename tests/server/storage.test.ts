import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { createAdmin } from "@/lib/server/admins";
import { ADMIN_COOKIE, login } from "@/lib/server/auth";
import { MAX_UPLOAD_BYTES, putUpload, readUpload, removeUpload } from "@/lib/server/storage";
import { POST as uploadRoute } from "@/app/api/admin/uploads/route";
import { GET as serve } from "@/app/uploads/[...path]/route";
import { resetDb } from "../setup";

let dir = "";
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "sv-uploads-"));
  process.env.UPLOAD_DIR = dir;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const png = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: "#1F5C44" } }).png().toBuffer();

describe("storage (local disk)", () => {
  it("a 4000px photo is kept at 1800px on its long side, as JPEG, under /uploads/<year>/", async () => {
    const r = await putUpload(await png(4000, 3000), "kolam.png");
    expect(r).toMatchObject({ ok: true, name: "kolam.png" });
    if (!r.ok) return;
    expect(r.src).toMatch(/^\/uploads\/\d{4}\/[a-z0-9]+\.jpg$/);
    const file = await readUpload(r.src.replace(/^\/uploads\//, ""));
    const meta = await sharp(file!).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1800, 1350, "jpeg"]);
  });

  it("a small photo is not enlarged", async () => {
    const r = await putUpload(await png(800, 1000), "kecil.png");
    if (!r.ok) throw new Error();
    const meta = await sharp((await readUpload(r.src.slice("/uploads/".length)))!).metadata();
    expect([meta.width, meta.height]).toEqual([800, 1000]);
  });

  it("a file that is not a picture → unreadable; too big → too_large", async () => {
    expect(await putUpload(Buffer.from("bukan gambar"), "a.jpg")).toEqual({ ok: false, error: "unreadable", name: "a.jpg" });
    expect(await putUpload(Buffer.alloc(MAX_UPLOAD_BYTES + 1), "b.jpg")).toEqual({ ok: false, error: "too_large", name: "b.jpg" });
  });

  it("never reads outside the upload folder", async () => {
    expect(await readUpload("../etc/passwd")).toBeNull();
    expect(await readUpload("2027/../../x.jpg")).toBeNull();
    expect(await readUpload("..%2F..%2Fx")).toBeNull();
    expect(await readUpload("2027/nope.jpg")).toBeNull();
  });

  it("remove deletes the file", async () => {
    const r = await putUpload(await png(100, 100), "x.png");
    if (!r.ok) throw new Error();
    await removeUpload(r.src);
    expect(await readUpload(r.src.slice("/uploads/".length))).toBeNull();
  });
});

describe("routes", () => {
  let cookie = "";
  beforeEach(async () => {
    await resetDb();
    await createAdmin(db, { email: "owner@sukavillage.com", username: "owner", displayName: "Owner", password: "kata-sandi-panjang" });
    cookie = `${ADMIN_COOKIE}=${(await login("owner@sukavillage.com", "kata-sandi-panjang"))!.token}`;
  });

  const form = async (file: Blob, name: string) => {
    const f = new FormData();
    f.append("file", file, name);
    return f;
  };

  it("POST /api/admin/uploads: the admin's file comes back as a served photo", async () => {
    const body = await form(new Blob([await png(2400, 1600)], { type: "image/png" }), "teras.png");
    const res = await uploadRoute(new Request("http://localhost/api/admin/uploads", { method: "POST", headers: { cookie }, body }), { params: Promise.resolve({}) });
    const r = await res.json();
    expect(r).toMatchObject({ ok: true, name: "teras.png" });
    const served = await serve(new Request(`http://localhost${r.src}`), { params: Promise.resolve({ path: r.src.split("/").slice(2) }) });
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/jpeg");
    expect(served.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect((await sharp(Buffer.from(await served.arrayBuffer())).metadata()).width).toBe(1800);
  });

  it("not an image type → not_image; no session → 401", async () => {
    const body = await form(new Blob(["%PDF-1.4"], { type: "application/pdf" }), "menu.pdf");
    expect(await (await uploadRoute(new Request("http://localhost/api/admin/uploads", { method: "POST", headers: { cookie }, body }), { params: Promise.resolve({}) })).json()).toEqual({ ok: false, error: "not_image", name: "menu.pdf" });
    const anon = await uploadRoute(new Request("http://localhost/api/admin/uploads", { method: "POST", body: await form(new Blob(["x"], { type: "image/png" }), "a.png") }), { params: Promise.resolve({}) });
    expect(anon.status).toBe(401);
  });

  it("serving a path outside the folder → 404", async () => {
    const res = await serve(new Request("http://localhost/uploads/../.env"), { params: Promise.resolve({ path: ["..", ".env"] }) });
    expect(res.status).toBe(404);
  });
});
