"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BackendApi from "../_components/Common";
import { useEffect } from "react";

/**
 * After NextAuth login, exchange the session's backend JWT for an
 * httpOnly `backend_token` cookie (so the browser auto-sends it to the
 * NodeJS API), then route into the dashboard.
 */
export default function JwtSetupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    const run = async () => {
      try {
        const token = session?.user?.backendToken;
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await fetch(BackendApi.SettingCookies.url, {
          method: BackendApi.SettingCookies.method,
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          // Admins/owners land on the admin panel; everyone else on dashboard.
          const role = session?.user?.user_role;
          if (role === "owner" || role === "admin") {
            router.push("/admin");
          } else {
            router.push("/dashboard");
          }
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Error setting cookies:", error);
        router.push("/login");
      }
    };

    run();
  }, [status, session, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <p className="text-gray-500 text-sm">Setting up your session…</p>
    </div>
  );
}
