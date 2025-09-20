"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  User,
  MapPin,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Truck,
  Eye,
  ShoppingCart,
  BarChart3,
} from "lucide-react";

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

export default function OrdersManagementDashboard() {
  const [orders, setOrders] = useState<ManagementOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  console.log(orders);

  useEffect(() => {
    loadOrders();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [statusFilter, searchTerm, priorityFilter]);

  console.log(orders);

  const loadOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchTerm) params.set("search", searchTerm);
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);

      const response = await fetch(`/api/orders/management?${params}`);
      if (response.ok) {
        const data = await response.json();

        console.log("DATA: ", data);
        setOrders(data.orders);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
    }
    setIsLoading(false);
  };

  const performAction = async (
    action: string,
    orderId?: string,
    orderIds?: string[]
  ) => {
    setIsPerformingAction(true);
    try {
      const response = await fetch("/api/orders/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          orderId,
          orderIds,
        }),
      });

      if (response.ok) {
        await loadOrders(); // Refresh data
        if (orderIds) {
          setSelectedOrders(new Set()); // Clear selection after bulk action
        }
      }
    } catch (error) {
      console.error(`Failed to perform ${action}:`, error);
    }
    setIsPerformingAction(false);
  };

  const handleOrderAction = async (action: string, orderId: string) => {
    const order = orders.find((o) => o.id === orderId); // ✅ Declare here

    switch (action) {
      case "ALLOCATE":
        await performAction("ALLOCATE", orderId);
        break;

      case "GENERATE_SINGLE_PICK":
        console.log(orderId);
        await performAction("GENERATE_SINGLE_PICK", orderId);

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
          await loadOrders();
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
            await loadOrders();
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
          await loadOrders();
        }
        break;

      case "PACK_ORDER":
        window.location.href = `/dashboard/packing/pack/${orderId}`;
        break;

      case "CREATE_LABEL":
        window.location.href = `/dashboard/shipping/create-label/${orderId}`;
        break;

      case "MARK_FULFILLED":
        await performAction("MARK_FULFILLED", orderId);
        break;

      case "VIEW_DETAILS":
        setExpandedOrder(expandedOrder === orderId ? null : orderId);
        break;

      default:
        console.log(`Action ${action} not implemented yet`);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-gray-100 text-gray-800";
      case "ALLOCATED":
        return "bg-blue-100 text-blue-800";
      case "PICKING":
        return "bg-yellow-100 text-yellow-800";
      case "PICKED":
        return "bg-purple-100 text-purple-800";
      case "PACKED":
        return "bg-orange-100 text-orange-800";
      case "SHIPPED":
        return "bg-green-100 text-green-800";
      case "FULFILLED":
        return "bg-green-100 text-green-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Orders Management
              </h1>
              <p className="text-gray-600">
                Central operations dashboard for all orders
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={loadOrders}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              {/* {selectedOrders.size > 0 && (
                <Button
                  onClick={() =>
                    performAction(
                      "BULK_GENERATE_PICKS",
                      undefined,
                      Array.from(selectedOrders)
                    )
                  }
                  disabled={isPerformingAction}
                >
                  Generate Pick Lists ({selectedOrders.size})
                </Button>
              )} */}
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
                      <p className="text-xs text-gray-600">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">{stats.urgent}</p>
                      <p className="text-xs text-gray-600">Urgent</p>
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
                      <p className="text-xs text-gray-600">Picking</p>
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
                      <p className="text-xs text-gray-600">Picked</p>
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
                      <p className="text-xs text-gray-600">Shipped</p>
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
                      <p className="text-xs text-gray-600">Fulfilled</p>
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
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ALLOCATED">Allocated</option>
              <option value="PICKING">Picking</option>
              <option value="PICKED">Picked</option>
              <option value="PACKED">Packed</option>
              <option value="SHIPPED">Shipped</option>
              <option value="FULFILLED">Fulfilled</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Orders ({orders.length})</span>
              {selectedOrders.size > 0 && (
                <span className="text-sm font-normal text-blue-600">
                  {selectedOrders.size} selected
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="rounded"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrders(new Set(orders.map((o) => o.id)));
                          } else {
                            setSelectedOrders(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th> */}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <React.Fragment key={order.id}>
                      <tr className="hover:bg-gray-50">
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
                              <div className="text-xs text-blue-600">
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
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace("_", " ")}
                          </Badge>
                        </td>
                        {/* <td className="px-4 py-4">
                          <Badge className={getPriorityColor(order.priority)}>
                            {order.priority}
                          </Badge>
                        </td> */}
                        <td className="px-4 py-4">
                          <div>
                            <div className="text-sm">
                              {/* {order.itemCount} */}
                              {order.items.reduce(
                                (sum, item) => sum + item.quantity,
                                0
                              )}
                            </div>
                            {/* <div className="text-sm text-gray-500">
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
                          <div className="flex gap-2 flex-wrap">
                            {order.nextActions
                              .slice(0, 2)
                              .map((action, index) => (
                                <Button
                                  key={index}
                                  variant={action.variant as any}
                                  size="sm"
                                  onClick={() =>
                                    handleOrderAction(action.action, order.id)
                                  }
                                  disabled={isPerformingAction}
                                >
                                  {action.label}
                                </Button>
                              ))}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Order Details */}
                      {expandedOrder === order.id && (
                        <tr>
                          <td colSpan={9} className="px-4 py-4 bg-gray-50">
                            <div className="space-y-4">
                              <h4 className="font-medium">Order Items:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {order.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="bg-white p-3 rounded border"
                                  >
                                    <div className="font-medium">
                                      {item.productName}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      SKU: {item.sku}
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span>Qty: {item.quantity}</span>
                                      <span>${item.totalPrice}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {order.pickListInfo && (
                                <div>
                                  <h4 className="font-medium">
                                    Pick List Info:
                                  </h4>
                                  <div className="bg-white p-3 rounded border">
                                    <div>
                                      Batch: {order.pickListInfo.batchNumber}
                                    </div>
                                    <div>
                                      Status: {order.pickListInfo.pickStatus}
                                    </div>
                                    {order.pickListInfo.assignedTo && (
                                      <div>
                                        Assigned:{" "}
                                        {order.pickListInfo.assignedTo}
                                      </div>
                                    )}
                                    {order.pickListInfo.startTime && (
                                      <div>
                                        Started:{" "}
                                        {new Date(
                                          order.pickListInfo.startTime
                                        ).toLocaleString()}
                                      </div>
                                    )}
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
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No orders found
                  </h3>
                  <p className="text-gray-600">
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
