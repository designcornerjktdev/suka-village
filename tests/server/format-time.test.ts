import { describe, expect, it } from "vitest";
import { fmtDateTime, fmtTime } from "@/lib/booking/format";

/* The server runs on UTC; times shown to guests and in emails are WIB. */
describe("times are WIB whatever the machine's zone", () => {
  const deadline = "2026-11-20T08:11:00.000Z"; // 15.11 WIB

  it("fmtDateTime, labelled WIB", () => {
    expect(fmtDateTime(deadline, "id")).toMatch(/20 Nov.*15\.11 WIB$/);
    expect(fmtDateTime(deadline, "en")).toMatch(/20 Nov.*15:11 WIB \(GMT\+7\)$/);
  });

  it("fmtTime, labelled WIB", () => {
    expect(fmtTime(deadline, "id")).toBe("15.11 WIB");
  });

  it("past midnight UTC+7 the date moves to the next day", () => {
    expect(fmtDateTime("2026-11-20T18:30:00.000Z", "id")).toMatch(/21 Nov.*01\.30/);
  });
});
