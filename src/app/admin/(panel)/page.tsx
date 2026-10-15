import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { normaliseWhatsappNumber } from "@/lib/whatsapp";
import { isPreviewMode } from "@/lib/env";

export const metadata = { title: "Overview" };

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [published, drafts, needsReview, archived, categories, settingsRes] = await Promise.all([
    count(supabase.from("products").select("id", { count: "exact", head: true }).eq("publication_status", "published")),
    count(supabase.from("products").select("id", { count: "exact", head: true }).eq("publication_status", "draft")),
    count(supabase.from("products").select("id", { count: "exact", head: true }).eq("needs_review", true).neq("publication_status", "archived")),
    count(supabase.from("products").select("id", { count: "exact", head: true }).eq("publication_status", "archived")),
    count(supabase.from("categories").select("id", { count: "exact", head: true })),
    supabase.from("site_settings").select("key,value"),
  ]);
  const settings = Object.fromEntries((settingsRes.data ?? []).map((r) => [r.key, r.value]));
  const waOk = Boolean(normaliseWhatsappNumber(settings.whatsapp_number as string | null));

  const warnings: { text: string; href: string; cta: string }[] = [];
  if (!waOk) warnings.push({ text: "No WhatsApp number is set. Customers cannot send enquiries until you add one.", href: "/admin/settings", cta: "Add WhatsApp number" });
  if (categories === 0) warnings.push({ text: "You haven't created any categories yet.", href: "/admin/categories", cta: "Create categories" });
  if (!settings.about_text || !settings.delivery_text || !settings.returns_text)
    warnings.push({ text: "About, delivery or returns text is still empty. Those pages show a 'being finalised' note until you write them.", href: "/admin/settings", cta: "Write page text" });
  if (needsReview > 0) warnings.push({ text: `${needsReview} product${needsReview === 1 ? "" : "s"} still need${needsReview === 1 ? "s" : ""} review before they can be published.`, href: "/admin/products?review=1", cta: "Review now" });
  if (isPreviewMode()) warnings.push({ text: "The site is in private preview (password-protected and hidden from search engines).", href: "/admin/settings", cta: "See going-live steps" });

  const stat = (label: string, value: number, href: string) => (
    <Link href={href} className="border border-line bg-cream p-5 hover:border-wine">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-serif text-5xl">{value}</p>
    </Link>
  );

  return (
    <div className="max-w-5xl">
      <h1 className="text-5xl">Overview</h1>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stat("Published", published, "/admin/products?status=published")}
        {stat("Drafts", drafts, "/admin/products?status=draft")}
        {stat("Needs review", needsReview, "/admin/products?review=1")}
        {stat("Archived", archived, "/admin/products?status=archived")}
      </div>
      {warnings.length ? (
        <section className="mt-10" aria-labelledby="todo">
          <h2 id="todo" className="mb-4 text-3xl">To do</h2>
          <ul className="space-y-3">
            {warnings.map((w) => (
              <li key={w.text} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-cream p-4">
                <span className="flex items-start gap-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />{w.text}</span>
                <Link href={w.href} className="border-b border-wine text-sm text-wine">{w.cta}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/admin/products/new" className="inline-flex h-12 items-center bg-wine px-7 text-xs font-medium uppercase tracking-[0.18em] text-ivory hover:bg-wine-deep">Add a product</Link>
        <Link href="/admin/import" className="inline-flex h-12 items-center border border-wine px-7 text-xs font-medium uppercase tracking-[0.18em] text-wine hover:bg-wine hover:text-ivory">Import photos</Link>
      </div>
    </div>
  );
}
