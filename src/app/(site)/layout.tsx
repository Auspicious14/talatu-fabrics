import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getSettings } from "@/lib/data/catalogue";

export const revalidate = 60;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:bg-wine focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <SiteHeader settings={settings} />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
    </div>
  );
}
