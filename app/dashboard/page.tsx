"use client";

import React, { useState } from "react";
import {
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  Settings,
  Scan,
  Plus,
  Bell,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import UserMenu from "@/components/UserMenu";
import ScannerModal from "@/components/ScannerModal";
import InventoryView from "@/components/InventoryView";
import OrdersView from "@/components/OrdersView";
import { useSession } from "next-auth/react";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

// Mock data for demonstration
const mockStats = {
  totalProducts: 1247,
  lowStock: 23,
  pendingOrders: 156,
  todayShipments: 89,
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showScanner, setShowScanner] = useState(false);

  const router = useRouter();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: activity } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/activity");
      return res.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/low-stock");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Replace mockStats with stats || defaultValues
  const displayStats = stats || {
    totalProducts: 0,
    lowStock: 0,
    pendingOrders: 0,
    todayShipments: 0,
  };

  // Replace mockRecentActivity with activity || []
  const displayActivity = activity || [];

  // Replace mockLowStockItems with lowStockItems || []
  const displayLowStockItems = lowStockItems || [];

  console.log("Dashboard: ", displayLowStockItems);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case "inventory":
        return <Package className="w-4 h-4 text-green-500" />;
      case "shipment":
        return <Truck className="w-4 h-4 text-teal-500" />;
      case "scan":
        return <Scan className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500 dark:text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayStats.totalProducts.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center justify-between">
                Low Stock Items
                <Badge variant="outline">{displayLowStockItems.length}</Badge>
              </CardTitle>
              <Badge variant="destructive" className="text-xs">
                {displayStats.lowStock}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {displayStats.lowStock}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Orders
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayStats.pendingOrders}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for fulfillment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Shipments
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayStats.todayShipments}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest warehouse operations</CardDescription>
            </CardHeader>
            <CardContent>
              {!activity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : displayActivity.length > 0 ? (
                <div className="space-y-4">
                  {displayActivity.map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3"
                    >
                      {getActivityIcon(activity.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-200">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.time}
                          {activity.userName && (
                            <span className="ml-1 text-blue-500">
                              • by {activity.userName}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Low Stock Items
                <Badge variant="outline">{displayLowStockItems.length}</Badge>
              </CardTitle>
              <CardDescription>Items below minimum threshold</CardDescription>
            </CardHeader>
            <CardContent>
              {!lowStockItems ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : displayLowStockItems.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {displayLowStockItems.map((item: any) => (
                      <div
                        key={item.sku}
                        className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                      >
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            SKU: {item.sku} • {item.location}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            {item.current}/{item.minimum}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Current/Min
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() =>
                      router.push(
                        "/dashboard/purchasing/inventory?status=CRITICAL"
                      )
                    }
                  >
                    {/* <Plus className="w-4 h-4 mr-2" /> */}
                    View All
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">All items are well stocked</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common warehouse operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col">
                <Package className="w-6 h-6 mb-2" />
                <span className="text-sm">Add Product</span>
              </Button>
              <Link href={`/dashboard/inventory/receive`} className="">
                <Button variant="outline" className="h-20 flex-col w-full">
                  <Scan className="w-6 h-6 mb-2" />
                  <span className="text-sm">Receive Items</span>
                </Button>
              </Link>
              <Button variant="outline" className="h-20 flex-col">
                <ShoppingCart className="w-6 h-6 mb-2" />
                <span className="text-sm">Process Orders</span>
              </Button>

              <Button variant="outline" className="h-20 flex-col">
                <Truck className="w-6 h-6 mb-2" />
                <span className="text-sm">Ship Orders</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeTab === "inventory" && <InventoryView />}

      {activeTab === "orders" && <OrdersView />}

      {activeTab === "shipping" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Shipping Management</h2>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-500">
                Shipping features coming in Phase 3...
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-500">Settings panel coming soon...</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && <ScannerModal onClose={() => setShowScanner(false)} />}
    </div>
  );
}
