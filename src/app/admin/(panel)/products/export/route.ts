import { getAdminContext } from "@/lib/auth";
import { koboToNairaInput } from "@/lib/money";

export const dynamic = "force-dynamic";

/** Spreadsheet formula-injection guard + RFC 4180 quoting. */
function cell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });
  const { data, error } = await ctx.supabase
    .from("products")
    .select("sku,slug,name,short_description,description,price_kobo,pricing_unit,min_order_qty,stock_quantity,availability,publication_status,featured,needs_review,instagram_url,created_at,updated_at,category:categories(name),variants:product_variants(kind,label)")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return new Response("Export failed", { status: 500 });

  const header = ["sku", "slug", "name", "category", "short_description", "description", "price_ngn", "pricing_unit", "min_order_qty", "stock_quantity", "availability", "publication_status", "featured", "needs_review", "colours", "instagram_url", "created_at", "updated_at"];
  const lines = [header.join(",")];
  for (const p of data ?? []) {
    const cat = p.category as unknown as { name: string } | null;
    const colours = ((p.variants ?? []) as { kind: string; label: string }[]).filter((v) => v.kind === "colour").map((v) => v.label).join("|");
    lines.push(
      [p.sku, p.slug, p.name, cat?.name, p.short_description, p.description, koboToNairaInput(p.price_kobo), p.pricing_unit, p.min_order_qty, p.stock_quantity, p.availability, p.publication_status, p.featured, p.needs_review, colours, p.instagram_url, p.created_at, p.updated_at].map(cell).join(","),
    );
  }
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="talatu-products-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
