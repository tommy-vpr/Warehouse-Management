"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Search,
  Download,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Package,
  ArrowLeft,
} from "lucide-react";

interface Variant {
  id: string;
  sku: string;
  title: string;
  in_stock?: number;
  replenishment?: number;
  oos?: number;
  cost_price?: number;
}

interface FetchVariantsParams {
  lowStock: boolean;
  limit: number;
  pageParam: number;
}

const fetchVariants = async ({
  lowStock,
  limit,
  pageParam,
}: FetchVariantsParams): Promise<Variant[]> => {
  const params = new URLSearchParams({
    endpoint: "variants",
    fields: "id,sku,title,in_stock,replenishment,oos,cost_price",
    limit: String(limit),
    page: String(pageParam),
  });

  if (lowStock) {
    params.set("oos_lt", "7");
  }

  const res = await fetch(`/api/inventory-planner/reports?${params}`);
  const data = await res.json();

  if (!data.success || !data.data) {
    throw new Error("Failed to load forecasts");
  }

  return data.data;
};

export default function ForecastsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    lowStock: filterParam === "low-stock",
    reorder: filterParam === "reorder",
    limit: 50,
  });

  // TanStack Infinite Query
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["variants", filters.lowStock, filters.limit],
    queryFn: ({ pageParam = 0 }) => fetchVariants({ ...filters, pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < filters.limit) {
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Flatten all pages into a single array
  const variants = useMemo(() => {
    return data?.pages.flatMap((page) => page) ?? [];
  }, [data]);

  // Filtered variants based on search and reorder filter
  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      if (filters.reorder && (!v.replenishment || v.replenishment === 0)) {
        return false;
      }
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        v.sku.toLowerCase().includes(search) ||
        v.title?.toLowerCase().includes(search)
      );
    });
  }, [variants, searchTerm, filters.reorder]);

  // Stats calculations
  const stats = useMemo(() => {
    return {
      total: variants.length,
      urgent: variants.filter((v) => v.oos !== undefined && v.oos < 7).length,
      reorder: variants.filter((v) => v.replenishment && v.replenishment > 0)
        .length,
      totalReorderValue: variants.reduce((sum, v) => {
        if (v.replenishment && v.cost_price) {
          return sum + v.replenishment * v.cost_price;
        }
        return sum;
      }, 0),
    };
  }, [variants]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const exportCSV = () => {
    const params = new URLSearchParams({
      endpoint: "variants",
      format: "csv",
      limit: "1000",
    });
    if (filters.lowStock) params.set("oos_lt", "7");
    window.open(`/api/inventory-planner/reports?${params}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard/inventory-planner")}
            className="cursor-pointer flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            Forecast & Replenishment
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filters.lowStock
              ? "Low stock items requiring attention"
              : filters.reorder
              ? "Items recommended for reorder"
              : "All inventory forecasts"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Items
            </p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Urgent
            </p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.urgent}
            </p>
          </div>
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Reorder Needed
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.reorder}
            </p>
          </div>
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Reorder Value
            </p>
            <p className="text-2xl font-bold text-foreground">
              ${stats.totalReorderValue.toLocaleString()} USD
            </p>
          </div>
        </div>

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
              <label className="flex items-center gap-2 px-4 py-2 border dark:border-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-accent transition-colors">
                <input
                  type="checkbox"
                  checked={filters.lowStock}
                  onChange={(e) =>
                    handleFilterChange("lowStock", e.target.checked)
                  }
                  className="rounded"
                />
                <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm text-foreground">Low Stock</span>
              </label>

              <label className="flex items-center gap-2 px-4 py-2 border dark:border-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-accent transition-colors">
                <input
                  type="checkbox"
                  checked={filters.reorder}
                  onChange={(e) =>
                    handleFilterChange("reorder", e.target.checked)
                  }
                  className="rounded"
                />
                <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-foreground">Reorder</span>
              </label>

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
              Loading forecasts...
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg overflow-hidden border dark:border-border">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-muted border-b dark:border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    Reorder
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    Days to OOS
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-border">
                {filteredVariants.map((variant) => (
                  <tr
                    key={variant.id}
                    onClick={() =>
                      router.push(
                        `/dashboard/inventory-planner/forecasts/${variant.sku}`
                      )
                    }
                    className="hover:bg-gray-50 dark:hover:bg-accent cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                      {variant.sku}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {variant.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-foreground">
                      {variant.in_stock ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                      {variant.replenishment ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-foreground">
                      {variant.oos !== undefined ? (
                        <span
                          className={
                            variant.oos < 7
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : ""
                          }
                        >
                          {variant.oos} days
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-foreground">
                      {variant.cost_price
                        ? `$${variant.cost_price.toFixed(2)} USD`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {variant.oos !== undefined && variant.oos < 7 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          Urgent
                        </span>
                      ) : variant.replenishment && variant.replenishment > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-xs">
                          <Package className="w-3 h-3" />
                          Reorder
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredVariants.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                No items found
              </div>
            )}

            {/* Load More Button */}
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

            {/* Footer with count */}
            {filteredVariants.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 dark:bg-muted border-t dark:border-border text-sm text-gray-600 dark:text-gray-400 text-center">
                Showing {filteredVariants.length} items
                {!hasNextPage && variants.length > 0 && " (all loaded)"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
