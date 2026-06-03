import { safeAuth } from "@/lib/safeAuth"
import { SidebarTrigger } from "@/components/ui/sidebar"
import UserProfileDropdownPage from "./UserProfileDropDown"
import { Bell, Settings, ShieldCheck, Leaf } from "lucide-react"

export default async function DashboardHeader() {
  const session = await safeAuth()

  const role = session?.user?.user_role?.toLowerCase() || "farmer"

  // Role badge styling — all on the SmartAgri sea-green palette.
  const roleBadge =
    role === "owner" || role === "admin"
      ? "bg-white/15 text-white border-white/25"
      : "bg-white/10 text-emerald-50 border-white/20"

  const roleLabel =
    role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Farmer"

  return (
    <header
      className="
        sticky top-2 sm:top-3 z-50
        mx-2 sm:mx-3 md:mx-4 lg:mx-6
        h-14
        rounded-2xl
        border border-white/15
        bg-gradient-to-r from-[#2E8B57] via-[#27784b] to-[#1f6940]
        backdrop-blur-xl
        shadow-lg shadow-[#2E8B57]/25
        flex items-center
        px-3 sm:px-4 lg:px-5
      "
    >
      {/* Left — sidebar trigger */}
      <div className="flex items-center gap-2">
        <SidebarTrigger
          className="
            w-8 h-8 rounded-lg
            text-white/80 hover:text-white
            hover:bg-white/15
            transition-all duration-200
            flex items-center justify-center
          "
        />
        <div className="hidden sm:block w-px h-6 bg-white/20 mx-1" />
      </div>

      {/* Center — welcome */}
      <div className="flex-1 flex items-center gap-3 min-w-0 px-1 sm:px-2">
        <div className="hidden xs:flex items-center justify-center w-7 h-7 rounded-lg bg-white/15 flex-shrink-0">
          <Leaf className="w-4 h-4 text-white" />
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm text-emerald-50/80 whitespace-nowrap">
            Welcome back,
          </span>
          <span className="text-sm sm:text-base font-semibold text-white truncate max-w-[120px] sm:max-w-[220px]">
            {session?.user?.firstName ?? "User"}
          </span>

          {/* Role pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${roleBadge}`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span className="text-[11px] font-medium">{roleLabel}</span>
          </div>
        </div>
      </div>

      {/* Right — actions + profile */}
      <div className="flex items-center gap-1.5">
        <button
          aria-label="Notifications"
          className="
            w-8 h-8 rounded-lg
            text-white/80 hover:text-white hover:bg-white/15
            transition-all duration-200
            hidden md:flex items-center justify-center
          "
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          aria-label="Settings"
          className="
            w-8 h-8 rounded-lg
            text-white/80 hover:text-white hover:bg-white/15
            transition-all duration-200
            hidden md:flex items-center justify-center
          "
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="hidden md:block w-px h-6 bg-white/20 mx-1" />

        <UserProfileDropdownPage isArrowUp={false} isFullName={false} />
      </div>
    </header>
  )
}
