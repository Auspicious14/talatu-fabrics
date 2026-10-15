export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8" aria-busy="true" aria-label="Loading fabrics">
      <div className="mb-10 h-14 w-64 animate-pulse bg-cream" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[4/5] animate-pulse bg-cream" />
            <div className="mt-3 h-5 w-3/4 animate-pulse bg-cream" />
            <div className="mt-2 h-4 w-1/3 animate-pulse bg-cream" />
          </div>
        ))}
      </div>
    </div>
  );
}
