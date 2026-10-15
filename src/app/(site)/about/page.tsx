import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { getSettings } from "@/lib/data/catalogue";

export const metadata: Metadata = { title: "About", alternates: { canonical: "/about" } };

export default async function AboutPage() {
  const s = await getSettings();
  return <InfoPage eyebrow="Our story" title={`About ${s.business_name}`} body={s.about_text} settings={s} />;
}
