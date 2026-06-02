"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import BackendApi from "../_components/Common";

/**
 * Exchanges the backend JWT for an httpOnly `backend_token` cookie, then
 * redirects to the destination (admin panel or dashboard).
 */
export default function JwtSetupClient({
  token,
  destination,
}: {
  token: string;
  destination: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch(BackendApi.SettingCookies.url, {
          method: BackendApi.SettingCookies.method,
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        });

        router.push(response.ok ? destination : "/login");
      } catch (error) {
        console.error("Error setting cookies:", error);
        router.push("/login");
      }
    };
    run();
  }, [token, destination, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <p className="text-gray-500 text-sm">Setting up your session…</p>
    </div>
  );
}
