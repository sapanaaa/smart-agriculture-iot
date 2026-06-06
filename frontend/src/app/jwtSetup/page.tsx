import { safeAuth } from "@/lib/safeAuth";
import { redirect } from "next/navigation";
import JwtSetupClient from "./JwtSetupClient";

/**
 * Transitional bootstrap page. Lives OUTSIDE the (dashboard) route group so it
 * does NOT inherit the ProtectedPage guard.
 *
 * Loop-safety: this page must NEVER redirect back to /login while a session
 * exists — /login redirects logged-in users here, so a bounce back would loop.
 * - No session at all          → /login (safe: no session, /login shows form)
 * - Session but no backendToken → JwtSetupClient signs the user out, then /login
 * - Session + token            → set cookie (best effort) and proceed onward
 */
export default async function JwtSetupPage() {
  const session = await safeAuth();

  if (!session) redirect("/login");

  const token = session.user.backendToken ?? "";
  const { firstName, lastName, user_role } = session.user;

  let destination = "/dashboard";
  if (!firstName || !lastName) {
    destination = "/onboarding";
  } else if (user_role === "owner" || user_role === "admin") {
    destination = "/admin";
  }

  return <JwtSetupClient token={token} destination={destination} />;
}
