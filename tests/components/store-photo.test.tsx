import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import StorePhoto from "@/components/StorePhoto";
import { isUpload } from "@/lib/booking/uploads";

describe("uploaded photographs", () => {
  it("isUpload knows a server upload from a photo that ships with the site", () => {
    expect(isUpload("/uploads/2027/abc123.jpg")).toBe(true);
    expect(isUpload("/photos/main-villa/01.jpg")).toBe(false);
  });

  it("StorePhoto draws an upload straight from /uploads, in the same frame as before", () => {
    const html = renderToStaticMarkup(<StorePhoto src="/uploads/2027/abc123.jpg" alt="Kolam renang" sizes="100vw" />);
    expect(html).toContain('src="/uploads/2027/abc123.jpg"');
    expect(html).toContain('alt="Kolam renang"');
    expect(html).toContain("sv-photo sv-upload-img");
  });
});
