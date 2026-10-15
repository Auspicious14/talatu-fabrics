import Link from "next/link";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import type { SiteSettings } from "@/lib/types";

/**
 * Renders owner-supplied copy only. When the owner has not written it yet we say
 * so plainly and point to WhatsApp, rather than inventing policies or claims.
 */
export function InfoPage({
  eyebrow,
  title,
  body,
  settings,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string | null;
  settings: SiteSettings;
  children?: React.ReactNode;
}) {
  const wa = buildWhatsappUrl(settings.whatsapp_number, "Hello Talatu Fabrics, I have a question.");
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="text-5xl sm:text-6xl">{title}</h1>
      <div className="hairline my-8 max-w-24" />
      {body ? (
        <div className="space-y-4 whitespace-pre-line text-lg leading-relaxed">{body}</div>
      ) : (
        <div className="border border-line bg-cream p-6 text-muted">
          <p>These details are being finalised. In the meantime, please ask us directly and we will be happy to help.</p>
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block border-b border-wine text-wine">
              Ask on WhatsApp
            </a>
          ) : (
            <Link href="/contact" className="mt-4 inline-block border-b border-wine text-wine">Contact us</Link>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
