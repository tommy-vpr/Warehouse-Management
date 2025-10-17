// app/dashboard/inventory-planner/inventory/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Search,
  Download,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface InventoryItem {
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

interface InventoryStats {
  totalItems: number;
  totalStock: number;
  avgDaysOfStock: number;
  lowStockItems: number;
  outOfStockItems: number;
  reorderNeeded: number;
}

interface FetchInventoryParams {
  filter: string;
  limit: number;
  search: string;
  pageParam: number;
}

// In app/dashboard/inventory-planner/inventory/page.tsx

// In app/dashboard/inventory-planner/inventory/page.tsx

const fetchInventory = async ({
  filter,
  limit,
  search,
  pageParam,
}: FetchInventoryParams): Promise<{
  inventory: InventoryItem[];
  total: number;
  stats?: InventoryStats;
}> => {
  const params = new URLSearchParams({
    endpoint: "variants",
    limit: String(limit),
    page: String(pageParam),
    fields:
      "id,sku,title,in_stock,replenishment,oos,cost_price,vendor,lead_time,review_period,safety_stock,price,barcode",
  });

  // Add filters
  if (filter === "low-stock") {
    params.set("oos_lte", "30");
  } else if (filter === "reorder") {
    params.set("replenishment_gt", "0");
  } else if (filter === "out-of-stock") {
    params.set("in_stock_lte", "0");
  } else if (filter === "negative") {
    params.set("in_stock_lt", "0");
  }

  if (search) {
    params.set("sku_match", search); // Use sku_match for partial matching
  }

  const res = await fetch(`/api/inventory-planner/reports?${params}`);
  const data = await res.json();

  if (!data.success || !data.data) {
    throw new Error("Failed to load inventory");
  }

  // Transform Inventory Planner data
  const inventory = data.data.map((variant: any) => ({
    id: variant.id,
    sku: variant.sku,
    productName: variant.title,
    vendorId: variant.vendor,
    warehouseId: null,
    currentStock: variant.in_stock,
    forecast30Days: null,
    forecast60Days: null,
    forecast90Days: null,
    daysOfStock: variant.oos,
    safetyStock: variant.safety_stock,
    leadTimeDays: variant.lead_time,
    reorderPoint: null,
    recommendedQty: variant.replenishment,
    unitCost: variant.cost_price,
    currency: "USD",
    replenishment: variant.replenishment,
    reviewPeriod: variant.review_period,
    lastUpdated: new Date(),
  }));

  // Calculate stats
  const totalStock = inventory.reduce(
    (sum: number, item: InventoryItem) => sum + (item.currentStock || 0),
    0
  );
  const totalDaysOfStock = inventory.reduce(
    (sum: number, item: InventoryItem) => sum + (item.daysOfStock || 0),
    0
  );
  const avgDaysOfStock =
    inventory.length > 0 ? Math.round(totalDaysOfStock / inventory.length) : 0;
  const lowStockItems = inventory.filter(
    (item: InventoryItem) => item.daysOfStock !== null && item.daysOfStock <= 30
  ).length;
  const outOfStockItems = inventory.filter(
    (item: InventoryItem) =>
      item.currentStock !== null && item.currentStock <= 0
  ).length;
  const reorderNeeded = inventory.reduce(
    (sum: number, item: InventoryItem) => sum + (item.recommendedQty || 0),
    0
  );

  const stats: InventoryStats = {
    totalItems: data.meta?.total || inventory.length,
    totalStock,
    avgDaysOfStock,
    lowStockItems,
    outOfStockItems,
    reorderNeeded,
  };

  return {
    inventory,
    total: data.meta?.total || inventory.length,
    stats: pageParam === 0 ? stats : undefined,
  };
};
export default function InventoryListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    filter: filterParam || "all",
    limit: 50,
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["inventory", filters.filter, filters.limit, searchTerm],
    queryFn: ({ pageParam = 0 }) =>
      fetchInventory({ ...filters, search: searchTerm, pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.inventory.length < filters.limit) {
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const inventory = useMemo(() => {
    return data?.pages.flatMap((page) => page.inventory) ?? [];
  }, [data]);

  // In the component
  const stats = useMemo(() => {
    // Get stats from first page, or calculate from all loaded inventory
    if (data?.pages[0]?.stats) {
      return data.pages[0].stats;
    }

    // Fallback: calculate from loaded inventory
    if (inventory.length === 0) return null;

    const totalStock = inventory.reduce(
      (sum, item) => sum + (item.currentStock || 0),
      0
    );
    const totalDaysOfStock = inventory.reduce(
      (sum, item) => sum + (item.daysOfStock || 0),
      0
    );
    const avgDaysOfStock = Math.round(totalDaysOfStock / inventory.length);
    const lowStockItems = inventory.filter(
      (item) => item.daysOfStock !== null && item.daysOfStock <= 30
    ).length;
    const outOfStockItems = inventory.filter(
      (item) => item.currentStock !== null && item.currentStock <= 0
    ).length;
    const reorderNeeded = inventory.reduce(
      (sum, item) => sum + (item.recommendedQty || 0),
      0
    );

    return {
      totalItems: inventory.length,
      totalStock,
      avgDaysOfStock,
      lowStockItems,
      outOfStockItems,
      reorderNeeded,
    };
  }, [data, inventory]);

  console.log("INVENTORY: ", inventory);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const exportCSV = () => {
    const params = new URLSearchParams({
      format: "csv",
      limit: "10000",
    });
    if (filters.filter !== "all") {
      params.set("filter", filters.filter);
    }
    if (searchTerm) {
      params.set("search", searchTerm);
    }
    window.open(`/api/inventory-planner/inventory?${params}`, "_blank");
  };

  const getStockStatusColor = (daysOfStock: number | null) => {
    if (!daysOfStock) return "text-gray-400";
    if (daysOfStock <= 7) return "text-red-600 dark:text-red-400";
    if (daysOfStock <= 30) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const getStockStatusBadge = (
    currentStock: number | null,
    daysOfStock: number | null
  ) => {
    if (currentStock === null || currentStock <= 0) {
      return (
        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          OUT OF STOCK
        </span>
      );
    }
    if (daysOfStock !== null && daysOfStock <= 7) {
      return (
        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          CRITICAL
        </span>
      );
    }
    if (daysOfStock !== null && daysOfStock <= 30) {
      return (
        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          LOW STOCK
        </span>
      );
    }
    return (
      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        IN STOCK
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard/inventory-planner")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            Current Inventory
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View stock levels, forecasts, and replenishment recommendations
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Items
              </p>
              <p className="text-2xl font-bold text-foreground">
                {stats.totalItems.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Stock
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalStock.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Avg Days of Stock
              </p>
              <p className="text-2xl font-bold text-foreground">
                {stats.avgDaysOfStock}
              </p>
            </div>
            <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Low Stock
              </p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.lowStockItems}
              </p>
            </div>
            <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Out of Stock
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.outOfStockItems}
              </p>
            </div>
            <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Reorder Needed
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.reorderNeeded.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by SKU or product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-background text-foreground placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={filters.filter}
                onChange={(e) => handleFilterChange("filter", e.target.value)}
                className="px-4 py-2 border dark:border-border rounded-lg bg-white dark:bg-background text-foreground"
              >
                <option value="all">All Items</option>
                <option value="low-stock">Low Stock (≤30 days)</option>
                <option value="out-of-stock">Out of Stock</option>
                <option value="negative">Negative Stock</option>
                <option value="reorder">Reorder Needed</option>
              </select>

              <select
                value={filters.limit}
                onChange={(e) =>
                  handleFilterChange("limit", Number(e.target.value))
                }
                className="px-4 py-2 border dark:border-border rounded-lg bg-white dark:bg-background text-foreground"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <button
                onClick={exportCSV}
                className="px-4 py-2 border dark:border-border rounded-lg hover:bg-gray-50 dark:hover:bg-accent flex items-center gap-2 text-foreground transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-12 text-center border dark:border-border">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading inventory...
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg overflow-hidden border dark:border-border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-muted border-b dark:border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Days of Stock
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Forecast 30d
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Reorder Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-border">
                  {inventory.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() =>
                        router.push(
                          `/dashboard/inventory-planner/inventory/${item.sku}`
                        )
                      }
                      className="hover:bg-gray-50 dark:hover:bg-accent cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-mono font-medium text-blue-600 dark:text-blue-400">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">
                        {item.productName || "—"}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {getStockStatusBadge(
                          item.currentStock,
                          item.daysOfStock
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-foreground">
                        {item.currentStock?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span
                          className={`font-semibold ${getStockStatusColor(
                            item.daysOfStock
                          )}`}
                        >
                          {item.daysOfStock !== null
                            ? `${item.daysOfStock} days`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">
                        {item.forecast30Days?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {item.recommendedQty && item.recommendedQty > 0 ? (
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {item.recommendedQty.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">
                        <div className="flex items-center justify-end gap-2">
                          <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          {new Date(item.lastUpdated).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {inventory.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <p>No inventory items found</p>
              </div>
            )}

            {hasNextPage && (
              <div className="p-4 border-t dark:border-border text-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="cursor-pointer px-6 py-2 border dark:border-border rounded-lg hover:bg-gray-50 dark:hover:bg-accent disabled:opacity-50 flex items-center gap-2 mx-auto text-foreground transition-colors"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}

            {inventory.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 dark:bg-muted border-t dark:border-border text-sm text-gray-600 dark:text-gray-400 text-center">
                Showing {inventory.length} items
                {!hasNextPage && stats && ` of ${stats.totalItems} total`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
