import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { getSettings } from "@/lib/data/catalogue";

export const metadata: Metadata = { title: "Ordering & delivery", alternates: { canonical: "/ordering-and-delivery" } };

export default async function Page() {
  const s = await getSettings();
  return (
    <InfoPage eyebrow="Customer care" title="Ordering & delivery" body={s.delivery_text} settings={s}>
      <p className="mt-8 text-sm text-muted">
        Orders are enquiry-based: choose a fabric, send your selection on WhatsApp, and we confirm availability, total price, delivery and payment with you.
      </p>
    </InfoPage>
  );
}
