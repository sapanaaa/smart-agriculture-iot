"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Mail,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BACKEND_DOMAIN } from "@/lib/backend";

const BACKEND = BACKEND_DOMAIN;

type State =
  | { kind: "inbox" } // no token → just show "check your email"
  | { kind: "verifying" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const email = params.get("email");

  const [state, setState] = useState<State>(
    token && email ? { kind: "verifying" } : { kind: "inbox" }
  );

  useEffect(() => {
    if (!token || !email) return;

    const verify = async () => {
      try {
        const res = await fetch(
          `${BACKEND}/api/account/verify?token=${encodeURIComponent(
            token
          )}&email=${encodeURIComponent(email)}`
        );
        const data = await res.json().catch(() => null);

        if (res.ok && data?.success) {
          setState({ kind: "success", message: data.message });
        } else {
          setState({
            kind: "error",
            message: data?.message || "Verification failed.",
          });
        }
      } catch {
        setState({
          kind: "error",
          message: "Could not reach the server. Please try again.",
        });
      }
    };

    verify();
  }, [token, email]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md relative bg-white border border-gray-200 shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-col gap-4 items-center pt-8 pb-4">
          <div className="relative">
            {state.kind === "success" ? (
              <div className="bg-[#2E8B57] text-white p-5 rounded-full shadow-xl">
                <CheckCircle className="size-8" />
              </div>
            ) : state.kind === "error" ? (
              <div className="bg-red-500 text-white p-5 rounded-full shadow-xl">
                <XCircle className="size-8" />
              </div>
            ) : state.kind === "verifying" ? (
              <div className="bg-[#2E8B57] text-white p-5 rounded-full shadow-xl">
                <Loader2 className="size-8 animate-spin" />
              </div>
            ) : (
              <div className="bg-[#2E8B57] text-white p-5 rounded-full shadow-xl">
                <Mail className="size-8" />
              </div>
            )}
          </div>

          <div className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              {state.kind === "success"
                ? "Email verified"
                : state.kind === "error"
                ? "Verification failed"
                : state.kind === "verifying"
                ? "Verifying…"
                : "Check your email"}
            </CardTitle>
            <CardDescription className="text-base text-gray-500 max-w-sm">
              {state.kind === "success"
                ? state.message
                : state.kind === "error"
                ? state.message
                : state.kind === "verifying"
                ? "Confirming your email address, one moment."
                : "We've sent a verification link to your email address. Please check your inbox."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6 pt-2">
          {state.kind === "inbox" && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="size-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800 mb-1">
                      Didn&apos;t receive the email?
                    </h4>
                    <p className="text-xs text-amber-700">
                      Check your spam folder or wait a few minutes. The link
                      expires in 24 hours.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <CheckCircle className="size-4 text-[#2E8B57] flex-shrink-0" />
                <p className="text-xs text-emerald-700">
                  After verification, an admin will approve your account.
                </p>
              </div>
            </>
          )}

          {state.kind === "success" && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <Clock className="size-4 text-[#2E8B57] flex-shrink-0" />
              <p className="text-xs text-emerald-700">
                An administrator will review and approve your account. You&apos;ll
                get an email once approved.
              </p>
            </div>
          )}

          <Button
            onClick={() => router.push("/login")}
            variant="outline"
            className="w-full h-11 rounded-xl border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all group"
          >
            <ArrowLeft className="size-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-[#2E8B57]" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
