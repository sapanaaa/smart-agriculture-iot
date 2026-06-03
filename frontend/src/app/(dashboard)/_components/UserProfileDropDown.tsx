// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
// import { auth } from "@/lib/auth";
// import getAvatarName from "@/lib/getAvatarName";
// import { ChevronDown } from "lucide-react";
// import { signOut } from "@/lib/auth";
// import UserProfilePage from "./Use";

// interface IUserProfileDropdown {
//     isFullName: boolean,
//     isArrowUp: boolean
// }

// export default async function UserProfileDropdownPage({ isArrowUp, isFullName }: IUserProfileDropdown) {
//     const session = await auth()
//     return (
//         <DropdownMenu>
//             <DropdownMenuTrigger>
//                 <div className="flex items-center gap-3 cursor-pointer">
//                     <Avatar className="border size-9 bg-neutral-900 cursor-pointer">
//                         <AvatarImage
//                             src={session?.user.image as string}
//                         />
//                         <AvatarFallback>
//                             {
//                                 getAvatarName(
//                                     session?.user.firstName as string,
//                                     session?.user.lastName as string
//                                 )
//                             }
//                         </AvatarFallback>
//                     </Avatar>
//                     {
//                         isFullName && (
//                             <div>
//                                 <p className="text-ellipsis line-clamp-1 font-medium">
//                                     <span>{session?.user.firstName}</span>
//                                     {" "}
//                                     <span>{session?.user.lastName}</span>
//                                 </p>
//                             </div>
//                         )
//                     }

//                     {
//                         isArrowUp && (
//                             <ChevronDown className="transition-all ml-auto" />
//                         )
//                     }
//                 </div>
//             </DropdownMenuTrigger>

//             <DropdownMenuContent className="w-full min-w-[250px]">
//                 <DropdownMenuLabel>
//                     My Account
//                 </DropdownMenuLabel>

//                 <DropdownMenuSeparator />
//                 {/* user Profile */}
//                 <UserProfilePage />

//                 <DropdownMenuItem onClick={async () => {
//                     "use server"
//                     await signOut()
//                 }}
//                     className="text-red-500 hover:bg-red-200 font-medium cursor-pointer">
//                     Logout
//                 </DropdownMenuItem>

//             </DropdownMenuContent>
//         </DropdownMenu>
//     )
// }

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuShortcut
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth";
import { safeAuth } from "@/lib/safeAuth";
import getAvatarName from "@/lib/getAvatarName";
import { 
  ChevronDown, 
  ChevronUp,
  User, 
  Settings, 
  HelpCircle, 
  LogOut,
  Sparkles,
  Shield,
  Bell
} from "lucide-react";
import UserProfilePage from "./UserProfile";

interface IUserProfileDropdown {
    isFullName: boolean,
    isArrowUp: boolean
}

export default async function UserProfileDropdownPage({ isArrowUp, isFullName }: IUserProfileDropdown) {
    const session = await safeAuth()
    const userInitials = getAvatarName(
        session?.user.firstName as string,
        session?.user.lastName as string
    );
    const fullName = `${session?.user.firstName} ${session?.user.lastName}`;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-950/50 dark:hover:to-indigo-950/50 transition-all duration-300 group">
                    {/* Avatar with gradient border */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-linear-to-br from-blue-400 to-indigo-500 rounded-full blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />
                        <Avatar className="relative size-10 border-2 border-white dark:border-slate-800 shadow-md">
                            <AvatarImage
                                src={session?.user.image as string}
                                className="object-cover"
                            />
                            <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-white font-medium">
                                {userInitials}
                            </AvatarFallback>
                        </Avatar>
                        {/* Online status indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800" />
                    </div>

                    {/* User info - conditionally shown */}
                    {isFullName && (
                        <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                {fullName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                            </p>
                        </div>
                    )}

                    {/* Arrow icon with animation */}
                    {isArrowUp && (
                        <div className="ml-auto">
                            {isArrowUp ? (
                                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-all group-hover:-translate-y-0.5" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-all group-hover:translate-y-0.5" />
                            )}
                        </div>
                    )}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent 
                className="w-[280px] mt-2 p-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-blue-100 dark:border-blue-900/50 shadow-xl rounded-2xl"
                align="end"
                sideOffset={5}
            >
                {/* Header with gradient */}
                <div className="px-3 pt-3 pb-2 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <Avatar className="size-12 border-2 border-white shadow-md">
                            <AvatarImage src={session?.user.image as string} />
                            <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                                {userInitials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                {fullName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {session?.user.email}
                            </p>
                        </div>
                        {/* Premium badge */}
                        <div className="px-2 py-1 bg-linear-to-r from-amber-400 to-orange-400 rounded-full">
                            <span className="text-[10px] font-bold text-white flex items-center gap-0.5">
                                <Sparkles className="w-3 h-3" />
                                PRO
                            </span>
                        </div>
                    </div>
                </div>

                <DropdownMenuLabel className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-3 pb-1">
                    My Account
                </DropdownMenuLabel>

                {/* User Profile Section with consistent styling */}
                <div className="px-1">
                    <UserProfilePage />
                </div>

                <DropdownMenuSeparator className="bg-blue-100/50 dark:bg-blue-900/50 my-1" />

                {/* Additional menu items for better UX */}
                <DropdownMenuGroup>
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer transition-all group">
                        <User className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Settings</span>
                        <DropdownMenuShortcut className="text-xs text-gray-400">⌘P</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer transition-all group">
                        <Bell className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notifications</span>
                        <div className="ml-auto w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">3</span>
                        </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer transition-all group">
                        <Shield className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Privacy & Security</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer transition-all group">
                        <HelpCircle className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Help & Support</span>
                        <DropdownMenuShortcut className="text-xs text-gray-400">⌘H</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="bg-blue-100/50 dark:bg-blue-900/50 my-1" />

                {/* Logout button with consistent styling */}
                <DropdownMenuItem 
                    onClick={async () => {
                        "use server"
                        await signOut()
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer transition-all group mt-1"
                >
                    <LogOut className="w-4 h-4 text-red-500 group-hover:text-red-600 group-hover:translate-x-0.5 transition-transform" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">Logout</span>
                    <DropdownMenuShortcut className="text-xs text-gray-400">⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>

                {/* Footer with version info */}
                <div className="px-3 py-2 mt-1">
                    <p className="text-[10px] text-center text-gray-400">
                        Version 2.0.1 • © 2024 SmartAgri
                    </p>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}