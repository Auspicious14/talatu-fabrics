"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/settings", label: "Site settings" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3">
      {ITEMS.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap px-3 py-2.5 text-sm ${active ? "bg-wine text-ivory" : "hover:bg-parchment"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
