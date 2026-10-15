"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { saveProduct } from "@/app/admin/actions";
import { productSchema, type ProductInput, type ProductParsed } from "@/lib/validation";
import { AVAILABILITY_LABEL } from "@/lib/labels";
import { UNIT_LABEL } from "@/lib/money";
import type { AvailabilityStatus, PricingUnit } from "@/lib/types";

const inp = "h-11 w-full border border-line bg-ivory px-3 text-base focus:border-wine focus:outline-none aria-[invalid=true]:border-warn";
const lbl = "eyebrow mb-1.5 block";

export function ProductForm({
  id,
  defaults,
  categories,
}: {
  id: string | null;
  defaults: ProductInput;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const form = useForm<ProductInput, unknown, ProductParsed>({
    resolver: zodResolver(productSchema),
    defaultValues: defaults,
  });
  const { register, control, handleSubmit, setError, formState: { errors } } = form;
  const variants = useFieldArray({ control, name: "variants" });
  const status = useWatch({ control, name: "publication_status" });

  const submit = handleSubmit(
    async () => {
      setSaving(true);
      const r = await saveProduct(id, form.getValues());
      setSaving(false);
      if (!r.ok) {
        toast.error(r.error);
        for (const [k, m] of Object.entries(r.fieldErrors ?? {})) setError(k as never, { message: m });
        return;
      }
      toast.success("Saved.");
      if (!id) router.replace(`/admin/products/${r.id}`);
      else router.refresh();
    },
    () => toast.error("Please fix the highlighted fields."),
  );

  const err = (k: string) => (errors as Record<string, { message?: string } | undefined>)[k]?.message;
  const fieldErr = (k: string) => (err(k) ? <p role="alert" className="mt-1 text-sm text-warn">{err(k)}</p> : null);

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      <section className="space-y-5 border border-line p-5" aria-labelledby="basics">
        <h2 id="basics" className="text-3xl">Details</h2>
        <div>
          <label htmlFor="name" className={lbl}>Name</label>
          <input id="name" {...register("name")} aria-invalid={!!err("name")} className={inp} placeholder="e.g. the name customers will see" />
          {fieldErr("name")}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="sku" className={lbl}>Reference / SKU</label>
            <input id="sku" {...register("sku")} aria-invalid={!!err("sku")} className={inp} />
            {fieldErr("sku")}
          </div>
          <div>
            <label htmlFor="category_id" className={lbl}>Category</label>
            <select id="category_id" {...register("category_id")} className={inp}>
              <option value="">No category yet</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="slug" className={lbl}>Web address (slug)</label>
          <input id="slug" {...register("slug")} aria-invalid={!!err("slug")} className={inp} placeholder="Leave blank to create from the name" />
          {fieldErr("slug")}
        </div>
        <div>
          <label htmlFor="short_description" className={lbl}>Short description</label>
          <input id="short_description" {...register("short_description")} aria-invalid={!!err("short_description")} className={inp} />
          {fieldErr("short_description")}
        </div>
        <div>
          <label htmlFor="description" className={lbl}>Full description</label>
          <textarea id="description" rows={5} {...register("description")} className={`${inp} h-auto py-2`} />
          {fieldErr("description")}
        </div>
      </section>

      <section className="space-y-5 border border-line p-5" aria-labelledby="pricing">
        <h2 id="pricing" className="text-3xl">Price &amp; availability</h2>
        <p className="text-sm text-muted">Leave the price empty if you don&apos;t know it. Customers will see &ldquo;Enquire for price&rdquo;.</p>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="priceNaira" className={lbl}>Price (₦)</label>
            <input id="priceNaira" inputMode="decimal" {...register("priceNaira")} aria-invalid={!!err("priceNaira")} className={inp} placeholder="e.g. 25000" />
            {fieldErr("priceNaira")}
          </div>
          <div>
            <label htmlFor="pricing_unit" className={lbl}>Sold per</label>
            <select id="pricing_unit" {...register("pricing_unit")} className={inp}>
              <option value="">Not set</option>
              {(Object.keys(UNIT_LABEL) as PricingUnit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="min_order_qty" className={lbl}>Minimum order</label>
            <input id="min_order_qty" inputMode="decimal" {...register("min_order_qty")} aria-invalid={!!err("min_order_qty")} className={inp} />
            {fieldErr("min_order_qty")}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="availability" className={lbl}>Availability</label>
            <select id="availability" {...register("availability")} className={inp}>
              {(Object.keys(AVAILABILITY_LABEL) as AvailabilityStatus[]).map((a) => <option key={a} value={a}>{AVAILABILITY_LABEL[a]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="stock_quantity" className={lbl}>Stock quantity (private, optional)</label>
            <input id="stock_quantity" inputMode="numeric" {...register("stock_quantity")} aria-invalid={!!err("stock_quantity")} className={inp} />
            {fieldErr("stock_quantity")}
          </div>
        </div>
      </section>

      <section className="space-y-4 border border-line p-5" aria-labelledby="options">
        <h2 id="options" className="text-3xl">Colours &amp; options</h2>
        <p className="text-sm text-muted">Optional. Customers pick one before ordering. Leave the price blank to use the main price.</p>
        <ul className="space-y-3">
          {variants.fields.map((f, i) => (
            <li key={f.id} className="grid grid-cols-[1fr_auto] gap-3 border border-line p-3 sm:grid-cols-[7rem_1fr_7rem_9rem_auto]">
              <select aria-label="Option type" {...register(`variants.${i}.kind` as const)} className={inp}>
                <option value="colour">Colour</option><option value="size">Size</option><option value="other">Other</option>
              </select>
              <input aria-label="Option name" placeholder="e.g. Wine" {...register(`variants.${i}.label` as const)} className={inp} />
              <input aria-label="Option price (₦), optional" inputMode="decimal" placeholder="Price ₦" {...register(`variants.${i}.priceNaira` as const)} className={inp} />
              <select aria-label="Option availability" {...register(`variants.${i}.availability` as const)} className={inp}>
                <option value="">Same as product</option>
                {(Object.keys(AVAILABILITY_LABEL) as AvailabilityStatus[]).map((a) => <option key={a} value={a}>{AVAILABILITY_LABEL[a]}</option>)}
              </select>
              <button type="button" onClick={() => variants.remove(i)} aria-label={`Remove option ${i + 1}`} className="inline-flex h-11 w-11 items-center justify-center border border-line hover:border-warn"><X className="h-4 w-4" aria-hidden /></button>
              {(errors.variants as unknown as { message?: string }[] | undefined)?.[i]?.message ? <p role="alert" className="col-span-full text-sm text-warn">{(errors.variants as unknown as { message?: string }[])[i].message}</p> : null}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => variants.append({ kind: "colour", label: "", priceNaira: "", availability: "" } as never)} className="inline-flex h-10 items-center gap-2 border border-wine px-4 text-xs uppercase tracking-[0.14em] text-wine hover:bg-wine hover:text-ivory">
          <Plus className="h-4 w-4" aria-hidden /> Add option
        </button>
      </section>

      <section className="space-y-5 border border-line p-5" aria-labelledby="publish">
        <h2 id="publish" className="text-3xl">Publishing</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="publication_status" className={lbl}>Status</label>
            <select id="publication_status" {...register("publication_status")} className={inp}>
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published (visible in shop)</option>
              <option value="archived">Archived (hidden, kept for history)</option>
            </select>
            {status === "published" ? <p className="mt-1 text-sm text-muted">Needs a name, at least one photo, and “needs review” unticked.</p> : null}
          </div>
          <div className="space-y-1 self-end">
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" {...register("featured")} className="h-4 w-4 accent-wine" /> Featured on the homepage</label>
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" {...register("needs_review")} className="h-4 w-4 accent-wine" /> Needs review (details not yet confirmed)</label>
            {fieldErr("needs_review")}
          </div>
        </div>
        <div>
          <label htmlFor="instagram_url" className={lbl}>Original Instagram post (optional)</label>
          <input id="instagram_url" {...register("instagram_url")} aria-invalid={!!err("instagram_url")} className={inp} placeholder="https://www.instagram.com/p/…" />
          {fieldErr("instagram_url")}
        </div>
        <div>
          <label htmlFor="internal_notes" className={lbl}>Private notes (never shown to customers)</label>
          <textarea id="internal_notes" rows={3} {...register("internal_notes")} className={`${inp} h-auto py-2`} />
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap items-center gap-4 border-t border-line bg-ivory/95 px-5 py-4 lg:-mx-10 lg:px-10">
        <button type="submit" disabled={saving} className="h-12 bg-wine px-8 text-xs font-medium uppercase tracking-[0.18em] text-ivory hover:bg-wine-deep disabled:opacity-60">
          {saving ? "Saving…" : id ? "Save changes" : "Save as draft"}
        </button>
        {!id ? <span className="text-sm text-muted">You can add photos right after the first save.</span> : null}
      </div>
    </form>
  );
}
