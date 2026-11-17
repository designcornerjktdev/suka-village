import { createHash, createHmac, createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  issueNotificationToken,
  signAsymmetric,
  signSymmetric,
  snapTimestamp,
  verifyAsymmetric,
  verifyNotificationToken,
} from "@/lib/server/payments/doku/snap";

const merchant = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
const doku = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });

describe("SNAP signatures (DOKU)", () => {
  it("timestamp is Jakarta time with +07:00", () => {
    expect(snapTimestamp(new Date("2027-03-01T03:04:05.678Z"))).toBe("2027-03-01T10:04:05+07:00");
    expect(snapTimestamp(new Date("2027-03-01T20:00:00Z"))).toBe("2027-03-02T03:00:00+07:00");
  });

  it("Get Token B2B: SHA256withRSA over clientId|timestamp, base64", () => {
    const sig = signAsymmetric(merchant.privateKey, "BRN-0001", "2027-03-01T10:04:05+07:00");
    const v = createVerify("RSA-SHA256").update("BRN-0001|2027-03-01T10:04:05+07:00");
    expect(v.verify(merchant.publicKey, Buffer.from(sig, "base64"))).toBe(true);
  });

  it("verifies DOKU's token request with DOKU's public key", () => {
    const sig = signAsymmetric(doku.privateKey, "BRN-0001", "2027-03-01T10:04:05+07:00");
    expect(verifyAsymmetric(doku.publicKey, "BRN-0001", "2027-03-01T10:04:05+07:00", sig)).toBe(true);
    expect(verifyAsymmetric(doku.publicKey, "BRN-0001", "2027-03-01T10:04:06+07:00", sig)).toBe(false);
    expect(verifyAsymmetric(doku.publicKey, "BRN-0001", "2027-03-01T10:04:05+07:00", "bukan-signature")).toBe(false);
  });

  it("transaction: HMAC-SHA512(secret, METHOD:path:token:sha256hex(JSON body):timestamp), base64", () => {
    const body = { partnerServiceId: "   19008", totalAmount: { value: "100000.00", currency: "IDR" } };
    const ts = "2027-03-01T10:04:05+07:00";
    const expected = createHmac("sha512", "rahasia")
      .update(`POST:/virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va:tok123:${createHash("sha256").update(JSON.stringify(body)).digest("hex")}:${ts}`)
      .digest("base64");
    expect(signSymmetric("rahasia", "POST", "/virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va", "tok123", JSON.stringify(body), ts)).toBe(expected);
  });

  it("the body hash keeps spaces inside values (partnerServiceId is left padded)", () => {
    const a = signSymmetric("s", "POST", "/p", "t", JSON.stringify({ partnerServiceId: "   19008" }), "ts");
    const b = signSymmetric("s", "POST", "/p", "t", JSON.stringify({ partnerServiceId: "19008" }), "ts");
    expect(a).not.toBe(b);
  });
});

describe("notification token (the token DOKU asks us for before notifying)", () => {
  it("issued by us (RS256 with our key) and accepted back", () => {
    const now = new Date("2027-03-01T03:00:00Z");
    const token = issueNotificationToken(merchant.privateKey, "BRN-0001", 900, now);
    expect(token.split(".")).toHaveLength(3);
    expect(verifyNotificationToken(merchant.publicKey, token, new Date(now.getTime() + 60_000))).toBe(true);
  });

  it("refused when expired, tampered with, or signed by another key", () => {
    const now = new Date("2027-03-01T03:00:00Z");
    const token = issueNotificationToken(merchant.privateKey, "BRN-0001", 900, now);
    expect(verifyNotificationToken(merchant.publicKey, token, new Date(now.getTime() + 901_000))).toBe(false);
    const [h, p, s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url").toString()), exp: 9999999999 })).toString("base64url");
    expect(verifyNotificationToken(merchant.publicKey, `${h}.${forged}.${s}`, now)).toBe(false);
    expect(verifyNotificationToken(merchant.publicKey, issueNotificationToken(doku.privateKey, "BRN-0001", 900, now), now)).toBe(false);
    expect(verifyNotificationToken(merchant.publicKey, "bukan.token", now)).toBe(false);
  });
});
