"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
        className="-ml-2 inline-flex h-11 w-11 items-center justify-center"
      >
        <Menu className="h-6 w-6" aria-hidden />
      </button>
      {open
        ? createPortal(
            <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 bg-ivory">
              <div className="flex h-16 items-center justify-between px-5">
                <Image src="/brand/wordmark.png" alt="Talatu Fabrics" width={733} height={94} className="h-6 w-auto" />
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="-mr-2 inline-flex h-11 w-11 items-center justify-center"
                >
                  <X className="h-6 w-6" aria-hidden />
                </button>
              </div>
              <nav className="px-5 pt-6">
                <ul className="divide-y divide-line border-y border-line">
                  {links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="block py-4 font-serif text-3xl hover:text-wine"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
