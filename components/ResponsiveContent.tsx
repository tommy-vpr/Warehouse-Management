"use client";

import { useEffect, useState, ReactNode } from "react";
import { MobileDashboard } from "./mobile/MobileDashboard";

interface ResponsiveContentProps {
  children: ReactNode;
}

export function ResponsiveContent({ children }: ResponsiveContentProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check initial screen size
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 468);
    };

    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  // Show mobile dashboard on small screens
  if (isMobile) {
    return <MobileDashboard />;
  }

  // Show regular content on larger screens
  return <>{children}</>;
}
