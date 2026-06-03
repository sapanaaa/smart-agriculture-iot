"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import BackendApi from "../(dashboard)/_components/Common";

/**
 * Exchanges the backend JWT for an httpOnly `backend_token` cookie, then
 * redirects to the destination (onboarding / admin / dashboard).
 */
export default function JwtSetupClient({
  token,
  destination,
}: {
  token: string;
  destination: string;
}) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    // Guard against double-invocation (StrictMode / re-renders).
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      try {
        const response = await fetch(BackendApi.SettingCookies.url, {
          method: BackendApi.SettingCookies.method,
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        });

        router.replace(response.ok ? destination : "/login");
      } catch (error) {
        console.error("Error setting cookies:", error);
        router.replace("/login");
      }
    };
    run();
  }, [token, destination, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-white">
      <p className="text-gray-500 text-sm">Setting up your session…</p>
    </div>
  );
}
