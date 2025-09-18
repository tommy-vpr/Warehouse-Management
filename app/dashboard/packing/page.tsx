"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  Truck,
  Clock,
  User,
  MapPin,
  Weight,
  CheckCircle,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { usePathname } from "next/navigation";

interface PackableOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: string;
  itemCount: number;
  totalWeight: number;
  priority: "LOW" | "MEDIUM" | "HIGH";
  pickedAt: string;
  shippingAddress: {
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  items: {
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    weight: number;
  }[];
}

export default function PackStationDashboard() {
  const [orders, setOrders] = useState<PackableOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");

  const pathname = usePathname();

  useEffect(() => {
    loadPackableOrders();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPackableOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPackableOrders = async () => {
    try {
      const response = await fetch("/api/packing/orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Failed to load packable orders:", error);
    }
    setIsLoading(false);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority =
      selectedPriority === "ALL" || order.priority === selectedPriority;

    return matchesSearch && matchesPriority;
  });

  // Calculate statistics
  const stats = {
    totalOrders: orders.length,
    highPriority: orders.filter((o) => o.priority === "HIGH").length,
    totalWeight: orders.reduce((sum, o) => sum + o.totalWeight, 0),
    averageItems:
      orders.length > 0
        ? Math.round(
            orders.reduce((sum, o) => sum + o.itemCount, 0) / orders.length
          )
        : 0,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getShippingZone = (address: any) => {
    if (address.country !== "US") return "INTL";
    const state = address.state;
    const westCoast = ["CA", "WA", "OR", "NV"];
    const eastCoast = ["NY", "NJ", "CT", "MA", "FL"];

    if (westCoast.includes(state)) return "WEST";
    if (eastCoast.includes(state)) return "EAST";
    return "CENTRAL";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading pack station...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pack Station</h1>
              <p className="text-gray-600">Pack and ship completed orders</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={loadPackableOrders}>
                Refresh Orders
              </Button>
              <Button
                onClick={() => (window.location.href = "/packing/settings")}
              >
                Pack Settings
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Package className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                    <p className="text-gray-600">Ready to Pack</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">{stats.highPriority}</p>
                    <p className="text-gray-600">High Priority</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Weight className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">
                      {stats.totalWeight.toFixed(1)}
                    </p>
                    <p className="text-gray-600">Total lbs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">{stats.averageItems}</p>
                    <p className="text-gray-600">Avg Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search orders, customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No orders ready for packing
            </h3>
            <p className="text-gray-600">
              Complete some pick lists to see orders here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => (
              <Card
                key={order.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {order.orderNumber}
                      </CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge className={getPriorityColor(order.priority)}>
                          {order.priority}
                        </Badge>
                        <Badge variant="secondary">
                          {getShippingZone(order.shippingAddress)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Items</div>
                      <div className="font-semibold">{order.itemCount}</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Customer Info */}
                  <div>
                    <div className="flex items-center mb-1">
                      <User className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="font-medium">{order.customerName}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.customerEmail}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <div className="flex items-center mb-1">
                      <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-sm font-medium">Ship To:</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.shippingAddress.city},{" "}
                      {order.shippingAddress.state} {order.shippingAddress.zip}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Value:</span>
                      <div className="font-medium">${order.totalAmount}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Weight:</span>
                      <div className="font-medium">
                        {order.totalWeight.toFixed(1)} lbs
                      </div>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    Picked: {new Date(
                      order.pickedAt
                    ).toLocaleDateString()} at{" "}
                    {new Date(order.pickedAt).toLocaleTimeString()}
                  </div>

                  {/* Items Preview */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Items:
                    </div>
                    <div className="space-y-1">
                      {order.items.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="text-xs text-gray-600 flex justify-between"
                        >
                          <span>{item.productName}</span>
                          <span>×{item.quantity}</span>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{order.items.length - 2} more items
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    className="w-full"
                    onClick={() =>
                      (window.location.href = `${pathname}/pack/${order.id}`)
                    }
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Start Packing
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
