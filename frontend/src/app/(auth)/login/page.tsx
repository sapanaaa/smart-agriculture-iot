import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuthCard from "./AuthCard";

export default async function LoginPage() {
  const session = await auth();

  // Already signed in → route onward.
  if (session) {
    if (!session.user.firstName || !session.user.lastName) {
      redirect("/onboarding");
    }
    redirect("/jwtSetup");
  }

  return <AuthCard />;
}
