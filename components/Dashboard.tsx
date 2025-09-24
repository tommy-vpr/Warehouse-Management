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
    <div className="min-h-screen bg-background">
      {/* Your existing dashboard JSX here */}
      <p>Dashboard component loaded successfully!</p>
    </div>
  );
}
