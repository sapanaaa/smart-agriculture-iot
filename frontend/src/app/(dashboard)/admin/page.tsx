import { safeAuth } from "@/lib/safeAuth";
import { redirect } from "next/navigation";
import AdminPanel from "./AdminPanel";

/**
 * Admin panel — owner/admin only. RBAC is enforced here (frontend guard)
 * and again on every backend route (requireRole middleware).
 *
 * The (dashboard) layout already verified the session is usable, so here we
 * only need the role check.
 */
export default async function AdminPage() {
  const session = await safeAuth();

  if (!session) redirect("/login");

  const role = session.user.user_role;
  if (role !== "owner" && role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <AdminPanel
      backendToken={session.user.backendToken}
      currentRole={role}
      currentUserId={session.user.id}
    />
  );
}
