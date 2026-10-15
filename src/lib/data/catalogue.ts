import { getPublicClient } from "@/lib/supabase/public";
import type {
  Category,
  ProductWithRelations,
  SiteSettings,
} from "@/lib/types";

export const PAGE_SIZE = 12;

const DEFAULT_SETTINGS: SiteSettings = {
  business_name: "Talatu Fabrics",
  whatsapp_number: null,
  instagram_url: "https://www.instagram.com/talatufabrics/",
  contact_email: null,
  contact_phone: null,
  business_address: null,
  announcement_text: null,
  announcement_enabled: false,
  about_text: null,
  delivery_text: null,
  returns_text: null,
  hero_headline: null,
  hero_subtext: null,
};

export async function getSettings(): Promise<SiteSettings> {
  const db = getPublicClient();
  if (!db) return DEFAULT_SETTINGS;
  const { data, error } = await db.from("site_settings").select("key,value");
  if (error || !data) return DEFAULT_SETTINGS;
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of data) {
    if (row.key in DEFAULT_SETTINGS && row.value !== null) merged[row.key] = row.value;
  }
  return merged as unknown as SiteSettings;
}

export async function getCategories(): Promise<Category[]> {
  const db = getPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("categories")
    .select("*")
    .eq("is_public", true)
    .order("sort_order")
    .order("name");
  return (data as Category[]) ?? [];
}

const PRODUCT_SELECT =
  "*, category:categories(*), images:product_images(*), variants:product_variants(*)";

function tidy(p: ProductWithRelations): ProductWithRelations {
  return {
    ...p,
    images: [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    variants: [...(p.variants ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}

export type SortKey = "newest" | "price_asc" | "price_desc";
export type AvailabilityFilter = "in_stock" | "all";

export interface CatalogueQuery {
  q?: string;
  category?: string;
  colour?: string;
  minNaira?: number;
  maxNaira?: number;
  availability?: AvailabilityFilter;
  sort?: SortKey;
  page?: number;
}

export interface CatalogueResult {
  products: ProductWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  error: boolean;
  configured: boolean;
}

/** Strip characters that have meaning inside a PostgREST `or()` filter. */
export function sanitiseSearch(q: string): string {
  return q.replace(/[,()%*\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function listProducts(query: CatalogueQuery = {}): Promise<CatalogueResult> {
  const db = getPublicClient();
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const base = { products: [], total: 0, page, pageSize: PAGE_SIZE };
  if (!db) return { ...base, error: false, configured: false };

  try {
    let ids: string[] | null = null;
    if (query.colour) {
      const { data } = await db
        .from("product_variants")
        .select("product_id")
        .eq("kind", "colour")
        .ilike("label", sanitiseSearch(query.colour));
      ids = (data ?? []).map((r) => r.product_id as string);
      if (ids.length === 0) return { ...base, error: false, configured: true };
    }

    let categoryId: string | null = null;
    if (query.category) {
      const { data: cat } = await db.from("categories").select("id").eq("slug", query.category).maybeSingle();
      if (!cat) return { ...base, error: false, configured: true };
      categoryId = cat.id as string;
    }

    let req = db
      .from("products")
      .select(PRODUCT_SELECT, { count: "exact" })
      .eq("publication_status", "published");

    if (ids) req = req.in("id", ids);
    if (categoryId) req = req.eq("category_id", categoryId);
    if (query.availability === "in_stock") req = req.in("availability", ["available", "made_to_order"]);
    if (query.minNaira !== undefined) req = req.gte("price_kobo", Math.round(query.minNaira * 100));
    if (query.maxNaira !== undefined) req = req.lte("price_kobo", Math.round(query.maxNaira * 100));

    const q = query.q ? sanitiseSearch(query.q) : "";
    if (q) {
      const like = `%${q}%`;
      req = req.or(`name.ilike.${like},sku.ilike.${like},short_description.ilike.${like},description.ilike.${like}`);
    }

    switch (query.sort) {
      case "price_asc":
        req = req.order("price_kobo", { ascending: true, nullsFirst: false });
        break;
      case "price_desc":
        req = req.order("price_kobo", { ascending: false, nullsFirst: false });
        break;
      default:
        req = req.order("published_at", { ascending: false, nullsFirst: false });
    }
    req = req.order("id");

    const from = (page - 1) * PAGE_SIZE;
    const { data, count, error } = await req.range(from, from + PAGE_SIZE - 1);
    if (error) return { ...base, error: true, configured: true };
    return {
      products: ((data as unknown as ProductWithRelations[]) ?? []).map(tidy),
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
      error: false,
      configured: true,
    };
  } catch {
    return { ...base, error: true, configured: true };
  }
}

export async function getFeatured(limit = 4): Promise<ProductWithRelations[]> {
  const db = getPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("publication_status", "published")
    .eq("featured", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((data as unknown as ProductWithRelations[]) ?? []).map(tidy);
}

export async function getNewArrivals(limit = 8): Promise<ProductWithRelations[]> {
  const db = getPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("publication_status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((data as unknown as ProductWithRelations[]) ?? []).map(tidy);
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  const db = getPublicClient();
  if (!db) return null;
  const { data } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("publication_status", "published")
    .maybeSingle();
  return data ? tidy(data as unknown as ProductWithRelations) : null;
}

export async function getRelated(product: ProductWithRelations, limit = 4): Promise<ProductWithRelations[]> {
  const db = getPublicClient();
  if (!db || !product.category_id) return [];
  const { data } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("publication_status", "published")
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((data as unknown as ProductWithRelations[]) ?? []).map(tidy);
}

export async function getAllPublishedSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const db = getPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("products")
    .select("slug,updated_at")
    .eq("publication_status", "published")
    .not("slug", "is", null);
  return (data as { slug: string; updated_at: string }[]) ?? [];
}

/** Distinct colour labels across published products, for the filter UI. */
export async function getColourOptions(): Promise<string[]> {
  const db = getPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("product_variants")
    .select("label, products!inner(publication_status)")
    .eq("kind", "colour")
    .eq("products.publication_status", "published");
  const set = new Set<string>();
  for (const r of (data as { label: string }[]) ?? []) set.add(r.label);
  return [...set].sort((a, b) => a.localeCompare(b));
}
