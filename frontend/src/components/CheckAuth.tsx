// Server-side auth guards for protected / unprotected page groups.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Guard for protected pages (dashboard, admin, etc).
 * - No session   → /login
 * - Not approved → /login (login already blocks them; double-guard)
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
 * Admin-only guard.
 */
export async function AdminOnly() {
  const session = await auth();

  if (!session) redirect("/login");

  const role = session.user.user_role;
  if (role !== "owner" && role !== "admin") {
    redirect("/dashboard");
  }

  return <></>;
}

/**
 * Guard for unprotected/auth pages (login, register).
 * If already signed in, send to /jwtSetup, which mints the backend cookie
 * and then routes onward (onboarding if profile incomplete, else dashboard/admin).
 */
export async function UnprotectedPage() {
  const session = await auth();

  if (session) {
    redirect("/jwtSetup");
  }

  return <></>;
}
