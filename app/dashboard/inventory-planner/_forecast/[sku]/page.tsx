// app/inventory-planner/forecast/[sku]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface VariantDetail {
  id: string;
  sku: string;
  title: string;
  in_stock?: number;
  replenishment?: number;
  oos?: number;
  cost_price?: number;
  vendor_id?: string;
  lead_time?: number;
  review_period?: number;
  warehouse?: Array<{
    id?: string;
    in_stock?: number;
    replenishment?: number;
  }>;
}

const fetchVariantDetail = async (sku: string): Promise<VariantDetail> => {
  const params = new URLSearchParams({
    endpoint: "variants",
    fields:
      "id,sku,title,in_stock,replenishment,oos,cost_price,vendor_id,lead_time,review_period,warehouse",
    limit: "1",
    sku: sku,
  });

  const res = await fetch(`/api/inventory-planner/reports?${params}`);
  const data = await res.json();

  if (!data.success || !data.data || data.data.length === 0) {
    throw new Error("Product not found");
  }

  return data.data[0];
};

export default function ForecastDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sku = params.sku as string;

  const {
    data: variant,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["variant-detail", sku],
    queryFn: () => fetchVariantDetail(sku),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Loading product details...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !variant) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background p-6">
        <div className="max-w-4xl mx-auto">
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
              Product Not Found
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

  const isLowStock = variant.oos !== undefined && variant.oos < 7;
  const needsReorder = variant.replenishment && variant.replenishment > 0;
  const reorderValue =
    variant.replenishment && variant.cost_price
      ? variant.replenishment * variant.cost_price
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Reports
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2 text-foreground">
                {variant.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 font-mono">
                {variant.sku}
              </p>
            </div>
            {isLowStock && (
              <span className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-sm">
                <AlertTriangle className="w-4 h-4" />
                Low Stock Alert
              </span>
            )}
          </div>

          {needsReorder && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400 font-semibold mb-1">
                <Package className="w-5 h-5" />
                Reorder Recommended
              </div>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Suggested order quantity: {variant.replenishment} units
                {reorderValue > 0 && (
                  <span className="ml-2">
                    (${reorderValue.toLocaleString()} USD)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <Package className="w-5 h-5" />
              <span className="text-sm">Current Stock</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {variant.in_stock ?? "—"}
            </p>
          </div>

          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm">Replenishment</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {variant.replenishment ?? "—"}
            </p>
          </div>

          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">Days to OOS</span>
            </div>
            <p
              className={`text-2xl font-bold ${
                isLowStock
                  ? "text-red-600 dark:text-red-400"
                  : "text-foreground"
              }`}
            >
              {variant.oos !== undefined ? `${variant.oos} days` : "—"}
            </p>
          </div>

          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm">Unit Cost</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {variant.cost_price
                ? `$${variant.cost_price.toFixed(2)} USD`
                : "—"}
            </p>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Additional Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Vendor ID
              </p>
              <p className="font-medium text-foreground">
                {variant.vendor_id || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Lead Time
              </p>
              <p className="font-medium text-foreground">
                {variant.lead_time ? `${variant.lead_time} days` : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Review Period
              </p>
              <p className="font-medium text-foreground">
                {variant.review_period ? `${variant.review_period} days` : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Product ID
              </p>
              <p className="font-medium font-mono text-sm text-foreground">
                {variant.id}
              </p>
            </div>
          </div>
        </div>

        {/* Warehouse Details */}
        {variant.warehouse && variant.warehouse.length > 0 && (
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 border dark:border-border">
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              Warehouse Stock
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-muted border-b dark:border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                      Warehouse
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                      In Stock
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                      Replenishment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-border">
                  {variant.warehouse.map((wh, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 dark:hover:bg-accent transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-foreground">
                        {wh.id || `Warehouse ${idx + 1}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-foreground">
                        {wh.in_stock ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                        {wh.replenishment ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
