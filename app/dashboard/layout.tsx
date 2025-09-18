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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserMenu from "@/components/UserMenu";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [showScanner, setShowScanner] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "shipping", label: "Shipping", icon: Truck },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "test-reserve", label: "Test Reserve", icon: AlignCenterHorizontal },
    { id: "picking", label: "Pick Orders", icon: PackagePlus },
    { id: "packing", label: "Pack Orders", icon: Package2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">WMS Dashboard</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products, orders, SKUs..."
                className="pl-10 w-64"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setShowScanner(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Scan className="w-4 h-4 mr-2" />
              Quick Scan
            </Button>
            <Button variant="outline" size="icon">
              <Bell className="w-4 h-4" />
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Layout with Aside */}
      <div className="flex">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              //   <button
              //     key={item.id}
              //     className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
              //   >
              //     <item.icon className="w-5 h-5" />
              //     <span>{item.label}</span>
              //   </button>
              <Link
                href={
                  item.id === "dashboard"
                    ? "/dashboard"
                    : `/dashboard/${item.id}`
                }
                key={item.id}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
