"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ArrowLeft,
  RefreshCw,
  Truck,
  MapPin,
  Mail,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  User,
  FileText,
  Loader2,
  Expand,
  MoveDiagonal,
  Upload,
  ImageIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { useOrderDetail, useOrderAction } from "@/hooks/use-order";
import { OrderDetailResponse, ShippingPackage } from "@/types/order";
import OrderImageUploadModal from "../modal/OrderImageUploadModal";
import OrderImageDetailModal from "../modal/OrderImageDetailModal";

interface OrderDetailViewProps {
  orderId: string;
  initialData?: OrderDetailResponse;
}

export default function OrderDetailView({
  orderId,
  initialData,
}: OrderDetailViewProps) {
  const {
    data: order,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useOrderDetail(orderId, initialData);

  const orderActionMutation = useOrderAction();

  const [imageUploadModalOpen, setImageUploadModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    id: string;
    url: string;
    createdAt: string;
    reference?: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<
    "items" | "history" | "shipping" | "backorders" | "images"
  >("items");

  const handleOrderAction = async (action: string) => {
    try {
      // Group 1: Actions handled by mutation (backend API)
      const mutationActions = [
        "ALLOCATE",
        "GENERATE_SINGLE_PICK",
        "MARK_FULFILLED",
      ];

      if (mutationActions.includes(action)) {
        await orderActionMutation.mutateAsync({ action, orderId });
        return;
      }

      // Group 2: Navigation actions
      const navigationMap: Record<string, string> = {
        VIEW_PICK_PROGRESS: "/dashboard/picking",
        PACK_ORDER: `/dashboard/packing/pack/${orderId}`,
        CREATE_LABEL: `/dashboard/packing/pack/${orderId}`,
        // action: `/dashboard/packing/pack/${backOrder.orderId}`,
        SPLIT_ORDER: `/dashboard/shipping/split/${orderId}`,
        VIEW_TRACKING: `/dashboard/shipping/tracking/${orderId}`,
      };

      if (navigationMap[action]) {
        window.location.href = navigationMap[action];
        return;
      }

      // Group 3: Special actions requiring additional logic
      switch (action) {
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
            await refetch();
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
              await refetch();
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
            await refetch();
          }
          break;

        case "VIEW_DETAILS":
          // Could scroll to a section or toggle expanded view
          break;

        default:
          console.log(`Action ${action} not implemented yet`);
      }
    } catch (error) {
      console.error(`Failed to perform ${action}:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Action failed",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "ALLOCATED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "PICKING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "PICKED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "PACKED":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "SHIPPED":
      case "FULFILLED":
      case "DELIVERED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "CANCELLED":
      case "RETURNED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
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

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Order
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.history.back()} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => refetch()} className="cursor-pointer">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading order details...
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="cursor-pointer flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Order {order.orderNumber}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Created {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                className="cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
                />
                {isFetching ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          {/* Status & Priority Bar */}
          <div className="flex items-center gap-4">
            <Badge
              className={`${getStatusColor(
                order.status
              )} rounded-4xl text-xs px-3 py-2`}
            >
              {order.status.replace("_", " ")}
            </Badge>
            {/* <Badge
              className={getPriorityColor(order.priority)}
              style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
            >
              {order.priority} PRIORITY
            </Badge> */}
            {order.pickListInfo && (
              <Badge
                variant="outline"
                style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
              >
                Pick List: {order.pickListInfo.batchNumber}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {order.nextActions.map((action, index) => (
                <Button
                  className="cursor-pointer"
                  key={index}
                  variant={action.variant}
                  onClick={() => handleOrderAction(action.action)}
                  disabled={orderActionMutation.isPending}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              {order.customerEmail && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-1 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Email
                    </p>
                    <p className="font-medium">{order.customerEmail}</p>
                  </div>
                </div>
              )}
              {order.shopifyOrderId && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Shopify Order
                  </p>
                  <p className="font-medium text-sm">{order.shopifyOrderId}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 mt-1 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Amount
                  </p>
                  <p className="text-2xl font-bold">${order.totalAmount}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Items
                </p>
                <p className="font-medium">
                  {order.itemCount} items (
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                  units)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 mt-1 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Last Updated
                  </p>
                  <p className="font-medium">
                    {new Date(order.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-medium">{order.shippingAddress.name}</p>
                {order.shippingAddress.company && (
                  <p className="text-sm">{order.shippingAddress.company}</p>
                )}
                <p className="text-sm">{order.shippingAddress.address1}</p>
                {order.shippingAddress.address2 && (
                  <p className="text-sm">{order.shippingAddress.address2}</p>
                )}
                <p className="text-sm">
                  {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                  {order.shippingAddress.zip}
                </p>
                <p className="text-sm">{order.shippingAddress.country}</p>
                {order.shippingAddress.phone && (
                  <p className="text-sm mt-2">{order.shippingAddress.phone}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pick List Info */}
        {order.pickListInfo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Pick List Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Batch Number
                  </p>
                  <p className="font-medium">
                    {order.pickListInfo.batchNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pick Status
                  </p>
                  <Badge
                    className={getStatusColor(order.pickListInfo.pickStatus)}
                  >
                    {order.pickListInfo.pickStatus}
                  </Badge>
                </div>
                {order.pickListInfo.assignedTo && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Assigned To
                    </p>
                    <p className="font-medium">
                      {order.pickListInfo.assignedTo}
                    </p>
                  </div>
                )}
                {order.pickListInfo.startTime && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Started At
                    </p>
                    <p className="font-medium">
                      {new Date(order.pickListInfo.startTime).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Card>
          <CardHeader>
            <div className="flex gap-4 border-b">
              <button
                className={`cursor-pointer pb-2 px-1 ${
                  activeTab === "items"
                    ? "border-b-2 border-green-600 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-300 transition"
                }`}
                onClick={() => setActiveTab("items")}
              >
                Order Items ({order.items.length})
              </button>
              <button
                className={`cursor-pointer pb-2 px-1 ${
                  activeTab === "history"
                    ? "border-b-2 border-green-600 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-300 transition"
                }`}
                onClick={() => setActiveTab("history")}
              >
                Status History ({order.statusHistory.length})
              </button>
              <button
                className={`cursor-pointer pb-2 px-1 ${
                  activeTab === "shipping"
                    ? "border-b-2 border-green-600 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-300 transition"
                }`}
                onClick={() => setActiveTab("shipping")}
              >
                Shipping Info
              </button>
              <button
                className={`cursor-pointer pb-2 px-1 ${
                  activeTab === "images"
                    ? "border-b-2 border-green-600 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-300 transition"
                }`}
                onClick={() => setActiveTab("images")}
              >
                Order Images ({order.images?.length || 0})
              </button>
              {order.backOrders.length > 0 && (
                <button
                  className={`pb-2 px-1 ${
                    activeTab === "backorders"
                      ? "border-b-2 border-green-600 font-medium"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                  onClick={() => setActiveTab("backorders")}
                >
                  Back Orders ({order.backOrders.length})
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Order Items Tab */}
            {activeTab === "items" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {order.items.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3">{item.productName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {item.sku}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right">
                          ${item.unitPrice}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ${item.totalPrice}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t font-medium">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-right text-lg">
                        ${order.totalAmount}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Status History Tab */}
            {activeTab === "history" && (
              <div className="space-y-4">
                {order.statusHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex gap-4 pb-4 border-b last:border-b-0"
                  >
                    <div className="flex-shrink-0">
                      <Clock className="w-5 h-5 text-gray-200 dark:text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            Status changed from{" "}
                            <Badge
                              className={getStatusColor(entry.previousStatus)}
                              style={{ fontSize: "0.75rem" }}
                            >
                              {entry.previousStatus}
                            </Badge>
                            {" to "}
                            <Badge
                              className={getStatusColor(entry.newStatus)}
                              style={{ fontSize: "0.75rem" }}
                            >
                              {entry.newStatus}
                            </Badge>
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            By {entry.changedBy}
                          </p>
                          {entry.notes && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">
                              "{entry.notes}"
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(entry.changedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {order.statusHistory.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No status history available
                  </p>
                )}
              </div>
            )}

            {/* Shipping Info Tab */}
            {activeTab === "shipping" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Shipping Details
                    </h3>
                    <div className="space-y-3">
                      {order.shippingCarrier && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Carrier
                          </p>
                          <p className="font-medium capitalize">
                            {order.shippingCarrier}
                          </p>
                        </div>
                      )}
                      {order.shippingService && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Service
                          </p>
                          <p className="font-medium">
                            {order.shippingService.replace(/_/g, " ")}
                          </p>
                        </div>
                      )}
                      {order.shippingCost && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Shipping Cost
                          </p>
                          <p className="font-medium">${order.shippingCost}</p>
                        </div>
                      )}
                      {order.shippedAt && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Shipped At
                          </p>
                          <p className="font-medium">
                            {new Date(order.shippedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Tracking Information
                    </h3>
                    <div className="space-y-3">
                      {order.trackingNumber ? (
                        <>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Tracking Number
                            </p>
                            <p className="font-medium font-mono">
                              {order.trackingNumber}
                            </p>
                          </div>
                          {order.trackingUrl && (
                            <Button
                              variant="outline"
                              onClick={() =>
                                window.open(order.trackingUrl, "_blank")
                              }
                              className="w-full"
                            >
                              <Truck className="w-4 h-4 mr-2" />
                              Track Package
                            </Button>
                          )}
                          {order.labelUrl && (
                            <Button
                              variant="outline"
                              onClick={() =>
                                window.open(order.labelUrl, "_blank")
                              }
                              className="w-full"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View Label
                            </Button>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500 italic">
                          No tracking information available
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ✅ ADD: All Shipments Section - INSERT HERE */}
                {order.shippingPackages &&
                  order.shippingPackages.length > 0 && (
                    <div className="border-t pt-6">
                      <h3 className="font-medium mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        All Shipments ({order.shippingPackages.length})
                      </h3>

                      <div className="space-y-4">
                        {order.shippingPackages.map(
                          (pkg: ShippingPackage, index: number) => (
                            <div
                              key={pkg.id}
                              className="border rounded-lg p-4 bg-gray-50 dark:bg-zinc-800"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-medium flex items-center gap-2">
                                    <span className="bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 px-2 py-1 rounded text-xs">
                                      Shipment {index + 1}
                                    </span>
                                  </h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(pkg.createdAt).toLocaleString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Cost
                                  </p>
                                  <p className="font-medium">${pkg.cost}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Carrier
                                  </p>
                                  <p className="font-medium text-sm uppercase">
                                    {pkg.carrierCode}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Service
                                  </p>
                                  <p className="font-medium text-sm">
                                    {pkg.serviceCode.replace(/_/g, " ")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Weight
                                  </p>
                                  <p className="font-medium text-sm">
                                    {pkg.weight} lbs
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Tracking
                                  </p>
                                  <p className="font-medium text-sm font-mono">
                                    {pkg.trackingNumber}
                                  </p>
                                </div>
                              </div>

                              {/* ✅ ADD: Package Contents */}
                              {pkg.items && pkg.items.length > 0 && (
                                <div className="mb-3 border-t pt-3">
                                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                                    Package Contents ({pkg.items.length} items)
                                  </h5>
                                  <div className="space-y-1">
                                    {pkg.items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex justify-between items-center text-xs border border-gray-200 dark:border-zinc-600 p-2 px-4 rounded w-fit"
                                      >
                                        <div className="flex-1">
                                          <p className="font-medium">
                                            {item.productName}{" "}
                                            <span className="ml-4">
                                              ×{item.quantity}
                                            </span>
                                          </p>
                                          <p className="text-gray-500">
                                            SKU: {item.sku}
                                          </p>
                                        </div>
                                        {/* <div className="text-right ml-4">
                                          <p className="font-medium text-[16px]">
                                            ×{item.quantity}
                                          </p>
                                        </div> */}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      pkg.trackingNumber
                                    )
                                  }
                                  className="cursor-pointer"
                                >
                                  Copy Tracking
                                </Button>
                                {pkg.labelUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      window.open(pkg.labelUrl!, "_blank")
                                    }
                                    className="cursor-pointer"
                                  >
                                    <FileText className="w-3 h-3 mr-1" />
                                    View Label
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* {order.notes && (
                  <div>
                    <h3 className="font-medium mb-2">Order Notes</h3>
                    <p className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      {order.notes}
                    </p>
                  </div>
                )} */}
              </div>
            )}

            {activeTab === "images" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {order.images && order.images.length > 0
                      ? `${order.images.length} image${
                          order.images.length !== 1 ? "s" : ""
                        }`
                      : "No images"}
                  </h3>
                  <Button
                    onClick={() => setImageUploadModalOpen(true)}
                    size="sm"
                    className="cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </Button>
                </div>

                {order.images && order.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {order.images.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => setSelectedImage(img)}
                        className="relative group rounded-lg overflow-hidden border dark:border-border bg-gray-50 dark:bg-gray-800 aspect-square cursor-pointer transition-all"
                      >
                        <img
                          src={img.url}
                          alt="Order"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />

                        {/* Overlay on hover */}
                        <div className="absolute inset-0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            View Details
                          </span>
                        </div>

                        {/* Timestamp */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-xs text-white">
                            {new Date(img.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      No images uploaded yet
                    </p>
                    <Button
                      onClick={() => setImageUploadModalOpen(true)}
                      variant="outline"
                      className="cursor-pointer"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload First Image
                    </Button>
                  </div>
                )}

                {/* Upload Modal */}
                <OrderImageUploadModal
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  customerName={order.customerName}
                  open={imageUploadModalOpen}
                  onOpenChange={setImageUploadModalOpen}
                  onUploadSuccess={() => {
                    refetch();
                  }}
                />

                {/* Image Detail Modal */}
                <OrderImageDetailModal
                  image={selectedImage}
                  orderNumber={order.orderNumber}
                  open={!!selectedImage}
                  onOpenChange={(open) => !open && setSelectedImage(null)}
                  onDelete={(imageId) => {
                    // Remove from local state immediately
                    setSelectedImage(null);
                    // Refresh to get updated list
                    refetch();
                  }}
                />
              </div>
            )}

            {/* Back Orders Tab */}
            {activeTab === "backorders" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                        Backordered
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                        Fulfilled
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {order.backOrders.map((backOrder) => (
                      <tr
                        key={backOrder.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3">{backOrder.productName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {backOrder.sku}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {backOrder.quantityBackOrdered}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {backOrder.quantityFulfilled}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusColor(backOrder.status)}>
                            {backOrder.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {backOrder.reason.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(backOrder.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {order.backOrders.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No back orders
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
