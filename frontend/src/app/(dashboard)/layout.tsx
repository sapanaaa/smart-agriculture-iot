import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "./_components/DashboardSidebar";
import UserProfileDropdownPage from "./_components/UserProfileDropDown";
import DashboardHeaderPage from "./_components/DashboardHeader";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/safeAuth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard FIRST — before rendering any protected UI — so unauthorized users
  // never see a flash of the dashboard before redirecting.
  const session = await safeAuth();

  const usable =
    session?.user?.status === "approved" && session.user.backendToken;

  if (!usable) {
    redirect("/login");
  }

  return (
    <SidebarProvider className=" bg-[#e4e7eb] lg:pl-2.5 lg:pr-2.5">
      <DashboardSidebar>
        <UserProfileDropdownPage isArrowUp isFullName />
      </DashboardSidebar>

      <main className="w-full relative bg-[#f8fafc]">
        <DashboardHeaderPage />
        <Suspense fallback={<p>Loading...</p>}>{children}</Suspense>
      </main>
    </SidebarProvider>
  );
}
