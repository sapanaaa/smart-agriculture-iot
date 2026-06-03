import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

/**
 * Safe wrapper around NextAuth's auth().
 *
 * A stale or invalid session cookie (e.g. one left over from the previous
 * database-session magic-link setup) makes auth() throw a JWTSessionError,
 * which would crash any server component that calls it. We swallow that and
 * return null, so the app simply treats the visitor as logged out.
 */
export async function safeAuth(): Promise<Session | null> {
  try {
    return await auth();
  } catch {
    return null;
  }
}
