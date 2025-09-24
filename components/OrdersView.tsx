"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export default function OrdersView() {
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
