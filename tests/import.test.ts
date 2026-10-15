import { describe, expect, it } from "vitest";
import { suggestNameFromFilename, matchKey } from "@/lib/import/filenames";
import { captionMentionsPrice, suggestNameFromCaption } from "@/lib/import/caption";
import { matchRowsToFiles, parseMetadataCsv } from "@/lib/import/csv";
import { isAllowedMediaUrl, normalisePostUrl, parsePostUrls } from "@/lib/import/instagram";
import { hexHamming } from "@/lib/import/hamming";

describe("filename suggestions", () => {
  it("suggests names from descriptive filenames only", () => {
    expect(suggestNameFromFilename("swiss-voile_wine_01.jpg")).toBe("Swiss Voile Wine");
    expect(suggestNameFromFilename("IMG_20240101_1234.jpg")).toBeNull();
    expect(suggestNameFromFilename("WhatsApp Image 2024-05-01 at 10.jpeg")).toBeNull();
    expect(suggestNameFromFilename("12345678901234.png")).toBeNull();
    expect(suggestNameFromFilename("a.jpg")).toBeNull();
  });
  it("match key ignores folders, case and extension", () => {
    expect(matchKey("folder/Swiss-Voile.JPG")).toBe("swiss-voile");
  });
});

describe("caption hints", () => {
  it("never treats a price as a name and flags price mentions", () => {
    expect(captionMentionsPrice("Now ₦25,000 per yard")).toBe(true);
    expect(captionMentionsPrice("Beautiful lace")).toBe(false);
    expect(suggestNameFromCaption("Royal Wine Lace\nDM to order #lace")).toBe("Royal Wine Lace");
    expect(suggestNameFromCaption("₦25,000 per yard")).toBeNull();
    expect(suggestNameFromCaption("DM to order now")).toBeNull();
    expect(suggestNameFromCaption("#lace #fabric")).toBeNull();
  });
});

describe("csv import", () => {
  const csv = "filename,name,price_ngn,pricing_unit,availability,colours\nlace-1.jpg|lace-2.jpg,Royal Lace,\"25,000\",yard,Sold Out,Wine|Gold\nmissing.jpg,X,abc,metre,maybe,\n";
  it("parses exact kobo, groups files, and drops invalid cells with errors", () => {
    const { rows, fatal } = parseMetadataCsv(csv);
    expect(fatal).toBeNull();
    expect(rows[0].filenames).toEqual(["lace-1.jpg", "lace-2.jpg"]);
    expect(rows[0].priceKobo).toBe(2500000);
    expect(rows[0].availability).toBe("sold_out");
    expect(rows[0].colours).toEqual(["Wine", "Gold"]);
    expect(rows[1].priceKobo).toBeNull();
    expect(rows[1].pricingUnit).toBeNull();
    expect(rows[1].availability).toBeNull();
    expect(rows[1].errors.length).toBe(3);
  });
  it("requires a filename column", () => {
    expect(parseMetadataCsv("name\nx").fatal).toMatch(/filename/);
  });
  it("matches rows to files and reports unmatched rows", () => {
    const { rows } = parseMetadataCsv(csv);
    const { byFile, unmatched } = matchRowsToFiles(rows, ["Lace-1.JPG", "lace-2.jpg"]);
    expect(byFile.get("lace-1")?.name).toBe("Royal Lace");
    expect(unmatched).toEqual([{ line: 3, filename: "missing.jpg" }]);
  });
});

describe("instagram urls", () => {
  it("normalises permalinks and strips tracking", () => {
    expect(normalisePostUrl("https://www.instagram.com/p/ABCdef12345/?igsh=xyz")?.url).toBe("https://www.instagram.com/p/ABCdef12345/");
    expect(normalisePostUrl("https://instagram.com/talatufabrics/reel/Xy_12345ab/")?.kind).toBe("reel");
    expect(normalisePostUrl("https://evil.com/p/ABCdef12345/")).toBeNull();
    expect(normalisePostUrl("http://www.instagram.com/p/ABCdef12345/")).toBeNull();
    expect(normalisePostUrl("https://www.instagram.com/talatufabrics/")).toBeNull();
  });
  it("de-duplicates and reports invalid entries", () => {
    const r = parsePostUrls("https://www.instagram.com/p/ABCdef12345/\nhttps://www.instagram.com/p/ABCdef12345/?x=1, nope");
    expect(r.valid).toHaveLength(1);
    expect(r.duplicates).toBe(1);
    expect(r.invalid).toEqual(["nope"]);
  });
  it("only allows https Instagram/Meta CDN media hosts", () => {
    expect(isAllowedMediaUrl("https://scontent-lhr8-1.cdninstagram.com/v/t51/x.jpg")).toBe(true);
    expect(isAllowedMediaUrl("https://scontent.fbcdn.net/x.jpg")).toBe(true);
    expect(isAllowedMediaUrl("http://scontent.cdninstagram.com/x.jpg")).toBe(false);
    expect(isAllowedMediaUrl("https://169.254.169.254/latest")).toBe(false);
    expect(isAllowedMediaUrl("https://cdninstagram.com.evil.com/x.jpg")).toBe(false);
    expect(isAllowedMediaUrl("https://user:pw@x.cdninstagram.com/x.jpg")).toBe(false);
  });
});

describe("perceptual hash distance", () => {
  it("computes hamming distance", () => {
    expect(hexHamming("0000000000000000", "0000000000000000")).toBe(0);
    expect(hexHamming("0000000000000000", "000000000000000f")).toBe(4);
    expect(hexHamming("00", "0")).toBe(Infinity);
  });
});
