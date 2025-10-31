"use client";

import { ReactNode, useState } from "react";
import {
  BarChart3,
  Bell,
  Package,
  Scan,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Import,
  Menu,
  X,
  RefreshCw,
  FileText,
  MapPin,
  CalendarDays,
  ArrowLeftRight,
  ShoppingBag,
  LaptopMinimal,
  ChartColumn,
  ScanText,
  User,
  File,
  Scroll,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationBell from "@/components/notification/NotificationBell";
import { useQuery } from "@tanstack/react-query";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Fetch unread notification count
  const { data: notificationData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = notificationData?.unreadCount || 0;

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LaptopMinimal },
    { id: "inventory", label: "Inventory", icon: ChartColumn },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "my-work", label: "My Work", icon: User },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      showCount: true,
    },
    { id: "inventory/receive/po", label: "Purchase Orders", icon: FileText },
    { id: "invoice", label: "Invoice", icon: Scroll },
    // { id: "purchasing", label: "Purchasing", icon: DollarSign },
    { id: "locations/print-labels", label: "Locations", icon: MapPin },
    { id: "inventory/transfers", label: "Transfers", icon: ArrowLeftRight },
    { id: "backorders", label: "Backorders", icon: ShoppingBag },
    {
      id: "inventory-planner",
      label: "Inventory Planner",
      icon: CalendarDays,
    },
    { id: "picking", label: "Picking", icon: ScanText }, // 🟢
    { id: "packing", label: "Packing", icon: Package }, // 📦

    { id: "shipping", label: "Tracking", icon: Truck },
    { id: "import", label: "Import", icon: Import },
    { id: "inventory/count", label: "Cycle Count", icon: RefreshCw },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const activeItem = menuItems
    .filter((item) => pathname.startsWith(`/dashboard/${item.id}`))
    .sort((a, b) => b.id.length - a.id.length)[0]?.id;

  const checkActive = (id: string) => id === activeItem;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: logo + search */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              className="sm:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-foreground" />
              ) : (
                <Menu className="w-6 h-6 text-foreground" />
              )}
            </button>

            <div className="relative hidden md:block md:w-10 md:h-10">
              <Link href={"/dashboard"}>
                <Image
                  src="/images/headquarter-logo.webp"
                  alt="HQ warehouse management"
                  fill
                  className="object-contain dark:invert"
                  sizes="(max-width: 640px) 32px, 48px"
                />
              </Link>
            </div>

            {/* Search (hidden on very small screens) */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <GlobalSearch />
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              href="/dashboard/inventory/receive/scan"
              className="hidden sm:block"
            >
              <Button className="cursor-pointer bg-blue-600 hover:bg-blue-700 dark:text-gray-200">
                <Scan className="w-4 h-4" />
                Receive
              </Button>
            </Link>

            {/* Mobile: Icon-only buttons */}
            <Link href="/dashboard/inventory/receive" className="sm:hidden">
              <Button
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 text-gray-200"
              >
                <Scan className="w-4 h-4" />
              </Button>
            </Link>

            <Link href="/dashboard/picking/scan" className="sm:hidden">
              <Button
                size="icon"
                className="bg-gray-600 hover:bg-gray-700 text-gray-200"
              >
                <Scan className="w-4 h-4" />
              </Button>
            </Link>

            <NotificationBell />

            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={clsx(
            "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out sm:static sm:translate-x-0 sm:transform-none",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex justify-end sm:hidden p-2">
            <button onClick={() => setMobileMenuOpen(false)}>
              <X className="w-6 h-6 text-foreground" />
            </button>
          </div>

          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const href =
                item.id === "dashboard"
                  ? "/dashboard"
                  : `/dashboard/${item.id}`;

              const active = checkActive(item.id);

              return (
                <Link
                  key={item.id}
                  href={href}
                  className={clsx(
                    "text-xs w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors",
                    active
                      ? "bg-gray-200 text-zinc-900 dark:bg-black dark:text-gray-200"
                      : "text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-4 h-4" />
                    <span>
                      {item.label}
                      {item.label === "Notifications" &&
                        item.showCount &&
                        unreadCount > 0 && (
                          <> ({unreadCount > 99 ? "99+" : unreadCount})</>
                        )}
                    </span>
                  </div>

                  {/* {item.showCount && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full w-3 h-3 min-w-3 min-h-3 text-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )} */}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Overlay (mobile only) */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/40 bg-opacity-50 z-30 sm:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
