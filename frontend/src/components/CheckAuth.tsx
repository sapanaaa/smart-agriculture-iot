// Server-side auth guards for protected / unprotected page groups.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Guard for protected pages (dashboard, admin, etc).
 * - No session            → /login
 * - Not approved          → /login (login already blocks them, but double-guard)
 */
export async function ProtectedPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.status !== "approved") {
    redirect("/login");
  }

  return <></>;
}

/**
 * Admin-only guard. Use inside admin routes.
 */
export async function AdminOnly() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = session.user.user_role;
  if (role !== "owner" && role !== "admin") {
    redirect("/dashboard");
  }

  return <></>;
}

/**
 * Guard for unprotected/auth pages (login, register, landing).
 * If already signed in, route the user onward:
 *   - profile incomplete → /onboarding
 *   - otherwise          → /jwtSetup (mints backend cookie → dashboard)
 */
export async function UnprotectedPage() {
  const session = await auth();

  if (session) {
    if (!session.user.firstName || !session.user.lastName) {
      redirect("/onboarding");
    }
    redirect("/jwtSetup");
  }

  return <></>;
}
