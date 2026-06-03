/**
 * Base URL for browser-side calls to the NodeJS backend.
 *
 * - Production: empty string → relative "/api/..." paths, served on the same
 *   domain and proxied to the NodeJS container by nginx. (The browser must
 *   never be told to hit http://localhost:5000 — that's the server's own host.)
 * - Local dev:  http://localhost:5000, because the Next.js dev server (3000)
 *   and the Express backend (5000) run on different ports.
 * - Override:   NEXT_PUBLIC_BACKEND wins if explicitly set.
 */
export const BACKEND_DOMAIN =
  process.env.NEXT_PUBLIC_BACKEND ??
  (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");
