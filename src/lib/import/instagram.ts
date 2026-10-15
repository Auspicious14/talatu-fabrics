/** Instagram public-post URL handling. Pure functions: no network. */

const POST_RE = /^https:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9._]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]{5,20})\/?(?:[?#].*)?$/;

export interface NormalisedPost {
  url: string; // canonical permalink (no query, no tracking params)
  kind: "p" | "reel" | "tv";
  shortcode: string;
}

export function normalisePostUrl(raw: string): NormalisedPost | null {
  const m = POST_RE.exec(raw.trim());
  if (!m) return null;
  const kind = m[1] as NormalisedPost["kind"];
  return { url: `https://www.instagram.com/${kind}/${m[2]}/`, kind, shortcode: m[2] };
}

/** Parse a pasted block (one URL per line, commas/spaces tolerated) with duplicate removal. */
export function parsePostUrls(text: string, max = 500) {
  const seen = new Set<string>();
  const valid: NormalisedPost[] = [];
  const invalid: string[] = [];
  let duplicates = 0;
  for (const token of text.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean)) {
    const n = normalisePostUrl(token);
    if (!n) { invalid.push(token); continue; }
    if (seen.has(n.url)) { duplicates++; continue; }
    seen.add(n.url);
    valid.push(n);
  }
  return { valid: valid.slice(0, max), invalid, duplicates, truncated: valid.length > max };
}

/**
 * SSRF guard for the optional download step: https only, host must be an Instagram/Meta
 * media CDN, no credentials, no odd ports.
 */
export function isAllowedMediaUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
  const h = u.hostname.toLowerCase();
  return h.endsWith(".cdninstagram.com") || h.endsWith(".fbcdn.net");
}
