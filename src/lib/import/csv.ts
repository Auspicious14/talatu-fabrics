import Papa from "papaparse";
import { matchKey } from "./filenames";
import { parseNairaToKobo } from "@/lib/money";

export interface CsvRow {
  filenames: string[]; // one or more files (separated by | ) forming ONE product
  name: string | null;
  sku: string | null;
  priceKobo: number | null;
  pricingUnit: string | null;
  category: string | null;
  description: string | null;
  availability: string | null;
  colours: string[];
  instagramUrl: string | null;
  caption: string | null;
  line: number;
  errors: string[];
}

const UNITS = ["yard", "set", "piece", "bundle", "roll"];
const AVAIL = ["available", "made_to_order", "sold_out", "unconfirmed"];
const clean = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

/**
 * Parses the metadata CSV (template in /public/talatu-import-template.csv).
 * Invalid cells are reported per row and DROPPED (not guessed); the image still imports
 * as a draft. Prices are parsed to exact integer kobo.
 */
export function parseMetadataCsv(text: string): { rows: CsvRow[]; fatal: string | null } {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  const fields = parsed.meta.fields ?? [];
  if (!fields.includes("filename")) return { rows: [], fatal: "The CSV needs a “filename” column." };
  if (parsed.data.length > 5000) return { rows: [], fatal: "The CSV has more than 5,000 rows. Split it into smaller files." };

  const rows: CsvRow[] = parsed.data.map((r, i) => {
    const errors: string[] = [];
    const price = clean(r.price_ngn);
    let priceKobo: number | null = null;
    if (price) {
      const k = parseNairaToKobo(price);
      if (k === undefined) errors.push(`Price “${price}” isn't a valid naira amount, so it was ignored.`);
      else priceKobo = k;
    }
    const unit = clean(r.pricing_unit)?.toLowerCase() ?? null;
    if (unit && !UNITS.includes(unit)) errors.push(`Unit “${unit}” isn't one of ${UNITS.join(", ")}; ignored.`);
    const avail = clean(r.availability)?.toLowerCase().replace(/[\s-]+/g, "_") ?? null;
    if (avail && !AVAIL.includes(avail)) errors.push(`Availability “${avail}” isn't recognised; ignored.`);
    const ig = clean(r.instagram_url);
    const igOk = ig && /^https:\/\/(www\.)?instagram\.com\//i.test(ig);
    if (ig && !igOk) errors.push("Instagram URL must start with https://www.instagram.com/; ignored.");
    return {
      filenames: (clean(r.filename) ?? "").split("|").map((f) => f.trim()).filter(Boolean),
      name: clean(r.name),
      sku: clean(r.sku),
      priceKobo,
      pricingUnit: unit && UNITS.includes(unit) ? unit : null,
      category: clean(r.category),
      description: clean(r.description),
      availability: avail && AVAIL.includes(avail) ? avail : null,
      colours: (clean(r.colours) ?? "").split("|").map((c) => c.trim()).filter(Boolean).slice(0, 20),
      instagramUrl: igOk ? ig : null,
      caption: clean(r.caption),
      line: i + 2, // header is line 1
      errors,
    };
  });
  return { rows, fatal: null };
}

/** Map every file key → the CSV row that names it. Reports rows that match no uploaded file. */
export function matchRowsToFiles(rows: CsvRow[], filenames: string[]) {
  const fileKeys = new Set(filenames.map(matchKey));
  const byFile = new Map<string, CsvRow>();
  const unmatched: { line: number; filename: string }[] = [];
  for (const row of rows) {
    let any = false;
    for (const f of row.filenames) {
      const k = matchKey(f);
      if (fileKeys.has(k)) {
        any = true;
        if (!byFile.has(k)) byFile.set(k, row);
      } else {
        unmatched.push({ line: row.line, filename: f });
      }
    }
    if (!any && row.filenames.length === 0) unmatched.push({ line: row.line, filename: "(empty filename)" });
  }
  return { byFile, unmatched };
}
