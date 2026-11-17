import QRCode from "qrcode";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import QrisCode, { qrPath } from "@/components/booking/QrisCode";

const QR = "00020101021226670016ID.CO.DOKU.WWW011893600899000000012302150000000000001240303UMI51440014ID.CO.QRIS.WWW5303360540810000.005802ID6304ABCD";

describe("QrisCode", () => {
  it("draws exactly the modules of the QRIS string", () => {
    const { modules } = QRCode.create(QR, { errorCorrectionLevel: "M" });
    const dark: string[] = [];
    for (let y = 0; y < modules.size; y++) for (let x = 0; x < modules.size; x++) if (modules.get(x, y)) dark.push(`M${x} ${y}h1v1h-1z`);
    expect(qrPath(QR)).toEqual({ size: modules.size, d: dark.join("") });
  });

  it("is a labelled image in the same frame as the demo QR, without the CONTOH stamp", () => {
    const html = renderToStaticMarkup(<QrisCode value={QR} label="Scan QRIS" />);
    expect(html).toContain('class="sv-qr"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Scan QRIS"');
    expect(html).not.toContain("CONTOH");
  });
});
