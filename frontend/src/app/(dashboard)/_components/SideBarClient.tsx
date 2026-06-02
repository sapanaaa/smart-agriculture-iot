"use client";

import Logo from "@/components/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

import {
  LayoutDashboard,
  Activity,
  BrainCircuit,
  BarChart3,
  CloudSun,
  Settings,
  Users,
  Bell,
  Star,
  TrendingUp,
  Zap,
  Sparkles,
  Wifi,
  WifiOff,
  Database,
  Cpu,
  Cloud,
  History,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview & statistics",
  },
  {
    title: "Sensor Live",
    href: "/sensor_Live",
    icon: Activity,
    description: "Real-time sensor data",
  },
  {
    title: "ML Advisor",
    href: "/ai_advisor",
    icon: BrainCircuit,
    description: "Intelligent recommendations",
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Deep data insights",
  },
  {
    title: "Weather",
    href: "/weather",
    icon: CloudSun,
    description: "Weather forecasts",
  },
  {
    title: "History",
    href: "/history",
    icon: History,
    description: "Recommendation history",
  },
];

const adminItem = {
  title: "Admin Panel",
  href: "/admin",
  icon: Users,
  description: "Manage users & devices",
};

export default function SidebarClient({ session, children }: any) {
  const pathname = usePathname();
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const role = session?.user?.user_role;
  const isAdmin = role === "owner" || role === "admin";
  const navItems = isAdmin ? [...menuItems, adminItem] : menuItems;

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("http://localhost:8000/health");
        const data = await res.json();
        setHealth(data);
      } catch (error) {
        console.error("Health check failed:", error);
        setHealth(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  // System status mapping
  const systemStatus = [
    {
      label: "MongoDB Atlas",
      key: "mongodb",
      ok: health?.mongodb === "connected",
      icon: Database,
      color:
        health?.mongodb === "connected" ? "text-emerald-600" : "text-rose-600", // Darker colors
    },
    {
      label: "ML Engine",
      key: "ml_models",
      ok: health?.ml_models === "loaded",
      icon: Cpu,
      color:
        health?.ml_models === "loaded" ? "text-emerald-600" : "text-rose-600",
    },
    {
      label: "Weather API",
      key: "weather_api",
      ok: health?.weather_api === "configured",
      icon: Cloud,
      color:
        health?.weather_api === "configured"
          ? "text-emerald-600"
          : "text-rose-600",
    },
  ];

  return (
    <Sidebar className="border-r border-blue-300/70 dark:border-blue-800/70 bg-linear-to-br from-blue-50 via-indigo-50 to-white dark:from-blue-900 dark:via-indigo-900 dark:to-slate-800 shadow-md">
      {/* Header */}
      <SidebarHeader className="px-6 py-5 border-b border-blue-300/50 dark:border-blue-700/50 flex items-center justify-center">
        <Logo />
      </SidebarHeader>

      {/* Sidebar Content */}
      <SidebarContent className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Main Menu */}
        <SidebarMenu className="space-y-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-4 px-5 py-4 min-h-15 transition-all duration-300",
                      // Active state - matches Installation style
                      isActive
                        ? "bg-purple-200 dark:bg-purple-800/60 text-gray-900 dark:text-white font-medium" // Darker active bg
                        : "hover:bg-purple-100 dark:hover:bg-purple-800/40",
                      !isActive && "rounded-2xl",
                    )}
                    style={{
                      borderRadius: isActive ? "0 9999px 9999px 0" : "",
                      marginLeft: isActive ? "-1.25rem" : "",
                      paddingLeft: isActive ? "calc(1.25rem + 1.25rem)" : "",
                    }}
                  >
                    {/* Left border indicator - visible on active */}
                    {isActive && (
                      <div className="absolute left-0 w-1.5 h-10 bg-purple-600 dark:bg-purple-400 rounded-r-full" />
                    )}

                    <Icon
                      className={cn(
                        "w-6 h-6 shrink-0 transition-all duration-300 relative z-10",
                        isActive
                          ? "text-purple-700 dark:text-purple-300" // Darker active icon
                          : "text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-300",
                      )}
                    />

                    <div className="flex flex-col flex-1 leading-tight relative z-10">
                      <span
                        className={cn(
                          "text-sm font-semibold tracking-wide transition-colors duration-300",
                          isActive
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-800 dark:text-gray-200 group-hover:text-purple-800 dark:group-hover:text-purple-200", // Darker default text
                        )}
                      >
                        {item.title}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium transition-colors duration-300",
                          isActive
                            ? "text-gray-700 dark:text-gray-300" // Darker active description
                            : "text-gray-600 dark:text-gray-400 group-hover:text-purple-700 dark:group-hover:text-purple-300", // Darker default description
                        )}
                      >
                        {item.description}
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-4 space-y-4 border-t border-blue-300/50 dark:border-blue-700/50">
        {/* System Status Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              System Status
            </h4>
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    health ? "bg-emerald-600" : "bg-rose-600"
                  } animate-pulse`}
                />
                <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                  {health ? "Connected" : "Offline"}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {systemStatus.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between group hover:bg-purple-100/70 dark:hover:bg-purple-800/40 p-2 rounded-lg transition-colors duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.ok ? "bg-emerald-600" : "bg-rose-600"
                      } animate-pulse`}
                    />
                    <span
                      className={`text-[10px] font-semibold ${
                        item.ok
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-rose-700 dark:text-rose-400"
                      }`}
                    >
                      {item.ok ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Last Updated Timestamp */}
          {health && (
            <div className="pt-2 mt-2 border-t border-blue-300/50 dark:border-blue-700/50">
              <p className="text-[9px] font-medium text-gray-600 dark:text-gray-400 text-center">
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>

        {/* Children (UserProfileDropdown) */}
        {children}
      </SidebarFooter>
    </Sidebar>
  );
}
