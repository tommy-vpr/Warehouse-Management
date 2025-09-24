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
  AlignCenterHorizontal,
  PackagePlus,
  Package2,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserMenu from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import Image from "next/image";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "shipping", label: "Shipping", icon: Truck },
    { id: "settings", label: "Settings", icon: Settings },
    // { id: "test-reserve", label: "Test Reserve", icon: AlignCenterHorizontal },
    // { id: "picking", label: "Pick Orders", icon: PackagePlus },
    // { id: "packing", label: "Pack Orders", icon: Package2 },
  ];

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

            <div className="relative w-10 h-10 sm:w-12 sm:h-12">
              <Image
                src="/images/headquarter-logo.webp"
                alt="HQ warehouse management"
                fill
                className="object-contain dark:invert"
                sizes="(max-width: 640px) 32px, 48px"
              />
            </div>

            {/* Search (hidden on very small screens) */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search products, orders, SKUs..."
                className="pl-10 w-48 md:w-64"
              />
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link href={"/dashboard/inventory/receive"}>
              <Button className="bg-blue-600 hover:bg-blue-700 dark:text-gray-200 hidden sm:flex">
                <Scan className="w-4 h-4 mr-2" />
                Quick Scan
              </Button>
            </Link>

            <Button variant="outline" size="icon">
              <Bell className="w-4 h-4" />
            </Button>

            {/* Theme Toggle - ADD IT HERE */}
            <ThemeToggle />

            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`
    fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border
    transform transition-transform duration-200 ease-in-out
    sm:static sm:translate-x-0 sm:transform-none
    ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
  `}
        >
          {/* Mobile-only close button */}
          <div className="flex justify-end sm:hidden p-2">
            <button onClick={() => setMobileMenuOpen(false)}>
              <X className="w-6 h-6 text-foreground" />
            </button>
          </div>

          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                href={
                  item.id === "dashboard"
                    ? "/dashboard"
                    : `/dashboard/${item.id}`
                }
                key={item.id}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left text-foreground hover:bg-accent transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
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
