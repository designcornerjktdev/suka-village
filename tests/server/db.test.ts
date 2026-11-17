import { describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";

describe("db", () => {
  it("db connects", async () => {
    const rows = await db.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].ok)).toBe(1);
  });
});
