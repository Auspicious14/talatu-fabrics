import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ProductForm } from "@/components/admin/ProductForm";
import { ImageManager } from "@/components/admin/ImageManager";
import { koboToNairaInput } from "@/lib/money";
import type { ProductImage, ProductVariant } from "@/lib/types";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: p }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*, images:product_images(*), variants:product_variants(*)").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id,name").order("sort_order"),
  ]);
  if (!p) notFound();
  const images = ([...(p.images ?? [])] as ProductImage[]).sort((a, b) => a.sort_order - b.sort_order);
  const variants = ([...(p.variants ?? [])] as ProductVariant[]).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-5xl">{p.name ?? "Untitled product"}</h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/admin/products/${id}/preview`} className="border-b border-wine text-wine">Preview</Link>
          {p.publication_status === "published" && p.slug ? <Link href={`/shop/${p.slug}`} target="_blank" className="border-b border-wine text-wine">View live page</Link> : null}
        </div>
      </div>
      {p.source_caption ? (
        <details className="mb-6 border border-line bg-cream p-4 text-sm">
          <summary className="cursor-pointer font-medium">Original Instagram caption (kept for reference)</summary>
          <p className="mt-3 whitespace-pre-line text-muted">{p.source_caption}</p>
        </details>
      ) : null}
      <div className="space-y-8">
        <ImageManager key={images.map((i) => i.id).join(",")} productId={id} initial={images} productName={p.name ?? "Product"} />
        <ProductForm
          key={p.updated_at}
          id={id}
          categories={categories ?? []}
          defaults={{
            name: p.name ?? "", sku: p.sku ?? "", slug: p.slug ?? "", category_id: p.category_id ?? "",
            short_description: p.short_description ?? "", description: p.description ?? "",
            priceNaira: koboToNairaInput(p.price_kobo), pricing_unit: p.pricing_unit ?? "",
            min_order_qty: p.min_order_qty === null ? "" : String(p.min_order_qty),
            stock_quantity: p.stock_quantity === null ? "" : String(p.stock_quantity),
            availability: p.availability, publication_status: p.publication_status,
            featured: p.featured, needs_review: p.needs_review,
            instagram_url: p.instagram_url ?? "", internal_notes: p.internal_notes ?? "",
            variants: variants.map((v) => ({ kind: v.kind, label: v.label, priceNaira: koboToNairaInput(v.price_kobo), availability: v.availability ?? "" })),
          } as never}
        />
      </div>
    </div>
  );
}
