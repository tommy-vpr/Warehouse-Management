// app/dashboard/inventory-planner/purchase-orders/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  Building2,
  Calendar,
  DollarSign,
  Loader2,
  AlertTriangle,
  User,
} from "lucide-react";

interface POLineItem {
  id: string;
  sku: string;
  title: string;
  replenishment?: number;
  cost_price?: number;
  ordered_cost?: number;
  in_stock?: number;
  image?: string;
}

interface PurchaseOrderDetail {
  id: string;
  reference: string;
  vendor?: string;
  vendor_display_name?: string;
  status: string;
  created_at: string;
  expected_date?: string;
  total?: number;
  currency?: string;
  reference2?: string;
  items?: POLineItem[];
  warehouse_display_name?: string;
  created_by?: string;
  shipping_address?: string;
  total_ordered?: number;
  total_received?: number;
  total_remaining?: number;
}

const fetchPurchaseOrder = async (
  poId: string
): Promise<PurchaseOrderDetail> => {
  const url = `/api/inventory-planner/reports?endpoint=purchase-orders/${poId}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || "Purchase order not found");
  }

  return data.data;
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poId = params.id as string;

  const {
    data: po,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["purchase-order", poId],
    queryFn: () => fetchPurchaseOrder(poId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  console.log(po);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "closed":
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "partially received":
      case "partially_received":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "received":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Loading purchase order...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !po) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-8 text-center border dark:border-border">
            <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">
              Purchase Order Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error instanceof Error
                ? error.message
                : "Unknown error occurred"}
            </p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="cursor-pointer flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Purchase Orders
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2 text-foreground">
                PO: {po.reference}
              </h1>
              {po.reference2 && (
                <p className="text-gray-600 dark:text-gray-400 mb-1">
                  {po.reference2}
                </p>
              )}
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                ID: {po.id}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                po.status
              )}`}
            >
              {po.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t dark:border-border">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Vendor
                </p>
                <p className="font-medium text-foreground">
                  {po.vendor_display_name || po.vendor || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Warehouse
                </p>
                <p className="font-medium text-foreground">
                  {po.warehouse_display_name || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Created
                </p>
                <p className="font-medium text-foreground">
                  {new Date(po.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Expected
                </p>
                <p className="font-medium text-foreground">
                  {po.expected_date
                    ? new Date(po.expected_date).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {po.created_by && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t dark:border-border text-sm text-gray-600 dark:text-gray-400">
              <User className="w-4 h-4" />
              Created by: {po.created_by}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm">Total Value</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {po.total
                ? `$${po.total.toLocaleString()} ${(
                    po.currency || "USD"
                  ).toUpperCase()}`
                : "—"}
            </p>
          </div>

          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <Package className="w-5 h-5" />
              <span className="text-sm">Line Items</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {po.items?.length || 0}
            </p>
          </div>

          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm">Total Ordered</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {po.total_ordered || 0}
            </p>
          </div>

          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm">Received</span>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {po.total_received || 0}
            </p>
          </div>
        </div>

        {/* Line Items */}
        {po.items && po.items.length > 0 ? (
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg border dark:border-border">
            <div className="p-6 border-b dark:border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Order Items
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-muted border-b dark:border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      In Stock
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Unit Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-border">
                  {po.items.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-gray-50 dark:hover:bg-accent transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.image &&
                          !item.image.includes("no-image.png") ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <img
                              src="/images/default-product.webp"
                              alt={item.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}

                          <span className="text-sm text-foreground">
                            {item.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium font-mono text-foreground">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-foreground">
                        {item.in_stock ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-foreground">
                        {item.replenishment || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-foreground">
                        {item.cost_price
                          ? `$${item.cost_price.toFixed(2)} ${(
                              po.currency || "USD"
                            ).toUpperCase()}`
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-foreground">
                        {item.ordered_cost
                          ? `$${item.ordered_cost.toFixed(2)} ${(
                              po.currency || "USD"
                            ).toUpperCase()}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-muted border-t dark:border-border">
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-sm font-semibold text-right text-foreground"
                    >
                      Total:
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-foreground">
                      {po.total
                        ? `$${po.total.toLocaleString()} ${(
                            po.currency || "USD"
                          ).toUpperCase()}`
                        : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-8 text-center border dark:border-border">
            <Package className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No line items available
            </p>
          </div>
        )}

        {/* Shipping Address */}
        {po.shipping_address && (
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mt-6 border dark:border-border">
            <h2 className="text-lg font-semibold mb-3 text-foreground">
              Shipping Address
            </h2>
            <pre className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
              {po.shipping_address}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
