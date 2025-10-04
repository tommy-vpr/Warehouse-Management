"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Package,
  Download,
  ExternalLink,
  Search,
  Loader2,
  Calendar,
} from "lucide-react";
import { CarrierBadge } from "@/components/CarrierBadge";

interface ShippedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  shippedAt: string;
  status: string;
  packages: Array<{
    id: string;
    trackingNumber: string;
    carrierCode: string;
    serviceCode: string;
    labelUrl: string;
    cost: string;
  }>;
  totalCost: number;
  packageCount: number;
}

export default function ShippingDashboard() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month

  const { data: orders, isLoading } = useQuery<ShippedOrder[]>({
    queryKey: ["shipped-orders", dateFilter],
    queryFn: async () => {
      const res = await fetch(`/api/shipping/orders?period=${dateFilter}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const filteredOrders = orders?.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.packages.some((pkg) =>
        pkg.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const stats = {
    totalShipped: orders?.length || 0,
    todayShipped:
      orders?.filter((o) => {
        const shipDate = new Date(o.shippedAt);
        const today = new Date();
        return shipDate.toDateString() === today.toDateString();
      }).length || 0,
    totalPackages: orders?.reduce((sum, o) => sum + o.packageCount, 0) || 0,
    totalCost:
      orders?.reduce((sum, o) => sum + o.totalCost, 0).toFixed(2) || "0.00",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-200">
            Loading shipments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Shipping Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage shipped orders
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Shipped
                  </p>
                  <p className="text-2xl font-bold">{stats.totalShipped}</p>
                </div>
                <Truck className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Today
                  </p>
                  <p className="text-2xl font-bold">{stats.todayShipped}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Packages
                  </p>
                  <p className="text-2xl font-bold">{stats.totalPackages}</p>
                </div>
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Cost
                  </p>
                  <p className="text-2xl font-bold">${stats.totalCost}</p>
                </div>
                <Download className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by order number, customer, or tracking..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="all" className="text-gray-400">
                  All Time
                </option>
                <option value="today" className="text-gray-400">
                  Today
                </option>
                <option value="week" className="text-gray-400">
                  This Week
                </option>
                <option value="month" className="text-gray-400">
                  This Month
                </option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Shipped Orders ({filteredOrders?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOrders && filteredOrders.length > 0 ? (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Shipped: {new Date(order.shippedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="cursor-pointer"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/dashboard/shipping/tracking/${order.id}`
                            )
                          }
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>

                    {/* Packages */}
                    <div className="space-y-2">
                      {order.packages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className="flex items-center justify-between p-3 bg-gray-100 dark:bg-zinc-900 rounded"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-mono text-sm">
                                {pkg.trackingNumber}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <CarrierBadge carrierCode={pkg.carrierCode} />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ${pkg.cost}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(pkg.labelUrl, "_blank")}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {order.packageCount} package
                        {order.packageCount > 1 ? "s" : ""}
                      </span>
                      <span className="font-semibold">
                        Total: ${order.totalCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Truck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No shipped orders</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm
                    ? "No orders match your search"
                    : "No orders have been shipped yet"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
