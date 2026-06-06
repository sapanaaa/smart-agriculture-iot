// Server-side auth guards for protected / unprotected page groups.
//
// Loop-safety principle: a page only forwards a session ONWARD if that
// session is actually usable (approved + carries a backend token). A broken
// or stale session is treated as "not logged in" so guards never ping-pong.

import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/safeAuth";
import type { Session } from "next-auth";

function isUsable(session: Session | null): session is Session {
  return Boolean(
    session &&
      session.user &&
      session.user.status === "approved" &&
      session.user.backendToken
  );
}

/**
 * Guard for protected pages (dashboard, admin, etc).
 * Only a usable (approved + tokened) session may stay. Anything else → /login.
 */
export async function ProtectedPage() {
  const session = await safeAuth();

  if (!isUsable(session)) {
    redirect("/login");
  }

  return <></>;
}

/**
 * Admin-only guard.
 */
export async function AdminOnly() {
  const session = await safeAuth();

  if (!isUsable(session)) redirect("/login");

  const role = session.user.user_role;
  if (role !== "owner" && role !== "admin") {
    redirect("/dashboard");
  }

  return <></>;
}

/**
 * Guard for unprotected/auth pages (login, register).
 * Forward onward ONLY if the session is usable; otherwise render the page
 * (login form) so a stale session never loops between /login and /jwtSetup.
 */
export async function UnprotectedPage() {
  const session = await safeAuth();

  if (isUsable(session)) {
    redirect("/jwtSetup");
  }

  return <></>;
}
