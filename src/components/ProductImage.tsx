"use client";

import Image from "next/image";
import { useState } from "react";
import { productImageUrl } from "@/lib/supabase/public";

interface Props {
  path: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** Fills its (relatively positioned) parent. Falls back to an honest "no photo" tile. */
export function ProductImage({ path, alt, sizes, priority = false, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  if (!path || failed) {
    return (
      <div
        role="img"
        aria-label={path ? `${alt} (image unavailable)` : `${alt} (photo coming soon)`}
        className={`no-photo absolute inset-0 flex items-end p-3 ${className}`}
      >
        <span className="eyebrow !text-muted">{path ? "Image unavailable" : "Photo coming soon"}</span>
      </div>
    );
  }
  return (
    <Image
      src={productImageUrl(path)}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
