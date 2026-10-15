import type { MetadataRoute } from "next";
import { getAllPublishedSlugs } from "@/lib/data/catalogue";
import { siteUrl } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await getAllPublishedSlugs();
  const fixed = ["", "/shop", "/about", "/contact", "/ordering-and-delivery", "/returns-and-exchanges"];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}` })),
    ...products.map((p) => ({ url: `${base}/shop/${p.slug}`, lastModified: p.updated_at })),
  ];
}
