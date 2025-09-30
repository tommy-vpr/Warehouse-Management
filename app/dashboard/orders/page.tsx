"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Truck,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
// Types - inline until you create the types file
export enum OrderStatus {
  PENDING = "PENDING",
  ALLOCATED = "ALLOCATED",
  PICKING = "PICKING",
  PICKED = "PICKED",
  PACKED = "PACKED",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  RETURNED = "RETURNED",
  FULFILLED = "FULFILLED",
}

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface NextAction {
  action: string;
  label: string;
  variant: "default" | "outline" | "destructive";
}

interface ManagementOrder {
  id: string;
  orderNumber: string;
  shopifyOrderId?: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: string;
  itemCount: number;
  totalWeight: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  createdAt: string;
  updatedAt: string;
  shippingLocation: {
    city: string;
    state: string;
    country: string;
  };
  pickListInfo?: {
    pickListId: string;
    batchNumber: string;
    pickStatus: string;
    assignedTo?: string;
    startTime?: string;
  };
  nextActions: NextAction[];
  items: OrderItem[];
}

interface OrderStats {
  total: number;
  pending: number;
  allocated: number;
  picking: number;
  picked: number;
  packed: number;
  shipped: number;
  fulfilled: number;
  urgent: number;
  high: number;
}

interface OrdersResponse {
  orders: ManagementOrder[];
  stats: OrderStats;
}

interface OrderFilters {
  status?: OrderStatus | "ALL";
  search?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "ALL";
}

interface OrderActionRequest {
  action: string;
  orderId?: string;
  orderIds?: string[];
}

// API Functions
const fetchOrders = async (params: OrderFilters): Promise<OrdersResponse> => {
  const searchParams = new URLSearchParams();
  if (params.status && params.status !== "ALL")
    searchParams.set("status", params.status);
  if (params.search) searchParams.set("search", params.search);
  if (params.priority && params.priority !== "ALL")
    searchParams.set("priority", params.priority);

  const response = await fetch(`/api/orders/management?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status}`);
  }
  return response.json();
};

const performOrderAction = async (request: OrderActionRequest) => {
  const response = await fetch("/api/orders/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || `Failed to perform action: ${response.status}`
    );
  }

  return data;
};

// Custom hook for orders data
const useOrders = (filters: OrderFilters) => {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () => fetchOrders(filters),
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchIntervalInBackground: true, // Continue refetching when tab is not active
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Custom hook for order actions
const useOrderAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: performOrderAction,
    onSuccess: () => {
      // Invalidate and refetch orders data after successful action
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Order action failed";
      console.error("Order action failed:", message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};

export default function OrdersManagementDashboard() {
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<OrderFilters["status"]>("ALL");
  const [priorityFilter, setPriorityFilter] =
    useState<OrderFilters["priority"]>("ALL");

  // UI states
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // TanStack Query hooks
  const { data, isLoading, isError, error, isFetching, refetch } = useOrders({
    status: statusFilter,
    search: searchTerm,
    priority: priorityFilter,
  });

  const orderActionMutation = useOrderAction();

  // Extract data with defaults
  const orders = data?.orders ?? [];
  const stats = data?.stats;

  const handleOrderAction = async (action: string, orderId: string) => {
    const order = orders.find((o) => o.id === orderId);

    try {
      switch (action) {
        case "ALLOCATE":
        case "GENERATE_SINGLE_PICK":
        case "MARK_FULFILLED":
          await orderActionMutation.mutateAsync({ action, orderId });
          break;

        case "VIEW_PICK_PROGRESS":
          window.location.href = `/dashboard/picking`;
          break;

        case "MOBILE_PICK":
          if (order?.pickListInfo) {
            window.open(
              `/dashboard/picking/mobile/${order.pickListInfo.pickListId}`,
              "_blank"
            );
          }
          break;

        case "START_PICKING":
          if (order?.pickListInfo?.pickListId) {
            await fetch(`/api/picking/${order.pickListInfo.pickListId}/start`, {
              method: "POST",
            });
            refetch(); // Manual refetch for external API calls
          }
          break;

        case "PAUSE_PICKING":
          if (order?.pickListInfo?.pickListId) {
            const reason = prompt("Reason for pausing?");
            if (reason) {
              await fetch(
                `/api/picking/list/${order.pickListInfo.pickListId}/pause`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ reason }),
                }
              );
              refetch();
            }
          }
          break;

        case "COMPLETE_PICKING":
          if (order?.pickListInfo?.pickListId) {
            await fetch(
              `/api/picking/list/${order.pickListInfo.pickListId}/complete`,
              {
                method: "POST",
              }
            );
            refetch();
          }
          break;

        case "PACK_ORDER":
          window.location.href = `/dashboard/packing/pack/${orderId}`;
          break;

        case "CREATE_LABEL":
          window.location.href = `/dashboard/shipping/create-label/${orderId}`;
          break;

        case "SPLIT_ORDER":
          window.location.href = `/dashboard/shipping/split/${orderId}`;
          break;

        case "VIEW_TRACKING":
          window.location.href = `/dashboard/shipping/tracking/${orderId}`;
          break;

        case "VIEW_DETAILS":
          setExpandedOrder(expandedOrder === orderId ? null : orderId);
          break;

        default:
          console.log(`Action ${action} not implemented yet`);
      }
    } catch (error) {
      console.error(`Failed to perform ${action}:`, error);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return "bg-gray-100 text-gray-800 dark:bg-gray-200 dark:text-gray-900";
      case OrderStatus.ALLOCATED:
        return "bg-blue-100 text-blue-800 dark:bg-blue-600 dark:text-gray-900";
      case OrderStatus.PICKING:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-gray-900";
      case OrderStatus.PICKED:
        return "bg-purple-100 text-purple-800 dark:bg-purple-600 dark:text-gray-900";
      case OrderStatus.PACKED:
        return "bg-orange-100 text-orange-800 dark:bg-orange-600 dark:text-gray-900";
      case OrderStatus.SHIPPED:
        return "bg-green-100 text-green-800 dark:bg-green-600 dark:text-gray-900";
      case OrderStatus.FULFILLED:
        return "bg-green-100 text-green-800 dark:bg-green-600 dark:text-gray-900";
      case OrderStatus.DELIVERED:
        return "bg-green-100 text-green-800 dark:bg-green-600 dark:text-gray-900";
      case OrderStatus.CANCELLED:
        return "bg-red-100 text-red-800 dark:bg-red-600 dark:text-gray-900";
      case OrderStatus.RETURNED:
        return "bg-red-100 text-red-800 dark:bg-red-600 dark:text-gray-900";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-900";
    }
  };

  const getPriorityColor = (priority: ManagementOrder["priority"]) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800 dark:bg-red-400 dark:text-red-900";
      case "HIGH":
        return "bg-red-100 text-red-800 dark:bg-red-400 dark:text-red-900";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-400 dark:text-yellow-900";
      case "LOW":
        return "bg-green-100 text-green-800 dark:bg-green-400 dark:text-green-900";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-400 dark:text-gray-900";
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedOrders.size === 0) return;

    try {
      await orderActionMutation.mutateAsync({
        action,
        orderIds: Array.from(selectedOrders),
      });
      setSelectedOrders(new Set());
    } catch (error) {
      console.error(`Failed to perform bulk ${action}:`, error);
    }
  };

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Orders
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Orders Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Central operations dashboard for all orders
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
                />
                {isFetching ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Package className="w-6 h-6 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">{stats.total}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Total
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">{stats.urgent}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Urgent
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <ShoppingCart className="w-6 h-6 text-yellow-600" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">{stats.picking}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Picking
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Package className="w-6 h-6 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">{stats.picked}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Picked
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Truck className="w-6 h-6 text-green-600" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">{stats.shipped}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Shipped
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">{stats.fulfilled}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Fulfilled
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search orders, customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 dark:border-zinc-700"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as OrderFilters["status"])
              }
              className="text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value={OrderStatus.PENDING}>Pending</option>
              <option value={OrderStatus.ALLOCATED}>Allocated</option>
              <option value={OrderStatus.PICKING}>Picking</option>
              <option value={OrderStatus.PICKED}>Picked</option>
              <option value={OrderStatus.PACKED}>Packed</option>
              <option value={OrderStatus.SHIPPED}>Shipped</option>
              <option value={OrderStatus.FULFILLED}>Fulfilled</option>
              <option value={OrderStatus.CANCELLED}>Cancelled</option>
              <option value={OrderStatus.RETURNED}>Returned</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as OrderFilters["priority"])
              }
              className="text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedOrders.size > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-400 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedOrders.size} orders selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction("BULK_ALLOCATE")}
                    disabled={orderActionMutation.isPending}
                    className="cursor-pointer"
                  >
                    Allocate Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("BULK_GENERATE_PICKS")}
                    disabled={orderActionMutation.isPending}
                    className="cursor-pointer"
                  >
                    Generate Pick Lists
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOrders(new Set())}
                    className="cursor-pointer"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Orders ({orders.length})</span>
              <div className="flex items-center gap-4">
                {isFetching && (
                  <span className="text-sm text-gray-500 flex items-center">
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    Updating...
                  </span>
                )}
                {selectedOrders.size > 0 && (
                  <span className="text-sm font-normal text-blue-600">
                    {selectedOrders.size} selected
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background border-b border-gray-200 dark:border-zinc-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={
                          selectedOrders.size === orders.length &&
                          orders.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrders(new Set(orders.map((o) => o.id)));
                          } else {
                            setSelectedOrders(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-gray-200 dark:divide-zinc-700">
                  {orders.map((order) => (
                    <React.Fragment key={order.id}>
                      <tr className="hover:bg-background">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={selectedOrders.has(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium">
                              {order.orderNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                            {order.pickListInfo && (
                              <div className="text-xs text-blue-600 dark:text-blue-400">
                                Pick: {order.pickListInfo.batchNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium">
                              {order.customerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.customerEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            className={getStatusColor(
                              order.status as OrderStatus
                            )}
                          >
                            {order.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={getPriorityColor(order.priority)}>
                            {order.priority}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="text-sm">
                              {order.items.reduce(
                                (sum, item) => sum + item.quantity,
                                0
                              )}
                            </div>
                            {/* <div className="text-xs text-gray-500">
                              {order.totalWeight.toFixed(1)} lbs
                            </div> */}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">${order.totalAmount}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div>{order.shippingLocation.city}</div>
                            <div className="text-gray-500">
                              {order.shippingLocation.state}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-1 flex-wrap">
                            {order.nextActions
                              .slice(0, 2)
                              .map((action, index) => (
                                <Button
                                  key={index}
                                  variant={action.variant}
                                  size="sm"
                                  onClick={() =>
                                    handleOrderAction(action.action, order.id)
                                  }
                                  disabled={orderActionMutation.isPending}
                                  className="text-xs px-2 py-1 cursor-pointer"
                                >
                                  {action.label}
                                </Button>
                              ))}
                            {order.nextActions.length > 2 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleOrderAction("VIEW_DETAILS", order.id)
                                }
                                className="text-xs px-2 py-1 cursor-pointer"
                              >
                                +{order.nextActions.length - 2}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Order Details */}
                      {expandedOrder === order.id && (
                        <tr>
                          <td colSpan={9} className="px-4 py-4 bg-background">
                            <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium mb-2">
                                    Order Items:
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {order.items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="bg-background p-3 rounded border"
                                      >
                                        <div className="font-medium text-sm">
                                          {item.productName}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                          SKU: {item.sku}
                                        </div>
                                        <div className="flex justify-between text-xs mt-1">
                                          <span>Qty: {item.quantity}</span>
                                          <span>${item.totalPrice}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="ml-6">
                                  <h4 className="font-medium mb-2">
                                    All Actions:
                                  </h4>
                                  <div className="flex flex-col gap-1">
                                    {order.nextActions.map((action, index) => (
                                      <Button
                                        key={index}
                                        variant={action.variant}
                                        size="sm"
                                        onClick={() =>
                                          handleOrderAction(
                                            action.action,
                                            order.id
                                          )
                                        }
                                        disabled={orderActionMutation.isPending}
                                        className="text-xs justify-start"
                                      >
                                        {action.label}
                                      </Button>
                                    ))}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleOrderAction(
                                          "VIEW_TRACKING",
                                          order.id
                                        )
                                      }
                                      className="text-xs px-2 py-1"
                                    >
                                      View Tracking
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {order.pickListInfo && (
                                <div>
                                  <h4 className="font-medium mb-2">
                                    Pick List Info:
                                  </h4>
                                  <div className="bg-background p-3 rounded border">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <span className="font-medium">
                                          Batch:
                                        </span>{" "}
                                        {order.pickListInfo.batchNumber}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Status:
                                        </span>{" "}
                                        {order.pickListInfo.pickStatus}
                                      </div>
                                      {order.pickListInfo.assignedTo && (
                                        <div>
                                          <span className="font-medium">
                                            Assigned:
                                          </span>{" "}
                                          {order.pickListInfo.assignedTo}
                                        </div>
                                      )}
                                      {order.pickListInfo.startTime && (
                                        <div>
                                          <span className="font-medium">
                                            Started:
                                          </span>{" "}
                                          {new Date(
                                            order.pickListInfo.startTime
                                          ).toLocaleString()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {orders.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 dark:text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-400 mb-2">
                    No orders found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your filters or search terms.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
