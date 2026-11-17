import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { loadRooms, loadSection, toPhoto } from "@/lib/server/content";
import { photos as library, units } from "@/content/site";
import { resetDb } from "../setup";

beforeEach(async () => {
  await resetDb();
  await seedDatabase(db);
});

describe("rooms for the public pages", () => {
  it("the three launch rooms, with their slugs, cover first, description from the database", async () => {
    const rooms = await loadRooms();
    expect(rooms.map((r) => [r.id, r.slug])).toEqual([
      ["mainVilla", "main-villa"],
      ["familyCabin", "family-cabin"],
      ["singleCabin", "single-cabin"],
    ]);
    const villa = rooms[0];
    const site = units.find((u) => u.id === "mainVilla")!;
    expect(villa.cover).toEqual(site.cover);
    expect(villa.photos[0]).toEqual(site.cover);
    expect(villa.photos).toHaveLength(site.photos.length);
    expect(villa.description.id.length).toBeGreaterThan(0);
  });

  it("an edit in the admin shows; archived rooms and rooms without photographs do not", async () => {
    await db.room.update({ where: { unit: "familyCabin" }, data: { name: "Kabin Keluarga", size: 64 } });
    await db.room.update({ where: { unit: "singleCabin" }, data: { archived: true } });
    await db.room.create({ data: { unit: "room-new1", name: "Kosong", size: 1, bedrooms: 1, bathrooms: 1, features: [], description: { id: "", en: "" }, photos: [], position: 9 } });
    const rooms = await loadRooms();
    expect(rooms.map((r) => r.id)).toEqual(["mainVilla", "familyCabin"]);
    expect(rooms[1]).toMatchObject({ name: "Kabin Keluarga", size: 64 });
  });

  it("a room added in the admin gets a page under its own id", async () => {
    await db.room.create({
      data: { unit: "room-ab12cd34", name: "Glamping", size: 20, bedrooms: 1, bathrooms: 1, features: ["wifi"], description: { id: "Tenda", en: "Tent" }, photos: ["/uploads/2027/x.jpg"], position: 9 },
    });
    const glamping = (await loadRooms()).find((r) => r.id === "room-ab12cd34");
    expect(glamping).toMatchObject({ slug: "room-ab12cd34", name: "Glamping", cover: { src: "/uploads/2027/x.jpg" } });
  });
});

describe("page sections", () => {
  it("visible items only, in the admin's order, with their status", async () => {
    const before = await loadSection("facilities");
    expect(before.map((i) => i.id)).not.toContain("shop");
    const padel = before.find((i) => i.id === "padel");
    expect(padel?.soon).toBe(true);
    await db.contentItem.update({ where: { section_id: { section: "facilities", id: "pool" } }, data: { position: 99 } });
    await db.contentItem.update({ where: { section_id: { section: "facilities", id: "dining" } }, data: { data: { ...((await db.contentItem.findUniqueOrThrow({ where: { section_id: { section: "facilities", id: "dining" } } })).data as object), visible: false } } });
    const after = await loadSection("facilities");
    expect(after.at(-1)?.id).toBe("pool");
    expect(after.map((i) => i.id)).not.toContain("dining");
  });

  it("text comes from the database in both languages", async () => {
    const row = await db.contentItem.findUniqueOrThrow({ where: { section_id: { section: "experiences", id: "farm" } } });
    await db.contentItem.update({ where: { section_id: { section: "experiences", id: "farm" } }, data: { data: { ...(row.data as object), name: { id: "Peternakan Kami", en: "Our Farm" } } } });
    const farm = (await loadSection("experiences")).find((i) => i.id === "farm");
    expect(farm?.name).toEqual({ id: "Peternakan Kami", en: "Our Farm" });
  });
});

describe("toPhoto", () => {
  it("a photograph that ships with the site keeps its alt text", () => {
    const p = library.mainVilla[3];
    expect(toPhoto(p.src, {}, "x")).toEqual(p);
  });

  it("an upload takes its alt text from the admin, else the item's name", () => {
    expect(toPhoto("/uploads/2027/a.jpg", { "/uploads/2027/a.jpg": { name: "a.jpg", alt: { id: "Kolam", en: "Pool" } } }, "x")).toEqual({ src: "/uploads/2027/a.jpg", alt: { id: "Kolam", en: "Pool" } });
    expect(toPhoto("/uploads/2027/b.jpg", {}, "Glamping")).toEqual({ src: "/uploads/2027/b.jpg", alt: { id: "Glamping", en: "Glamping" } });
  });
});
