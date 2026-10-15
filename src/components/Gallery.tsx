"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImage } from "./ProductImage";
import type { ProductImage as Img } from "@/lib/types";

export function Gallery({ images, name }: { images: Img[]; name: string }) {
  const [i, setI] = useState(0);
  const count = images.length;
  const current = images[i];
  const go = (d: number) => setI((v) => (v + d + count) % count);

  return (
    <div
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-cream">
        <ProductImage
          path={current?.storage_path}
          alt={current?.alt_text || `${name}${count > 1 ? `, photo ${i + 1} of ${count}` : ""}`}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />
        {count > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-ivory/90 hover:bg-ivory">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-ivory/90 hover:bg-ivory">
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <ul className="mt-3 grid grid-cols-5 gap-2" aria-label="Product photos">
          {images.map((img, idx) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setI(idx)}
                aria-label={`Show photo ${idx + 1}`}
                aria-current={idx === i}
                className={`relative block aspect-square w-full overflow-hidden border ${idx === i ? "border-wine" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                <ProductImage path={img.storage_path} alt="" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
