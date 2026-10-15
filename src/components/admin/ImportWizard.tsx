"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { FileUp, RotateCcw } from "lucide-react";
import { createImportBatch, finishImportBatch } from "@/app/admin/import-actions";
import { matchKey, suggestNameFromFilename } from "@/lib/import/filenames";
import { matchRowsToFiles, parseMetadataCsv, type CsvRow } from "@/lib/import/csv";

const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i;
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 1000;
const MAX_ZIP_BYTES = 300 * 1024 * 1024;

interface Entry {
  key: string;
  name: string;
  file: File;
  hash: string;
  thumb: string;
  csv: CsvRow | null;
  suggested: string | null;
  group: string | null;
  skip: string | null; // reason this file will not be uploaded
  dupInSelection: boolean;
  status: "ready" | "uploading" | "imported" | "duplicate" | "failed";
  message?: string;
  productId?: string | null;
}

async function sha256(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ImportWizard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [csvName, setCsvName] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [unmatched, setUnmatched] = useState<{ line: number; filename: string }[]>([]);
  const [csvFatal, setCsvFatal] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [running, setRunning] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const abort = useRef(false);

  const applyCsv = useCallback((list: Entry[], text: string | null) => {
    if (!text) { setUnmatched([]); setCsvFatal(null); return list.map((e) => ({ ...e, csv: null, group: null })); }
    const { rows, fatal } = parseMetadataCsv(text);
    setCsvFatal(fatal);
    if (fatal) return list;
    const { byFile, unmatched: um } = matchRowsToFiles(rows, list.map((e) => e.name));
    setUnmatched(um);
    return list.map((e) => {
      const row = byFile.get(matchKey(e.name)) ?? null;
      return { ...e, csv: row, group: row && row.filenames.length > 1 ? `csv-line-${row.line}` : null };
    });
  }, []);

  async function addFiles(files: FileList | File[]) {
    setReading(true);
    const problems: string[] = [];
    try {
      const incoming: { name: string; file: File }[] = [];
      for (const f of Array.from(files)) {
        if (/\.zip$/i.test(f.name)) {
          if (f.size > MAX_ZIP_BYTES) { problems.push(`${f.name}: ZIP is larger than 300 MB. Split it into smaller ZIPs.`); continue; }
          try {
            const zip = await JSZip.loadAsync(f);
            const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir && !n.startsWith("__MACOSX/") && !/(^|\/)\._/.test(n));
            for (const n of names) {
              if (n.includes("..")) { problems.push(`${n}: skipped (unsafe path).`); continue; }
              if (/\.csv$/i.test(n) && !csvText) { const t = await zip.files[n].async("string"); setCsvText(t); setCsvName(n); continue; }
              if (!IMAGE_RE.test(n)) { problems.push(`${n}: skipped (not a JPG, PNG, WebP or AVIF image).`); continue; }
              const blob = await zip.files[n].async("blob");
              incoming.push({ name: n.split("/").pop()!, file: new File([blob], n.split("/").pop()!, { type: blob.type || "image/jpeg" }) });
              if (incoming.length > MAX_FILES) break;
            }
          } catch { problems.push(`${f.name}: couldn't open this ZIP.`); }
        } else if (/\.csv$/i.test(f.name)) {
          setCsvText(await f.text()); setCsvName(f.name);
        } else if (IMAGE_RE.test(f.name)) {
          incoming.push({ name: f.name, file: f });
        } else problems.push(`${f.name}: skipped (unsupported file type).`);
      }

      const next: Entry[] = [...entries];
      const seen = new Map(next.map((e) => [e.hash, e.name]));
      for (const { name, file } of incoming) {
        if (next.length >= MAX_FILES) { problems.push(`Stopped at ${MAX_FILES} images. Import these first, then add the rest in another batch.`); break; }
        const hash = await sha256(await file.arrayBuffer());
        const dup = seen.has(hash);
        seen.set(hash, seen.get(hash) ?? name);
        next.push({
          key: `${hash}-${next.length}`, name, file, hash, thumb: URL.createObjectURL(file), csv: null,
          suggested: suggestNameFromFilename(name), group: null,
          skip: file.size > MAX_BYTES ? "Larger than 8 MB: resize it and add it again." : dup ? `Same file as “${seen.get(hash)}” in this selection.` : null,
          dupInSelection: dup, status: "ready",
        });
      }
      setEntries(applyCsv(next, csvText));
    } finally {
      setNotes((n) => [...n, ...problems]);
      setReading(false);
    }
  }

  async function onCsv(f: File | null | undefined) {
    if (!f) return;
    const t = await f.text();
    setCsvText(t); setCsvName(f.name);
    setEntries((list) => applyCsv(list, t));
  }

  const csvRows = useMemo(() => (csvText ? parseMetadataCsv(csvText).rows : []), [csvText]);
  const counts = useMemo(() => ({
    total: entries.length,
    ready: entries.filter((e) => !e.skip && e.status === "ready").length,
    skipped: entries.filter((e) => e.skip).length,
    imported: entries.filter((e) => e.status === "imported").length,
    duplicates: entries.filter((e) => e.status === "duplicate").length,
    failed: entries.filter((e) => e.status === "failed").length,
  }), [entries]);

  const update = (key: string, patch: Partial<Entry>) => setEntries((l) => l.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  async function run(retryFailedOnly = false) {
    let id = batchId;
    if (!id) {
      const r = await createImportBatch(entries.some((e) => /\.zip$/i.test(e.name)) ? "zip" : "upload", label || (csvName ?? "Photo import"));
      if (!r.ok) return void toast.error(r.error);
      id = r.id; setBatchId(id);
    }
    setRunning(true); abort.current = false;
    const queue = entries.filter((e) => !e.skip && (retryFailedOnly ? e.status === "failed" : e.status === "ready" || e.status === "failed"));
    // Files belonging to the same CSV row must run in order so they land on ONE product.
    for (const e of queue) {
      if (abort.current) break;
      update(e.key, { status: "uploading", message: undefined });
      const fd = new FormData();
      fd.set("file", e.file, e.name);
      fd.set("meta", JSON.stringify({
        batchId: id, filename: e.name, sourceHash: e.hash, groupKey: e.group,
        caption: e.csv?.caption ?? null,
        csv: e.csv ? { name: e.csv.name, sku: e.csv.sku, priceKobo: e.csv.priceKobo, pricingUnit: e.csv.pricingUnit, category: e.csv.category, description: e.csv.description, availability: e.csv.availability, colours: e.csv.colours, instagramUrl: e.csv.instagramUrl, line: e.csv.line, warnings: e.csv.errors } : null,
      }));
      try {
        const res = await fetch("/api/admin/import/item", { method: "POST", body: fd });
        const j = (await res.json().catch(() => ({}))) as { status?: Entry["status"]; message?: string; error?: string; productId?: string | null };
        if (res.status === 401) { update(e.key, { status: "failed", message: "Your session expired. Sign in again, then retry." }); abort.current = true; break; }
        if (!res.ok && !j.status) update(e.key, { status: "failed", message: j.error ?? `Server error (${res.status}). You can retry.` });
        else update(e.key, { status: j.status ?? "failed", message: j.message ?? j.error, productId: j.productId });
      } catch {
        update(e.key, { status: "failed", message: "Network problem. You can retry; nothing will be duplicated." });
      }
    }
    setRunning(false);
    setEntries((cur) => {
      void finishImportBatch(id!, {
        files: cur.length, imported: cur.filter((e) => e.status === "imported").length, duplicates: cur.filter((e) => e.status === "duplicate").length,
        failed: cur.filter((e) => e.status === "failed").map((e) => ({ file: e.name, reason: e.message })),
        skipped: cur.filter((e) => e.skip).map((e) => ({ file: e.name, reason: e.skip })),
        csvRowsWithoutFile: unmatched, notes,
      });
      return cur;
    });
    toast.success(abort.current ? "Import stopped. Nothing is lost; you can resume." : "Import finished. Review the report below.");
  }

  const done = counts.imported + counts.duplicates + counts.failed;
  const pct = counts.total - counts.skipped > 0 ? Math.round((done / (counts.total - counts.skipped)) * 100) : 0;
  const btn = "inline-flex h-12 items-center justify-center gap-2 px-7 text-xs font-medium uppercase tracking-[0.18em]";

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-line bg-cream p-10 text-center hover:border-wine has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-wine"
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files); }}>
          <FileUp className="h-7 w-7 text-wine" aria-hidden />
          <span className="font-serif text-2xl">Add photos or a ZIP</span>
          <span className="text-sm text-muted">JPG, PNG, WebP, AVIF · up to 8 MB each · ZIP up to 300 MB</span>
          <input type="file" multiple accept=".zip,image/jpeg,image/png,image/webp,image/avif,.csv" className="sr-only" onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <div className="border border-line p-6">
          <h2 className="text-2xl">Optional: details CSV</h2>
          <p className="mt-1 text-sm text-muted">Match filenames to names, prices, categories and colours. <a className="underline" href="/talatu-import-template.csv" download>Download the template</a>.</p>
          <label className="mt-4 inline-flex h-10 cursor-pointer items-center border border-wine px-4 text-xs uppercase tracking-[0.14em] text-wine hover:bg-wine hover:text-ivory has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wine">
            Choose CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { void onCsv(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {csvName ? <p className="mt-3 text-sm">{csvName}: {csvRows.length} row{csvRows.length === 1 ? "" : "s"}</p> : null}
          {csvFatal ? <p role="alert" className="mt-2 text-sm text-warn">{csvFatal}</p> : null}
        </div>
      </section>

      {reading ? <p role="status" className="text-sm text-wine">Reading files…</p> : null}
      {notes.length ? (
        <details className="border border-line p-4 text-sm"><summary className="cursor-pointer font-medium">{notes.length} file note{notes.length === 1 ? "" : "s"}</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{notes.slice(0, 100).map((n, i) => <li key={i}>{n}</li>)}</ul>
        </details>
      ) : null}
      {unmatched.length ? (
        <div role="alert" className="border border-warn p-4 text-sm">
          <p className="font-medium text-warn">{unmatched.length} CSV row{unmatched.length === 1 ? "" : "s"} point to files you haven&apos;t added:</p>
          <ul className="mt-2 list-disc pl-5 text-muted">{unmatched.slice(0, 15).map((u) => <li key={`${u.line}-${u.filename}`}>line {u.line}: {u.filename}</li>)}</ul>
        </div>
      ) : null}

      {entries.length > 0 ? (
        <section aria-labelledby="preview-h" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="preview-h" className="text-3xl">Review before importing</h2>
              <p className="text-sm text-muted">
                {counts.total} photo{counts.total === 1 ? "" : "s"} · {counts.ready} ready · {counts.skipped} skipped
                {counts.imported ? ` · ${counts.imported} imported` : ""}{counts.duplicates ? ` · ${counts.duplicates} duplicate` : ""}{counts.failed ? ` · ${counts.failed} failed` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input aria-label="Batch name" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Batch name (optional)" disabled={!!batchId} className="h-12 border border-line bg-ivory px-3 text-sm" />
              {running ? (
                <button type="button" onClick={() => { abort.current = true; }} className={`${btn} border border-wine text-wine`}>Stop</button>
              ) : (
                <>
                  {counts.failed > 0 ? <button type="button" onClick={() => void run(true)} className={`${btn} border border-wine text-wine`}><RotateCcw className="h-4 w-4" aria-hidden /> Retry failed</button> : null}
                  <button type="button" disabled={counts.ready === 0} onClick={() => void run(false)} className={`${btn} bg-wine text-ivory hover:bg-wine-deep disabled:opacity-50`}>Import {counts.ready} as drafts</button>
                </>
              )}
            </div>
          </div>
          <p className="border border-line bg-cream p-3 text-sm">Everything imports as a <strong>draft</strong> marked “needs review”. Nothing is published, and no price, stock or availability is guessed.</p>
          {running || done > 0 ? (
            <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Import progress" className="h-2 w-full bg-parchment">
              <div className="h-full bg-wine transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {entries.map((e) => (
              <li key={e.key} className={`border p-2 text-xs ${e.status === "failed" ? "border-warn" : e.status === "imported" ? "border-ok" : "border-line"}`}>
                <div className="relative aspect-square overflow-hidden bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.thumb} alt="" className={`h-full w-full object-cover ${e.skip ? "opacity-40" : ""}`} loading="lazy" />
                </div>
                <p className="mt-2 truncate font-medium" title={e.name}>{e.name}</p>
                <p className="truncate text-muted">{e.csv?.name ?? e.suggested ?? "No name suggested"}</p>
                <p className={e.status === "failed" || e.skip ? "text-warn" : e.status === "imported" ? "text-ok" : "text-muted"}>
                  {e.skip ?? (e.status === "ready" ? (e.csv ? `CSV line ${e.csv.line}` : "Ready") : e.status === "uploading" ? "Uploading…" : e.status === "imported" ? "Imported as draft" : e.status === "duplicate" ? e.message ?? "Duplicate" : e.message ?? "Failed")}
                </p>
              </li>
            ))}
          </ul>
          {batchId ? <Link href={`/admin/import/${batchId}`} className="inline-block border-b border-wine text-wine">Open the batch report</Link> : null}
        </section>
      ) : null}
    </div>
  );
}
