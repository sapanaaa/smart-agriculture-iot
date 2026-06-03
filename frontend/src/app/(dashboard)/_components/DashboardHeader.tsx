import { safeAuth } from "@/lib/safeAuth"
import { SidebarTrigger } from "@/components/ui/sidebar"
import UserProfileDropdownPage from "./UserProfileDropDown"
import { Sparkles } from "lucide-react"

export default async function DashboardHeader(){
    
    const session = await safeAuth()
    
    // Role color mapping with deep blue navy theme
    const roleColors = {
        admin: { 
            bg: "bg-[#0b1f4b]", 
            text: "text-[#0b1f4b]", 
            dot: "bg-[#0b1f4b]", 
            badge: "bg-white/20 text-white border-white/30" 
        },
        farmer: { 
            bg: "bg-emerald-600", 
            text: "text-emerald-600", 
            dot: "bg-emerald-600", 
            badge: "bg-emerald-50 text-emerald-700 border-emerald-200" 
        },
    }
    
    const userRole = session?.user?.user_role?.toLowerCase() || 'farmer'
    const roleStyle = roleColors[userRole as keyof typeof roleColors] || roleColors.farmer

    return (
        <header className={`
            sticky 
            top-2 sm:top-3 s
            z-50 
            mx-2 sm:mx-3 md:mx-4 lg:mx-6
            h-12 sm:h-14 
            rounded-xl sm:rounded-2xl
            border border-white/20 dark:border-white/10
            bg-linear-to-r from-[#0a1a3a]/90 via-[#1a2f5a]/80 to-[#0a1a3a]/90
            dark:from-[#0a1a3a]/90 dark:via-[#1a2f5a]/80 dark:to-[#0a1a3a]/90
            backdrop-blur-xl 
            shadow-lg shadow-[#0a1a3a]/30 dark:shadow-[#0a1a3a]/50
            flex items-center 
            px-2 sm:px-3 md:px-4 lg:px-5
            transition-all duration-300
        `}>
            {/* Left Section with Sidebar Trigger */}
            <div className="flex items-center gap-1 sm:gap-2">
                <SidebarTrigger className={`
                    w-7 h-7 sm:w-8 sm:h-8 
                    rounded-lg 
                    text-white/70 hover:text-white 
                    dark:text-white/70 dark:hover:text-white
                    hover:bg-white/10 dark:hover:bg-white/10
                    transition-all duration-200
                    flex items-center justify-center
                `} />
                
                {/* Decorative Divider - Hidden on mobile */}
                <div className="hidden sm:block w-px h-5 sm:h-6 bg-gradient-to-b from-transparent via-white/30 to-transparent mx-1" />
            </div>

            {/* Center Section - Welcome Message with Role */}
            <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 px-1 sm:px-2">
                {/* Sparkle Icon - Hidden on very small screens */}
                <div className="hidden xs:flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/10 backdrop-blur-sm flex-shrink-0">
                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap min-w-0">
                    <span className="text-xs sm:text-sm text-white/70 whitespace-nowrap">
                        Welcome back,
                    </span>
                    
                    <span className="text-sm sm:text-base font-semibold text-white truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[200px]">
                        {session?.user?.firstName ?? "User"}
                    </span>
                    
                    {/* Role Badge - Hidden on mobile, visible on sm and up */}
                    {session?.user?.user_role && (
                        <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                            <span className="hidden sm:block w-1 h-1 rounded-full bg-white/50" />
                            <div className={`
                                flex items-center gap-1 sm:gap-1.5 
                                px-1.5 sm:px-2.5 py-0.5 sm:py-1 
                                rounded-full 
                                ${roleStyle.badge}
                                border
                                shadow-sm
                                backdrop-blur-sm
                                transition-all duration-200
                                hover:shadow-md
                                group
                            `}>
                                <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${roleStyle.dot} animate-pulse`} />
                                <span className={`text-[10px] sm:text-xs font-medium capitalize ${roleStyle.text}`}>
                                    {session.user.user_role === 'admin' ? 'Admin' : 
                                     session.user.user_role === 'manager' ? 'Mgr' : 
                                     session.user.user_role}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Section - User Profile */}
            <div className="flex items-center gap-1 sm:gap-2">
                {/* Quick Actions - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-1 mr-1">
                    <button className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg hover:bg-white/10 text-white/70 hover:text-white backdrop-blur-sm transition-all duration-200 flex items-center justify-center">
                        <span className="text-base sm:text-lg">🔔</span>
                    </button>
                    <button className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg hover:bg-white/10 text-white/70 hover:text-white backdrop-blur-sm transition-all duration-200 flex items-center justify-center">
                        <span className="text-base sm:text-lg">⚙️</span>
                    </button>
                </div>
                
                {/* User Profile Dropdown */}
                <div className="relative">
                    <UserProfileDropdownPage
                        isArrowUp={false}
                        isFullName={false}
                    />
                </div>
            </div>
        </header>
    )
}