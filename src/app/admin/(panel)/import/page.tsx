import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ImportWizard } from "@/components/admin/ImportWizard";
import { InstagramLinks } from "@/components/admin/InstagramLinks";
import { activeProvider, downloadsAllowed } from "@/lib/import/provider";

export const metadata = { title: "Import" };

export default async function ImportPage() {
  const { supabase } = await requireAdmin();
  const { data: batches } = await supabase.from("import_batches").select("id,label,source,created_at,summary").order("created_at", { ascending: false }).limit(10);
  return (
    <div className="max-w-6xl space-y-12">
      <header>
        <h1 className="text-5xl">Import catalogue</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Bring existing product photos in as <strong>drafts</strong> to review and publish. Preferred sources: the owner&apos;s own photos, or her Instagram data export (Settings → Accounts Centre → Your information and permissions → Download your information).
        </p>
      </header>
      <ImportWizard />
      <InstagramLinks provider={activeProvider()} downloads={downloadsAllowed()} />
      {batches?.length ? (
        <section>
          <h2 className="mb-4 text-3xl">Recent imports</h2>
          <ul className="divide-y divide-line border border-line">
            {batches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <span>{b.label ?? "Untitled batch"} <span className="text-muted">· {b.source} · {new Date(b.created_at).toLocaleString("en-NG")}</span></span>
                <Link href={`/admin/import/${b.id}`} className="border-b border-wine text-wine">View report</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
