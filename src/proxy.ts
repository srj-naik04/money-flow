import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { e2eBypassUserId } from "@/lib/auth/test-bypass";

/**
 * Route guard (Next 16's renamed `middleware`). Redirects unauthenticated page
 * requests to the sign-in screen and refreshes the session cookie. API auth is
 * enforced separately in `withHandler` (it returns a JSON 401, not a redirect),
 * so `/api` is excluded here — as are the public `/auth` sign-in page, the
 * offline fallback, Next internals, and static assets.
 */
const guard = auth.middleware({ loginUrl: "/auth/sign-in" });

export default function proxy(request: NextRequest) {
  // When the e2e bypass is active the API gate impersonates a test user; let
  // pages through too so Playwright can drive the real UI without Google OAuth.
  if (e2eBypassUserId()) return NextResponse.next();
  return guard(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|auth|offline|manifest|robots|sitemap|favicon|icon|apple-icon|.*\\.[^/]+$).*)",
  ],
};
