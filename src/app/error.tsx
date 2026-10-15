"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 text-center">
      <p className="eyebrow mb-3">Something went wrong</p>
      <h1 className="text-5xl">We hit a snag</h1>
      <p className="mt-4 text-muted">Please try again. If it keeps happening, message us on WhatsApp.</p>
      <button type="button" onClick={reset} className="mt-8 inline-flex h-12 items-center bg-wine px-7 text-xs font-medium uppercase tracking-[0.18em] text-ivory hover:bg-wine-deep">
        Try again
      </button>
    </div>
  );
}
