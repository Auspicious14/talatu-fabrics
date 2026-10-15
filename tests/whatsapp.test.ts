import { describe, expect, it } from "vitest";
import { buildEnquiryMessage, buildWhatsappUrl, normaliseWhatsappNumber } from "@/lib/whatsapp";

describe("whatsapp", () => {
  it("normalises numbers and rejects junk", () => {
    expect(normaliseWhatsappNumber("+234 803 000 0000")).toBe("2348030000000");
    expect(normaliseWhatsappNumber("08030000000")).toBe("2348030000000");
    expect(normaliseWhatsappNumber("")).toBeNull();
    expect(normaliseWhatsappNumber(null)).toBeNull();
    expect(normaliseWhatsappNumber("123")).toBeNull();
  });
  it("returns no link when no number is configured (no dead buttons)", () => {
    expect(buildWhatsappUrl(null, "hi")).toBeNull();
  });
  it("encodes product, reference, option, quantity and URL", () => {
    const msg = buildEnquiryMessage({
      productName: "Swiss Voile & Lace",
      sku: "TF-001",
      variantLabel: "Wine",
      quantity: 5,
      unitLabel: "per yard",
      productUrl: "https://example.com/shop/swiss-voile?x=1&y=2",
    });
    const url = buildWhatsappUrl("2348030000000", msg)!;
    expect(url.startsWith("https://wa.me/2348030000000?text=")).toBe(true);
    const decoded = decodeURIComponent(url.split("text=")[1]);
    expect(decoded).toBe(msg);
    expect(decoded).toContain("Swiss Voile & Lace");
    expect(decoded).toContain("Reference: TF-001");
    expect(decoded).toContain("Option: Wine");
    expect(decoded).toContain("Quantity: 5 (yard)");
    expect(decoded).toContain("x=1&y=2");
    expect(url).not.toContain("&y=2 ");
  });
});
