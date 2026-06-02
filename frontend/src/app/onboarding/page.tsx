// // "use client"
// // import { Button } from "@/components/ui/button";
// // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// // import { Input } from "@/components/ui/input";
// // import { Label } from "@/components/ui/label";
// // import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// // import { currencyOption } from "@/lib/utils";
// // import { onboardingSchema } from "@/lib/zodSchema";
// // import { zodResolver } from "@hookform/resolvers/zod";
// // import { useRouter } from "next/navigation";

// // import { useState } from "react";
// // import { useForm } from "react-hook-form";
// // import { boolean, z } from "zod";

// // export default function OnboardingPage() {
// //     const { register, handleSubmit, formState: { errors }, } = useForm<z.infer<typeof onboardingSchema>>({
// //         resolver : zodResolver(onboardingSchema),
// //         defaultValues : {
// //              currency : "NPR"
// //         }
// //     })

// //     const router = useRouter()
// //     const [isLoading, setIsLoading] = useState<boolean>(false)

// //     const onSubmit = async (data : z.infer<typeof onboardingSchema>)=>{
// //         try {
// //             setIsLoading(true)
// //             const response = await fetch('/api/user',{
// //                 method: "put",
// //                 body: JSON.stringify(data)
// //             })
// //             const responseData = await response.json()

// //             if(response.status === 200){

// //                 router.push("/dashboard")
// //             }

// //         } catch (error) {
// //             console.log(error)

// //         } finally{
// //             setIsLoading(false)
// //         }
// //     }
// //     return (
// //         <div className="flex justify-center items-center flex-col min-h-dvh overflow-auto h-dvh relative p-4">
// //             <Card className="min-h-xs lg:min-w-sm w-full max-w-sm">
// //                 <CardHeader>
// //                     <CardTitle>
// //                         You are almost finished
// //                     </CardTitle>

// //                     <CardDescription>
// //                         Enter your Information to create an account
// //                     </CardDescription>
// //                 </CardHeader>

// //                 <CardContent>
// //                     <form className="grid gap-4" onSubmit = {handleSubmit(onSubmit)}>
// //                         <div className="grid gap-2">
// //                             <Label>First Name</Label>
// //                             <Input
// //                                 placeholder="Sagar"
// //                                 type="text"
// //                                 {...register("firstName", { required : true })}
// //                                 disabled={isLoading}
// //                             />
// //                             {
// //                                 errors.firstName && (
// //                                     <p className="text-xs text-red-400">
// //                                         {errors.firstName.message}
// //                                     </p>
// //                                 )
// //                             }
// //                         </div>

// //                         <div className="grid gap-2">
// //                             <Label>Last Name</Label>
// //                             <Input
// //                                 placeholder="Bista"
// //                                 type="text"
// //                                 {...register("lastName", { required : true })}
// //                                 disabled={isLoading}
// //                             />
// //                              {
// //                                 errors.lastName && (
// //                                     <p className="text-xs text-red-400">
// //                                         {errors.lastName.message}
// //                                     </p>
// //                                 )
// //                             }

// //                         </div>

// //                         <div className="grid gap-2">
// //                             <Label>Select Currency</Label>
// //                             <Select
// //                                defaultValue="NPR"
// //                                {...register("currency")}
// //                                disabled={isLoading}
// //                             >
// //                                 <SelectTrigger className="w-full">
// //                                     <SelectValue placeholder="Select currency" />
// //                                 </SelectTrigger>

// //                                 <SelectContent>
// //                                     {
// //                                         Object.keys(currencyOption).map((item: string, index: number) => {
// //                                             return (
// //                                                 <SelectItem key={item} value={item}>{item}</SelectItem>
// //                                             )
// //                                         })
// //                                     }

// //                                 </SelectContent>
// //                             </Select>
// //                         </div>

// //                         <Button disabled={isLoading}>
// //                             {
// //                                 isLoading ? "Wait a while..." : "Finish Onboarding"
// //                             }
// //                         </Button>

// //                     </form>
// //                 </CardContent>
// //             </Card>
// //         </div>
// //     )
// // }
// "use client";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { currencyOption, user_role } from "@/lib/utils";
// import { onboardingSchema } from "@/lib/zodSchema";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useRouter } from "next/navigation";

// import { useState } from "react";
// import { useForm, Controller } from "react-hook-form";
// import toast from "react-hot-toast";
// import { z } from "zod";

// import BackendApi from "../_components/Common";

// export default function OnboardingPage() {
//   const {
//     register,
//     handleSubmit,
//     control,
//     formState: { errors },
//   } = useForm<z.infer<typeof onboardingSchema>>({
//     resolver: zodResolver(onboardingSchema),
//     defaultValues: {
//       role: "farmer",
//     },
//   });

//   const router = useRouter();
//   const [isLoading, setIsLoading] = useState<boolean>(false);

//   const onSubmit = async (data: z.infer<typeof onboardingSchema>) => {
//     try {
//       setIsLoading(true);
//       const response = await fetch(BackendApi.Onboarding.url, {
//         method: BackendApi.Onboarding.method,
//         credentials: "include",
//         headers: {
//           "content-type": "application/json",
//         },
//         body: JSON.stringify(data),
//       });
//       const responseData = await response.json();
//       console.log("response Data", responseData)

//       if (response.status === 200) {
//         toast.success(responseData.message); 
//         router.push("/jwtSetup");
//       } else {
//         toast.error(responseData.message);
//       }
//     } catch (error) {
//       console.log(error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="flex justify-center items-center flex-col min-h-dvh overflow-auto h-dvh relative p-4">
//       <Card className="min-h-xs lg:min-w-sm w-full max-w-sm">
//         <CardHeader>
//           <CardTitle>You are almost finished</CardTitle>

//           <CardDescription>
//             Enter your Information to create an account
//           </CardDescription>
//         </CardHeader>

//         <CardContent>
//           <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
//             <div className="grid gap-2">
//               <Label>First Name</Label>
//               <Input
//                 placeholder="Sagar"
//                 type="text"
//                 {...register("firstName", { required: true })}
//                 disabled={isLoading}
//               />
//               {errors.firstName && (
//                 <p className="text-xs text-red-400">
//                   {errors.firstName.message}
//                 </p>
//               )}
//             </div>

//             <div className="grid gap-2">
//               <Label>Last Name</Label>
//               <Input
//                 placeholder="Bista"
//                 type="text"
//                 {...register("lastName", { required: true })}
//                 disabled={isLoading}
//               />
//               {errors.lastName && (
//                 <p className="text-xs text-red-400">
//                   {errors.lastName.message}
//                 </p>
//               )}
//             </div>

//             <div className="grid gap-2">
//               <Label>Device_Id</Label>
//               <Input
//                 placeholder="ESP32_023346"
//                 type="text"
//                 {...register("device_id", { required: true })}
//                 disabled={isLoading}
//               />
//               {errors.device_id && (
//                 <p className="text-xs text-red-400">
//                   {errors.device_id.message}
//                 </p>
//               )}
//             </div>

//             <div className="grid gap-2">
//               <Label>Select user Role</Label>
//               {/* Updated Select with Controller */}
//               <Controller
//                 name="role"
//                 control={control}
//                 defaultValue="farmer"
//                 render={({ field }) => (
//                   <Select
//                     {...field}
//                     disabled={isLoading}
//                     onValueChange={(value) => field.onChange(value)}
//                   >
//                     <SelectTrigger className="w-full">
//                       <SelectValue placeholder="Select user role" />
//                     </SelectTrigger>

//                     <SelectContent>
//                       {Object.keys(user_role).map((item: string) => (
//                         <SelectItem key={item} value={item}>
//                           {item}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 )}
//               />
//             </div>

//             <Button disabled={isLoading}>
//               {isLoading ? "Wait a while..." : "Finish Onboarding"}
//             </Button>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }


"use client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currencyOption, user_role } from "@/lib/utils";
import { onboardingSchema } from "@/lib/zodSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import {
  User,
  Fingerprint,
  Shield,
  Loader2,
  Sparkles,
  ArrowRight,
  MapPin,
  Phone,
} from "lucide-react";

import BackendApi from "../(dashboard)/_components/Common";

export default function OnboardingPage() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      role: "farmer",
    },
  });

  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
          icon: '🎉',
          style: {
            borderRadius: '12px',
            background: '#10b981',
            color: '#fff',
            fontSize: '14px',
          },
        });
        router.push("/dashboard");
      } else {
        toast.error(responseData.message, {
          style: {
            borderRadius: '12px',
            background: '#ef4444',
            color: '#fff',
            fontSize: '14px',
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

  // Field configurations
  const fields = [
    {
      name: "firstName",
      label: "First Name",
      icon: User,
      placeholder: "Sagar",
      color: "blue"
    },
    {
      name: "lastName",
      label: "Last Name",
      icon: User,
      placeholder: "Bista",
      color: "indigo"
    },
    {
      name: "device_id",
      label: "Device ID",
      icon: Fingerprint,
      placeholder: "ESP32_023346",
      color: "purple"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-blue-100/50 dark:border-blue-900/50 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header with gradient */}
        <CardHeader className="text-center pb-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg mb-4 mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Almost finished!
          </CardTitle>
          <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
            Enter your information to complete setup
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {/* Name Fields - Grid */}
            <div className="grid grid-cols-2 gap-3">
              {fields.slice(0, 2).map((field) => {
                const Icon = field.icon;
                const error = errors[field.name as keyof typeof errors];
                
                return (
                  <div key={field.name} className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <Icon className={`w-3.5 h-3.5 text-${field.color}-500`} />
                      {field.label}
                    </Label>
                    <Input
                      {...register(field.name as any)}
                      placeholder={field.placeholder}
                      disabled={isLoading}
                      className={`
                        h-10 text-sm rounded-xl border-gray-200 dark:border-gray-800
                        bg-white dark:bg-gray-900
                        focus:ring-2 focus:ring-${field.color}-500/20 focus:border-${field.color}-500
                        hover:border-${field.color}-300 dark:hover:border-${field.color}-700
                        transition-all duration-200
                        ${error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''}
                      `}
                    />
                    {error && (
                      <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full" />
                        {error.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Device ID */}
            {fields.slice(2, 3).map((field) => {
              const Icon = field.icon;
              const error = errors[field.name as keyof typeof errors];
              
              return (
                <div key={field.name} className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Icon className={`w-3.5 h-3.5 text-${field.color}-500`} />
                    {field.label}
                  </Label>
                  <Input
                    {...register(field.name as any)}
                    placeholder={field.placeholder}
                    disabled={isLoading}
                    className={`
                      h-10 text-sm rounded-xl border-gray-200 dark:border-gray-800
                      bg-white dark:bg-gray-900
                      focus:ring-2 focus:ring-${field.color}-500/20 focus:border-${field.color}-500
                      hover:border-${field.color}-300 dark:hover:border-${field.color}-700
                      transition-all duration-200
                      ${error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''}
                    `}
                  />
                  {error && (
                    <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full" />
                      {error.message}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Role Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-purple-500" />
                User Role
              </Label>
              <Controller
                name="role"
                control={control}
                defaultValue="farmer"
                render={({ field }) => (
                  <Select
                    {...field}
                    disabled={isLoading}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger className="w-full h-10 text-sm rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200">
                      <SelectValue placeholder="Select user role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-200 dark:border-gray-800">
                      {Object.keys(user_role).map((item: string) => (
                        <SelectItem 
                          key={item} 
                          value={item}
                          className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950/50 py-2 text-sm capitalize"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              item === 'admin' ? 'bg-purple-500' :
                              item === 'manager' ? 'bg-blue-500' :
                              'bg-green-500'
                            }`} />
                            {item}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Optional: District + Region + Phone */}
            <div className="space-y-3 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                Location & Contact (optional)
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* District */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    District
                  </Label>
                  <Input
                    {...register("district")}
                    placeholder="Kanchanpur"
                    disabled={isLoading}
                    className="h-10 text-sm rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 hover:border-green-300 dark:hover:border-green-700 transition-all duration-200"
                  />
                  {errors.district && (
                    <p className="text-[10px] text-red-500">{errors.district.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-green-500" />
                    Phone
                  </Label>
                  <Input
                    {...register("phone")}
                    type="tel"
                    placeholder="+977 98XXXXXXXX"
                    disabled={isLoading}
                    className="h-10 text-sm rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 hover:border-green-300 dark:hover:border-green-700 transition-all duration-200"
                  />
                  {errors.phone && (
                    <p className="text-[10px] text-red-500">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* Region */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Region
                </Label>
                <Controller
                  name="region"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || undefined)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full h-10 text-sm rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 hover:border-green-300 dark:hover:border-green-700 transition-all duration-200">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-gray-200 dark:border-gray-800">
                        {["Terai", "Mid-hills", "Hilly", "Mountain"].map((r) => (
                          <SelectItem key={r} value={r} className="cursor-pointer text-sm">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Progress indicator */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Step 2 of 2</span>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Almost done</span>
              </div>
              <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up your account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Complete Setup
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            {/* Help text */}
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-4">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
