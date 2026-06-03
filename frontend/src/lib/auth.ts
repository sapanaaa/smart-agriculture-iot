import NextAuth, { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Server-side base URL for reaching the NodeJS backend from within the
// Next.js container. In production docker-compose sets BACKEND=http://nodejs:5000
// (the internal service name). Falls back to that same value.
const BACKEND = process.env.BACKEND || "http://nodejs:5000";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      user_role: string;
      status: string;
      device_id: string | null;
      backendToken: string;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    user_role?: string;
    status?: string;
    device_id?: string | null;
    backendToken?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Credentials provider requires JWT session strategy (no DB adapter).
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const res = await fetch(`${BACKEND}/api/account/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          // Surface the backend's reason (e.g. PENDING_APPROVAL) to the UI.
          const reason = data?.code || data?.message || "Login failed";
          throw new Error(reason);
        }

        // Returned object becomes the `user` passed to the jwt callback.
        return {
          id: data.user.id,
          email: data.user.email,
          name:
            [data.user.firstName, data.user.lastName]
              .filter(Boolean)
              .join(" ") || data.user.email,
          firstName: data.user.firstName ?? null,
          lastName: data.user.lastName ?? null,
          user_role: data.user.user_role,
          status: data.user.status,
          device_id: data.user.device_id ?? null,
          backendToken: data.token,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, copy user fields into the token.
      if (user) {
        token.id = user.id;
        token.firstName = user.firstName ?? null;
        token.lastName = user.lastName ?? null;
        token.user_role = user.user_role;
        token.status = user.status;
        token.device_id = user.device_id ?? null;
        token.backendToken = user.backendToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.firstName = (token.firstName as string) ?? null;
        session.user.lastName = (token.lastName as string) ?? null;
        session.user.user_role = (token.user_role as string) ?? "farmer";
        session.user.status = (token.status as string) ?? "approved";
        session.user.device_id = (token.device_id as string) ?? null;
        session.user.backendToken = (token.backendToken as string) ?? "";
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },

  // Suppress the noisy JWTSessionError that fires when a visitor still holds
  // a stale/old session cookie (e.g. from the previous magic-link setup).
  // It is harmless — safeAuth() already treats it as "logged out" — but
  // NextAuth logs it via console.error which triggers the dev error overlay.
  logger: {
    error(error: Error) {
      if (error?.name === "JWTSessionError" || error?.name === "JWEInvalid") {
        return;
      }
      console.error("[auth]", error);
    },
    warn() {},
  },
});
