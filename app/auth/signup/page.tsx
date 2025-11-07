"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, CheckCircle, Clock } from "lucide-react";
import Image from "next/image";

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rateLimitExpiry, setRateLimitExpiry] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  // Countdown timer effect
  useEffect(() => {
    if (!rateLimitExpiry) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((rateLimitExpiry - now) / 1000));

      setCountdown(remaining);

      if (remaining === 0) {
        setRateLimitExpiry(null);
        setError("");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitExpiry]);

  // Check if passwords match
  useEffect(() => {
    if (formData.confirmPassword === "") {
      setPasswordsMatch(true);
      return;
    }
    setPasswordsMatch(formData.password === formData.confirmPassword);
  }, [formData.password, formData.confirmPassword]);

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(
          "Account created! Please check your email to verify your account."
        );
        // Clear form
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
      } else {
        if (response.status === 429) {
          const expiryTime = Date.now() + data.retryAfter * 1000;
          setRateLimitExpiry(expiryTime);
          setError(
            "Too many signup attempts. Please wait before trying again."
          );
        } else {
          setError(data.error || "Failed to create account. Please try again.");
        }
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const isRateLimited = rateLimitExpiry && countdown > 0;

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

          {isRateLimited && (
            <div className="flex items-center justify-center space-x-2 text-orange-400 bg-orange-700/10 p-3 rounded-md border border-orange-400">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                Try again in {formatCountdown(countdown)}
              </span>
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
                disabled={isLoading || success !== "" || !!isRateLimited}
                className="bg-white/10 border border-white/20 text-white placeholder:text-zinc-400
                     focus:ring-2 focus:ring-blue-400 focus:outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={isLoading || success !== "" || !!isRateLimited}
                className="bg-white/10 border border-white/20 text-white placeholder:text-zinc-400
                     focus:ring-2 focus:ring-blue-400 focus:outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={isLoading || success !== "" || !!isRateLimited}
                minLength={6}
                className="bg-white/10 border border-white/20 text-white placeholder:text-zinc-400
                     focus:ring-2 focus:ring-blue-400 focus:outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-100">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                disabled={isLoading || success !== "" || !!isRateLimited}
                minLength={6}
                className={`bg-white/10 border text-white placeholder:text-zinc-400
                     focus:ring-2 focus:outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed
                     ${
                       !passwordsMatch && formData.confirmPassword !== ""
                         ? "border-red-500 focus:ring-red-400"
                         : "border-white/20 focus:ring-blue-400"
                     }`}
              />
              {!passwordsMatch && formData.confirmPassword !== "" && (
                <p className="text-xs text-red-400">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-violet-500 
                   text-white font-semibold rounded-xl py-2 
                   hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] 
                   transition-all duration-300 cursor-pointer
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
              disabled={
                isLoading ||
                success !== "" ||
                !!isRateLimited ||
                !passwordsMatch
              }
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isRateLimited ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Locked ({formatCountdown(countdown)})
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
