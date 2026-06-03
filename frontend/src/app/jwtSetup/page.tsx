import { safeAuth } from "@/lib/safeAuth";
import { redirect } from "next/navigation";
import JwtSetupClient from "./JwtSetupClient";

/**
 * Transitional bootstrap page. Lives OUTSIDE the (dashboard) route group so it
 * does NOT inherit the ProtectedPage guard (which would bounce unapproved or
 * mid-login users back to /login and create a redirect loop).
 *
 * Reads the NextAuth session, then hands the backend JWT + target route to a
 * client component that sets the httpOnly cookie before navigating on.
 *
 * Destination:
 *  - profile incomplete (no first/last name) → /onboarding
 *  - admin/owner                              → /admin
 *  - otherwise                                → /dashboard
 */
export default async function JwtSetupPage() {
  const session = await safeAuth();

  if (!session) redirect("/login");

  const token = session.user.backendToken;
  if (!token) redirect("/login");

  const { firstName, lastName, user_role } = session.user;

  let destination = "/dashboard";
  if (!firstName || !lastName) {
    destination = "/onboarding";
  } else if (user_role === "owner" || user_role === "admin") {
    destination = "/admin";
  }

  return <JwtSetupClient token={token} destination={destination} />;
}
