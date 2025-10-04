"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const { toast } = useToast();

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else if (result?.ok) {
        toast({
          title: "Welcome!",
        });
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      // First ensure demo user exists
      await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "demo@wms.com" }),
      });

      // Then sign in with demo credentials
      const result = await signIn("demo", {
        email: "demo@wms.com",
        redirect: false,
      });

      if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Demo login failed. Please try again.");
      }
    } catch (error) {
      setError("Demo login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <Card
        className="w-full max-w-md 
             bg-white/10 backdrop-blur-xl 
             border border-white/20 
             shadow-xl rounded-2xl 
             text-gray-100"
      >
        <CardHeader className="space-y-1 text-center">
          <div className="relative w-16 h-16 m-auto">
            <Image
              src="/images/headquarter-logo.webp"
              alt="HQ warehouse management"
              fill
              className="object-contain drop-shadow-lg invert"
              sizes="64px"
            />
          </div>
          <CardTitle className="text-xl text-white">
            Sign into your account
          </CardTitle>
          {/* <CardDescription className="text-gray-00">
            Sign in to your warehouse management system
          </CardDescription> */}
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-700/10 p-3 rounded-md border border-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-100">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-white/10 border border-white/20 text-white placeholder:text-gray-400
                     focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-100">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-white/10 border border-white/20 text-white placeholder:text-gray-400
                       focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-violet-500 
                   text-white font-semibold rounded-xl py-2 
                   hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] 
                   transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sign in
            </Button>
          </form>

          <div className="flex items-center gap-4">
            <span className="flex-1 border-t border-white/20" />
            <span className="text-gray-300 text-xs uppercase">Or</span>
            <span className="flex-1 border-t border-white/20" />
          </div>

          <Button
            className="w-full bg-white/10 text-white 
                 border border-white/20 rounded-xl py-2
                 hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] 
                 transition-all duration-300"
            onClick={handleDemoLogin}
            disabled={isLoading}
          >
            <Package className="h-4 w-4 mr-2" />
            Demo Login
          </Button>
        </CardContent>

        {/* <CardFooter>
          <p className="text-center text-sm text-gray-300 w-full">
            Don't have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Sign up
            </Link>
          </p>
        </CardFooter> */}
      </Card>
    </div>
  );
}
