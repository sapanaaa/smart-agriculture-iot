import type { NextConfig } from "next";

// Upstream service URLs. Inside docker these resolve to the compose service
// names on the shared network. Override via env if running outside docker.
const FASTAPI_URL = process.env.FASTAPI_URL || "http://fastapi:8000";
const NODEJS_URL = process.env.NODEJS_URL || process.env.BACKEND || "http://nodejs:5000";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",

  // Local-dev equivalent of the production nginx reverse proxy.
  //
  // In production nginx terminates TLS and routes /api/* to the right
  // container, so these requests never reach Next.js. In local dev there is
  // no nginx, so we proxy the same prefixes from the Next.js server to the
  // FastAPI and NodeJS containers. /api/auth/* is intentionally NOT listed —
  // that namespace belongs to NextAuth and is handled by Next.js itself.
  async rewrites() {
    return [
      // ── FastAPI (ML + sensors + weather + analytics) ──────────
      { source: "/api/sensors/:path*", destination: `${FASTAPI_URL}/api/sensors/:path*` },
      { source: "/api/recommend/:path*", destination: `${FASTAPI_URL}/api/recommend/:path*` },
      { source: "/api/analytics/:path*", destination: `${FASTAPI_URL}/api/analytics/:path*` },
      { source: "/api/weather/:path*", destination: `${FASTAPI_URL}/api/weather/:path*` },
      { source: "/health", destination: `${FASTAPI_URL}/health` },

      // ── NodeJS (auth account + user management) ────────────────
      { source: "/api/account/:path*", destination: `${NODEJS_URL}/api/account/:path*` },
      { source: "/api/admin/:path*", destination: `${NODEJS_URL}/api/admin/:path*` },
      { source: "/api/userOnboarding", destination: `${NODEJS_URL}/api/userOnboarding` },
      { source: "/api/settingCookies", destination: `${NODEJS_URL}/api/settingCookies` },
      { source: "/api/me", destination: `${NODEJS_URL}/api/me` },
    ];
  },
};

export default nextConfig;
