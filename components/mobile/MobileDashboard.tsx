"use client";

import React from "react";
import {
  Package,
  ShoppingCart,
  ClipboardList,
  PackageCheck,
  Truck,
  MapPin,
  Users,
  BarChart3,
  Settings,
  RotateCcw,
  ScanBarcode,
  RefreshCcw,
  ListCheck,
  User,
  Bell,
  FileText,
  ArrowLeftRight,
  ShoppingBag,
  CalendarDays,
  LaptopMinimal,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

export function MobileDashboard() {
  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // Replace with your actual stats API
      return {
        pendingOrders: 24,
        inProgress: 12,
        completed: 156,
      };
    },
    staleTime: 60000,
  });

  const menuItems = [
    {
      icon: LaptopMinimal,
      label: "Dashboard",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard",
    },
    {
      icon: ListCheck,
      label: "Inventory",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/inventory",
    },
    {
      icon: ShoppingCart,
      label: "Orders",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/orders",
    },
    {
      icon: User,
      label: "My Work",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/my-work",
    },
    {
      icon: Bell,
      label: "Notifications",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/notifications",
    },
    {
      icon: ClipboardList,
      label: "Picking",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/picking",
    },
    {
      icon: PackageCheck,
      label: "Packing",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/packing",
    },
    {
      icon: Truck,
      label: "Shipping",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/shipping",
    },
    {
      icon: ScanBarcode,
      label: "Receiving",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/inventory/receive/po",
    },
    {
      icon: MapPin,
      label: "Locations",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/locations/print-labels",
    },
    {
      icon: ArrowLeftRight,
      label: "Transfers",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/inventory/transfers",
    },
    {
      icon: ShoppingBag,
      label: "Backorders",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/backorders",
    },
    {
      icon: CalendarDays,
      label: "Planner",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/inventory-planner",
    },
    {
      icon: RefreshCcw,
      label: "Cycle Count",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/inventory/count",
    },
    {
      icon: FileText,
      label: "POs",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/inventory/receive/po",
    },
    {
      icon: Settings,
      label: "Settings",
      color: "bg-gradient-to-t from-blue-600 to-blue-500",
      href: "/dashboard/settings",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Stats Summary */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {statsData?.pendingOrders || 0}
            </div>
            <div className="text-xs text-muted-foreground">Pending Orders</div>
          </div>
          <div className="text-center border-l border-r border-border">
            <div className="text-2xl font-bold text-foreground">
              {statsData?.inProgress || 0}
            </div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {statsData?.completed || 0}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>
      </div>

      {/* 2-Column Grid Menu */}
      <div className="p-4 pb-24">
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="bg-card rounded-xl shadow-sm p-6 flex flex-col items-center justify-center gap-3 active:scale-95 transform transition-transform border border-border"
            >
              <div className={`${item.color} p-4 rounded-full`}>
                <item.icon className="w-8 h-8 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
        <div className="grid grid-cols-4 gap-1 p-2">
          <Link
            href="/dashboard/inventory/receive/scan"
            className="flex flex-col items-center gap-1 p-2 hover:bg-accent rounded-lg"
          >
            <ScanBarcode className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Scan</span>
          </Link>
          <Link
            href="/dashboard/my-work"
            className="flex flex-col items-center gap-1 p-2 hover:bg-accent rounded-lg"
          >
            <ClipboardList className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Tasks</span>
          </Link>
          <Link
            href="/dashboard/inventory"
            className="flex flex-col items-center gap-1 p-2 hover:bg-accent rounded-lg"
          >
            <Package className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Search</span>
          </Link>
          <Link
            href="/dashboard/orders"
            className="flex flex-col items-center gap-1 p-2 hover:bg-accent rounded-lg"
          >
            <FileText className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Orders</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
