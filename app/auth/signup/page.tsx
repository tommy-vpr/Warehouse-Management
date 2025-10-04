"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
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
import { Package, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import Image from "next/image";
import { startRegistration } from "@simplewebauthn/browser";

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    company: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Create user account
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Account created! Check your email for a sign-in link.");

        // Automatically send sign-in email
        await signIn("email", {
          email: formData.email,
          redirect: false,
        });
      } else {
        setError(data.error || "Failed to create account. Please try again.");
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  async function handlePasskeySignup(email: string) {
    // Step 1. Ask server for registration challenge
    const options = await fetch("/api/webauthn/register", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.json());

    // Step 2. Run WebAuthn registration in browser
    const attResp = await startRegistration(options);

    // Step 3. Send result back to server
    const verifyRes = await fetch("/api/webauthn/register/verify", {
      method: "POST",
      body: JSON.stringify({ email, attResp }),
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.json());

    if (verifyRes.success) {
      setSuccess(
        "Passkey created! You can now sign in with Face ID / Touch ID."
      );
    } else {
      setError("Passkey registration failed.");
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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
            Create your account
          </CardTitle>
          <CardDescription className="text-gray-300 hidden">
            Set up your warehouse management system
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center space-x-2 text-red-300 bg-red-500/10 p-3 rounded-md border border-red-500/30">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 text-green-300 bg-green-500/10 p-3 rounded-md border border-green-500/30">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-100">
                Full name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className="bg-white/10 border border-white/20 text-white placeholder:text-zinc-400
                     focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-100">
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className="bg-white/10 border border-white/20 text-white placeholder:text-zinc-400
                     focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-100">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                minLength={6}
                className="bg-white/10 border border-white/20 text-white placeholder:text-zinc-400
                     focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-gray-100">
                Company name
              </Label>
              <Input
                id="company"
                name="company"
                type="text"
                placeholder="Your Company Inc."
                value={formData.company}
                onChange={handleInputChange}
                disabled={isLoading}
                className="bg-white/10 border border-white/20 text-white placeholder:text-zinc-400
                     focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-violet-500 
                   text-white font-semibold rounded-xl py-2 
                   hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] 
                   transition-all duration-300 cursor-pointer"
              disabled={isLoading || success !== ""}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Account (Email)
            </Button>

            {typeof window !== "undefined" &&
              "PublicKeyCredential" in window && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl py-2
                     hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] 
                     transition-all duration-300 cursor-pointer"
                  onClick={() => handlePasskeySignup(formData.email)}
                >
                  Sign up with Passkey
                </Button>
              )}
          </form>
        </CardContent>

        {/* <CardFooter>
          <p className="text-center text-sm text-gray-300 w-full">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter> */}
      </Card>
    </div>
  );
}
