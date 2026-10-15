/** Normalise to digits only, international format (no +, no spaces). */
export function normaliseWhatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  // Nigerian local format 0803... → 234803... (only when it clearly looks local)
  else if (/^0\d{10}$/.test(digits)) digits = `234${digits.slice(1)}`;
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

export interface EnquiryInput {
  productName: string;
  sku?: string | null;
  variantLabel?: string | null;
  quantity: number;
  unitLabel?: string | null;
  productUrl: string;
}

export function buildEnquiryMessage(i: EnquiryInput): string {
  const lines = [
    "Hello Talatu Fabrics, I'd like to enquire about this fabric:",
    "",
    `Product: ${i.productName}`,
  ];
  if (i.sku) lines.push(`Reference: ${i.sku}`);
  if (i.variantLabel) lines.push(`Option: ${i.variantLabel}`);
  lines.push(`Quantity: ${i.quantity}${i.unitLabel ? ` (${i.unitLabel.replace(/^per /, "")})` : ""}`);
  lines.push(`Link: ${i.productUrl}`);
  lines.push("", "Please confirm availability, total price and delivery. Thank you.");
  return lines.join("\n");
}

/** Returns null when no valid number is configured, so callers never render a dead link. */
export function buildWhatsappUrl(number: string | null | undefined, message: string): string | null {
  const n = normaliseWhatsappNumber(number);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}
