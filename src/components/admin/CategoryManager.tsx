"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCategory, saveCategory } from "@/app/admin/actions";

interface Cat { id: string; name: string; description: string | null; is_public: boolean; slug: string; count: number }

export function CategoryManager({ initial }: { initial: Cat[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const inp = "h-11 border border-line bg-ivory px-3 focus:border-wine focus:outline-none";

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveCategory(null, { name, description: "", is_public: true });
      if (!r.ok) return void toast.error(r.error);
      setName(""); toast.success("Category added."); router.refresh();
    });
  };

  return (
    <div className="mt-8 space-y-8">
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 basis-56">
          <label htmlFor="cat-name" className="eyebrow mb-1.5 block">New category</label>
          <input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="e.g. Swiss voile" className={`${inp} w-full`} />
        </div>
        <button type="submit" disabled={pending || !name.trim()} className="h-11 bg-wine px-6 text-xs uppercase tracking-[0.16em] text-ivory hover:bg-wine-deep disabled:opacity-60">Add</button>
      </form>
      {initial.length === 0 ? (
        <p className="border border-dashed border-line p-8 text-center text-muted">No categories yet.</p>
      ) : (
        <ul className="divide-y divide-line border border-line">
          {initial.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <input
                aria-label={`Name of ${c.name}`}
                defaultValue={c.name}
                maxLength={80}
                className={`${inp} min-w-0 flex-1 basis-48`}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (!v || v === c.name) return;
                  start(async () => {
                    const r = await saveCategory(c.id, { name: v, description: c.description ?? "", is_public: c.is_public });
                    if (!r.ok) toast.error(r.error); else { toast.success("Saved."); router.refresh(); }
                  });
                }}
              />
              <span className="text-sm text-muted">{c.count} product{c.count === 1 ? "" : "s"}</span>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked={c.is_public} className="h-4 w-4 accent-wine"
                  onChange={(e) => start(async () => {
                    const r = await saveCategory(c.id, { name: c.name, description: c.description ?? "", is_public: e.target.checked });
                    if (!r.ok) toast.error(r.error); else router.refresh();
                  })} />
                Visible
              </label>
              <button type="button" disabled={pending} className="text-sm text-warn underline"
                onClick={() => {
                  if (!window.confirm(`Delete “${c.name}”? Its ${c.count} product(s) will become uncategorised, not deleted.`)) return;
                  start(async () => {
                    const r = await deleteCategory(c.id);
                    if (!r.ok) toast.error(r.error); else { toast.success("Category deleted."); router.refresh(); }
                  });
                }}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
