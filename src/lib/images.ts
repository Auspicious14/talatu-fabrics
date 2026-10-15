import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp", "avif"]);

export interface ProcessedImage {
  buffer: Buffer;
  contentType: "image/webp";
  hash: string; // sha256 of the ORIGINAL bytes (stable duplicate key)
  width: number;
  height: number;
}

export class ImageError extends Error {}

/**
 * Validates by decoding (magic bytes, not the client-supplied MIME type), then
 * auto-orients, strips metadata (e.g. GPS) and caps the longest side at 2400px.
 * Re-encodes to high-quality WebP. Colour is not graded or altered.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new ImageError("The file is empty.");
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageError("Each image must be 8 MB or smaller.");
  let meta;
  try {
    meta = await sharp(input, { limitInputPixels: 80_000_000 }).metadata();
  } catch {
    throw new ImageError("That file is not a readable image.");
  }
  if (!meta.format || !ALLOWED.has(meta.format)) {
    throw new ImageError("Only JPG, PNG, WebP or AVIF images are supported.");
  }
  const hash = createHash("sha256").update(input).digest("hex");
  const { data, info } = await sharp(input, { limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, contentType: "image/webp", hash, width: info.width, height: info.height };
}
