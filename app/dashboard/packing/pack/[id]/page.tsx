"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  ArrowLeft,
  CheckCircle,
  User,
  MapPin,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { useParams } from "next/navigation";

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  weight: number;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: string;
  shippingAddress: any;
  items: OrderItem[];
}

export default function PackingInterface() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPacking, setIsPacking] = useState(false);
  const [isPackingComplete, setIsPackingComplete] = useState(false);

  useEffect(() => {
    loadOrderDetails();
  }, []);

  const loadOrderDetails = async () => {
    try {
      const response = await fetch(`/api/packing/pack/${id}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
      }
    } catch (error) {
      console.error("Failed to load order:", error);
    }
    setIsLoading(false);
  };

  const markOrderAsPacked = async () => {
    if (!order) return;

    setIsPacking(true);
    try {
      const response = await fetch(`/api/packing/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to mark as packed");
      }

      const data = await response.json();
      if (data.success) {
        setIsPackingComplete(true);
        setOrder({ ...order, status: "PACKED" });
      }
    } catch (error) {
      console.error("Failed to mark order as packed:", error);
      alert(
        `Failed to pack order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
    setIsPacking(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-200">
            Loading order details...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">
            Order not found or not ready for packing
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (isPackingComplete || order.status === "PACKED") {
    return (
      <div className="min-h-screen bg-green-50 dark:bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Order Packed Successfully!
          </h2>
          <p className="text-green-700 mb-6">
            {order.orderNumber} has been marked as packed and is ready for
            shipping
          </p>

          <div className="space-y-3">
            <Button
              onClick={() =>
                (window.location.href = `/dashboard/shipping/create-label/${order.id}`)
              }
              className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
            >
              <Truck className="w-5 h-5 mr-2" />
              Ship Now
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/dashboard/packing")}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pack Station
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Pack Order
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {order.orderNumber}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">{order.customerName}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {order.customerEmail}
                </div>
                <div className="pt-2">
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-500" />
                    <div className="text-sm">
                      <div>{order.shippingAddress.address1}</div>
                      {order.shippingAddress.address2 && (
                        <div>{order.shippingAddress.address2}</div>
                      )}
                      <div>
                        {order.shippingAddress.city},{" "}
                        {order.shippingAddress.province}{" "}
                        {order.shippingAddress.zip}
                      </div>
                      <div>{order.shippingAddress.country}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items to Pack */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Items to Pack ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 bg-background rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        SKU: {item.sku}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Weight: {item.weight} lbs each
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">×{item.quantity}</div>
                      {/* <div className="text-sm text-gray-600 dark:text-gray-400">
                        ${item.totalPrice}
                      </div> */}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between font-semibold">
                  <span>Total Value:</span>
                  <span>${order.totalAmount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pack Button */}
        <div className="mt-8 flex justify-center">
          <div className="w-full max-w-md space-y-3">
            <Button
              onClick={markOrderAsPacked}
              disabled={isPacking}
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
            >
              {isPacking ? (
                <>
                  <Package className="w-5 h-5 mr-2 animate-pulse" />
                  Marking as Packed...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Mark as Packed
                </>
              )}
            </Button>
            <p className="text-sm text-gray-600 text-center">
              This will mark the order as packed and ready for shipping
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
