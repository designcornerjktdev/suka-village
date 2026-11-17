import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dokuRequest, DokuError } from "@/lib/server/payments/doku/client";
import { createVa, deleteVa, VA_CHANNEL } from "@/lib/server/payments/doku/va";
import { installFakeDoku, type Call } from "../doku-fake";

let fake: ReturnType<typeof installFakeDoku>;
beforeEach(() => {
  fake = installFakeDoku();
});
afterEach(() => vi.unstubAllGlobals());

const charge = {
  trxId: "SV-ABC123-1",
  method: "va_bca" as const,
  amount: 7_600_000,
  expiresAt: "2027-03-01T04:00:00.000Z",
  guest: { name: "Ana Wijaya (Keluarga) & Co", email: "ana@example.com", phone: "+6281234567890" },
};

describe("DOKU client", () => {
  it("gets a B2B token once and reuses it until it expires", async () => {
    await createVa(charge);
    await createVa({ ...charge, trxId: "SV-ABC123-2" });
    expect(fake.tokenCount()).toBe(1);
  });

  it("asks for a new token when DOKU rejects the cached one", async () => {
    let first = true;
    fake = installFakeDoku({
      respond: (c) => {
        if (c.path.endsWith("create-va") && first) {
          first = false;
          return { status: 401, body: { responseCode: "4012701", responseMessage: "Invalid Token (B2B)" } };
        }
      },
    });
    const r = await createVa(charge);
    expect(r.reference).toMatch(/^\d+$/);
    expect(fake.tokenCount()).toBe(2);
  });

  it("a DOKU refusal becomes a DokuError with DOKU's code", async () => {
    fake = installFakeDoku({ respond: (c) => (c.path.endsWith("create-va") ? { status: 409, body: { responseCode: "4092700", responseMessage: "Conflict" } } : undefined) });
    await expect(dokuRequest("POST", "/virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va", {})).rejects.toMatchObject({ name: "DokuError", code: "4092700" });
    expect(new DokuError("x", "y")).toBeInstanceOf(Error);
  });
});

describe("Virtual account", () => {
  it("creates a closed-amount VA that expires with the hold", async () => {
    const r = await createVa(charge);
    const call = fake.calls.find((c) => c.path.endsWith("create-va")) as Call;
    const body = call.body as Record<string, unknown>;
    expect(body).toMatchObject({
      partnerServiceId: "   19008",
      virtualAccountName: "Ana Wijaya Keluarga Co",
      virtualAccountEmail: "ana@example.com",
      virtualAccountPhone: "6281234567890",
      trxId: "SV-ABC123-1",
      totalAmount: { value: "7600000.00", currency: "IDR" },
      virtualAccountTrxType: "C",
      expiredDate: "2027-03-01T11:00:00+07:00",
      additionalInfo: { channel: "VIRTUAL_ACCOUNT_BCA", virtualAccountConfig: { reusableStatus: false } },
    });
    /* DGPC: partnerServiceId is the Merchant BIN, customerNo any 10 digits
       (DOKU checks the length), and we keep the number DOKU makes. */
    expect(String(body.customerNo)).toMatch(/^\d{10}$/);
    expect(body.virtualAccountNo).toBe(`${body.partnerServiceId}${body.customerNo}`);
    expect(r).toEqual({ reference: "1900800000000123", gatewayId: "SV-ABC123-1" });
  });

  it("a create-va answer without a VA number is an error, not an empty reference", async () => {
    fake = installFakeDoku({ respond: (c) => (c.path.endsWith("create-va") ? { body: { responseCode: "2002700", virtualAccountData: {} } } : undefined) });
    await expect(createVa(charge)).rejects.toThrow(/no VA number/);
  });

  it("each bank uses its own channel and Merchant BIN", async () => {
    expect(VA_CHANNEL).toEqual({ va_bca: "VIRTUAL_ACCOUNT_BCA", va_bni: "VIRTUAL_ACCOUNT_BNI", va_bri: "VIRTUAL_ACCOUNT_BRI", va_mandiri: "VIRTUAL_ACCOUNT_BANK_MANDIRI" });
    await createVa({ ...charge, method: "va_mandiri" });
    const body = fake.calls.find((c) => c.path.endsWith("create-va"))!.body as Record<string, unknown>;
    expect(body.partnerServiceId).toBe("   88899");
    expect((body.additionalInfo as { channel: string }).channel).toBe("VIRTUAL_ACCOUNT_BANK_MANDIRI");
  });

  it("deletes the VA it created (new payment method, guest cancels)", async () => {
    const r = await createVa(charge);
    await deleteVa({ method: "va_bca", reference: r.reference, trxId: r.gatewayId });
    const call = fake.calls.find((c) => c.path.endsWith("delete-va"))!;
    expect(call.method).toBe("DELETE");
    expect(call.body).toMatchObject({ partnerServiceId: "   19008", virtualAccountNo: `   ${r.reference}`, trxId: "SV-ABC123-1", additionalInfo: { channel: "VIRTUAL_ACCOUNT_BCA" } });
  });
});
