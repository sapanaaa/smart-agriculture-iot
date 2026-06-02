import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import JwtSetupClient from "./JwtSetupClient";

/**
 * Server component: reads the NextAuth session, then hands the backend JWT
 * + target route to a small client component that sets the httpOnly cookie.
 */
export default async function JwtSetupPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const token = session.user.backendToken;
  if (!token) {
    redirect("/login");
  }

  const role = session.user.user_role;
  const destination = role === "owner" || role === "admin" ? "/admin" : "/dashboard";

  return <JwtSetupClient token={token} destination={destination} />;
}
