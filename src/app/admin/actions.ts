"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ImageError, processImage } from "@/lib/images";
import { slugify } from "@/lib/slug";
import { categorySchema, productSchema, settingsSchema, type ProductInput } from "@/lib/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normaliseWhatsappNumber } from "@/lib/whatsapp";

export type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const fail = (error: string, fieldErrors?: Record<string, string>) => ({ ok: false as const, error, fieldErrors });

function refreshStorefront(slug?: string | null) {
  revalidatePath("/", "layout");
  revalidatePath("/shop");
  if (slug) revalidatePath(`/shop/${slug}`);
}

// ------------------------------------------------------------------ auth
export async function signIn(_: unknown, formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Those details are not right." };
  const { data: row } = await supabase.from("admin_users").select("role").eq("user_id", data.user.id).maybeSingle();
  if (!row) {
    await supabase.auth.signOut();
    return { error: "This account does not have admin access." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ------------------------------------------------------------------ products
async function uniqueSlug(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, base: string, selfId: string | null) {
  const root = base || "fabric";
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const { data } = await supabase.from("products").select("id").eq("slug", candidate).maybeSingle();
    if (!data || data.id === selfId) return candidate;
  }
  return `${root}-${randomUUID().slice(0, 6)}`;
}

export async function saveProduct(id: string | null, input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const { supabase } = await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return fail("Please fix the highlighted fields.", fieldErrors);
  }
  const v = parsed.data;

  // Publish gate: never publish something that cannot be shown or is unconfirmed.
  if (v.publication_status === "published") {
    if (!v.name) return fail("Add a product name before publishing.", { name: "Required to publish." });
    if (v.needs_review) return fail("Untick “Needs review” once you have checked the details, then publish.", { needs_review: "Review the details first." });
    if (id) {
      const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", id);
      if (!count) return fail("Add at least one photo before publishing.");
    } else {
      return fail("Save the product as a draft, add photos, then publish.");
    }
  }

  let slug = v.slug;
  if (!slug && v.name) slug = await uniqueSlug(supabase, slugify(v.name), id);

  const row = {
    name: v.name,
    sku: v.sku,
    slug,
    category_id: v.category_id,
    short_description: v.short_description,
    description: v.description,
    price_kobo: v.priceNaira,
    pricing_unit: v.pricing_unit,
    min_order_qty: v.min_order_qty,
    stock_quantity: v.stock_quantity,
    availability: v.availability,
    publication_status: v.publication_status,
    featured: v.publication_status === "archived" ? false : v.featured,
    needs_review: v.needs_review,
    instagram_url: v.instagram_url,
    internal_notes: v.internal_notes,
  };

  let productId = id;
  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return dbError(error);
  } else {
    const { data, error } = await supabase.from("products").insert(row).select("id").single();
    if (error || !data) return dbError(error);
    productId = data.id;
  }

  // Sync variants (replace set).
  const { error: delErr } = await supabase.from("product_variants").delete().eq("product_id", productId!);
  if (delErr) return fail("Saved the product, but couldn't update its options. Please try again.");
  if (v.variants.length) {
    const { error: insErr } = await supabase.from("product_variants").insert(
      v.variants.map((x, i) => ({
        product_id: productId!,
        kind: x.kind,
        label: x.label,
        price_kobo: x.priceNaira,
        availability: x.availability,
        sort_order: i,
      })),
    );
    if (insErr) return insErr.code === "23505" ? fail("Two options have the same name.") : fail("Couldn't save the options.");
  }

  refreshStorefront(slug);
  revalidatePath("/admin", "layout");
  return { ok: true, id: productId! };
}

function dbError(error: { code?: string; message?: string; details?: string } | null) {
  if (error?.code === "23505") {
    if (error.message?.includes("sku")) return fail("That reference/SKU is already used by another product.", { sku: "Already in use." });
    if (error.message?.includes("slug")) return fail("That web address (slug) is already used.", { slug: "Already in use." });
    return fail("That value is already used by another product.");
  }
  if (error?.code === "42501") return fail("You don't have permission to do that.");
  return fail("Something went wrong saving. Please try again.");
}

const STATUS = new Set(["draft", "published", "archived"]);

export async function setPublication(id: string, status: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!STATUS.has(status)) return fail("Invalid status.");
  const { data: p } = await supabase.from("products").select("name,slug,needs_review").eq("id", id).maybeSingle();
  if (!p) return fail("Product not found.");
  if (status === "published") {
    if (!p.name) return fail("Add a product name before publishing.");
    if (p.needs_review) return fail("This product still needs review. Open it, check the details and untick “Needs review”.");
    const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", id);
    if (!count) return fail("Add at least one photo before publishing.");
    if (!p.slug) {
      const slug = await uniqueSlug(supabase, slugify(p.name), id);
      await supabase.from("products").update({ slug }).eq("id", id);
    }
  }
  const { error } = await supabase.from("products").update({ publication_status: status }).eq("id", id);
  if (error) return dbError(error);
  refreshStorefront(p.slug);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function bulkUpdateProducts(
  ids: string[],
  patch: { category_id?: string | null; availability?: string; publication_status?: string; needs_review?: boolean },
): Promise<ActionResult<{ updated: number; skipped: number }>> {
  const { supabase } = await requireAdmin();
  if (!ids.length || ids.length > 500) return fail("Select between 1 and 500 products.");
  const update: Record<string, unknown> = {};
  if (patch.category_id !== undefined) update.category_id = patch.category_id;
  if (patch.availability) {
    if (!["available", "made_to_order", "sold_out", "unconfirmed"].includes(patch.availability)) return fail("Invalid availability.");
    update.availability = patch.availability;
  }
  if (patch.needs_review !== undefined) update.needs_review = patch.needs_review;

  let skipped = 0;
  let targetIds = ids;
  if (patch.publication_status) {
    if (!STATUS.has(patch.publication_status)) return fail("Invalid status.");
    if (patch.publication_status === "published") {
      // Only publish rows that are actually publishable; report the rest.
      const { data } = await supabase
        .from("products")
        .select("id,name,needs_review,product_images(id)")
        .in("id", ids);
      const ok = (data ?? []).filter((p) => p.name && !p.needs_review && (p.product_images as unknown[]).length > 0);
      skipped = ids.length - ok.length;
      targetIds = ok.map((p) => p.id);
      if (!targetIds.length) return fail("None of the selected products are ready to publish (they need a name, a photo and no “needs review” flag).");
      // Ensure slugs.
      const { data: noSlug } = await supabase.from("products").select("id,name").in("id", targetIds).is("slug", null);
      for (const p of noSlug ?? []) {
        await supabase.from("products").update({ slug: await uniqueSlug(supabase, slugify(p.name ?? ""), p.id) }).eq("id", p.id);
      }
    }
    update.publication_status = patch.publication_status;
  }
  if (!Object.keys(update).length) return fail("Nothing to change.");
  const { error } = await supabase.from("products").update(update).in("id", targetIds);
  if (error) return dbError(error);
  refreshStorefront();
  revalidatePath("/admin", "layout");
  return { ok: true, updated: targetIds.length, skipped };
}

// ------------------------------------------------------------------ images
export async function uploadProductImage(productId: string, formData: FormData): Promise<ActionResult<{ imageId: string }>> {
  const { supabase } = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return fail("No file received.");
  let processed;
  try {
    processed = await processImage(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return fail(e instanceof ImageError ? e.message : "Couldn't read that image.");
  }
  const { data: existing } = await supabase.from("product_images").select("id,product_id").eq("content_hash", processed.hash).maybeSingle();
  if (existing) {
    return fail(existing.product_id === productId ? "That photo is already on this product." : "That photo is already used on another product.");
  }
  const path = `${productId}/${randomUUID()}.webp`;
  const up = await supabase.storage.from("product-images").upload(path, processed.buffer, { contentType: processed.contentType, upsert: false });
  if (up.error) return fail("Upload failed. Please try again.");
  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  const { data, error } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      storage_path: path,
      content_hash: processed.hash,
      width: processed.width,
      height: processed.height,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) {
    await supabase.storage.from("product-images").remove([path]);
    return error?.code === "23505" ? fail("That photo is already in the catalogue.") : fail("Couldn't save the photo.");
  }
  refreshStorefront();
  return { ok: true, imageId: data.id };
}

export async function deleteProductImage(imageId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data: img } = await supabase.from("product_images").select("storage_path,product_id").eq("id", imageId).maybeSingle();
  if (!img) return fail("Photo not found.");
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return fail("Couldn't remove the photo.");
  await supabase.storage.from("product-images").remove([img.storage_path]);
  refreshStorefront();
  return { ok: true };
}

export async function reorderProductImages(productId: string, orderedIds: string[]): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from("product_images").update({ sort_order: i }).eq("id", orderedIds[i]).eq("product_id", productId);
    if (error) return fail("Couldn't reorder the photos.");
  }
  refreshStorefront();
  return { ok: true };
}

export async function updateImageAlt(imageId: string, alt: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const text = alt.trim().slice(0, 300) || null;
  const { error } = await supabase.from("product_images").update({ alt_text: text }).eq("id", imageId);
  return error ? fail("Couldn't save the description.") : { ok: true };
}

// ------------------------------------------------------------------ categories
export async function saveCategory(id: string | null, input: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid category.");
  const v = parsed.data;
  if (id) {
    const { error } = await supabase.from("categories").update({ name: v.name, description: v.description, is_public: v.is_public }).eq("id", id);
    if (error) return fail("Couldn't save the category.");
  } else {
    let slug = slugify(v.name) || "category";
    const { data: clash } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${slug}-${randomUUID().slice(0, 4)}`;
    const { count } = await supabase.from("categories").select("id", { count: "exact", head: true });
    const { error } = await supabase.from("categories").insert({ name: v.name, slug, description: v.description, is_public: v.is_public, sort_order: count ?? 0 });
    if (error) return fail("Couldn't create the category.");
  }
  refreshStorefront();
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return fail("Couldn't delete the category.");
  refreshStorefront();
  revalidatePath("/admin/categories");
  return { ok: true };
}

// ------------------------------------------------------------------ settings
export async function saveSettings(input: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] ??= i.message;
    return fail("Please fix the highlighted fields.", fieldErrors);
  }
  const v = parsed.data;
  let wa: string | null = null;
  if (v.whatsapp_number) {
    wa = normaliseWhatsappNumber(v.whatsapp_number);
    if (!wa) return fail("That WhatsApp number doesn't look right. Use international format, e.g. +234 803 000 0000.", { whatsapp_number: "Invalid number." });
  }
  const rows = Object.entries({ ...v, whatsapp_number: wa }).map(([key, value]) => ({ key, value: value as never, is_public: true }));
  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return fail("Couldn't save the settings.");
  refreshStorefront();
  revalidatePath("/admin", "layout");
  return { ok: true };
}
