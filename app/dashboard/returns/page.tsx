// dashboard/returns/page.tsx
// Returns Management Dashboard with metrics and pipeline view

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReturnMetrics {
  period: {
    start: string;
    end: string;
  };
  totals: {
    returnCount: number;
    returnRate: number;
    totalRefundAmount: number;
    averageRefundAmount: number;
    averageProcessingDays: number;
  };
  byReason: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  byCondition: Array<{
    condition: string;
    count: number;
    percentage: number;
  }>;
  restockingMetrics: {
    totalReceived: number;
    totalRestocked: number;
    totalDisposed: number;
    restockRate: number;
  };
}

interface ReturnOrder {
  id: string;
  rmaNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  refundAmount?: number;
  createdAt: string;
  order: {
    orderNumber: string;
  };
}

type StatusFilter =
  | "ALL"
  | "PENDING"
  | "APPROVED"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "INSPECTING"
  | "REFUND_PENDING"
  | "REFUNDED";

export default function ReturnsDashboard() {
  const [metrics, setMetrics] = useState<ReturnMetrics | null>(null);
  const [returns, setReturns] = useState<ReturnOrder[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<ReturnOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    fetchReturns();
  }, []);

  useEffect(() => {
    let filtered = returns;

    // Status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.rmaNumber.toLowerCase().includes(query) ||
          r.customerName.toLowerCase().includes(query) ||
          r.customerEmail.toLowerCase().includes(query) ||
          r.order.orderNumber.toLowerCase().includes(query)
      );
    }

    setFilteredReturns(filtered);
  }, [statusFilter, searchQuery, returns]);

  const fetchMetrics = async () => {
    try {
      // Get current month metrics
      const startDate = new Date();
      startDate.setDate(1); // First day of month
      const endDate = new Date();

      const response = await fetch(
        `/api/returns/dashboard?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error("Failed to fetch metrics");
    }
  };

  const fetchReturns = async () => {
    try {
      const response = await fetch("/api/returns");
      const data = await response.json();
      setReturns(data);
      setFilteredReturns(data);
    } catch (err) {
      console.error("Failed to fetch returns");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
      IN_TRANSIT: "bg-blue-100 text-blue-800",
      RECEIVED: "bg-purple-100 text-purple-800",
      INSPECTING: "bg-indigo-100 text-indigo-800",
      INSPECTION_COMPLETE: "bg-cyan-100 text-cyan-800",
      RESTOCKING: "bg-teal-100 text-teal-800",
      REFUND_PENDING: "bg-orange-100 text-orange-800",
      REFUNDED: "bg-green-100 text-green-800",
      CLOSED: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading returns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Returns Management
              </h1>
              <p className="mt-1 text-gray-600">
                Monitor and manage product returns
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/returns/new">
                <Button variant={"outline"}>Create Return</Button>
              </Link>
              <Link href="/dashboard/warehouse/returns/receive">
                <Button className="bg-blue-600 hover:bg-blue-500 transition">
                  Receive Return
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.totals.returnCount}
              </p>
              <p className="text-xs text-gray-500">returns</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Return Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.totals.returnRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">of orders</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Avg Refund</p>
              <p className="text-3xl font-bold text-gray-900">
                ${metrics.totals.averageRefundAmount.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">per return</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Avg Process Time</p>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.totals.averageProcessingDays.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">days</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Restock Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.restockingMetrics.restockRate.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">restocked</p>
            </div>
          </div>
        )}

        {/* Charts Row */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Return Reasons */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Top Return Reasons
              </h3>
              <div className="space-y-3">
                {metrics.byReason.slice(0, 5).map((reason) => (
                  <div key={reason.reason}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">
                        {reason.reason.replace(/_/g, " ")}
                      </span>
                      <span className="font-medium text-gray-900">
                        {reason.count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${reason.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Restocking Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Disposition Breakdown
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Restocked</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {metrics.restockingMetrics.totalRestocked}
                    </p>
                    <p className="text-xs text-gray-500">
                      {metrics.restockingMetrics.restockRate.toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Disposed</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {metrics.restockingMetrics.totalDisposed}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(
                        (metrics.restockingMetrics.totalDisposed /
                          metrics.restockingMetrics.totalReceived) *
                        100
                      ).toFixed(0)}
                      %
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Total Received
                    </span>
                    <span className="font-bold text-gray-900">
                      {metrics.restockingMetrics.totalReceived}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            {/* Status Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto">
              {(
                [
                  "ALL",
                  "PENDING",
                  "APPROVED",
                  "IN_TRANSIT",
                  "RECEIVED",
                  "INSPECTING",
                  "REFUND_PENDING",
                  "REFUNDED",
                ] as StatusFilter[]
              ).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                    statusFilter === status
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 sm:max-w-xs">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search RMA, customer, order..."
                className="block p-2 w-full rounded-md border-gray-300 border focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Returns List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RMA Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Refund
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No returns found
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((returnOrder) => (
                    <tr key={returnOrder.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-sm font-medium text-gray-900">
                          {returnOrder.rmaNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {returnOrder.customerName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {returnOrder.customerEmail}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {returnOrder.order.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {returnOrder.reason.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-[10px] leading-5 font-semibold rounded-full ${getStatusColor(
                            returnOrder.status
                          )}`}
                        >
                          {returnOrder.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {returnOrder.refundAmount
                          ? `$${returnOrder.refundAmount.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(returnOrder.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/dashboard/returns/${returnOrder.rmaNumber}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
