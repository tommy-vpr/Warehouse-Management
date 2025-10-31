// app/not-found.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-6">
      <Image
        src="/images/404-main.webp"
        width={600}
        height={600}
        alt="Page not found"
        quality={80}
      />
      <p className="text-muted-foreground mb-8">
        Oops! The page you’re looking for doesn’t exist.
      </p>
      <Link href="/dashboard">
        <Button className="bg-yellow-500 hover:bg-yellow-600 text-gray-700 transition">
          Return to Dashboard
        </Button>
      </Link>
    </main>
  );
}
