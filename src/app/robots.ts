import type { MetadataRoute } from "next";
import { isPreviewMode, siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  if (isPreviewMode()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/admin/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
