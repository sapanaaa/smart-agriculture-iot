import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/safeAuth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If a usable session already exists, skip the auth pages entirely.
  // (Stale/incomplete sessions fall through so the login form can render —
  // this prevents a /login ↔ /jwtSetup redirect loop.)
  const session = await safeAuth();
  const usable =
    session?.user?.status === "approved" && session.user.backendToken;

  if (usable) {
    redirect("/jwtSetup");
  }

  return (
    <main className="flex justify-center items-center flex-col min-h-dvh h-dvh overflow-auto relative ">
      <div className="absolute top-0 -z-10 h-full w-full bg-white">
        <div className="absolute bottom-auto left-auto right-0 top-0 h-500px w-500px -translate-x-[30%] translate-y-[20%] rounded-full bg-[rgba(173,109,244,0.5)] opacity-30 blur-[80px]"></div>
      </div>
      <div className="z-10 relative">{children}</div>
    </main>
  );
}
