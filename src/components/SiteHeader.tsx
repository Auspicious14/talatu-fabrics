import Link from "next/link";
import { Search } from "lucide-react";
import { MobileNav } from "./MobileNav";
import type { SiteSettings } from "@/lib/types";

export const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/ordering-and-delivery", label: "Ordering & delivery" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur-sm">
      {settings.announcement_enabled && settings.announcement_text ? (
        <div className="bg-wine px-4 py-2 text-center text-xs tracking-wide text-ivory">
          {settings.announcement_text}
        </div>
      ) : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 lg:px-8">
        <MobileNav links={NAV_LINKS} />
        <Link href="/" className="font-serif text-2xl tracking-tight text-wine sm:text-[1.7rem]">
          {settings.business_name}
        </Link>
        <nav aria-label="Primary" className="ml-10 hidden items-center gap-8 text-sm lg:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="relative py-1 hover:text-wine after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-wine after:transition-transform hover:after:scale-x-100">
              {l.label}
            </Link>
          ))}
        </nav>
        <form action="/shop" role="search" className="ml-auto flex items-center">
          <label htmlFor="header-search" className="sr-only">Search fabrics</label>
          <input
            id="header-search"
            name="q"
            type="search"
            placeholder="Search fabrics"
            className="hidden h-10 w-56 border-b border-line bg-transparent px-1 text-sm placeholder:text-muted focus:border-wine focus:outline-none sm:block"
          />
          <button type="submit" aria-label="Search" className="inline-flex h-11 w-11 items-center justify-center hover:text-wine">
            <Search className="h-5 w-5" aria-hidden />
          </button>
        </form>
        <Link
          href="/shop"
          className="hidden h-10 items-center bg-wine px-5 text-xs font-medium uppercase tracking-[0.16em] text-ivory transition-colors hover:bg-wine-deep sm:inline-flex"
        >
          Shop the collection
        </Link>
      </div>
    </header>
  );
}
