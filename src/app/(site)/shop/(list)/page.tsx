import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import {
  getCategories,
  getColourOptions,
  listProducts,
  type AvailabilityFilter,
  type SortKey,
} from "@/lib/data/catalogue";

export const metadata: Metadata = {
  title: "Shop all fabrics",
  description: "Browse the full Talatu Fabrics collection of lace and occasion fabrics.",
  alternates: { canonical: "/shop" },
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q)?.trim() || undefined;
  const category = one(sp.category) || undefined;
  const colour = one(sp.colour) || undefined;
  const minNaira = num(one(sp.min));
  const maxNaira = num(one(sp.max));
  const availability: AvailabilityFilter = one(sp.availability) === "in_stock" ? "in_stock" : "all";
  const sortRaw = one(sp.sort);
  const sort: SortKey = sortRaw === "price_asc" || sortRaw === "price_desc" ? sortRaw : "newest";
  const page = Math.max(1, Math.floor(num(one(sp.page)) ?? 1));

  const [result, categories, colours] = await Promise.all([
    listProducts({ q, category, colour, minNaira, maxNaira, availability, sort, page }),
    getCategories(),
    getColourOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const activeFilters = [q, category, colour, minNaira, maxNaira, availability === "in_stock" ? "x" : undefined].filter(
    (v) => v !== undefined,
  ).length;

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (colour) params.set("colour", colour);
    if (minNaira !== undefined) params.set("min", String(minNaira));
    if (maxNaira !== undefined) params.set("max", String(maxNaira));
    if (availability === "in_stock") params.set("availability", "in_stock");
    if (sort !== "newest") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  const field = "h-11 w-full border border-line bg-ivory px-3 text-sm focus:border-wine focus:outline-none";

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <header className="mb-8">
        <p className="eyebrow mb-2">The collection</p>
        <h1 className="text-5xl sm:text-6xl">{category ? (categories.find((c) => c.slug === category)?.name ?? "Shop") : "All fabrics"}</h1>
      </header>

      <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
        {/* Filters: plain GET form so it works without JS; a disclosure drawer on mobile. */}
        <aside>
          <details className="group border border-line lg:hidden" open={activeFilters > 0}>
            <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium">
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filter &amp; sort
                {activeFilters > 0 ? <span className="bg-wine px-1.5 text-xs text-ivory">{activeFilters}</span> : null}
              </span>
            </summary>
            <div className="border-t border-line p-4">
              <FilterForm />
            </div>
          </details>
          <div className="hidden lg:block">
            <FilterForm />
          </div>
        </aside>

        <section aria-live="polite">
          {!result.configured ? (
            <Notice title="The catalogue is not connected yet" body="Once the database is configured, fabrics will appear here." />
          ) : result.error ? (
            <Notice
              title="We couldn't load the fabrics"
              body="Please check your connection and try again."
              action={<Link href={pageHref(page)} className="border-b border-wine text-wine">Try again</Link>}
            />
          ) : result.products.length === 0 ? (
            <Notice
              title={activeFilters > 0 ? "No fabrics match those filters" : "New fabrics are on their way"}
              body={activeFilters > 0 ? "Try removing a filter or searching for something else." : "Check back soon, or message us on WhatsApp to ask what's available."}
              action={activeFilters > 0 ? <Link href="/shop" className="border-b border-wine text-wine">Clear all filters</Link> : null}
            />
          ) : (
            <>
              <p className="mb-6 text-sm text-muted">
                Showing {(page - 1) * result.pageSize + 1}–{(page - 1) * result.pageSize + result.products.length} of {result.total}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6">
                {result.products.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 2} />
                ))}
              </div>
              {totalPages > 1 ? (
                <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-6 text-sm">
                  {page > 1 ? <Link href={pageHref(page - 1)} className="border-b border-wine text-wine" rel="prev">Previous</Link> : <span className="text-muted/50">Previous</span>}
                  <span className="text-muted">Page {page} of {totalPages}</span>
                  {page < totalPages ? <Link href={pageHref(page + 1)} className="border-b border-wine text-wine" rel="next">Next</Link> : <span className="text-muted/50">Next</span>}
                </nav>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );

  function FilterForm() {
    return (
      <form action="/shop" method="get" className="space-y-5">
        <div>
          <label htmlFor="f-q" className="eyebrow mb-2 block">Search</label>
          <input id="f-q" name="q" type="search" defaultValue={q} placeholder="Name or reference" className={field} />
        </div>
        {categories.length > 0 ? (
          <div>
            <label htmlFor="f-cat" className="eyebrow mb-2 block">Category</label>
            <select id="f-cat" name="category" defaultValue={category ?? ""} className={field}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
        ) : null}
        {colours.length > 0 ? (
          <div>
            <label htmlFor="f-colour" className="eyebrow mb-2 block">Colour</label>
            <select id="f-colour" name="colour" defaultValue={colour ?? ""} className={field}>
              <option value="">Any colour</option>
              {colours.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ) : null}
        <fieldset>
          <legend className="eyebrow mb-2">Price (₦)</legend>
          <div className="flex items-center gap-2">
            <input name="min" type="number" min={0} inputMode="numeric" defaultValue={minNaira} placeholder="Min" aria-label="Minimum price in naira" className={field} />
            <span aria-hidden className="text-muted">–</span>
            <input name="max" type="number" min={0} inputMode="numeric" defaultValue={maxNaira} placeholder="Max" aria-label="Maximum price in naira" className={field} />
          </div>
        </fieldset>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="availability" value="in_stock" defaultChecked={availability === "in_stock"} className="h-4 w-4 accent-wine" />
          Hide sold-out fabrics
        </label>
        <div>
          <label htmlFor="f-sort" className="eyebrow mb-2 block">Sort by</label>
          <select id="f-sort" name="sort" defaultValue={sort} className={field}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" className="h-11 flex-1 bg-wine px-5 text-xs font-medium uppercase tracking-[0.16em] text-ivory hover:bg-wine-deep">
            Apply
          </button>
          {activeFilters > 0 ? <Link href="/shop" className="text-sm text-muted underline">Clear</Link> : null}
        </div>
      </form>
    );
  }
}

function Notice({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="border border-line bg-cream px-6 py-16 text-center">
      <h2 className="font-serif text-3xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-muted">{body}</p>
      {action ? <div className="mt-6 text-sm">{action}</div> : null}
    </div>
  );
}
