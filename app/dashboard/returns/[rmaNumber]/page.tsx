// app/admin/returns/[rmaNumber]/page.tsx - WITH DARK MODE
// Return Detail Page - View and manage individual return

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  User,
  DollarSign,
  Clock,
  MapPin,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReturnDetail {
  id: string;
  rmaNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  reasonDetails?: string;
  refundMethod: string;
  refundAmount?: number;
  refundStatus: string;
  restockingFee?: number;
  returnTrackingNumber?: string;
  returnCarrier?: string;
  returnLabelUrl?: string;
  returnShippingCost?: number;
  packagesExpected?: number;
  customerShippedAt?: string;
  receivedAt?: string;
  inspectedAt?: string;
  approvalRequired: boolean;
  approvedAt?: string;
  rejectionReason?: string;
  shopifyRefundId?: string;
  shopifySyncStatus?: string;
  createdAt: string;
  updatedAt: string;
  order: {
    orderNumber: string;
    shopifyOrderNumber?: string;
    totalAmount?: number;
  };
  items: Array<{
    id: string;
    quantityRequested: number;
    quantityReceived: number;
    quantityRestockable: number;
    quantityDisposed: number;
    status: string;
    unitPrice: number;
    refundAmount: number;
    productVariant: {
      sku: string;
      product: {
        name: string;
      };
    };
    inspections: Array<{
      id: string;
      condition: string;
      conditionNotes?: string;
      disposition: string;
      dispositionNotes?: string;
      photoUrls: string[];
      inspectedAt: string;
      inspector: {
        name: string;
      };
      location?: {
        name: string;
        aisle?: string;
        shelf?: string;
        bin?: string;
      };
    }>;
  }>;
  receivedByUser?: {
    name: string;
    email: string;
  };
  inspectedByUser?: {
    name: string;
    email: string;
  };
  approvedByUser?: {
    name: string;
    email: string;
  };
  events: Array<{
    id: string;
    eventType: string;
    notes?: string;
    createdAt: string;
    user?: {
      name: string;
    };
  }>;
}

export default function ReturnDetailPage({
  params,
}: {
  params: Promise<{ rmaNumber: string }>;
}) {
  const router = useRouter();
  const [returnOrder, setReturnOrder] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { rmaNumber } = use(params);

  useEffect(() => {
    fetchReturnDetail();
  }, [rmaNumber]);

  const fetchReturnDetail = async () => {
    try {
      const response = await fetch(`/api/returns/${rmaNumber}`);
      if (!response.ok) throw new Error("Failed to fetch return");
      const data = await response.json();
      setReturnOrder(data);
    } catch (error) {
      console.error("Error fetching return:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("Approve this return?")) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/returns/${rmaNumber}/approve`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to approve return");

      await fetchReturnDetail();
      alert("Return approved successfully");
    } catch (error) {
      console.error("Error approving return:", error);
      alert("Failed to approve return");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/returns/${rmaNumber}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (!response.ok) throw new Error("Failed to reject return");

      await fetchReturnDetail();
      setShowRejectModal(false);
      setRejectionReason("");
      alert("Return rejected");
    } catch (error) {
      console.error("Error rejecting return:", error);
      alert("Failed to reject return");
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!confirm("Process refund for this return?")) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/returns/${rmaNumber}/refund`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to process refund");

      await fetchReturnDetail();
      alert("Refund processed successfully");
    } catch (error) {
      console.error("Error processing refund:", error);
      alert("Failed to process refund");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING:
        "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900/50",
      APPROVED:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50",
      REJECTED:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50",
      IN_TRANSIT:
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50",
      RECEIVED:
        "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-900/50",
      INSPECTING:
        "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-900/50",
      INSPECTION_COMPLETE:
        "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-900/50",
      RESTOCKING:
        "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-900/50",
      REFUND_PENDING:
        "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-900/50",
      REFUNDED:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50",
      CLOSED:
        "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
    };
    return (
      colors[status] ||
      "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700"
    );
  };

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      NEW_UNOPENED: "text-green-600 dark:text-green-400",
      LIKE_NEW: "text-green-500 dark:text-green-400",
      GOOD: "text-blue-600 dark:text-blue-400",
      FAIR: "text-yellow-600 dark:text-yellow-500",
      POOR: "text-orange-600 dark:text-orange-500",
      DEFECTIVE: "text-red-600 dark:text-red-400",
      DAMAGED: "text-red-700 dark:text-red-500",
      EXPIRED: "text-purple-600 dark:text-purple-400",
    };
    return colors[condition] || "text-gray-600 dark:text-gray-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading return details...
          </p>
        </div>
      </div>
    );
  }

  if (!returnOrder) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Return Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            RMA #{rmaNumber} could not be found
          </p>
          <Link href="/dashboard/returns">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Returns
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/returns">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                #{returnOrder.rmaNumber}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Order {returnOrder.order.orderNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Action Buttons */}
            {returnOrder.status === "PENDING" &&
              returnOrder.approvalRequired && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Approve
                  </Button>
                </>
              )}
            {returnOrder.status === "INSPECTION_COMPLETE" &&
              returnOrder.refundStatus === "PENDING" && (
                <Button
                  onClick={handleProcessRefund}
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-gray-200"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    ""
                  )}
                  Process Refund
                </Button>
              )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Status Card */}
        <div className="bg-white dark:bg-zinc-800/50 rounded-lg shadow-sm dark:shadow-zinc-900/50 p-6 border border-gray-200 dark:border-zinc-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Status
              </p>
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full border ${getStatusColor(
                  returnOrder.status
                )}`}
              >
                {returnOrder.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Created
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {new Date(returnOrder.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="bg-white dark:bg-zinc-800/50 rounded-lg shadow-sm dark:shadow-zinc-900/50 border border-gray-200 dark:border-zinc-700/50">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <User className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                  Customer Information
                </h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Name
                  </p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {returnOrder.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Email
                  </p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {returnOrder.customerEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800/50 rounded-lg shadow-sm dark:shadow-zinc-900/50 p-6 border border-gray-200 dark:border-zinc-700/50">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Quick Actions
              </h3>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/returns/packing-slip/${returnOrder.rmaNumber}`}
                  target="_blank"
                >
                  <Button variant="default">
                    <Package className="w-4 h-4 mr-2" />
                    Packing Slip
                  </Button>
                </Link>

                {/* Return Label Button(s) */}
                {returnOrder.returnLabelUrl && (
                  <>
                    {returnOrder.returnLabelUrl
                      .split(", ")
                      .map((labelUrl, idx) => {
                        const trackingNumbers =
                          returnOrder.returnTrackingNumber?.split(", ") || [];
                        const packageNum = idx + 1;
                        const totalPackages =
                          returnOrder.returnLabelUrl?.split(", ").length || 1;

                        return (
                          <a
                            key={idx}
                            href={labelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline">
                              <FileText className="w-4 h-4 mr-2" />
                              Return Label{" "}
                              {totalPackages > 1
                                ? `${packageNum}/${totalPackages}`
                                : ""}
                            </Button>
                          </a>
                        );
                      })}
                  </>
                )}
              </div>
            </div>

            {/* Return Reason */}
            <div className="bg-white dark:bg-zinc-800/50 rounded-lg shadow-sm dark:shadow-zinc-900/50 border border-gray-200 dark:border-zinc-700/50">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Return Reason
                </h2>
              </div>
              <div className="p-6">
                <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {returnOrder.reason.replace(/_/g, " ")}
                </p>
                {returnOrder.reasonDetails && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {returnOrder.reasonDetails}
                  </p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white dark:bg-zinc-800/50 rounded-lg shadow-sm dark:shadow-zinc-900/50 border border-gray-200 dark:border-zinc-700/50">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                  Return Items
                </h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-zinc-700">
                {returnOrder.items.map((item) => (
                  <div key={item.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {item.productVariant.product.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          SKU: {item.productVariant.sku}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          ${Number(item.refundAmount).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ${Number(item.unitPrice)?.toFixed(2) ?? "0.00"} each
                        </p>
                      </div>
                    </div>

                    {/* Quantities */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Requested
                        </p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {item.quantityRequested}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Received
                        </p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {item.quantityReceived}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Restockable
                        </p>
                        <p className="font-medium text-green-600 dark:text-green-400">
                          {item.quantityRestockable}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Disposed
                        </p>
                        <p className="font-medium text-red-600 dark:text-red-400">
                          {item.quantityDisposed}
                        </p>
                      </div>
                    </div>

                    {/* Inspections */}
                    {item.inspections.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
                        {item.inspections.map((inspection) => (
                          <div
                            key={inspection.id}
                            className="bg-gray-50 dark:bg-zinc-900/50 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Inspection by {inspection.inspector.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(
                                    inspection.inspectedAt
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p
                                  className={`text-sm font-medium ${getConditionColor(
                                    inspection.condition
                                  )}`}
                                >
                                  {inspection.condition.replace(/_/g, " ")}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {inspection.disposition.replace(/_/g, " ")}
                                </p>
                              </div>
                            </div>

                            {inspection.location && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <MapPin className="w-4 h-4 mr-1" />
                                {inspection.location.name}
                                {inspection.location.aisle &&
                                  ` - ${inspection.location.aisle}-${inspection.location.shelf}-${inspection.location.bin}`}
                              </div>
                            )}

                            {inspection.conditionNotes && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {inspection.conditionNotes}
                              </p>
                            )}

                            {inspection.photoUrls.length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                {inspection.photoUrls.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    <ImageIcon className="w-4 h-4 mr-1" />
                                    Photo {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            {returnOrder.events.length > 0 && (
              <div className="bg-white dark:bg-zinc-800/50 rounded-lg shadow-sm dark:shadow-zinc-900/50 border border-gray-200 dark:border-zinc-700/50">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                    Timeline
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {returnOrder.events.map((event, idx) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-blue-600 dark:bg-blue-500 rounded-full"></div>
                          {idx < returnOrder.events.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gray-200 dark:bg-zinc-700 my-1"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {event.eventType.replace(/_/g, " ")}
                          </p>
                          {event.user && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {event.user.name}
                            </p>
                          )}
                          {event.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {event.notes}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(event.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="bg-white dark:bg-zinc-800/50 rounded-lg shadow-sm dark:shadow-zinc-900/50 border border-gray-200 dark:border-zinc-700/50">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                  Financial
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Refund Amount
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ${returnOrder.refundAmount?.toFixed(2) || "0.00"}
                  </span>
                </div>
                {returnOrder.restockingFee && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Restocking Fee
                    </span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -${returnOrder.restockingFee.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-zinc-700">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Refund Status
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      returnOrder.refundStatus === "REFUNDED"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : returnOrder.refundStatus === "PENDING"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
                    }`}
                  >
                    {returnOrder.refundStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Method
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {returnOrder.refundMethod.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>

            {/* Tracking Info */}
            {returnOrder.returnTrackingNumber && (
              <div className="bg-white dark:bg-zinc-800/50 rounded-lg shadow-sm dark:shadow-zinc-900/50 border border-gray-200 dark:border-zinc-700/50">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                    Return Shipping
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  {/* Carrier */}
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Carrier
                    </p>
                    <p className="font-medium text-gray-900 dark:text-gray-100 uppercase">
                      {returnOrder.returnCarrier?.replace("stamps_com", "USPS")}
                    </p>
                  </div>

                  {/* Package Count */}
                  {returnOrder.packagesExpected &&
                    returnOrder.packagesExpected > 1 && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Packages
                        </p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {returnOrder.packagesExpected}{" "}
                          {returnOrder.packagesExpected === 1
                            ? "package"
                            : "packages"}
                        </p>
                      </div>
                    )}

                  {/* Tracking Numbers + Labels */}
                  {returnOrder.returnTrackingNumber
                    .split(", ")
                    .map((tracking, idx) => {
                      const labelUrls =
                        returnOrder.returnLabelUrl?.split(", ") || [];
                      const packageNum = idx + 1;
                      const totalPackages =
                        returnOrder.returnTrackingNumber?.split(", ").length ||
                        1;

                      return (
                        <div
                          key={idx}
                          className={`${
                            idx > 0
                              ? "pt-4 border-t border-gray-200 dark:border-zinc-700"
                              : ""
                          }`}
                        >
                          {totalPackages > 1 && (
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                              Package {packageNum} of {totalPackages}
                            </p>
                          )}

                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Tracking Number
                              </p>
                              <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                                {tracking}
                              </p>
                              <Link
                                href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                Track Package <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>

                            {/* Label Download */}
                            {labelUrls[idx] && (
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                  Return Label
                                </p>
                                <a
                                  href={labelUrls[idx]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  <FileText className="w-4 h-4 mr-1" />
                                  Download Label{" "}
                                  {totalPackages > 1 ? packageNum : ""}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {/* Shipping Cost */}
                  {returnOrder.returnShippingCost && (
                    <div className="pt-3 border-t border-gray-200 dark:border-zinc-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Return Shipping Cost
                      </p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        ${Number(returnOrder.returnShippingCost).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Shipped Date */}
                  {returnOrder.customerShippedAt && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Customer Shipped
                      </p>
                      <p className="text-gray-900 dark:text-gray-100">
                        {new Date(
                          returnOrder.customerShippedAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Processing Info */}
            <div className="bg-white dark:bg-zinc-800/50 rounded-lg shadow-sm dark:shadow-zinc-900/50 border border-gray-200 dark:border-zinc-700/50">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Processing
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {returnOrder.receivedAt && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Received
                    </p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {new Date(returnOrder.receivedAt).toLocaleDateString()}
                    </p>
                    {returnOrder.receivedByUser && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by {returnOrder.receivedByUser.name}
                      </p>
                    )}
                  </div>
                )}
                {returnOrder.inspectedAt && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Inspected
                    </p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {new Date(returnOrder.inspectedAt).toLocaleDateString()}
                    </p>
                    {returnOrder.inspectedByUser && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by {returnOrder.inspectedByUser.name}
                      </p>
                    )}
                  </div>
                )}
                {returnOrder.approvedAt && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Approved
                    </p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {new Date(returnOrder.approvedAt).toLocaleDateString()}
                    </p>
                    {returnOrder.approvedByUser && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by {returnOrder.approvedByUser.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Shopify Sync */}
            {returnOrder.shopifyRefundId && (
              <div className="bg-white dark:bg-zinc-800/50 rounded-lg shadow-sm dark:shadow-zinc-900/50 border border-gray-200 dark:border-zinc-700/50">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Shopify
                  </h2>
                </div>
                <div className="p-6 space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Refund ID
                    </p>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {returnOrder.shopifyRefundId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Sync Status
                    </p>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        returnOrder.shopifySyncStatus === "SYNCED"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : returnOrder.shopifySyncStatus === "FAILED"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {returnOrder.shopifySyncStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-zinc-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Reject Return
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please provide a reason for rejecting this return:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 rounded-md p-2 mb-4 min-h-[100px] focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Explain why this return is being rejected..."
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Reject Return
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
