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
  Search,
  Bell,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// Mock data for demonstration
const mockStats = {
  totalProducts: 1247,
  lowStock: 23,
  pendingOrders: 156,
  todayShipments: 89,
};

const mockRecentActivity = [
  {
    id: 1,
    type: "order",
    message: "Order #1001 received from Shopify",
    time: "2 min ago",
  },
  {
    id: 2,
    type: "inventory",
    message: "Stock adjusted for SKU-ABC123",
    time: "5 min ago",
  },
  {
    id: 3,
    type: "shipment",
    message: "Shipment #SH789 shipped via FedEx",
    time: "12 min ago",
  },
  {
    id: 4,
    type: "scan",
    message: "UPC 123456789012 scanned in location A1-B2",
    time: "15 min ago",
  },
];

const mockLowStockItems = [
  {
    sku: "ABC-123",
    name: "Wireless Headphones",
    current: 5,
    minimum: 20,
    location: "A1-B2",
  },
  {
    sku: "DEF-456",
    name: "Phone Case",
    current: 2,
    minimum: 15,
    location: "B2-C1",
  },
  {
    sku: "GHI-789",
    name: "USB Cable",
    current: 8,
    minimum: 25,
    location: "C1-A3",
  },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showScanner, setShowScanner] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "shipping", label: "Shipping", icon: Truck },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case "inventory":
        return <Package className="w-4 h-4 text-green-500" />;
      case "shipment":
        return <Truck className="w-4 h-4 text-purple-500" />;
      case "scan":
        return <Scan className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                {mockStats.totalProducts.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Low Stock Alerts
              </CardTitle>
              <Badge variant="destructive" className="text-xs">
                {mockStats.lowStock}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {mockStats.lowStock}
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
                {mockStats.pendingOrders}
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
                {mockStats.todayShipments}
              </div>
              <p className="text-xs text-muted-foreground">
                +5% from yesterday
              </p>
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
              <div className="space-y-4">
                {mockRecentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Low Stock Items
                <Badge variant="outline">{mockLowStockItems.length}</Badge>
              </CardTitle>
              <CardDescription>Items below minimum threshold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockLowStockItems.map((item) => (
                  <div
                    key={item.sku}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-600">
                        SKU: {item.sku} • {item.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        {item.current}/{item.minimum}
                      </p>
                      <p className="text-xs text-gray-500">Current/Min</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create Reorder List
              </Button>
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
              <Button variant="outline" className="h-20 flex-col">
                <Scan className="w-6 h-6 mb-2" />
                <span className="text-sm">Receive Items</span>
              </Button>
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
