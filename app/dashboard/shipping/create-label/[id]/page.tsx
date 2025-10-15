"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import ShippingLabelForm from "@/components/shipping/ShippingLabelForm";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: string;
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    weightOz?: number;
  }>;
  shippingAddress: {
    address1: string;
    city: string;
    province: string;
    province_code: string;
    zip: string;
    name?: string;
    country?: string;
    country_code?: string;
  };
}

interface CreateLabelPageProps {
  params: Promise<{ id: string }>;
}

export default function CreateLabelPage({ params }: CreateLabelPageProps) {
  const router = useRouter();
  const [id, setid] = useState<string>("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Unwrap params promise
  useEffect(() => {
    params.then(({ id: id }) => {
      setid(id);
    });
  }, [params]);

  // Fetch order when id is available
  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  console.log(order);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      // ✅ CHANGED: Use packing API which accounts for back orders
      const response = await fetch(`/api/packing/pack/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch order");
      }

      const data = await response.json();
      // ✅ The packing API returns { order: {...}, packingInfo: {...} }
      setOrder(data.order);
    } catch (err) {
      console.error("Error fetching order:", err);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (results: any[]) => {
    console.log("Labels created:", results);
    // Redirect to order detail page
    router.push(`/dashboard/orders/${id}`);
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading || !id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-800 dark:text-red-400">
              {error || "Order not found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-foreground">
                Create Shipping Label
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Order #{order.orderNumber} - {order.customerName}
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Order Total
              </div>
              <div className="text-2xl font-bold text-foreground">
                ${parseFloat(order.totalAmount).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border">
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b dark:border-border last:border-0"
              >
                <div className="flex-1">
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    SKU: {item.sku}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">Qty: {item.quantity}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    ${parseFloat(item.totalPrice).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping Address Card */}
        <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border">
          <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
          <div className="text-gray-700 dark:text-gray-300">
            <p className="font-medium">
              {order.shippingAddress.name || order.customerName}
            </p>
            <p>{order.shippingAddress.address1}</p>
            <p>
              {order.shippingAddress.city},{" "}
              {order.shippingAddress.province_code} {order.shippingAddress.zip}
            </p>
            <p>{order.shippingAddress.country || "United States"}</p>
          </div>
        </div>

        {/* Shipping Label Form */}
        <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg border dark:border-border">
          <div className="p-6 border-b dark:border-border">
            <h2 className="text-lg font-semibold">Configure Shipping</h2>
          </div>

          <div className="p-6">
            <ShippingLabelForm
              order={order}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              embedded={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
