"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, CheckCircle, AlertCircle } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: number;
  items: Array<{
    id: string;
    quantity: number;
    productVariant: {
      sku: string;
      name: string;
    };
  }>;
}

interface OrderFulfillmentProps {
  order: Order;
  onFulfillmentComplete?: (result: any) => void;
}

export default function OrderFulfillment({
  order,
  onFulfillmentComplete,
}: OrderFulfillmentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompleteOrder = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${order.id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceCode: "usps_ground_advantage",
          carrierCode: "usps",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        onFulfillmentComplete?.(data);
      } else {
        setError(data.error || "Failed to complete order");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ALLOCATED":
        return "bg-blue-100 text-blue-800";
      case "SHIPPED":
        return "bg-purple-100 text-purple-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span>Order Completed Successfully!</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Tracking Number</p>
              <p className="text-lg">{result.label.trackingNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Shipping Cost</p>
              <p className="text-lg">${result.label.cost}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Inventory Fulfilled</p>
            {result.inventory.map((item: any, index: number) => (
              <div key={index} className="text-sm">
                {item.sku}: {item.quantityFulfilled} units from {item.location}
              </div>
            ))}
          </div>

          <Button
            onClick={() => window.open(result.label.labelUrl, "_blank")}
            className="w-full"
          >
            <Package className="w-4 h-4 mr-2" />
            Download Shipping Label
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Order {order.orderNumber}</span>
          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">
            Customer: {order.customerName}
          </p>
          <p className="text-sm text-gray-600">Items: {order.items.length}</p>
          <p className="text-sm text-gray-600">Total: ${order.totalAmount}</p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <Button
          onClick={handleCompleteOrder}
          disabled={isProcessing || order.status !== "ALLOCATED"}
          className="w-full"
        >
          {isProcessing ? (
            "Processing..."
          ) : (
            <>
              <Truck className="w-4 h-4 mr-2" />
              Complete Order (Ship + Fulfill)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
