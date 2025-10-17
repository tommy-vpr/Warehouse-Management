// app/dashboard/inventory-planner/inventory/[sku]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Loader2,
  AlertTriangle,
  Warehouse,
  MapPin,
  Clock,
  BarChart3,
  ShoppingCart,
  User,
} from "lucide-react";

interface ForecastData {
  id: string;
  sku: string;
  productName: string | null;
  vendorId: string | null;
  warehouseId: string | null;
  currentStock: number | null;
  forecast30Days: number | null;
  forecast60Days: number | null;
  forecast90Days: number | null;
  daysOfStock: number | null;
  safetyStock: number | null;
  leadTimeDays: number | null;
  reorderPoint: Date | null;
  recommendedQty: number | null;
  unitCost: number | null;
  currency: string | null;
  replenishment: number | null;
  reviewPeriod: number | null;
  lastUpdated: Date;
}

interface InventoryLocation {
  locationId: string;
  quantityOnHand: number;
  quantityReserved: number;
  location: {
    name: string;
    warehouseNumber: number | null;
    aisle: string | null;
    bay: number | null;
    tier: string | null;
  };
}

interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  upc: string | null;
  costPrice: number | null;
  sellingPrice: number | null;
  weight: number | null;
  volume: string | null;
  strength: string | null;
  supplier: string | null;
  product: {
    name: string;
    brand: string | null;
    category: string | null;
  };
  inventory: InventoryLocation[];
}

interface InventoryTransaction {
  id: string;
  transactionType: string;
  quantityChange: number;
  createdAt: Date;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  location: {
    name: string;
  } | null;
  user: {
    name: string | null;
    email: string | null;
  } | null;
}

interface InventoryDetail {
  forecast: ForecastData;
  productVariant: ProductVariant | null;
  recentTransactions: InventoryTransaction[];
}

// In app/dashboard/inventory-planner/inventory/[sku]/page.tsx

const fetchInventoryDetail = async (sku: string): Promise<InventoryDetail> => {
  // Fetch from Inventory Planner
  const params = new URLSearchParams({
    endpoint: "variants",
    sku: sku,
    fields:
      "id,sku,title,in_stock,replenishment,oos,cost_price,vendor,lead_time,review_period,safety_stock,price,barcode",
  });

  const res = await fetch(`/api/inventory-planner/reports?${params}`);
  const data = await res.json();

  if (!data.success || !data.data || data.data.length === 0) {
    throw new Error("Product not found in Inventory Planner");
  }

  const ipVariant = data.data[0];

  // Also fetch from your local WMS database
  const wmsRes = await fetch(`/api/wms/variants/${sku}`);
  const wmsData = await wmsRes.json();

  return {
    forecast: {
      id: ipVariant.id,
      sku: ipVariant.sku,
      productName: ipVariant.title,
      vendorId: ipVariant.vendor,
      warehouseId: null,
      currentStock: ipVariant.in_stock,
      forecast30Days: null,
      forecast60Days: null,
      forecast90Days: null,
      daysOfStock: ipVariant.oos,
      safetyStock: ipVariant.safety_stock,
      leadTimeDays: ipVariant.lead_time,
      reorderPoint: null,
      recommendedQty: ipVariant.replenishment,
      unitCost: ipVariant.cost_price,
      currency: "USD",
      replenishment: ipVariant.replenishment,
      reviewPeriod: ipVariant.review_period,
      lastUpdated: new Date(),
    },
    productVariant: wmsData.success ? wmsData.data : null,
    recentTransactions: wmsData.success ? wmsData.transactions : [],
  };
};

export default function InventoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sku = params.sku as string;

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ["inventory-detail", sku],
    queryFn: () => fetchInventoryDetail(sku),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const getStockStatusColor = (daysOfStock: number | null) => {
    if (!daysOfStock)
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    if (daysOfStock <= 7)
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (daysOfStock <= 30)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  };

  const getStockStatusLabel = (
    currentStock: number | null,
    daysOfStock: number | null
  ) => {
    if (currentStock === null || currentStock <= 0) return "OUT OF STOCK";
    if (daysOfStock !== null && daysOfStock <= 7) return "CRITICAL";
    if (daysOfStock !== null && daysOfStock <= 30) return "LOW STOCK";
    return "IN STOCK";
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      RECEIPT:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      SALE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      ADJUSTMENT:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      TRANSFER:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      ALLOCATION:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      DEALLOCATION:
        "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
      COUNT:
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
      PO_RECEIVING:
        "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
      RETURNS: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      colors[type] ||
      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Loading inventory details...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
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

  const { forecast, productVariant, recentTransactions } = data;

  // Calculate total WMS inventory
  const totalWMSStock =
    productVariant?.inventory.reduce(
      (sum, inv) => sum + inv.quantityOnHand,
      0
    ) || 0;

  const totalReserved =
    productVariant?.inventory.reduce(
      (sum, inv) => sum + inv.quantityReserved,
      0
    ) || 0;

  const availableStock = totalWMSStock - totalReserved;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="cursor-pointer flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Inventory
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2 text-foreground">
                {productVariant?.name ||
                  forecast.productName ||
                  "Unknown Product"}
              </h1>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-gray-600 dark:text-gray-400 font-mono">
                  SKU: <span className="font-semibold">{forecast.sku}</span>
                </p>
                {productVariant?.upc && (
                  <p className="text-gray-600 dark:text-gray-400 font-mono">
                    UPC:{" "}
                    <span className="font-semibold">{productVariant.upc}</span>
                  </p>
                )}
              </div>
              {productVariant && (
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  {productVariant.product.brand && (
                    <span>Brand: {productVariant.product.brand}</span>
                  )}
                  {productVariant.product.category && (
                    <span>Category: {productVariant.product.category}</span>
                  )}
                  {productVariant.volume && (
                    <span>Volume: {productVariant.volume}</span>
                  )}
                  {productVariant.strength && (
                    <span>Strength: {productVariant.strength}</span>
                  )}
                </div>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStockStatusColor(
                forecast.daysOfStock
              )}`}
            >
              {getStockStatusLabel(forecast.currentStock, forecast.daysOfStock)}
            </span>
          </div>
        </div>

        {/* Stock Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <Package className="w-5 h-5" />
              <span className="text-sm">IP Current Stock</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {forecast.currentStock?.toLocaleString() ?? "—"}
            </p>
          </div>

          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <Warehouse className="w-5 h-5" />
              <span className="text-sm">WMS Stock</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalWMSStock.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {totalReserved > 0 && `${totalReserved} reserved`}
            </p>
          </div>

          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm">Days of Stock</span>
            </div>
            <p
              className={`text-2xl font-bold ${
                forecast.daysOfStock && forecast.daysOfStock <= 30
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {forecast.daysOfStock !== null ? `${forecast.daysOfStock}d` : "—"}
            </p>
          </div>

          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="text-sm">Recommended Qty</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {forecast.recommendedQty?.toLocaleString() ?? "0"}
            </p>
          </div>
        </div>

        {/* Forecasts & Planning */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Forecast Data */}
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 border dark:border-border">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-foreground">
                Demand Forecast
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  30 Days
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {forecast.forecast30Days?.toLocaleString() ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  60 Days
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {forecast.forecast60Days?.toLocaleString() ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  90 Days
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {forecast.forecast90Days?.toLocaleString() ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Planning Parameters */}
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 border dark:border-border">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h2 className="text-lg font-semibold text-foreground">
                Planning Parameters
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Safety Stock
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {forecast.safetyStock?.toLocaleString() ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Lead Time
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {forecast.leadTimeDays !== null
                    ? `${forecast.leadTimeDays} days`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Review Period
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {forecast.reviewPeriod !== null
                    ? `${forecast.reviewPeriod} days`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Replenishment
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {forecast.replenishment?.toLocaleString() ?? "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Information */}
        {(forecast.unitCost ||
          productVariant?.costPrice ||
          productVariant?.sellingPrice) && (
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h2 className="text-lg font-semibold text-foreground">Pricing</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {forecast.unitCost && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    IP Unit Cost
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    ${forecast.unitCost.toFixed(2)}{" "}
                    {(forecast.currency || "USD").toUpperCase()}
                  </p>
                </div>
              )}
              {productVariant?.costPrice && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    WMS Cost Price
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    ${Number(productVariant.costPrice).toFixed(2)}
                  </p>
                </div>
              )}
              {productVariant?.sellingPrice && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Selling Price
                  </p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    ${Number(productVariant.sellingPrice).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WMS Locations */}
        {productVariant && productVariant.inventory.length > 0 && (
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-foreground">
                WMS Locations
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-muted border-b dark:border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Location
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      On Hand
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Reserved
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Available
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-border">
                  {productVariant.inventory.map((inv) => (
                    <tr key={inv.locationId}>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {inv.location.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-foreground">
                        {inv.quantityOnHand.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600 dark:text-orange-400">
                        {inv.quantityReserved.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-600 dark:text-green-400">
                        {(
                          inv.quantityOnHand - inv.quantityReserved
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 dark:bg-muted font-semibold">
                    <td className="px-4 py-3 text-sm text-foreground">Total</td>
                    <td className="px-4 py-3 text-sm text-right text-foreground">
                      {totalWMSStock.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-orange-600 dark:text-orange-400">
                      {totalReserved.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
                      {availableStock.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {recentTransactions && recentTransactions.length > 0 && (
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 border dark:border-border">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg font-semibold text-foreground">
                Recent Transactions
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-muted border-b dark:border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Location
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Qty Change
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-border">
                  {recentTransactions.map((txn) => (
                    <tr key={txn.id}>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(txn.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(
                            txn.transactionType
                          )}`}
                        >
                          {txn.transactionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {txn.location?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        <span
                          className={
                            txn.quantityChange > 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {txn.quantityChange > 0 ? "+" : ""}
                          {txn.quantityChange}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {txn.user?.name || txn.user?.email || "System"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {txn.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                Last Updated
              </p>
              <p className="text-blue-700 dark:text-blue-400">
                Inventory Planner data last synced:{" "}
                {new Date(forecast.lastUpdated).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
