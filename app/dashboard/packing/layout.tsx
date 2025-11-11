// app/(dashboard)/packing/layout.tsx
// Compact Segmented Control Approach
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

  const navItems = [
    { href: "/dashboard/packing", label: "Assign", fullLabel: "Assign Orders" },
    {
      href: "/dashboard/packing/active",
      label: "Active",
      fullLabel: "Active Packing Tasks",
    },
    {
      href: "/dashboard/packing/workload",
      label: "Workload",
      fullLabel: "Staff Workload",
    },
  ];

  return (
    <div>
      {isAdminOrManager && (
        <div className="border-b bg-background my-6 max-w-7xl mx-auto px-4">
          <div className="">
            {/* Mobile: Compact Segmented Control */}
            <div className="sm:hidden">
              <div className="inline-flex w-full bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex-1 px-3 py-2 text-sm font-medium text-center rounded-md transition ${
                      isActive(item.href)
                        ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop: Tabs */}
            <nav className="hidden sm:flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-3 border-b-2 font-medium transition ${
                    isActive(item.href)
                      ? "border-gray-700 dark:border-gray-200 text-gray-900 dark:text-white"
                      : "border-transparent hover:text-gray-900 dark:hover:text-gray-400 text-zinc-500"
                  }`}
                >
                  {item.fullLabel}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
