import type { PricingUnit } from "./types";

const ngn = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** Format integer kobo as naira. Returns null when the price is unknown. */
export function formatKobo(kobo: number | null | undefined): string | null {
  if (kobo === null || kobo === undefined || !Number.isFinite(kobo)) return null;
  return ngn.format(kobo / 100);
}

/**
 * Parse a naira amount typed by a human ("12,500", "₦12500.50") into integer kobo.
 * Returns null for empty input and NaN-safe `undefined` for invalid input.
 */
export function parseNairaToKobo(input: string | null | undefined): number | null | undefined {
  if (input === null || input === undefined) return null;
  const cleaned = input.replace(/[₦,\s]/g, "").replace(/^NGN/i, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Kobo → plain naira string for form inputs ("12500" or "12500.5"). */
export function koboToNairaInput(kobo: number | null | undefined): string {
  if (kobo === null || kobo === undefined) return "";
  const whole = Math.floor(kobo / 100);
  const frac = kobo % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}`;
}

export const UNIT_LABEL: Record<PricingUnit, string> = {
  yard: "per yard",
  set: "per set",
  piece: "per piece",
  bundle: "per bundle",
  roll: "per roll",
};
