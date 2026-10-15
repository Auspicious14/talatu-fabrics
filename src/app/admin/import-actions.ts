"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { ingestImage } from "@/lib/import/ingest";
import { parsePostUrls, isAllowedMediaUrl } from "@/lib/import/instagram";
import { downloadsAllowed, resolvePost } from "@/lib/import/provider";
import { MAX_UPLOAD_BYTES } from "@/lib/images";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

export async function createImportBatch(source: "upload" | "zip" | "instagram_public", label: string): Promise<{ ok: true; id: string } | Fail> {
  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase
    .from("import_batches")
    .insert({ source, label: label.trim().slice(0, 120) || null, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) return fail("Couldn't start the import.");
  revalidatePath("/admin/import");
  return { ok: true, id: data.id };
}

export async function finishImportBatch(batchId: string, summary: Record<string, unknown>): Promise<{ ok: true } | Fail> {
  const { supabase } = await requireAdmin();
  const safe = JSON.parse(JSON.stringify(summary).slice(0, 60_000)) as Record<string, unknown>;
  const { error } = await supabase.from("import_batches").update({ summary: safe, status: "open" }).eq("id", batchId);
  if (error) return fail("Couldn't save the import summary.");
  revalidatePath("/admin/import");
  revalidatePath(`/admin/import/${batchId}`);
  return { ok: true };
}

/** Records public post URLs as reference-only draft products. Never fetches anything. */
export async function submitInstagramUrls(batchId: string, text: string) {
  const { supabase } = await requireAdmin();
  const parsed = parsePostUrls(text, 100);
  if (parsed.valid.length === 0 && parsed.invalid.length === 0) return { ok: false as const, error: "Paste at least one post link." };
  let created = 0;
  let alreadyKnown = 0;
  const itemIds: string[] = [];
  for (const post of parsed.valid) {
    const { data: existing } = await supabase.from("import_items").select("id").eq("source_url", post.url).maybeSingle();
    if (existing) { alreadyKnown++; continue; }
    const { data: product, error: pErr } = await supabase.from("products").insert({
      instagram_url: post.url, publication_status: "draft", availability: "unconfirmed", needs_review: true,
      import_batch_id: batchId, internal_notes: "Created from a public Instagram post link. No photo has been imported yet.",
    }).select("id").single();
    if (pErr || !product) continue;
    const { data: item, error: iErr } = await supabase.from("import_items").insert({
      batch_id: batchId, source_url: post.url, filename: post.shortcode, retrieval: "pending", product_id: product.id,
      metadata: { kind: post.kind },
    }).select("id").single();
    if (iErr || !item) { await supabase.from("products").delete().eq("id", product.id); continue; }
    created++;
    itemIds.push(item.id);
  }
  revalidatePath(`/admin/import/${batchId}`);
  return { ok: true as const, created, alreadyKnown, invalid: parsed.invalid, duplicatesInInput: parsed.duplicates, truncated: parsed.truncated, itemIds };
}

/** Tries to enrich one pending post via the configured provider. Honest status on every path. */
export async function retrieveInstagramItem(itemId: string): Promise<{ ok: true; status: string; message?: string } | Fail> {
  const { supabase } = await requireAdmin();
  const { data: item } = await supabase.from("import_items").select("id,batch_id,source_url,product_id,metadata").eq("id", itemId).maybeSingle();
  if (!item?.source_url) return fail("Item not found.");

  const r = await resolvePost(item.source_url);
  const metadata = { ...(item.metadata as Record<string, unknown>), provider_checked_at: new Date().toISOString() } as Record<string, unknown>;

  if (r.status === "unavailable" || r.status === "failed") {
    await supabase.from("import_items").update({ retrieval: r.status === "unavailable" ? "unavailable" : "failed", error: r.message ?? null, metadata }).eq("id", itemId);
    return { ok: true, status: r.status, message: r.message };
  }
  if (r.status === "not_configured") {
    await supabase.from("import_items").update({ retrieval: "preview_only", error: r.message ?? null, metadata }).eq("id", itemId);
    return { ok: true, status: "reference_only", message: r.message };
  }

  if (r.caption && item.product_id) {
    await supabase.from("products").update({ source_caption: r.caption }).eq("id", item.product_id).is("source_caption", null);
  }
  const preview = r.imageUrls.find(isAllowedMediaUrl) ?? null;
  if (preview) metadata.preview_url = preview; // transient admin-preview only; never a product asset

  if (preview && downloadsAllowed() && item.product_id) {
    try {
      const res = await fetch(preview, { signal: AbortSignal.timeout(15_000), redirect: "error" });
      const len = Number(res.headers.get("content-length") ?? 0);
      if (!res.ok || len > MAX_UPLOAD_BYTES) throw new Error("download refused");
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > MAX_UPLOAD_BYTES) throw new Error("too large");
      const out = await ingestImage(supabase, bytes, { batchId: item.batch_id, filename: String(item.metadata?.["kind"] ?? "post"), attachToProductId: item.product_id, caption: r.caption ?? null });
      if (out.status === "imported") {
        const { data: made } = await supabase.from("import_items").select("storage_path,content_hash,phash").eq("id", out.itemId!).maybeSingle();
        await supabase.from("import_items").update({ retrieval: "imported", error: null, caption: r.caption ?? null, storage_path: made?.storage_path ?? null, content_hash: made?.content_hash ?? null, phash: made?.phash ?? null, metadata }).eq("id", itemId);
        if (out.itemId) await supabase.from("import_items").delete().eq("id", out.itemId);
        return { ok: true, status: "imported" };
      }
      await supabase.from("import_items").update({ retrieval: out.status === "duplicate" ? "duplicate" : "failed", error: out.message ?? null, caption: r.caption ?? null, metadata }).eq("id", itemId);
      return { ok: true, status: out.status, message: out.message };
    } catch {
      await supabase.from("import_items").update({ retrieval: "failed", error: "The image couldn't be downloaded.", caption: r.caption ?? null, metadata }).eq("id", itemId);
      return { ok: true, status: "failed", message: "The image couldn't be downloaded." };
    }
  }

  await supabase.from("import_items").update({
    retrieval: "preview_only", caption: r.caption ?? null, metadata,
    error: preview ? "Preview only. Image downloading is switched off, so the post link is kept as the reference." : "No usable image was returned. The post link is kept as the reference.",
  }).eq("id", itemId);
  return { ok: true, status: "preview_only" };
}

/** Match photos to drafts: fold several draft products into one (their photos move to the target). */
export async function mergeProducts(targetId: string, sourceIds: string[]): Promise<{ ok: true; merged: number } | Fail> {
  const { supabase } = await requireAdmin();
  const sources = [...new Set(sourceIds)].filter((id) => id !== targetId);
  if (!sources.length) return fail("Select at least two products.");
  const { data: target } = await supabase.from("products").select("id,publication_status").eq("id", targetId).maybeSingle();
  if (!target) return fail("Target product not found.");
  const { data: srcs } = await supabase.from("products").select("id,publication_status").in("id", sources);
  if ((srcs ?? []).some((s) => s.publication_status !== "draft")) return fail("Only draft products can be merged into another product.");
  let merged = 0;
  for (const s of srcs ?? []) {
    const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", targetId);
    const { data: imgs } = await supabase.from("product_images").select("id").eq("product_id", s.id).order("sort_order");
    for (let i = 0; i < (imgs?.length ?? 0); i++) {
      const { error } = await supabase.from("product_images").update({ product_id: targetId, sort_order: (count ?? 0) + i }).eq("id", imgs![i].id);
      if (error) return fail("Couldn't move a photo. Nothing else was changed after that point.");
    }
    await supabase.from("import_items").update({ product_id: targetId }).eq("product_id", s.id);
    const { error: delErr } = await supabase.from("products").delete().eq("id", s.id);
    if (delErr) return fail("Moved the photos but couldn't remove an empty draft.");
    merged++;
  }
  revalidatePath("/admin/products");
  revalidatePath("/admin/import", "layout");
  return { ok: true, merged };
}
