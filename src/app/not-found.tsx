import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 text-center">
      <p className="eyebrow mb-3">404</p>
      <h1 className="text-5xl">We couldn&apos;t find that page</h1>
      <p className="mt-4 text-muted">The fabric or page you are looking for may have moved or is no longer available.</p>
      <Link href="/shop" className="mt-8 inline-flex h-12 items-center bg-wine px-7 text-xs font-medium uppercase tracking-[0.18em] text-ivory hover:bg-wine-deep">
        Browse the collection
      </Link>
    </div>
  );
}
