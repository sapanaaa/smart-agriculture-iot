/**
 * Base URL for browser-side calls to the NodeJS backend.
 *
 * Always empty → relative "/api/..." paths. The browser is always on the
 * production domain (https://smartagri.cloudcoesis.com) and nginx proxies
 * /api/account/* and /api/admin/* to the NodeJS container. Using relative
 * paths means it works regardless of domain and avoids all CORS issues.
 */
export const BACKEND_DOMAIN = "";
