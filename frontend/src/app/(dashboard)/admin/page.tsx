import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminPanel from "./AdminPanel";

/**
 * Admin panel — owner/admin only. RBAC is enforced here (frontend guard)
 * and again on every backend route (requireRole middleware).
 */
export default async function AdminPage() {
  const session = await auth();

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
