import Link from "next/link";
import { ProductImage } from "./ProductImage";
import { Price } from "./Price";
import { AVAILABILITY_LABEL } from "@/lib/labels";
import type { ProductWithRelations } from "@/lib/types";

export function ProductCard({ product, priority = false }: { product: ProductWithRelations; priority?: boolean }) {
  if (!product.slug) return null;
  const primary = product.images[0];
  const soldOut = product.availability === "sold_out";
  const name = product.name ?? "Fabric";
  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-cream">
        <ProductImage
          path={primary?.storage_path}
          alt={primary?.alt_text || name}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          className={`transition-transform duration-700 ease-boutique group-hover:scale-[1.03] ${soldOut ? "opacity-70" : ""}`}
        />
        {soldOut ? (
          <span className="absolute left-3 top-3 bg-ivory/95 px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted">
            Sold out
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="font-serif text-xl leading-tight group-hover:text-wine">{name}</h3>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <Price kobo={product.price_kobo} unit={product.pricing_unit} />
          {product.availability === "unconfirmed" ? (
            <span className="text-xs text-muted">{AVAILABILITY_LABEL.unconfirmed}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
