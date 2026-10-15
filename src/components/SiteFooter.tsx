import Link from "next/link";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import type { SiteSettings } from "@/lib/types";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const wa = buildWhatsappUrl(settings.whatsapp_number, "Hello Talatu Fabrics, I have a question.");
  return (
    <footer className="mt-24 border-t border-line bg-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="font-serif text-3xl text-wine">{settings.business_name}</p>
          <p className="mt-3 max-w-xs text-sm text-muted">Premium lace and occasion fabrics.</p>
        </div>
        <div>
          <h2 className="eyebrow mb-4">Explore</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/shop" className="hover:text-wine">Shop all fabrics</Link></li>
            <li><Link href="/about" className="hover:text-wine">About</Link></li>
            <li><Link href="/contact" className="hover:text-wine">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="eyebrow mb-4">Customer care</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/ordering-and-delivery" className="hover:text-wine">Ordering &amp; delivery</Link></li>
            <li><Link href="/returns-and-exchanges" className="hover:text-wine">Returns &amp; exchanges</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="eyebrow mb-4">Get in touch</h2>
          <ul className="space-y-2 text-sm">
            {wa ? <li><a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-wine">WhatsApp us</a></li> : null}
            {settings.instagram_url ? (
              <li><a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-wine">Instagram @talatufabrics</a></li>
            ) : null}
            {settings.contact_email ? <li><a href={`mailto:${settings.contact_email}`} className="hover:text-wine">{settings.contact_email}</a></li> : null}
            {settings.contact_phone ? <li>{settings.contact_phone}</li> : null}
            {settings.business_address ? <li className="text-muted">{settings.business_address}</li> : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-line px-5 py-5 text-center text-xs text-muted">
        &copy; {new Date().getFullYear()} {settings.business_name}. All rights reserved.
      </div>
    </footer>
  );
}
