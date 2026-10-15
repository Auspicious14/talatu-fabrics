import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { getSettings } from "@/lib/data/catalogue";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const s = await getSettings();
  const wa = buildWhatsappUrl(s.whatsapp_number, "Hello Talatu Fabrics, I have a question.");
  const rows: { label: string; node: React.ReactNode }[] = [];
  if (wa) rows.push({ label: "WhatsApp", node: <a href={wa} target="_blank" rel="noopener noreferrer" className="border-b border-wine text-wine">Chat with us</a> });
  if (s.contact_phone) rows.push({ label: "Phone", node: <a href={`tel:${s.contact_phone.replace(/\s/g, "")}`}>{s.contact_phone}</a> });
  if (s.contact_email) rows.push({ label: "Email", node: <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a> });
  if (s.instagram_url) rows.push({ label: "Instagram", node: <a href={s.instagram_url} target="_blank" rel="noopener noreferrer" className="border-b border-wine text-wine">@talatufabrics</a> });
  if (s.business_address) rows.push({ label: "Address", node: <span>{s.business_address}</span> });

  return (
    <InfoPage eyebrow="Get in touch" title="Contact" body={rows.length ? "" : null} settings={s}>
      {rows.length ? (
        <dl className="mt-2 divide-y divide-line border-y border-line">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-3 gap-4 py-4">
              <dt className="eyebrow self-center">{r.label}</dt>
              <dd className="col-span-2 text-lg">{r.node}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </InfoPage>
  );
}
