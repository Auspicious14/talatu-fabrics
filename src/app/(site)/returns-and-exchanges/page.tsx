import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { getSettings } from "@/lib/data/catalogue";

export const metadata: Metadata = { title: "Returns & exchanges", alternates: { canonical: "/returns-and-exchanges" } };

export default async function Page() {
  const s = await getSettings();
  return <InfoPage eyebrow="Customer care" title="Returns & exchanges" body={s.returns_text} settings={s} />;
}
