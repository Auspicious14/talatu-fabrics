import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/Gallery";
import { OrderPanel } from "@/components/OrderPanel";
import { ProductCard } from "@/components/ProductCard";
import { getProductBySlug, getRelated, getSettings } from "@/lib/data/catalogue";
import { siteUrl } from "@/lib/env";
import { productImageUrl } from "@/lib/supabase/public";

export const revalidate = 60;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Fabric not found" };
  const title = p.name ?? "Fabric";
  const description = p.short_description ?? `Enquire about ${title} from Talatu Fabrics on WhatsApp.`;
  const image = p.images[0] ? productImageUrl(p.images[0].storage_path) : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/shop/${slug}` },
    openGraph: { title, description, url: `/shop/${slug}`, type: "website", images: image ? [{ url: image }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [settings, related] = await Promise.all([getSettings(), getRelated(product, 4)]);
  const name = product.name ?? "Fabric";
  const url = `${siteUrl()}/shop/${slug}`;

  // Structured data only with accurate, known fields.
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.description || product.short_description ? { description: product.description ?? product.short_description } : {}),
    ...(product.images.length ? { image: product.images.map((i) => productImageUrl(i.storage_path)) } : {}),
    url,
  };
  if (product.price_kobo !== null && product.availability !== "unconfirmed") {
    jsonLd.offers = {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: (product.price_kobo / 100).toFixed(2),
      availability:
        product.availability === "sold_out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url,
    };
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href="/shop" className="hover:text-wine">Shop</Link>
        {product.category ? (
          <>
            <span aria-hidden> / </span>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-wine">{product.category.name}</Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Gallery images={product.images} name={name} />
        <div>
          {product.category ? <p className="eyebrow mb-3">{product.category.name}</p> : null}
          <h1 className="text-4xl sm:text-5xl">{name}</h1>
          {product.sku ? <p className="mt-2 text-sm text-muted">Reference: {product.sku}</p> : null}
          <div className="hairline my-6" />
          <OrderPanel
            name={name}
            sku={product.sku}
            priceKobo={product.price_kobo}
            unit={product.pricing_unit}
            minQty={product.min_order_qty}
            availability={product.availability}
            variants={product.variants}
            productUrl={url}
            whatsappNumber={settings.whatsapp_number}
          />
          {product.short_description || product.description ? (
            <div className="mt-10 border-t border-line pt-8">
              <h2 className="eyebrow mb-3">Details</h2>
              {product.short_description ? <p className="mb-3 text-lg">{product.short_description}</p> : null}
              {product.description ? <p className="whitespace-pre-line text-muted">{product.description}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-24">
          <h2 className="mb-8 text-4xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
