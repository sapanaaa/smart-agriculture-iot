import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/safeAuth";
import AuthCard from "./AuthCard";

export default async function LoginPage() {
  const session = await safeAuth();

  // Already signed in → route onward.
  if (session) {
    if (!session.user.firstName || !session.user.lastName) {
      redirect("/onboarding");
    }
    redirect("/jwtSetup");
  }

  return <AuthCard />;
}
