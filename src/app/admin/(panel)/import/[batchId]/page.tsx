import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Import report" };

const LABEL: Record<string, string> = {
  imported: "Imported", pending: "Pending", preview_only: "Reference link only", duplicate: "Duplicate (skipped)", unavailable: "Unavailable", failed: "Failed",
};

export default async function BatchReport({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(batchId)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: batch }, { data: items }] = await Promise.all([
    supabase.from("import_batches").select("*").eq("id", batchId).maybeSingle(),
    supabase.from("import_items").select("id,filename,retrieval,error,source_url,product_id,metadata,products(name,needs_review,publication_status)").eq("batch_id", batchId).order("created_at").limit(2000),
  ]);
  if (!batch) notFound();
  const list = items ?? [];
  const by = (s: string) => list.filter((i) => i.retrieval === s).length;
  const problems = list.filter((i) => ["failed", "unavailable", "duplicate", "preview_only", "pending"].includes(i.retrieval));
  const sum = (batch.summary ?? {}) as { csvRowsWithoutFile?: { line: number; filename: string }[]; skipped?: { file: string; reason: string }[]; notes?: string[] };
  const complete = problems.length === 0 && !(sum.csvRowsWithoutFile?.length) && !(sum.skipped?.length);

  return (
    <div className="max-w-5xl">
      <Link href="/admin/import" className="text-sm text-muted underline">All imports</Link>
      <h1 className="mt-2 text-5xl">{batch.label ?? "Import report"}</h1>
      <p className="mt-1 text-sm text-muted">{new Date(batch.created_at).toLocaleString("en-NG")} · source: {batch.source}</p>

      <p role="status" className={`mt-6 border p-4 text-sm ${complete ? "border-ok" : "border-warn"}`}>
        {complete ? "Every item in this batch was imported." : "This import is incomplete. Items below need attention. Completeness against Instagram is not verified: only the files and links you supplied are counted."}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {(["imported", "duplicate", "preview_only", "unavailable", "failed"] as const).map((s) => (
          <div key={s} className="border border-line bg-cream p-4"><dt className="eyebrow">{LABEL[s]}</dt><dd className="mt-1 font-serif text-4xl">{by(s)}</dd></div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/admin/products?review=1&status=draft" className="inline-flex h-12 items-center bg-wine px-7 text-xs font-medium uppercase tracking-[0.18em] text-ivory hover:bg-wine-deep">Review the drafts</Link>
      </div>

      {problems.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-3xl">Needs attention</h2>
          <ul className="divide-y divide-line border border-line">
            {problems.map((i) => (
              <li key={i.id} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.filename ?? i.source_url}</p>
                  <p className="text-warn">{LABEL[i.retrieval]}{i.error ? `: ${i.error}` : ""}</p>
                  {i.source_url ? <a href={i.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-muted underline">Open original post</a> : null}
                </div>
                {i.product_id ? <Link href={`/admin/products/${i.product_id}`} className="shrink-0 border-b border-wine text-wine">Open draft</Link> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {sum.csvRowsWithoutFile?.length ? (
        <section className="mt-10"><h2 className="mb-3 text-3xl">CSV rows with no matching file</h2>
          <ul className="list-disc pl-5 text-sm text-muted">{sum.csvRowsWithoutFile.slice(0, 100).map((r) => <li key={`${r.line}-${r.filename}`}>line {r.line}: {r.filename}</li>)}</ul></section>
      ) : null}
      {sum.skipped?.length ? (
        <section className="mt-10"><h2 className="mb-3 text-3xl">Skipped files</h2>
          <ul className="list-disc pl-5 text-sm text-muted">{sum.skipped.slice(0, 100).map((r) => <li key={r.file}>{r.file}: {r.reason}</li>)}</ul></section>
      ) : null}
    </div>
  );
}
