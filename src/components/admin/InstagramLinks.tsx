"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { createImportBatch, retrieveInstagramItem, submitInstagramUrls } from "@/app/admin/import-actions";

export function InstagramLinks({ provider, downloads }: { provider: "none" | "meta_oembed"; downloads: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string[] | null>(null);
  const [batch, setBatch] = useState<string | null>(null);

  async function go() {
    setBusy(true); setReport(null);
    try {
      const b = await createImportBatch("instagram_public", "Public Instagram post links");
      if (!b.ok) return void toast.error(b.error);
      setBatch(b.id);
      const r = await submitInstagramUrls(b.id, text);
      if (!r.ok) return void toast.error(r.error);
      const lines = [`${r.created} post link${r.created === 1 ? "" : "s"} saved as reference-only drafts.`];
      if (r.alreadyKnown) lines.push(`${r.alreadyKnown} already known; skipped (no duplicates created).`);
      if (r.duplicatesInInput) lines.push(`${r.duplicatesInInput} repeated in your list; counted once.`);
      if (r.invalid.length) lines.push(`${r.invalid.length} not recognised as public post links: ${r.invalid.slice(0, 5).join(", ")}${r.invalid.length > 5 ? "…" : ""}`);
      if (r.truncated) lines.push("Only the first 100 links were used. Submit the rest in another batch.");
      let ok = 0, ref = 0, bad = 0;
      for (const id of r.itemIds) {
        const x = await retrieveInstagramItem(id);
        if (!x.ok) bad++; else if (x.status === "imported" || x.status === "ok") ok++; else if (x.status === "failed" || x.status === "unavailable") bad++; else ref++;
      }
      if (r.itemIds.length) lines.push(`Retrieval: ${ok} imported, ${ref} kept as reference links only, ${bad} unavailable or failed.`);
      setReport(lines); setText("");
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-4 border border-line p-6" aria-labelledby="ig-h">
      <h2 id="ig-h" className="text-3xl">Public Instagram post links</h2>
      <p className="text-sm text-muted">
        Paste links to public posts (one per line). Each becomes a draft that keeps the post link. This does <strong>not</strong> log in, scrape, or scroll the profile, so it cannot find posts by itself and it does not claim to have found every post.
      </p>
      <p className="border border-line bg-cream p-3 text-sm">
        Retrieval provider: <strong>{provider === "meta_oembed" ? "Meta oEmbed (official, untested in this build)" : "None (links are saved as references)"}</strong>.
        Image downloads: <strong>{downloads ? "on" : "off"}</strong>. When off, or when an image can&apos;t be retrieved reliably, the original post link stays as the reference and no image is copied.
      </p>
      <label htmlFor="ig-urls" className="eyebrow block">Post links</label>
      <textarea id="ig-urls" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="https://www.instagram.com/p/…" className="w-full border border-line bg-ivory p-3 font-mono text-sm focus:border-wine focus:outline-none" />
      <button type="button" disabled={busy || !text.trim()} onClick={() => void go()} className="h-12 bg-wine px-7 text-xs font-medium uppercase tracking-[0.18em] text-ivory hover:bg-wine-deep disabled:opacity-50">{busy ? "Working…" : "Save links as drafts"}</button>
      {report ? (
        <div role="status" className="border border-line p-4 text-sm">
          <ul className="list-disc space-y-1 pl-5">{report.map((l) => <li key={l}>{l}</li>)}</ul>
          {batch ? <Link href={`/admin/import/${batch}`} className="mt-3 inline-block border-b border-wine text-wine">Open the batch report</Link> : null}
        </div>
      ) : null}
    </section>
  );
}
