import "server-only";
import sharp from "sharp";

/** 64-bit difference hash (dHash) as 16 hex chars. Robust to resizing/re-compression. */
export async function dHash(input: Buffer): Promise<string> {
  const px = await sharp(input).rotate().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? "1" : "0";
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}
