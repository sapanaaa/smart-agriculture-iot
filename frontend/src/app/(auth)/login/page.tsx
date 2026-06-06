import AuthCard from "./AuthCard";

// The (auth) layout already redirects usable sessions to /jwtSetup, so this
// page just renders the sign-in / register card.
export default function LoginPage() {
  return <AuthCard />;
}
