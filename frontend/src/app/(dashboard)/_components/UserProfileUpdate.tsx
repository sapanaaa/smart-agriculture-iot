
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { user_role } from "@/lib/utils";
import { onboardingSchema } from "@/lib/zodSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import {
  User,
  Mail,
  Fingerprint,
  Shield,
  Save,
  Loader2,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import BackendApi from "./Common";

interface UserEditProfile {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  email: string | null | undefined;
  device_id: string | null | undefined;
  user_roles: string | null | undefined;
}

export default function UserProfileUpdatePage({
  firstName,
  lastName,
  email,
  device_id,
  user_roles,
}: UserEditProfile) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      device_id: device_id ?? undefined,
      role: user_roles ?? undefined,
    },
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const onSubmit = async (data: z.infer<typeof onboardingSchema>) => {
    try {
      setIsLoading(true);
      const response = await fetch(BackendApi.Onboarding.url, {
        method: BackendApi.Onboarding.method,
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();

      if (response.status === 200) {
        toast.success(responseData.message, {
          icon: "🎉",
          style: {
            borderRadius: "10px",
            background: "#10b981",
            color: "#fff",
          },
        });
        reset(data);
        setTimeout(() => {
          router.replace("/jwtSetup");
        }, 300);
        // router.refresh();
      } else {
        toast.error(responseData.message, {
          style: {
            borderRadius: "10px",
            background: "#ef4444",
            color: "#fff",
          },
        });
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Field configurations for consistent styling
  const fields = [
    {
      name: "firstName",
      label: "First Name",
      icon: User,
      placeholder: firstName || "Enter your first name",
      type: "text",
      color: "blue",
    },
    {
      name: "lastName",
      label: "Last Name",
      icon: User,
      placeholder: lastName || "Enter your last name",
      type: "text",
      color: "indigo",
    },
    {
      name: "device_id",
      label: "Device ID",
      icon: Fingerprint,
      placeholder: device_id || "Enter your device ID",
      type: "text",
      color: "purple",
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg mb-3">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Profile Settings
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Update your personal information and preferences
            </p>
          </div>

          {/* Profile Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-3 border border-blue-100 dark:border-blue-900/50">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {firstName?.[0]}
                  {lastName?.[0]}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-900" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                  {firstName} {lastName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{email}</span>
                </p>
              </div>
              <div className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full shadow-sm flex-shrink-0">
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 flex items-center gap-0.5 whitespace-nowrap">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {isDirty ? "Edited" : "Active"}
                </span>
              </div>
            </div>
          </div>

          {/* Form Fields - Compact Version */}
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {/* Name Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  First Name
                </Label>
                <Input
                  {...register("firstName")}
                  placeholder={firstName || "First name"}
                  disabled={isLoading}
                  className="h-9 text-sm rounded-lg border-gray-200 dark:border-gray-800 focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 w-full"
                />
                {errors.firstName && (
                  <p className="text-[10px] text-red-500">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  Last Name
                </Label>
                <Input
                  {...register("lastName")}
                  placeholder={lastName || "Last name"}
                  disabled={isLoading}
                  className="h-9 text-sm rounded-lg border-gray-200 dark:border-gray-800 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 w-full"
                />
                {errors.lastName && (
                  <p className="text-[10px] text-red-500">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Device ID */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5 text-purple-500" />
                Device ID
              </Label>
              <Input
                {...register("device_id")}
                placeholder={device_id || "Enter device ID"}
                disabled={isLoading}
                className="h-9 text-sm rounded-lg border-gray-200 dark:border-gray-800 focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 w-full"
              />
              {errors.device_id && (
                <p className="text-[10px] text-red-400">
                  {errors.device_id.message}
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-purple-500" />
                User Role
              </Label>
              <Controller
                name="role"
                control={control}
                defaultValue={user_roles ?? undefined}
                render={({ field }) => (
                  <Select
                    {...field}
                    disabled={isLoading}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200 dark:border-gray-800 focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {Object.keys(user_role).map((item: string) => (
                        <SelectItem
                          key={item}
                          value={item}
                          className="text-sm py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                item === "admin"
                                  ? "bg-purple-500"
                                  : item === "manager"
                                  ? "bg-blue-500"
                                  : "bg-green-500"
                              }`}
                            />
                            <span className="capitalize">{item}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-gray-500" />
                Email Address
              </Label>
              <div className="relative">
                <Input
                  type="email"
                  value={email ?? ""}
                  disabled
                  className="h-9 text-sm rounded-lg bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800 pr-16 w-full"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="submit"
                disabled={isLoading || !isDirty}
                className="flex-1 h-9 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-50 shadow-sm w-full sm:w-auto"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <Save className="w-3.5 h-3.5" />
                    Update
                  </span>
                )}
              </Button>
            </div>

            {/* Status Message */}
            {isDirty && !isLoading && (
              <p className="text-[10px] text-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 py-1.5 rounded-lg">
                You have unsaved changes
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Add responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}