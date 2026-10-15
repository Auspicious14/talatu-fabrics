/**
 * Turn an image filename into a *suggested* product name, or null when the filename
 * carries no real information (camera/WhatsApp/Instagram default names). Suggestions are
 * always flagged for review; this never decides a price, category or availability.
 */
const GENERIC = [
  /^img[-_ ]?\d+/i, /^dsc[-_ ]?\d+/i, /^image[-_ ]?\d*/i, /^photo[-_ ]?\d*/i, /^pxl[-_ ]?\d+/i,
  /^whatsapp image/i, /^screenshot/i, /^\d{8,}/, /^\d{4}-\d{2}-\d{2}/, /^[0-9a-f]{16,}$/i,
  /^untitled/i, /^unnamed/i, /^download/i, /^snapinsta/i, /^instagram/i, /^\d+_\d+_\d+/,
];

export function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]{2,5}$/i, "");
}

export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function suggestNameFromFilename(filename: string): string | null {
  const stem = stripExtension(baseName(filename)).trim();
  if (!stem || GENERIC.some((r) => r.test(stem))) return null;
  const cleaned = stem
    .replace(/[_\-.]+/g, " ")
    .replace(/\s*\(\d+\)\s*$/, "") // "name (2)"
    .replace(/\s+\d{1,3}$/, "") // trailing photo counter "name 01"
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 3 || !/[a-z]{3,}/i.test(cleaned)) return null;
  return cleaned.replace(/\b([a-z])([a-z]*)/gi, (_, a: string, b: string) => a.toUpperCase() + b.toLowerCase()).slice(0, 80);
}

/** Case-insensitive key used to match CSV rows to files (extension optional). */
export function matchKey(filename: string): string {
  return stripExtension(baseName(filename)).trim().toLowerCase();
}
