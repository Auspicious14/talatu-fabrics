"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { bulkUpdateProducts, setPublication } from "@/app/admin/actions";
import { formatKobo } from "@/lib/money";
import { AVAILABILITY_LABEL } from "@/lib/labels";
import type { AvailabilityStatus, PublicationStatus } from "@/lib/types";

export interface Row {
  id: string;
  name: string | null;
  sku: string | null;
  price_kobo: number | null;
  availability: AvailabilityStatus;
  publication_status: PublicationStatus;
  needs_review: boolean;
  category_name: string | null;
  thumb: string | null;
}

const STATUS_TONE: Record<PublicationStatus, string> = {
  published: "bg-ok text-ivory",
  draft: "bg-parchment text-ink",
  archived: "bg-muted text-ivory",
};

export function ProductsTable({ rows, categories }: { rows: Row[]; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const sel = "h-10 border border-line bg-ivory px-2 text-sm";

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const run = (fn: () => Promise<{ ok: boolean; error?: string; updated?: number; skipped?: number }>, okMsg: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Something went wrong.");
      else {
        toast.success(r.skipped ? `${r.updated} updated, ${r.skipped} skipped (not ready to publish).` : okMsg);
        setSelected(new Set());
        router.refresh();
      }
    });

  const bulk = (patch: Parameters<typeof bulkUpdateProducts>[1], msg: string) =>
    run(() => bulkUpdateProducts([...selected], patch), msg);

  return (
    <div>
      {selected.size > 0 ? (
        <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-3 border border-wine bg-cream p-3" role="region" aria-label="Bulk actions">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <select aria-label="Assign category" className={sel} defaultValue="" disabled={pending}
            onChange={(e) => { if (e.target.value) { bulk({ category_id: e.target.value === "none" ? null : e.target.value }, "Category updated."); e.target.value = ""; } }}>
            <option value="">Set category…</option>
            <option value="none">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select aria-label="Set availability" className={sel} defaultValue="" disabled={pending}
            onChange={(e) => { if (e.target.value) { bulk({ availability: e.target.value }, "Availability updated."); e.target.value = ""; } }}>
            <option value="">Set availability…</option>
            {(Object.keys(AVAILABILITY_LABEL) as AvailabilityStatus[]).map((a) => <option key={a} value={a}>{AVAILABILITY_LABEL[a]}</option>)}
          </select>
          <button type="button" disabled={pending} onClick={() => bulk({ needs_review: false }, "Marked as reviewed.")} className={`${sel} hover:border-wine`}>Mark reviewed</button>
          <button type="button" disabled={pending} onClick={() => bulk({ publication_status: "published" }, "Published.")} className="h-10 bg-wine px-4 text-xs uppercase tracking-[0.14em] text-ivory hover:bg-wine-deep">Publish</button>
          <button type="button" disabled={pending} onClick={() => bulk({ publication_status: "draft" }, "Moved to draft.")} className={`${sel} hover:border-wine`}>Unpublish</button>
          <button type="button" disabled={pending} onClick={() => bulk({ publication_status: "archived" }, "Archived.")} className={`${sel} hover:border-wine`}>Archive</button>
        </div>
      ) : null}

      <div className="border border-line">
        <div className="flex items-center gap-3 border-b border-line bg-cream px-4 py-2.5 text-sm">
          <label className="flex min-h-9 items-center gap-3">
            <input type="checkbox" className="h-4 w-4 accent-wine" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} />
            Select all on this page
          </label>
        </div>
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
              <input type="checkbox" aria-label={`Select ${r.name ?? "untitled product"}`} className="h-4 w-4 accent-wine" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
              <div className="no-photo relative h-16 w-14 shrink-0 overflow-hidden bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.thumb ? <img src={r.thumb} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
              </div>
              <div className="min-w-0 flex-1 basis-48">
                <Link href={`/admin/products/${r.id}`} className="block truncate font-serif text-xl hover:text-wine">{r.name ?? "Untitled (needs a name)"}</Link>
                <p className="truncate text-xs text-muted">
                  {[r.sku, r.category_name, formatKobo(r.price_kobo) ?? "Price not set"].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2 py-1 uppercase tracking-wider ${STATUS_TONE[r.publication_status]}`}>{r.publication_status}</span>
                {r.needs_review ? <span className="border border-warn px-2 py-1 uppercase tracking-wider text-warn">Needs review</span> : null}
                <span className="text-muted">{AVAILABILITY_LABEL[r.availability]}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link href={`/admin/products/${r.id}`} className="border-b border-wine text-wine">Edit</Link>
                {r.publication_status === "published" ? (
                  <button type="button" disabled={pending} className="underline" onClick={() => run(() => setPublication(r.id, "draft"), "Unpublished.")}>Unpublish</button>
                ) : r.publication_status === "draft" ? (
                  <button type="button" disabled={pending} className="underline" onClick={() => run(() => setPublication(r.id, "published"), "Published.")}>Publish</button>
                ) : (
                  <button type="button" disabled={pending} className="underline" onClick={() => run(() => setPublication(r.id, "draft"), "Restored to draft.")}>Restore</button>
                )}
                {r.publication_status !== "archived" ? (
                  <button type="button" disabled={pending} className="text-muted underline" onClick={() => run(() => setPublication(r.id, "archived"), "Archived.")}>Archive</button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
