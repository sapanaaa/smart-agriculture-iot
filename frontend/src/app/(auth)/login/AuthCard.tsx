"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { BACKEND_DOMAIN } from "@/lib/backend";

const BACKEND = BACKEND_DOMAIN;

type Mode = "signin" | "register";

/** Map backend login error codes to friendly messages. */
function friendlyError(raw: string): string {
  switch (raw) {
    case "EMAIL_NOT_VERIFIED":
      return "Please verify your email before signing in. Check your inbox for the verification link.";
    case "PENDING_APPROVAL":
      return "Your account is awaiting administrator approval. You'll get an email once approved.";
    case "REJECTED":
      return "Your account registration was not approved. Please contact an administrator.";
    case "SUSPENDED":
      return "Your account has been suspended. Please contact an administrator.";
    case "CredentialsSignin":
      return "Invalid email or password.";
    default:
      return raw || "Something went wrong. Please try again.";
  }
}

export default function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const update =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (res?.error) {
        setError(friendlyError(res.error));
        return;
      }
      // Success — go through the session-bootstrap route. Use replace so the
      // login page isn't left in history (prevents back-button loops).
      router.replace("/jwtSetup");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setError(data?.message || "Registration failed.");
        return;
      }

      setNotice(
        data.emailSent
          ? "Account created. Check your email for the verification link, then wait for admin approval."
          : "Account created, but the verification email could not be sent. Contact an administrator."
      );
      setMode("signin");
      setForm((f) => ({ ...f, password: "" }));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm lg:min-w-sm shadow-xl border-gray-200">
      <CardHeader className="space-y-3">
        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setNotice(null);
            }}
            className={`py-2 text-sm font-semibold rounded-md transition-colors ${
              mode === "signin"
                ? "bg-white text-[#2E8B57] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
              setNotice(null);
            }}
            className={`py-2 text-sm font-semibold rounded-md transition-colors ${
              mode === "register"
                ? "bg-white text-[#2E8B57] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Register
          </button>
        </div>

        <CardTitle className="text-xl">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </CardTitle>
        <CardDescription>
          {mode === "signin"
            ? "Enter your credentials to access your account."
            : "Register, verify your email, then an admin will approve you."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <form
          className="grid gap-4"
          onSubmit={mode === "signin" ? handleSignIn : handleRegister}
        >
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>First name</Label>
                <Input
                  required
                  value={form.firstName}
                  onChange={update("firstName")}
                  placeholder="Sagar"
                />
              </div>
              <div className="grid gap-2">
                <Label>Last name</Label>
                <Input
                  required
                  value={form.lastName}
                  onChange={update("lastName")}
                  placeholder="Bista"
                />
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Email</Label>
            <Input
              required
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={update("email")}
              placeholder="hello@example.com"
            />
          </div>

          <div className="grid gap-2">
            <Label>Password</Label>
            <Input
              required
              type="password"
              name="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={form.password}
              onChange={update("password")}
              placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="bg-[#2E8B57] hover:bg-[#256d44] text-white font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Please wait…
              </span>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
