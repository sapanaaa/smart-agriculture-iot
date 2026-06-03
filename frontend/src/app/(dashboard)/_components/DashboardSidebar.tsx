import { safeAuth } from "@/lib/safeAuth";
import SidebarClient from "./SideBarClient";

export default async function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const session = await safeAuth();

  return <SidebarClient session={session}>{children}</SidebarClient>;
}