import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Gallery } from "@/components/Gallery";
import { OrderPanel } from "@/components/OrderPanel";
import { siteUrl } from "@/lib/env";
import type { ProductImage, ProductVariant } from "@/lib/types";

export const metadata = { title: "Preview" };

/** Admin-only preview so drafts can be checked exactly as customers will see them. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: p }, { data: s }] = await Promise.all([
    supabase.from("products").select("*, category:categories(name), images:product_images(*), variants:product_variants(*)").eq("id", id).maybeSingle(),
    supabase.from("site_settings").select("value").eq("key", "whatsapp_number").maybeSingle(),
  ]);
  if (!p) notFound();
  const images = ([...(p.images ?? [])] as ProductImage[]).sort((a, b) => a.sort_order - b.sort_order);
  const variants = ([...(p.variants ?? [])] as ProductVariant[]).sort((a, b) => a.sort_order - b.sort_order);
  const name = p.name ?? "Untitled product";
  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between border border-wine bg-cream p-3 text-sm">
        <span>Preview ({p.publication_status}). Customers see this only when the product is published.</span>
        <Link href={`/admin/products/${id}`} className="border-b border-wine text-wine">Back to editing</Link>
      </div>
      <div className="grid gap-10 lg:grid-cols-2">
        <Gallery images={images} name={name} />
        <div>
          <h1 className="text-5xl">{name}</h1>
          {p.sku ? <p className="mt-2 text-sm text-muted">Reference: {p.sku}</p> : null}
          <div className="hairline my-6" />
          <OrderPanel
            name={name} sku={p.sku} priceKobo={p.price_kobo} unit={p.pricing_unit} minQty={p.min_order_qty}
            availability={p.availability} variants={variants}
            productUrl={`${siteUrl()}/shop/${p.slug ?? "preview"}`} whatsappNumber={(s?.value as string | null) ?? null}
          />
          {p.description ? <p className="mt-8 whitespace-pre-line text-muted">{p.description}</p> : null}
        </div>
      </div>
    </div>
  );
}
