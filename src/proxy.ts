import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { refreshSession } from "@/lib/supabase/proxy-session";

/**
 * 1. Private preview gate (HTTP Basic auth). ON unless PREVIEW_MODE=false.
 *    Fails CLOSED: preview mode without PREVIEW_PASSWORD returns 503 instead of
 *    leaving the surprise site open.
 * 2. Supabase session refresh and a UX redirect for /admin. This redirect is NOT
 *    the security boundary: every admin page/action re-verifies the admin role
 *    on the server and RLS enforces it again in the database.
 */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

function previewAuthorised(request: NextRequest, password: string): boolean {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const idx = decoded.indexOf(":");
  const pass = idx >= 0 ? decoded.slice(idx + 1) : decoded;
  return safeEqual(pass, password);
}

export async function proxy(request: NextRequest) {
  const preview = process.env.PREVIEW_MODE !== "false";

  if (preview) {
    const password = process.env.PREVIEW_PASSWORD;
    if (!password) {
      return new NextResponse("Preview is not configured. Set PREVIEW_PASSWORD.", {
        status: 503,
        headers: { "X-Robots-Tag": "noindex, nofollow" },
      });
    }
    if (!previewAuthorised(request, password)) {
      return new NextResponse("Private preview. Authentication required.", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Talatu Fabrics private preview", charset="UTF-8"',
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }
  }

  const response = NextResponse.next({ request });
  if (preview) response.headers.set("X-Robots-Tag", "noindex, nofollow");

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin")) {
    const { user } = await refreshSession(request, response);
    const isLogin = pathname === "/admin/login";
    if (!user && !isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
