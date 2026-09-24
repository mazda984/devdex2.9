import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth";
import { useRegister, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Gamepad2, Loader2 } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username is too long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Register() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const registerMutation = useRegister();

  useEffect(() => {
    if (!isAuthLoading && user) {
      setLocation("/");
    }
  }, [user, isAuthLoading, setLocation]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    registerMutation.mutate(
      { data: values },
      {
        onSuccess: (data: any) => {
          queryClient.setQueryData(getGetMeQueryKey(), data.user);
          toast({
            title: "Account Created!",
            description: `Welcome to DevDex, ${data.user.username}.`,
          });
          setLocation("/");
        },
        onError: (error: any) => {
          toast({
            title: "Registration Failed",
            description: error.data?.error || "Failed to create account.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isAuthLoading || user) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0b1220]">
      {/* Retro üst çubuk */}
      <div className="relative z-20 bg-[#0e1622] border-b border-black/40">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-white font-extrabold text-xl tracking-tight">
              <div className="bg-primary text-primary-foreground rounded-md p-1">
                <Gamepad2 className="w-5 h-5" />
              </div>
              Devdex
            </Link>
            <nav className="hidden sm:flex items-center gap-5 text-sm font-semibold text-slate-300">
              <Link href="/games" className="hover:text-white transition-colors">Play</Link>
              <span className="text-white border-b-2 border-primary pb-1">About</span>
              <Link href="/studio" className="hover:text-white transition-colors">Platforms</Link>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Input
              placeholder="Username"
              className="h-9 w-32 bg-white/95 border-none text-slate-800 placeholder:text-slate-400"
            />
            <Input
              type="password"
              placeholder="Password"
              className="h-9 w-32 bg-white/95 border-none text-slate-800 placeholder:text-slate-400"
            />
            <Link href="/login">
              <Button className="h-9 bg-emerald-600 hover:bg-emerald-500 font-bold">Log In</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero arkaplan + hafif shader */}
      <div className="relative flex-1 flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/assets/register-hero.png)" }}
        />
        {/* hafif shader / gradyan katmanı */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
        <div
          className="absolute inset-0 mix-blend-overlay opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 30% 20%, rgba(120,180,255,0.35), transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-[1400px] w-full mx-auto px-5 py-16 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="text-white max-w-xl">
            <h1
              className="text-6xl sm:text-7xl font-black tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
              style={{ WebkitTextStroke: "2px rgba(0,0,0,0.25)" }}
            >
              Devdex
            </h1>
            <p className="mt-4 text-lg sm:text-xl font-semibold text-slate-100/90 drop-shadow-md">
              Oyun bul, oyun yap, DexBux kazan.
            </p>
          </div>

          <div className="w-full sm:max-w-md bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl border border-black/10 p-6">
            <h2 className="text-slate-900 text-xl font-bold mb-4">Sign up and start having fun!</h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Username (6-20 characters, no spaces)"
                          className="h-11 bg-white text-slate-900 border-slate-300"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          className="h-11 bg-white text-slate-900 border-slate-300"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Password (min 6 characters)"
                          className="h-11 bg-white text-slate-900 border-slate-300"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 uppercase font-semibold">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-semibold mt-4 bg-white text-slate-800"
              onClick={() => {
                const apiUrl = import.meta.env.VITE_API_URL || "";
                window.location.href = `${apiUrl}/api/auth/google`;
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="mt-4 border-t border-slate-200 pt-4 text-center text-sm">
              <span className="text-slate-500">Already have an account? </span>
              <Link href="/login" className="font-bold text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 left-5 z-10 text-white/80 text-xs font-medium drop-shadow">
          Devdex Point<br />Builder: DevdexTeam
        </div>
      </div>
    </div>
  );
}
