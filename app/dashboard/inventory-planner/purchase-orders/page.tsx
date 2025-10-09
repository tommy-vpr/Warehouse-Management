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
  Building2,
  Calendar,
} from "lucide-react";

interface PurchaseOrder {
  id: string;
  reference: string;
  vendor_name?: string;
  status: string;
  created_at: string;
  expected_date?: string;
  total_value?: number;
  total?: number;
  currency?: string;
}

interface FetchPOsParams {
  status: string;
  limit: number;
  pageParam: number;
}

const fetchPurchaseOrders = async ({
  status,
  limit,
  pageParam,
}: FetchPOsParams): Promise<PurchaseOrder[]> => {
  const params = new URLSearchParams({
    endpoint: "purchase-orders",
    limit: String(limit),
    page: String(pageParam),
    created_at_sort: "desc",
  });

  if (status !== "all") {
    params.set("status", status);
  }

  const res = await fetch(`/api/inventory-planner/reports?${params}`);
  const data = await res.json();

  if (!data.success || !data.data) {
    throw new Error("Failed to load purchase orders");
  }

  return data.data;
};

export default function PurchaseOrdersListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: statusParam || "all",
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
    queryKey: ["purchase-orders", filters.status, filters.limit],
    queryFn: ({ pageParam = 0 }) =>
      fetchPurchaseOrders({ ...filters, pageParam }),
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

  const purchaseOrders = useMemo(() => {
    return data?.pages.flatMap((page) => page) ?? [];
  }, [data]);

  const filteredPOs = useMemo(() => {
    if (!searchTerm) return purchaseOrders;
    const search = searchTerm.toLowerCase();
    return purchaseOrders.filter(
      (po) =>
        po.reference.toLowerCase().includes(search) ||
        po.vendor_name?.toLowerCase().includes(search) ||
        po.id.toLowerCase().includes(search)
    );
  }, [purchaseOrders, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: purchaseOrders.length,
      open: purchaseOrders.filter((po) => po.status.toLowerCase() === "open")
        .length,
      pending: purchaseOrders.filter(
        (po) => po.status.toLowerCase() === "pending"
      ).length,
      totalValue: purchaseOrders.reduce(
        (sum, po) => sum + (po.total_value || po.total || 0),
        0
      ),
    };
  }, [purchaseOrders]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const exportCSV = () => {
    const params = new URLSearchParams({
      endpoint: "purchase-orders",
      format: "csv",
      limit: "1000",
    });
    if (filters.status !== "all") {
      params.set("status", filters.status);
    }
    window.open(`/api/inventory-planner/reports?${params}`, "_blank");
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "closed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "open":
        return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "partially received":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "received":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400";
    }
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
            Purchase Orders
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filters.status === "all"
              ? "All purchase orders"
              : `${
                  filters.status.charAt(0).toUpperCase() +
                  filters.status.slice(1)
                } purchase orders`}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by PO#, vendor, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-background text-foreground placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="px-4 py-2 border dark:border-border rounded-lg bg-white dark:bg-background text-foreground"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="partially received">Partially Received</option>
                <option value="received">Received</option>
                <option value="closed">Closed</option>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Orders
            </p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Open
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.open}
            </p>
          </div>
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Pending
            </p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.pending}
            </p>
          </div>
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-4 border dark:border-border">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Value
            </p>
            <p className="text-2xl font-bold text-foreground">
              ${stats.totalValue.toLocaleString()} USD
            </p>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-12 text-center border dark:border-border">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading purchase orders...
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg overflow-hidden border dark:border-border">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-muted border-b dark:border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    PO Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    Expected
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-border">
                {filteredPOs.map((po) => (
                  <tr
                    key={po.id}
                    onClick={() =>
                      router.push(
                        `/dashboard/inventory-planner/purchase-orders/${po.id}`
                      )
                    }
                    className="hover:bg-gray-50 dark:hover:bg-accent cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                      {po.reference}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        {po.vendor_name || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          po.status
                        )}`}
                      >
                        {po.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        {new Date(po.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {po.expected_date ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          {new Date(po.expected_date).toLocaleDateString()}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-foreground">
                      {po.total_value || po.total
                        ? `$${(
                            po.total_value ||
                            po.total ||
                            0
                          ).toLocaleString()} ${(
                            po.currency || "USD"
                          ).toUpperCase()}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPOs.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                No purchase orders found
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

            {filteredPOs.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 dark:bg-muted border-t dark:border-border text-sm text-gray-600 dark:text-gray-400 text-center">
                Showing {filteredPOs.length} orders
                {!hasNextPage && purchaseOrders.length > 0 && " (all loaded)"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
