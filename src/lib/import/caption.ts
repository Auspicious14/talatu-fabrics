/** Conservative helpers for turning an Instagram caption into *hints* (never facts). */

const PRICE_HINT = /(₦|\bNGN\b|\bnaira\b|\bN\s?\d{3,}|\d{1,3}(,\d{3})+)/i;

export function captionMentionsPrice(caption: string | null | undefined): boolean {
  return !!caption && PRICE_HINT.test(caption);
}

/**
 * A name is only suggested when the first caption line is short, plain text:
 * no hashtags, mentions, prices, calls to action or emoji-heavy copy.
 */
export function suggestNameFromCaption(caption: string | null | undefined): string | null {
  if (!caption) return null;
  const first = caption.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  if (!first || first.length < 3 || first.length > 60) return null;
  if (/[#@]|https?:|www\.|\bdm\b|\bwhatsapp\b|\border\b/i.test(first)) return null;
  if (PRICE_HINT.test(first)) return null;
  const letters = first.match(/\p{L}/gu)?.length ?? 0;
  if (letters / first.length < 0.6) return null;
  return first.replace(/[\s.:;,!-]+$/g, "");
}
