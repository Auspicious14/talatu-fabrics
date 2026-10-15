import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processImage } from "@/lib/images";
import { slugify } from "@/lib/slug";
import { dHash } from "./phash";
import { hexHamming } from "./hamming";
import { suggestNameFromFilename } from "./filenames";
import { captionMentionsPrice, suggestNameFromCaption } from "./caption";

export interface ItemMeta {
  batchId: string;
  filename: string;
  sourceHash?: string | null;      // sha256 of the ORIGINAL file read in the browser (retry key)
  groupKey?: string | null;        // files sharing a key become photos of ONE product
  attachToProductId?: string | null;
  sourceUrl?: string | null;
  caption?: string | null;
  postedAt?: string | null;
  csv?: {
    name?: string | null; sku?: string | null; priceKobo?: number | null; pricingUnit?: string | null;
    category?: string | null; description?: string | null; availability?: string | null;
    colours?: string[]; instagramUrl?: string | null; line?: number; warnings?: string[];
  } | null;
}

export interface IngestResult {
  status: "imported" | "duplicate" | "failed";
  itemId: string | null;
  productId: string | null;
  message?: string;
  possibleDuplicateOf?: string | null;
}

const NEAR_DUPLICATE_DISTANCE = 4;

async function categoryIdFor(db: SupabaseClient, name: string | null | undefined): Promise<string | null> {
  if (!name) return null;
  const slug = slugify(name);
  if (!slug) return null;
  const { data } = await db.from("categories").select("id").eq("slug", slug).maybeSingle();
  if (data) return data.id as string;
  const { count } = await db.from("categories").select("id", { count: "exact", head: true });
  const { data: created } = await db.from("categories").insert({ name: name.slice(0, 80), slug, sort_order: count ?? 0 }).select("id").single();
  return (created?.id as string) ?? null;
}

/**
 * Idempotent single-image ingest. Safe to retry:
 *  - same original file (sourceHash)  -> returns the existing item
 *  - same processed bytes (sha256)    -> recorded as a duplicate, no new product
 *  - near-identical picture (dHash)   -> imported but flagged for review
 * Everything created is a DRAFT flagged needs_review. Prices are only ever taken from
 * the owner's CSV and are never derived from images or captions.
 */
export async function ingestImage(db: SupabaseClient, bytes: Buffer, meta: ItemMeta): Promise<IngestResult> {
  if (meta.sourceHash) {
    const { data: prior } = await db.from("import_items").select("id,product_id,retrieval").eq("source_hash", meta.sourceHash).maybeSingle();
    if (prior) return { status: "duplicate", itemId: prior.id, productId: prior.product_id, message: "Already imported (same file)." };
  }

  let processed;
  try {
    processed = await processImage(bytes);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Couldn't read the image.";
    const { data } = await db.from("import_items").insert({ batch_id: meta.batchId, filename: meta.filename, source_hash: meta.sourceHash ?? null, retrieval: "failed", error: message, source_url: meta.sourceUrl ?? null }).select("id").single();
    return { status: "failed", itemId: data?.id ?? null, productId: null, message };
  }

  const { data: same } = await db.from("product_images").select("product_id").eq("content_hash", processed.hash).maybeSingle();
  if (same) {
    const { data } = await db.from("import_items").insert({
      batch_id: meta.batchId, filename: meta.filename, content_hash: processed.hash, source_hash: meta.sourceHash ?? null,
      retrieval: "duplicate", product_id: same.product_id, source_url: meta.sourceUrl ?? null, error: "This exact photo is already in the catalogue.",
    }).select("id").single();
    return { status: "duplicate", itemId: data?.id ?? null, productId: same.product_id, message: "Exact duplicate of a photo already in the catalogue." };
  }

  const phash = await dHash(processed.buffer);
  let near: string | null = null;
  const { data: known } = await db.from("product_images").select("product_id,phash").not("phash", "is", null).limit(10000);
  for (const k of known ?? []) {
    if (k.phash && hexHamming(phash, k.phash as string) <= NEAR_DUPLICATE_DISTANCE) { near = k.product_id as string; break; }
  }

  // Which product does this photo belong to?
  let productId = meta.attachToProductId ?? null;
  if (!productId && meta.groupKey) {
    const { data: g } = await db.from("import_items").select("product_id").eq("batch_id", meta.batchId).eq("metadata->>group_key", meta.groupKey).not("product_id", "is", null).limit(1).maybeSingle();
    productId = g?.product_id ?? null;
  }

  if (!productId) {
    const csv = meta.csv ?? {};
    const notes: string[] = [];
    if (csv.warnings?.length) notes.push(...csv.warnings.map((w) => `CSV line ${csv.line}: ${w}`));
    if (meta.caption && captionMentionsPrice(meta.caption)) notes.push("The original caption mentions a price. Check it before entering one.");
    if (near) notes.push(`Possible duplicate: this photo looks very similar to one already on another product (id ${near}).`);
    let sku = csv.sku ?? null;
    if (sku) {
      const { data: clash } = await db.from("products").select("id").eq("sku", sku).maybeSingle();
      if (clash) { notes.push(`Reference “${sku}” from the CSV is already used by another product, so it was left blank.`); sku = null; }
    }
    const name = csv.name ?? suggestNameFromFilename(meta.filename) ?? suggestNameFromCaption(meta.caption) ?? null;
    const { data: created, error } = await db.from("products").insert({
      name, sku,
      description: csv.description ?? null,
      price_kobo: csv.priceKobo ?? null,
      pricing_unit: csv.pricingUnit ?? null,
      availability: csv.availability ?? "unconfirmed",
      category_id: await categoryIdFor(db, csv.category),
      instagram_url: csv.instagramUrl ?? meta.sourceUrl ?? null,
      source_caption: meta.caption ?? null,
      publication_status: "draft",
      needs_review: true,
      import_batch_id: meta.batchId,
      internal_notes: notes.length ? notes.join("\n") : null,
    }).select("id").single();
    if (error || !created) return { status: "failed", itemId: null, productId: null, message: "Couldn't create the draft product." };
    productId = created.id as string;
    if (csv.colours?.length) {
      await db.from("product_variants").insert(csv.colours.map((label, i) => ({ product_id: productId, kind: "colour", label: label.slice(0, 80), sort_order: i })));
    }
  }

  const path = `${productId}/${randomUUID()}.webp`;
  const up = await db.storage.from("product-images").upload(path, processed.buffer, { contentType: processed.contentType, upsert: false });
  if (up.error) return { status: "failed", itemId: null, productId, message: "Upload to storage failed." };
  const { count } = await db.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  const { error: imgErr } = await db.from("product_images").insert({
    product_id: productId, storage_path: path, content_hash: processed.hash, phash, width: processed.width, height: processed.height, sort_order: count ?? 0,
  });
  if (imgErr) {
    await db.storage.from("product-images").remove([path]);
    return { status: imgErr.code === "23505" ? "duplicate" : "failed", itemId: null, productId, message: imgErr.code === "23505" ? "Exact duplicate." : "Couldn't save the photo." };
  }

  const { data: item } = await db.from("import_items").insert({
    batch_id: meta.batchId, filename: meta.filename, content_hash: processed.hash, source_hash: meta.sourceHash ?? null, phash,
    storage_path: path, source_url: meta.sourceUrl ?? null, caption: meta.caption ?? null, posted_at: meta.postedAt ?? null,
    suggested_name: suggestNameFromFilename(meta.filename) ?? suggestNameFromCaption(meta.caption),
    retrieval: "imported", product_id: productId,
    metadata: { group_key: meta.groupKey ?? null, csv_line: meta.csv?.line ?? null, possible_duplicate_of: near },
  }).select("id").single();
  return { status: "imported", itemId: item?.id ?? null, productId, possibleDuplicateOf: near };
}
