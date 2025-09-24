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
      {/* Top Navigation */}
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

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-700 hover:bg-background"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === "dashboard" && (
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
                    <CardDescription>
                      Latest warehouse operations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockRecentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start space-x-3"
                        >
                          {getActivityIcon(activity.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              {activity.message}
                            </p>
                            <p className="text-xs text-gray-500">
                              {activity.time}
                            </p>
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
                      <Badge variant="outline">
                        {mockLowStockItems.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Items below minimum threshold
                    </CardDescription>
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
          )}

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
        </main>
      </div>

      {/* Scanner Modal */}
      {showScanner && <ScannerModal onClose={() => setShowScanner(false)} />}
    </div>
  );
}

// Inventory View Component
function InventoryView() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockInventory = [
    {
      id: 1,
      sku: "ABC-123",
      name: "Wireless Headphones",
      upc: "123456789012",
      location: "A1-B2",
      onHand: 45,
      reserved: 12,
      available: 33,
      lastCounted: "2024-01-15",
    },
    {
      id: 2,
      sku: "DEF-456",
      name: "Phone Case",
      upc: "234567890123",
      location: "B2-C1",
      onHand: 128,
      reserved: 8,
      available: 120,
      lastCounted: "2024-01-10",
    },
    {
      id: 3,
      sku: "GHI-789",
      name: "USB Cable",
      upc: "345678901234",
      location: "C1-A3",
      onHand: 89,
      reserved: 15,
      available: 74,
      lastCounted: "2024-01-12",
    },
  ];

  const filteredInventory = mockInventory.filter(
    (item) =>
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.upc.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Inventory Management</h2>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
          <Button>
            <Scan className="w-4 h-4 mr-2" />
            Bulk Scan
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Current Inventory</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by SKU, name, or UPC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">SKU</th>
                  <th className="text-left py-3 px-4 font-medium">
                    Product Name
                  </th>
                  <th className="text-left py-3 px-4 font-medium">UPC</th>
                  <th className="text-left py-3 px-4 font-medium">Location</th>
                  <th className="text-right py-3 px-4 font-medium">On Hand</th>
                  <th className="text-right py-3 px-4 font-medium">Reserved</th>
                  <th className="text-right py-3 px-4 font-medium">
                    Available
                  </th>
                  <th className="text-left py-3 px-4 font-medium">
                    Last Counted
                  </th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-background">
                    <td className="py-3 px-4 font-medium">{item.sku}</td>
                    <td className="py-3 px-4">{item.name}</td>
                    <td className="py-3 px-4 text-gray-600">{item.upc}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{item.location}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">{item.onHand}</td>
                    <td className="py-3 px-4 text-right text-orange-600">
                      {item.reserved}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {item.available}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {item.lastCounted}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm">
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Orders View Component
function OrdersView() {
  const mockOrders = [
    {
      id: 1,
      orderNumber: "#1001",
      customer: "John Smith",
      status: "PENDING",
      items: 3,
      total: 129.99,
      createdAt: "2024-01-16 10:30 AM",
    },
    {
      id: 2,
      orderNumber: "#1002",
      customer: "Sarah Johnson",
      status: "PICKING",
      items: 1,
      total: 49.99,
      createdAt: "2024-01-16 09:15 AM",
    },
    {
      id: 3,
      orderNumber: "#1003",
      customer: "Mike Davis",
      status: "SHIPPED",
      items: 2,
      total: 89.98,
      createdAt: "2024-01-15 04:20 PM",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "PICKING":
        return "bg-blue-100 text-blue-800";
      case "SHIPPED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Order Management</h2>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Sync Orders
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Orders from Shopify integration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Order #</th>
                  <th className="text-left py-3 px-4 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-right py-3 px-4 font-medium">Items</th>
                  <th className="text-right py-3 px-4 font-medium">Total</th>
                  <th className="text-left py-3 px-4 font-medium">Created</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-background">
                    <td className="py-3 px-4 font-medium">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-4">{order.customer}</td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">{order.items}</td>
                    <td className="py-3 px-4 text-right">${order.total}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {order.createdAt}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Scanner Modal Component
function ScannerModal({ onClose }: { onClose: () => void }) {
  const [scannedCode, setScannedCode] = useState("");
  const [manualCode, setManualCode] = useState("");

  const handleScan = (code: string) => {
    setScannedCode(code);
    // Here you would typically look up the product by UPC/SKU
    alert(`Scanned: ${code}`);
    onClose();
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Quick Scan</h3>

        <div className="mb-4 p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
          <Scan className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Camera scanner will appear here</p>
          <p className="text-sm text-gray-400">Requires camera permission</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Or enter manually:</label>
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter UPC or SKU"
              onKeyPress={(e) => e.key === "Enter" && handleManualSubmit()}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
              Submit
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
