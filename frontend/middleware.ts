import { NextRequest, NextResponse } from "next/server";

/**
 * Pretty-URL aliases for the single-page landing.
 *
 * The landing page lives at "/" but we expose section-specific URLs like
 * /features, /how-it-works, /about, /supervisors so users can copy/share
 * links and the address bar stays clean. This middleware rewrites those
 * paths to "/" on the server so refreshes work, while the client-side
 * scroll handler in app/page.tsx scrolls to the matching section on load.
 */
const LANDING_ALIASES = new Set([
  "/features",
  "/how-it-works",
  "/about",
  "/supervisors",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LANDING_ALIASES.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  // Only run this middleware on the alias paths; everything else is untouched
  matcher: ["/features", "/how-it-works", "/about", "/supervisors"],
};
