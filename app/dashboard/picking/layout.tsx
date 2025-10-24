"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function PickingLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const role = session?.user?.role;
  const isAdminOrManager = role === "ADMIN" || role === "MANAGER";

  const isActive = (path: string) => {
    if (path === "/dashboard/picking") {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  return (
    <div>
      {/* Show nav only for ADMIN and MANAGER */}
      {isAdminOrManager && (
        <div className="border-b bg-background mb-6">
          <div className="max-w-7xl mx-auto px-6">
            <nav className="flex gap-6">
              <Link
                href="/dashboard/picking"
                className={`px-4 py-3 border-b-2 font-medium transition ${
                  isActive("/dashboard/picking") &&
                  !isActive("/dashboard/picking/active") &&
                  !isActive("/dashboard/picking/workload")
                    ? "border-gray-700 dark:border-gray-200"
                    : "border-transparent hover:text-gray-900 dark:hover:text-gray-400 text-zinc-500"
                }`}
              >
                Assign Orders
              </Link>
              <Link
                href="/dashboard/picking/active"
                className={`px-4 py-3 border-b-2 font-medium transition ${
                  isActive("/dashboard/picking/active")
                    ? "border-gray-700 dark:border-gray-200"
                    : "border-transparent hover:text-gray-900 dark:hover:text-gray-400 text-zinc-500"
                }`}
              >
                Active Pick Lists
              </Link>
              <Link
                href="/dashboard/picking/workload"
                className={`px-4 py-3 border-b-2 font-medium transition ${
                  isActive("/dashboard/picking/workload")
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
