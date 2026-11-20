import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dokuConfig, DokuNotConfigured } from "@/lib/server/payments/doku/config";
import { dokuRequest } from "@/lib/server/payments/doku/client";
import { createCardPage } from "@/lib/server/payments/doku/card";
import { handlePaymentNotification, handleTokenRequest } from "@/lib/server/payments/notify";
import { installFakeDoku } from "../doku-fake";

/**
 * DOKU Checkout (Non-SNAP, the pop-up) signs with the secret key only, so a
 * site that uses Checkout for every method needs no RSA key pair. Only the
 * SNAP paths ask for it.
 */

let fake: ReturnType<typeof installFakeDoku>;

beforeEach(() => {
  fake = installFakeDoku();
  delete process.env.DOKU_PRIVATE_KEY;
  delete process.env.DOKU_PRIVATE_KEY_PATH;
  delete process.env.DOKU_PUBLIC_KEY;
  delete process.env.DOKU_PUBLIC_KEY_PATH;
});
afterEach(() => vi.unstubAllGlobals());

describe("without RSA keys", () => {
  it("the config loads with client id and secret only", () => {
    const c = dokuConfig();
    expect(c.privateKey).toBe("");
    expect(c.merchantPublicKey).toBe("");
  });

  it("client id and secret are still required", () => {
    delete process.env.DOKU_SECRET_KEY;
    expect(() => dokuConfig()).toThrow(DokuNotConfigured);
  });

  it("a Checkout page (Non-SNAP) still opens", async () => {
    const r = await createCardPage({ trxId: "SV-NK0001-ab12cd34", amount: 1_000_000, code: "SV-NK0001", locale: "id", returnUrl: "https://sukavillage.com/id/booking/SV-NK0001", guest: { name: "Ana", email: "ana@example.com", phone: "+6281234567890" } });
    expect(r.gatewayId).toBe("SV-NK0001-ab12cd34");
  });

  it("a SNAP request says the private key is missing, and sends nothing", async () => {
    await expect(dokuRequest("POST", "/virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va", {})).rejects.toThrow(/DOKU_PRIVATE_KEY/);
    expect(fake.calls).toHaveLength(0);
  });

  it("DOKU's SNAP token request is refused, not a crash", () => {
    const r = handleTokenRequest(new Headers({ "x-client-key": "BRN-TEST-0001" }));
    expect(r.status).toBe(401);
  });

  it("a SNAP notification is refused, not a crash", async () => {
    const r = await handlePaymentNotification(new Headers({ authorization: "Bearer x" }), "{}");
    expect(r.status).toBe(401);
  });
});
