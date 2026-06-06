"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import BackendApi from "../(dashboard)/_components/Common";

/**
 * Exchanges the backend JWT for an httpOnly `backend_token` cookie, then
 * navigates onward (onboarding / admin / dashboard).
 *
 * Loop-safety: we do NOT bounce back to /login on a failed cookie set while a
 * session is still active — that ping-pongs with the /login guard. Instead:
 *  - missing token  → the session is broken; sign out (clears it), THEN /login.
 *  - cookie failed  → still proceed to the destination; the destination's own
 *    guard handles auth. We never re-enter /jwtSetup from here.
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
  const [msg, setMsg] = useState("Setting up your session…");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      // No backend token in the session → the session is unusable. Sign out
      // so /login won't immediately redirect back here (which would loop).
      if (!token) {
        setMsg("Signing you out…");
        await signOut({ redirect: false }).catch(() => {});
        router.replace("/login");
        return;
      }

      try {
        await fetch(BackendApi.SettingCookies.url, {
          method: BackendApi.SettingCookies.method,
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        // Non-fatal: the destination guard will re-check auth. Do NOT send
        // back to /login here, or we create a redirect loop.
        console.error("Error setting session cookie:", error);
      }

      router.replace(destination);
    };

    run();
  }, [token, destination, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-white">
      <p className="text-gray-500 text-sm">{msg}</p>
    </div>
  );
}
