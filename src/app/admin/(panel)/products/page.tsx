import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { sanitiseSearch } from "@/lib/data/catalogue";
import { ProductsTable, type Row } from "@/components/admin/ProductsTable";
import type { AvailabilityStatus, PublicationStatus } from "@/lib/types";

export const metadata = { title: "Products" };
const PER_PAGE = 30;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = sanitiseSearch(one(sp.q) ?? "");
  const status = one(sp.status);
  const review = one(sp.review) === "1";
  const category = one(sp.category);
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const { data: categories } = await supabase.from("categories").select("id,name").order("sort_order");

  let req = supabase
    .from("products")
    .select("id,name,sku,price_kobo,availability,publication_status,needs_review,category:categories(name),images:product_images(storage_path,sort_order)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (status && ["draft", "published", "archived"].includes(status)) req = req.eq("publication_status", status);
  else req = req.neq("publication_status", "archived");
  if (review) req = req.eq("needs_review", true);
  if (category) req = req.eq("category_id", category);
  if (q) req = req.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  const from = (page - 1) * PER_PAGE;
  const { data, count, error } = await req.range(from, from + PER_PAGE - 1);

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rows: Row[] = (data ?? []).map((p) => {
    const imgs = ((p.images ?? []) as { storage_path: string; sort_order: number }[]).sort((a, b) => a.sort_order - b.sort_order);
    const cat = p.category as unknown as { name: string } | null;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      price_kobo: p.price_kobo,
      availability: p.availability as AvailabilityStatus,
      publication_status: p.publication_status as PublicationStatus,
      needs_review: p.needs_review,
      category_name: cat?.name ?? null,
      thumb: imgs[0] ? `${base}/storage/v1/object/public/product-images/${imgs[0].storage_path}` : null,
    };
  });
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (status) u.set("status", status);
    if (review) u.set("review", "1");
    if (category) u.set("category", category);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };
  const field = "h-10 border border-line bg-ivory px-3 text-sm focus:border-wine focus:outline-none";

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-5xl">Products</h1>
        <div className="flex gap-3">
          {/* Route handler download, not a page: a plain anchor is intended. */}
          <a href="/admin/products/export" download className="inline-flex h-11 items-center border border-line px-5 text-xs uppercase tracking-[0.14em] hover:border-wine">Export CSV</a>
          <Link href="/admin/products/new" className="inline-flex h-11 items-center bg-wine px-6 text-xs font-medium uppercase tracking-[0.16em] text-ivory hover:bg-wine-deep">Add product</Link>
        </div>
      </div>

      <form className="my-6 flex flex-wrap items-center gap-3" role="search">
        <input name="q" defaultValue={q} placeholder="Search name or reference" aria-label="Search products" className={`${field} w-56`} />
        <select name="status" defaultValue={status ?? ""} aria-label="Status" className={field}>
          <option value="">Active (draft + published)</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select name="category" defaultValue={category ?? ""} aria-label="Category" className={field}>
          <option value="">All categories</option>
          {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="review" value="1" defaultChecked={review} className="h-4 w-4 accent-wine" /> Needs review</label>
        <button type="submit" className="h-10 border border-wine px-4 text-xs uppercase tracking-[0.14em] text-wine hover:bg-wine hover:text-ivory">Filter</button>
        {(q || status || review || category) ? <Link href="/admin/products" className="text-sm text-muted underline">Clear</Link> : null}
      </form>

      {error ? (
        <p role="alert" className="border border-warn p-4 text-sm text-warn">Couldn&apos;t load products. Please refresh.</p>
      ) : rows.length === 0 ? (
        <div className="border border-line bg-cream p-12 text-center">
          <p className="font-serif text-3xl">No products here yet</p>
          <p className="mt-2 text-muted">Add one by hand, or import photos in bulk.</p>
        </div>
      ) : (
        <ProductsTable rows={rows} categories={categories ?? []} />
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-6 text-sm">
          {page > 1 ? <Link href={href(page - 1)} className="border-b border-wine text-wine">Previous</Link> : <span className="text-muted/50">Previous</span>}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={href(page + 1)} className="border-b border-wine text-wine">Next</Link> : <span className="text-muted/50">Next</span>}
        </nav>
      ) : null}
    </div>
  );
}
