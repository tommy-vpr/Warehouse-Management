// app/(dashboard)/packing/layout.tsx
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function PackingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/dashboard/packing") {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdminOrManager = role === "ADMIN" || role === "MANAGER";

  return (
    <div>
      {isAdminOrManager && (
        <div className="border-b bg-background mb-6">
          <div className="max-w-7xl mx-auto px-6">
            <nav className="flex gap-6">
              <Link
                href="/dashboard/packing"
                className={`px-4 py-3 border-b-2 font-medium transition ${
                  isActive("/dashboard/packing") &&
                  !isActive("/dashboard/packing/active") &&
                  !isActive("/dashboard/packing/workload")
                    ? "border-gray-700 dark:border-gray-200"
                    : "border-transparent hover:text-gray-900 dark:hover:text-gray-400 text-zinc-500"
                }`}
              >
                Assign Orders
              </Link>
              <Link
                href="/dashboard/packing/active"
                className={`px-4 py-3 border-b-2 font-medium transition ${
                  isActive("/dashboard/packing/active")
                    ? "border-gray-700 dark:border-gray-200"
                    : "border-transparent hover:text-gray-900 dark:hover:text-gray-400 text-zinc-500"
                }`}
              >
                Active Packing Tasks
              </Link>
              <Link
                href="/dashboard/packing/workload"
                className={`px-4 py-3 border-b-2 font-medium transition ${
                  isActive("/dashboard/packing/workload")
                    ? "border-gray-700 dark:border-gray-200"
                    : "border-transparent hover:text-gray-900 dark:hover:text-gray-400 text-zinc-500"
                }`}
              >
                Staff Workload
              </Link>
            </nav>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
