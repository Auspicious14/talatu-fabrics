import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  href,
  hrefLabel = "View all",
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6">
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="text-4xl sm:text-5xl">{title}</h2>
      </div>
      {href ? (
        <Link href={href} className="shrink-0 border-b border-wine pb-0.5 text-sm text-wine hover:text-wine-deep">
          {hrefLabel}
        </Link>
      ) : null}
    </div>
  );
}
