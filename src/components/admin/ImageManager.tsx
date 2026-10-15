"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { deleteProductImage, reorderProductImages, updateImageAlt, uploadProductImage } from "@/app/admin/actions";
import type { ProductImage } from "@/lib/types";

const MAX = 8 * 1024 * 1024;

export function ImageManager({ productId, initial, productName }: { productId: string; initial: ProductImage[]; productName: string }) {
  const router = useRouter();
  const [images, setImages] = useState(initial);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = (p: string) => `${base}/storage/v1/object/public/product-images/${p}`;

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      setProgress(`Uploading ${i + 1} of ${list.length}…`);
      if (f.size > MAX) { toast.error(`${f.name}: must be 8 MB or smaller.`); continue; }
      const fd = new FormData();
      fd.set("file", f);
      const r = await uploadProductImage(productId, fd);
      if (r.ok) ok++;
      else toast.error(`${f.name}: ${r.error}`);
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    if (ok) toast.success(`${ok} photo${ok === 1 ? "" : "s"} added.`);
    router.refresh();
    // router.refresh re-renders the server page; sync local state from fresh props via key in parent.
  }

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[idx], next[j]] = [next[j], next[idx]];
    setImages(next);
    start(async () => {
      const r = await reorderProductImages(productId, next.map((i) => i.id));
      if (!r.ok) { toast.error(r.error); setImages(images); } else router.refresh();
    });
  };

  const remove = (img: ProductImage) => {
    if (!window.confirm("Remove this photo? This can't be undone.")) return;
    start(async () => {
      const r = await deleteProductImage(img.id);
      if (!r.ok) toast.error(r.error);
      else { setImages((s) => s.filter((x) => x.id !== img.id)); toast.success("Photo removed."); router.refresh(); }
    });
  };

  return (
    <section aria-labelledby="photos-h" className="border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="photos-h" className="text-3xl">Photos</h2>
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 border border-wine px-5 text-xs uppercase tracking-[0.14em] text-wine hover:bg-wine hover:text-ivory has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wine">
          <Upload className="h-4 w-4" aria-hidden /> Add photos
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} disabled={progress !== null} />
        </label>
      </div>
      <p className="mt-1 text-sm text-muted">The first photo is the main one. JPG, PNG, WebP or AVIF, up to 8 MB each. Use your original photos; don&apos;t colour-edit the fabric.</p>
      {progress ? <p role="status" className="mt-3 text-sm text-wine">{progress}</p> : null}
      {images.length === 0 ? (
        <p className="mt-6 border border-dashed border-line p-8 text-center text-muted">No photos yet.</p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {images.map((img, idx) => (
            <li key={img.id} className="flex gap-3 border border-line p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url(img.storage_path)} alt={img.alt_text || `${productName} photo ${idx + 1}`} className="h-28 w-24 shrink-0 object-cover" loading="lazy" />
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                <div>
                  <label htmlFor={`alt-${img.id}`} className="text-xs text-muted">Description (for accessibility)</label>
                  <input
                    id={`alt-${img.id}`}
                    defaultValue={img.alt_text ?? ""}
                    maxLength={300}
                    placeholder={idx === 0 ? "Main photo" : ""}
                    onBlur={async (e) => {
                      if (e.target.value.trim() === (img.alt_text ?? "")) return;
                      const r = await updateImageAlt(img.id, e.target.value);
                      if (!r.ok) toast.error(r.error);
                    }}
                    className="h-9 w-full border border-line bg-ivory px-2 text-sm focus:border-wine focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0 || pending} aria-label={`Move photo ${idx + 1} earlier`} className="inline-flex h-9 w-9 items-center justify-center border border-line disabled:opacity-40 hover:border-wine"><ArrowUp className="h-4 w-4" aria-hidden /></button>
                  <button type="button" onClick={() => move(idx, 1)} disabled={idx === images.length - 1 || pending} aria-label={`Move photo ${idx + 1} later`} className="inline-flex h-9 w-9 items-center justify-center border border-line disabled:opacity-40 hover:border-wine"><ArrowDown className="h-4 w-4" aria-hidden /></button>
                  <button type="button" onClick={() => remove(img)} disabled={pending} aria-label={`Remove photo ${idx + 1}`} className="ml-auto inline-flex h-9 w-9 items-center justify-center border border-line text-warn hover:border-warn"><Trash2 className="h-4 w-4" aria-hidden /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
