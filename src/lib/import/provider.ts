import "server-only";
import { normalisePostUrl } from "./instagram";

export interface ResolvedPost {
  status: "ok" | "unavailable" | "failed" | "not_configured";
  caption?: string | null;
  postedAt?: string | null;
  authorName?: string | null;
  /** Instagram-hosted media URLs. Transient: used for admin preview, never stored as product assets. */
  imageUrls: string[];
  message?: string;
}

/**
 * Optional discovery providers. The storefront never calls these and never depends on them.
 *  - "none"        : default. Records what you give it; no third party; no network.
 *  - "meta_oembed" : Meta's official oEmbed endpoint for public posts. Requires a Meta app and
 *                    a server-side token. NOT TESTED in this build (no credentials available).
 * Anything that scrapes Instagram without authorisation is deliberately not implemented.
 */
export function activeProvider(): "none" | "meta_oembed" {
  return process.env.DISCOVERY_PROVIDER === "meta_oembed" && process.env.META_OEMBED_TOKEN ? "meta_oembed" : "none";
}

export function downloadsAllowed(): boolean {
  return process.env.DISCOVERY_ALLOW_DOWNLOAD === "true";
}

export async function resolvePost(url: string): Promise<ResolvedPost> {
  const post = normalisePostUrl(url);
  if (!post) return { status: "failed", imageUrls: [], message: "Not a valid public Instagram post URL." };

  if (activeProvider() === "none") {
    return {
      status: "not_configured",
      imageUrls: [],
      message: "No retrieval provider is configured. The post link is kept as a reference; add the photo by uploading it or from the owner's data export.",
    };
  }

  try {
    const endpoint = new URL("https://graph.facebook.com/instagram_oembed");
    endpoint.searchParams.set("url", post.url);
    endpoint.searchParams.set("omitscript", "true");
    endpoint.searchParams.set("access_token", process.env.META_OEMBED_TOKEN!);
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(10_000), headers: { Accept: "application/json" } });
    if (res.status === 400 || res.status === 404) {
      return { status: "unavailable", imageUrls: [], message: "Meta reports this post as unavailable, private or not embeddable." };
    }
    if (!res.ok) return { status: "failed", imageUrls: [], message: `Meta oEmbed returned HTTP ${res.status}.` };
    const j = (await res.json()) as { author_name?: string; thumbnail_url?: string; title?: string };
    return {
      status: "ok",
      authorName: typeof j.author_name === "string" ? j.author_name : null,
      caption: typeof j.title === "string" && j.title.trim() ? j.title : null,
      imageUrls: typeof j.thumbnail_url === "string" ? [j.thumbnail_url] : [],
    };
  } catch (e) {
    return { status: "failed", imageUrls: [], message: e instanceof Error && e.name === "TimeoutError" ? "Timed out contacting Meta." : "Couldn't reach Meta." };
  }
}
