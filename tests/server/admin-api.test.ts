import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { createAdmin } from "@/lib/server/admins";
import { ADMIN_COOKIE, login } from "@/lib/server/auth";
import { createBooking as createServerBooking, markPaidByGateway } from "@/lib/server/bookings";
import * as bookings from "@/app/api/admin/bookings/route";
import * as booking from "@/app/api/admin/bookings/[code]/route";
import * as confirm from "@/app/api/admin/bookings/[code]/confirm/route";
import * as reject from "@/app/api/admin/bookings/[code]/reject/route";
import * as status from "@/app/api/admin/bookings/[code]/status/route";
import * as markPaid from "@/app/api/admin/bookings/[code]/mark-paid/route";
import * as cancel from "@/app/api/admin/bookings/[code]/cancel/route";
import * as notifyRoute from "@/app/api/admin/bookings/[code]/notify/route";
import * as blocks from "@/app/api/admin/blocks/route";
import * as block from "@/app/api/admin/blocks/[id]/route";
import * as promos from "@/app/api/admin/promos/route";
import * as promo from "@/app/api/admin/promos/[id]/route";
import * as rooms from "@/app/api/admin/rooms/route";
import * as room from "@/app/api/admin/rooms/[unit]/route";
import * as rate from "@/app/api/admin/rates/[unit]/route";
import * as settings from "@/app/api/admin/settings/route";
import * as content from "@/app/api/admin/content/route";
import * as contentSection from "@/app/api/admin/content/[section]/route";
import * as media from "@/app/api/admin/media/route";
import { GET as publicSettings } from "@/app/api/settings/route";
import type { CreateInput } from "@/lib/booking/types";
import { installFakeDoku } from "../doku-fake";
import { resetDb } from "../setup";

let cookie = "";
type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
const call = (h: unknown, method: string, path: string, body?: unknown, params: Record<string, string> = {}, withCookie = true) =>
  (h as Handler)(
    new Request(`http://localhost${path}`, {
      method,
      headers: { "content-type": "application/json", ...(withCookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );

const input = (over: Partial<CreateInput> = {}): CreateInput => ({
  checkIn: "2027-03-10",
  checkOut: "2027-03-12",
  units: ["mainVilla"],
  guests: 4,
  guest: { name: "Ana Wijaya", email: "ana@example.com", phone: "081234567890" },
  method: "va_bni",
  locale: "id",
  ...over,
});
async function paidBooking(over: Partial<CreateInput> = {}) {
  const r = await createServerBooking(input(over));
  if (!r.ok) throw new Error(r.error);
  await markPaidByGateway(r.booking.code, "g", new Date());
  return r.booking.code;
}

beforeEach(async () => {
  installFakeDoku();
  await resetDb();
  await seedDatabase(db);
  await db.rate.updateMany({ data: { bookable: true } });
  await createAdmin(db, "owner@sukavillage.com", "kata-sandi-panjang");
  cookie = `${ADMIN_COOKIE}=${(await login("owner@sukavillage.com", "kata-sandi-panjang"))!.token}`;
});
afterEach(() => vi.unstubAllGlobals());

describe("every admin route needs a session", () => {
  const routes: [string, unknown, string, Record<string, string>][] = [
    ["GET", bookings.GET, "/api/admin/bookings", {}],
    ["POST", bookings.POST, "/api/admin/bookings", {}],
    ["GET", booking.GET, "/api/admin/bookings/SV-X", { code: "SV-X" }],
    ["PATCH", booking.PATCH, "/api/admin/bookings/SV-X", { code: "SV-X" }],
    ["DELETE", booking.DELETE, "/api/admin/bookings/SV-X", { code: "SV-X" }],
    ["POST", confirm.POST, "/x", { code: "SV-X" }],
    ["POST", reject.POST, "/x", { code: "SV-X" }],
    ["PATCH", status.PATCH, "/x", { code: "SV-X" }],
    ["POST", markPaid.POST, "/x", { code: "SV-X" }],
    ["POST", cancel.POST, "/x", { code: "SV-X" }],
    ["POST", notifyRoute.POST, "/x", { code: "SV-X" }],
    ["GET", blocks.GET, "/x", {}],
    ["POST", blocks.POST, "/x", {}],
    ["PUT", block.PUT, "/x", { id: "b" }],
    ["DELETE", block.DELETE, "/x", { id: "b" }],
    ["GET", promos.GET, "/x", {}],
    ["POST", promos.POST, "/x", {}],
    ["PUT", promo.PUT, "/x", { id: "p" }],
    ["DELETE", promo.DELETE, "/x", { id: "p" }],
    ["GET", rooms.GET, "/x", {}],
    ["POST", rooms.POST, "/x", {}],
    ["PUT", room.PUT, "/x", { unit: "mainVilla" }],
    ["DELETE", room.DELETE, "/x", { unit: "mainVilla" }],
    ["PUT", rate.PUT, "/x", { unit: "mainVilla" }],
    ["GET", settings.GET, "/x", {}],
    ["PUT", settings.PUT, "/x", {}],
    ["GET", content.GET, "/x", {}],
    ["PUT", contentSection.PUT, "/x", { section: "facilities" }],
    ["GET", media.GET, "/x", {}],
    ["PUT", media.PUT, "/x", {}],
  ];
  it.each(routes)("%s %s → 401", async (method, handler, path, params) => {
    expect((await call(handler, method, path, method === "GET" || method === "DELETE" ? undefined : {}, params, false)).status).toBe(401);
  });
});

describe("bookings", () => {
  it("list: every booking with its status as it is now, deleted ones gone, paidCount for the sidebar badge", async () => {
    const paid = await paidBooking();
    const lapsed = await createServerBooking(input({ units: ["singleCabin"] }), { now: new Date(Date.now() - 2 * 3600_000) });
    const body = await (await call(bookings.GET, "GET", "/api/admin/bookings")).json();
    expect(body.paidCount).toBe(1);
    const byCode = Object.fromEntries(body.bookings.map((b: { code: string; status: string }) => [b.code, b.status]));
    expect(byCode[paid]).toBe("paid");
    expect(byCode[(lapsed as { booking: { code: string } }).booking.code]).toBe("expired");
  });

  it("manual booking: source admin, email optional, paid → confirmed and emailed", async () => {
    const res = await call(bookings.POST, "POST", "/api/admin/bookings", { ...input(), guest: { name: "Budi", email: "budi@example.com", phone: "081299990000" }, paid: true, method: "manual" });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.booking).toMatchObject({ source: "admin", status: "confirmed" });
    expect(await db.notification.findMany({ where: { bookingCode: body.booking.code }, select: { template: true } })).toEqual([{ template: "confirmed" }]);
  });

  it("confirm, then reject is refused; reject a paid one with a reason", async () => {
    const a = await paidBooking();
    expect((await (await call(confirm.POST, "POST", "/x", {}, { code: a })).json()).status).toBe("confirmed");
    expect((await call(reject.POST, "POST", "/x", { reason: "x" }, { code: a })).status).toBe(409);
    const b = await paidBooking({ units: ["familyCabin"] });
    const r = await (await call(reject.POST, "POST", "/x", { reason: "Kamar diperbaiki" }, { code: b })).json();
    expect(r).toMatchObject({ status: "rejected", rejectReason: "Kamar diperbaiki" });
    const ev = await db.bookingEvent.findFirstOrThrow({ where: { bookingCode: b, event: { startsWith: "Pesanan ditolak" } } });
    expect(ev.adminId).toBeTruthy();
  });

  it("status: check-in before the arrival day is refused", async () => {
    const a = await paidBooking();
    await call(confirm.POST, "POST", "/x", {}, { code: a });
    expect((await call(status.PATCH, "PATCH", "/x", { status: "checked_in" }, { code: a })).status).toBe(409);
    expect((await call(status.PATCH, "PATCH", "/x", { status: "paid" }, { code: a })).status).toBe(400);
  });

  it("mark paid, cancel, notify, note, guest edit, delete", async () => {
    const r = await createServerBooking(input());
    if (!r.ok) throw new Error();
    const code = r.booking.code;
    expect((await (await call(markPaid.POST, "POST", "/x", { note: "Transfer BCA" }, { code })).json()).status).toBe("confirmed");
    expect((await (await call(notifyRoute.POST, "POST", "/x", { template: "confirmed" }, { code })).json()).history.at(-1).event).toBe("Email dikirim ulang");
    expect((await (await call(booking.PATCH, "PATCH", "/x", { internalNote: "VIP" }, { code })).json()).internalNote).toBe("VIP");
    const edited = await (await call(booking.PATCH, "PATCH", "/x", { guest: { name: "Ana W", email: "", phone: "081211112222" }, guests: 5 }, { code })).json();
    expect(edited).toMatchObject({ ok: true, booking: { guests: 5 } });
    expect((await call(booking.DELETE, "DELETE", "/x", undefined, { code })).status).toBe(409);
    expect((await (await call(cancel.POST, "POST", "/x", { reason: "Tamu batal" }, { code })).json()).status).toBe("cancelled");
    expect(await (await call(booking.DELETE, "DELETE", "/x", undefined, { code })).json()).toEqual({ ok: true });
    expect((await call(booking.GET, "GET", "/x", undefined, { code })).status).toBe(404);
  });
});

describe("blocks (dates closed by hand)", () => {
  it("closing dates takes the nights; an overlap with a booking is refused with the clashing date", async () => {
    await paidBooking();
    const clash = await (await call(blocks.POST, "POST", "/x", { unit: "mainVilla", from: "2027-03-11", to: "2027-03-14", reason: "airbnb" })).json();
    expect(clash).toEqual({ ok: false, clash: "2027-03-11" });
    const ok = await (await call(blocks.POST, "POST", "/x", { unit: "mainVilla", from: "2027-03-12", to: "2027-03-14", reason: "airbnb", note: "Airbnb #123" })).json();
    expect(ok).toMatchObject({ ok: true, block: { unit: "mainVilla", from: "2027-03-12", to: "2027-03-14", reason: "airbnb", note: "Airbnb #123" } });
    expect(await createServerBooking(input({ checkIn: "2027-03-13", checkOut: "2027-03-15" }))).toMatchObject({ ok: false, error: "unavailable" });
    const list = await (await call(blocks.GET, "GET", "/x")).json();
    expect(list).toHaveLength(1);
  });

  it("move a block and open it again", async () => {
    const { block: b } = await (await call(blocks.POST, "POST", "/x", { unit: "familyCabin", from: "2027-04-01", to: "2027-04-03", reason: "maintenance" })).json();
    const moved = await (await call(block.PUT, "PUT", "/x", { unit: "familyCabin", from: "2027-04-02", to: "2027-04-05", reason: "maintenance" }, { id: b.id })).json();
    expect(moved).toMatchObject({ ok: true, block: { from: "2027-04-02", to: "2027-04-05" } });
    expect(await db.night.count({ where: { blockId: b.id } })).toBe(3);
    await call(block.DELETE, "DELETE", "/x", undefined, { id: b.id });
    expect(await db.night.count()).toBe(0);
  });

  it("refuses an empty range or an unknown room", async () => {
    expect((await call(blocks.POST, "POST", "/x", { unit: "mainVilla", from: "2027-04-03", to: "2027-04-03", reason: "owner" })).status).toBe(400);
    expect((await call(blocks.POST, "POST", "/x", { unit: "nope", from: "2027-04-01", to: "2027-04-03", reason: "owner" })).status).toBe(400);
  });
});

describe("promos", () => {
  const p = { code: "hemat-10", kind: "percent", value: 10, minNights: 1, units: [], active: true };
  it("create (code normalised), duplicate refused, bad value refused, edit, delete", async () => {
    const created = await (await call(promos.POST, "POST", "/x", p)).json();
    expect(created).toMatchObject({ ok: true, promo: { code: "HEMAT-10" } });
    expect(await (await call(promos.POST, "POST", "/x", { ...p, code: "HEMAT-10" })).json()).toEqual({ ok: false, error: "duplicate" });
    expect(await (await call(promos.POST, "POST", "/x", { ...p, code: "X1" })).json()).toEqual({ ok: false, error: "code" });
    expect(await (await call(promos.POST, "POST", "/x", { ...p, code: "BIG", value: 150 })).json()).toEqual({ ok: false, error: "value" });
    const saved = await (await call(promo.PUT, "PUT", "/x", { ...created.promo, value: 15, note: "Lebaran" }, { id: created.promo.id })).json();
    expect(saved).toMatchObject({ ok: true, promo: { value: 15, note: "Lebaran" } });
    expect((await (await call(promos.GET, "GET", "/x")).json())[0]).toMatchObject({ code: "HEMAT-10", note: "Lebaran" });
    await call(promo.DELETE, "DELETE", "/x", undefined, { id: created.promo.id });
    expect(await db.promo.count()).toBe(0);
  });
});

describe("rooms and rates", () => {
  it("new room starts empty and off sale; edit it; rates saved", async () => {
    const created = await (await call(rooms.POST, "POST", "/x", { name: "Kabin Baru" })).json();
    expect(created).toMatchObject({ name: "Kabin Baru", features: [], photos: [] });
    const list = await (await call(rooms.GET, "GET", "/x")).json();
    expect(list.rates.find((r: { unit: string }) => r.unit === created.unit)).toMatchObject({ bookable: false, weekday: 0 });
    await call(room.PUT, "PUT", "/x", { ...created, size: 40, description: { id: "a", en: "b" } }, { unit: created.unit });
    await call(rate.PUT, "PUT", "/x", { unit: created.unit, weekday: 900000, weekend: 1100000, minNights: 2, bookable: true, seasons: [] }, { unit: created.unit });
    const r = await db.rate.findUniqueOrThrow({ where: { unit: created.unit } });
    expect(r).toMatchObject({ weekday: 900000, minNights: 2, bookable: true });
    expect((await db.room.findUniqueOrThrow({ where: { unit: created.unit } })).size).toBe(40);
  });

  it("archive is refused while a booking still holds the room for a night to come", async () => {
    const code = await paidBooking();
    expect(await (await call(room.DELETE, "DELETE", "/x", undefined, { unit: "mainVilla" })).json()).toEqual({ ok: false, codes: [code] });
    expect(await (await call(room.DELETE, "DELETE", "/x", undefined, { unit: "singleCabin" })).json()).toEqual({ ok: true });
    const archived = await db.room.findUniqueOrThrow({ where: { unit: "singleCabin" }, include: { rate: true } });
    expect(archived.archived).toBe(true);
    expect(archived.rate?.bookable).toBe(false);
  });
});

describe("settings, content, media", () => {
  it("settings round-trip; the public read leaves out the sender address", async () => {
    const s = await (await call(settings.GET, "GET", "/x")).json();
    s.holdMinutes = 120;
    s.contact.senderEmail = "reservasi@sukavillage.com";
    await call(settings.PUT, "PUT", "/x", s);
    expect((await (await call(settings.GET, "GET", "/x")).json()).holdMinutes).toBe(120);
    const pub = await (await publicSettings()).json();
    expect(pub.holdMinutes).toBe(120);
    /* The order page previews the emails the guest was sent, so templates stay. */
    expect(pub.templates.confirmed.subject.id).toBeTruthy();
    expect(pub.contact.senderEmail).toBeUndefined();
    expect(pub.contact.whatsapp).toBeTruthy();
  });

  it("settings refuse a hold outside 15 minutes to 24 hours", async () => {
    const s = await (await call(settings.GET, "GET", "/x")).json();
    expect((await call(settings.PUT, "PUT", "/x", { ...s, holdMinutes: 5 })).status).toBe(400);
  });

  it("content: a section is replaced in the order given", async () => {
    const all = await (await call(content.GET, "GET", "/x")).json();
    type Item = { id: string; visible: boolean };
    const items: Item[] = [...(all.facilities as Item[])].reverse().map((i, n) => (n === 0 ? { ...i, visible: false } : i));
    await call(contentSection.PUT, "PUT", "/x", items, { section: "facilities" });
    const after = await (await call(content.GET, "GET", "/x")).json();
    expect(after.facilities.map((i: Item) => i.id)).toEqual(items.map((i) => i.id));
    expect(after.facilities[0].visible).toBe(false);
    expect((await call(contentSection.PUT, "PUT", "/x", items, { section: "nope" })).status).toBe(400);
  });

  it("media alt text", async () => {
    await call(media.PUT, "PUT", "/x", { src: "/uploads/2027/a.jpg", meta: { name: "a.jpg", alt: { id: "Kolam", en: "Pool" } } });
    expect(await (await call(media.GET, "GET", "/x")).json()).toEqual({ "/uploads/2027/a.jpg": { name: "a.jpg", alt: { id: "Kolam", en: "Pool" } } });
  });
});
