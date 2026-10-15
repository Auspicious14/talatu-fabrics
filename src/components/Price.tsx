import { formatKobo, UNIT_LABEL } from "@/lib/money";
import type { PricingUnit } from "@/lib/types";

export function Price({
  kobo,
  unit,
  size = "md",
}: {
  kobo: number | null;
  unit: PricingUnit | null;
  size?: "md" | "lg";
}) {
  const formatted = formatKobo(kobo);
  const cls = size === "lg" ? "text-3xl" : "text-base";
  if (!formatted) {
    return <span className={`font-serif italic text-muted ${size === "lg" ? "text-2xl" : "text-base"}`}>Enquire for price</span>;
  }
  return (
    <span className={`${cls} font-medium tabular-nums`}>
      {formatted}
      {unit ? <span className="ml-1.5 text-sm font-normal text-muted">{UNIT_LABEL[unit]}</span> : null}
    </span>
  );
}
