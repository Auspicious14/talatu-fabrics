import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { isPreviewMode, siteUrl } from "@/lib/env";

export const viewport: Viewport = { themeColor: "#5e1224", width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Talatu Fabrics | Premium lace & occasion fabrics", template: "%s | Talatu Fabrics" },
  description: "Browse premium lace and occasion fabrics from Talatu Fabrics and enquire on WhatsApp.",
  openGraph: { type: "website", siteName: "Talatu Fabrics", locale: "en_NG" },
  robots: isPreviewMode() ? { index: false, follow: false } : { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body className="min-h-dvh">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
