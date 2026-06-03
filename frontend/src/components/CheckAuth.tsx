// Server-side auth guards for protected / unprotected page groups.

import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/safeAuth";

/**
 * Guard for protected pages (dashboard, admin, etc).
 */
export async function ProtectedPage() {
  const session = await safeAuth();

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
  const session = await safeAuth();

  if (!session) redirect("/login");

  const role = session.user.user_role;
  if (role !== "owner" && role !== "admin") {
    redirect("/dashboard");
  }

  return <></>;
}

/**
 * Guard for unprotected/auth pages (login, register).
 * If already signed in, send to /jwtSetup which mints the backend cookie
 * and routes onward.
 */
export async function UnprotectedPage() {
  const session = await safeAuth();

  if (session) {
    redirect("/jwtSetup");
  }

  return <></>;
}
