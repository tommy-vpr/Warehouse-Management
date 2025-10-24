// components/orders/AuditTrailTab.tsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  User,
  Package,
  Truck,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  ArrowRight,
  FileText,
  Loader2,
  MapPin,
  Barcode,
  UserX,
  Users,
  XCircle,
  PackageX,
  ScanLine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AuditEvent, AuditTrailResponse } from "@/types/audit-trail";

interface AuditTrailTabProps {
  orderId: string;
}

export default function AuditTrailTab({ orderId }: AuditTrailTabProps) {
  const { data, isLoading, error } = useQuery<AuditTrailResponse>({
    queryKey: ["audit-trail", orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/audit-trail`);
      if (!response.ok) throw new Error("Failed to fetch audit trail");
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getEventIcon = (event: AuditEvent) => {
    const iconClass = "w-4 h-4 text-gray-600 dark:text-gray-400";

    // Reassignment events
    if (
      event.eventType === "PICK_REASSIGNED" ||
      event.eventType === "TASK_REASSIGNED"
    ) {
      return <Users className={iconClass} />;
    }

    // Status changes
    if (event.type === "ORDER_STATUS") {
      return <ArrowRight className={iconClass} />;
    }

    // Picking events
    if (event.type === "PICKING") {
      switch (event.eventType) {
        case "PICK_STARTED":
          return <PlayCircle className={iconClass} />;
        case "PICK_COMPLETED":
          return <CheckCircle className={iconClass} />;
        case "PICK_PAUSED":
          return <PauseCircle className={iconClass} />;
        case "PICK_CANCELLED":
          return <XCircle className={iconClass} />;
        case "LOCATION_SCANNED":
          return <MapPin className={iconClass} />;
        case "BARCODE_SCANNED":
          return <Barcode className={iconClass} />;
        case "ITEM_PICKED":
          return <CheckCircle className={iconClass} />;
        case "ITEM_SHORT_PICKED":
          return <AlertCircle className={iconClass} />;
        case "ITEM_SKIPPED":
          return <UserX className={iconClass} />;
        default:
          return <ScanLine className={iconClass} />;
      }
    }

    // Packing events
    if (event.type === "PACKING") {
      switch (event.eventType) {
        case "TASK_STARTED":
          return <PlayCircle className={iconClass} />;
        case "TASK_COMPLETED":
          return <CheckCircle className={iconClass} />;
        case "ITEM_COMPLETED":
          return <Package className={iconClass} />;
        case "TASK_PAUSED":
          return <PauseCircle className={iconClass} />;
        case "TASK_CANCELLED":
          return <XCircle className={iconClass} />;
        default:
          return <Package className={iconClass} />;
      }
    }

    // Shipping events
    // if (event.type === "SHIPPING") {
    //   if (event.eventType === "LABEL_CREATED") {
    //     return <FileText className={iconClass} />;
    //   }
    //   return <Truck className={iconClass} />;
    // }
    // Add to getEventIcon function in AuditTrailTab.tsx
    if (event.type === "SHIPPING") {
      switch (event.eventType) {
        case "TASK_STARTED":
          return <PlayCircle className={iconClass} />;
        case "TASK_COMPLETED":
          return <CheckCircle className={iconClass} />;
        case "LABEL_GENERATED":
        case "LABEL_CREATED":
          return <FileText className={iconClass} />;
        case "LABEL_PRINTED":
          return <FileText className="w-4 h-4 text-green-600" />;
        case "LABEL_VOIDED":
        case "SHIPMENT_VOIDED":
          return <XCircle className={iconClass} />;
        case "PACKAGE_WEIGHED":
          return <Package className={iconClass} />;
        case "PACKAGE_DIMENSIONS_RECORDED":
          return <Package className={iconClass} />;
        case "CARRIER_SELECTED":
        case "SERVICE_LEVEL_SELECTED":
          return <Truck className={iconClass} />;
        case "RATE_SHOPPED":
          return <FileText className={iconClass} />;
        case "TRACKING_NUMBER_ASSIGNED":
          return <Barcode className={iconClass} />;
        case "SHIPMENT_MANIFESTED":
          return <CheckCircle className="w-4 h-4 text-green-600" />;
        case "PICKUP_SCHEDULED":
          return <Clock className={iconClass} />;
        case "PACKAGE_SCANNED":
          return <ScanLine className={iconClass} />;
        case "PACKAGE_SHIPPED":
          return <Truck className="w-4 h-4 text-green-600" />;
        case "TASK_REASSIGNED":
          return <Users className={iconClass} />;
        default:
          return <Truck className={iconClass} />;
      }
    }

    // Back order events
    if (event.type === "BACK_ORDER") {
      if (event.eventType === "FULFILLED") {
        return <CheckCircle className={iconClass} />;
      }
      return <PackageX className={iconClass} />;
    }

    return <Clock className={iconClass} />;
  };

  const getEventTitle = (event: AuditEvent) => {
    const { type, eventType, metadata } = event;

    // Reassignment events
    if (eventType === "PICK_REASSIGNED" || eventType === "TASK_REASSIGNED") {
      const fromName =
        event.data?.fromUserName || event.metadata?.fromUserName || "Unknown";
      const toName =
        event.data?.toUserName || event.metadata?.toUserName || "Unknown";

      const label =
        eventType === "PICK_REASSIGNED"
          ? "Pick list reassigned"
          : "Task reassigned";

      return `${label}: ${fromName} → ${toName}`;
    }

    // Status changes
    if (type === "ORDER_STATUS") {
      return `Status changed: ${metadata.fromStatus} → ${metadata.toStatus}`;
    }

    // Picking events
    if (type === "PICKING") {
      const batch = metadata.batchNumber;
      switch (eventType) {
        case "PICK_STARTED":
          return `Pick started: ${batch}`;
        case "PICK_COMPLETED":
          return `Pick completed: ${batch}`;
        case "PICK_PAUSED":
          return `Pick paused: ${batch}`;
        case "PICK_RESUMED":
          return `Pick resumed: ${batch}`;
        case "PICK_CANCELLED":
          return `Pick cancelled: ${batch}`;
        case "LOCATION_SCANNED":
          return `Location scanned: ${metadata.location}`;
        case "BARCODE_SCANNED":
          return `Barcode scanned`;
        case "ITEM_PICKED":
          return `Item picked`;
        case "ITEM_SHORT_PICKED":
          return `Item short picked`;
        case "ITEM_SKIPPED":
          return `Item skipped`;
        default:
          return eventType?.replace(/_/g, " ") || "Pick event";
      }
    }

    // Packing events
    if (type === "PACKING") {
      const taskNum = metadata.taskNumber;
      switch (eventType) {
        case "TASK_CREATED":
          return `Packing task created: ${taskNum}`;
        case "TASK_ASSIGNED":
          return `Packing task assigned: ${taskNum}`;
        case "TASK_STARTED":
          return `Packing started: ${taskNum}`;
        case "TASK_COMPLETED":
          return `Packing completed: ${taskNum}`;
        case "ITEM_COMPLETED":
          return `Item packed`;
        case "TASK_PAUSED":
          return `Packing paused: ${taskNum}`;
        case "TASK_CANCELLED":
          return `Packing cancelled: ${taskNum}`;
        default:
          return eventType?.replace(/_/g, " ") || "Packing event";
      }
    }

    // Shipping events
    // if (type === "SHIPPING") {
    //   if (eventType === "LABEL_CREATED") {
    //     return "Shipping label created";
    //   }
    //   return "Package shipped";
    // }
    // Add to getEventTitle function
    if (type === "SHIPPING") {
      const taskNum = metadata.taskNumber;
      switch (eventType) {
        case "TASK_CREATED":
          return `Shipping task created: ${taskNum}`;
        case "TASK_ASSIGNED":
          return `Shipping task assigned: ${taskNum}`;
        case "TASK_STARTED":
          return `Shipping started: ${taskNum}`;
        case "TASK_COMPLETED":
          return `Shipping completed: ${taskNum}`;
        case "TASK_REASSIGNED":
          const fromName = metadata?.fromUserName || "Unknown";
          const toName = metadata?.toUserName || "Unknown";
          return `Shipping task reassigned: ${fromName} → ${toName}`;
        case "LABEL_GENERATED":
        case "LABEL_CREATED":
          return "Shipping label generated";
        case "LABEL_PRINTED":
          return "Shipping label printed";
        case "LABEL_VOIDED":
          return "Shipping label voided";
        case "PACKAGE_WEIGHED":
          return `Package weighed: ${metadata.weight}oz`;
        case "PACKAGE_DIMENSIONS_RECORDED":
          return "Package dimensions recorded";
        case "CARRIER_SELECTED":
          return `Carrier selected: ${metadata.carrier}`;
        case "SERVICE_LEVEL_SELECTED":
          return `Service level selected: ${metadata.serviceLevel}`;
        case "RATE_SHOPPED":
          return "Rate shopping completed";
        case "INSURANCE_ADDED":
          return `Insurance added: $${metadata.insuranceAmount}`;
        case "SIGNATURE_REQUIRED":
          return "Signature required";
        case "TRACKING_NUMBER_ASSIGNED":
          return `Tracking number: ${metadata.trackingNumber}`;
        case "SHIPMENT_MANIFESTED":
          return "Shipment manifested";
        case "PICKUP_SCHEDULED":
          return `Pickup scheduled: ${new Date(
            metadata.pickupDate
          ).toLocaleDateString()}`;
        case "PACKAGE_SCANNED":
          return "Package scanned";
        case "SHIPMENT_VOIDED":
          return "Shipment voided";
        case "PACKAGE_SHIPPED":
          return "Package shipped";
        default:
          return eventType?.replace(/_/g, " ") || "Shipping event";
      }
    }

    // Back order events
    if (type === "BACK_ORDER") {
      if (eventType === "FULFILLED") {
        return "Back order fulfilled";
      }
      return "Back order created";
    }

    return eventType?.replace(/_/g, " ") || "Event";
  };

  const getEventDescription = (event: AuditEvent) => {
    const { type, eventType, metadata } = event;

    const parts: string[] = [];

    // Reassignment description
    if (eventType === "PICK_REASSIGNED" || eventType === "TASK_REASSIGNED") {
      if (metadata.reassignmentReason) {
        parts.push(`Reason: ${metadata.reassignmentReason.replace(/_/g, " ")}`);
      }
      if (metadata.progress) {
        // For picking, show items; for packing, show orders
        if (eventType === "PICK_REASSIGNED") {
          const { completedItems, totalItems } = metadata.progress;
          if (completedItems !== undefined && totalItems !== undefined) {
            parts.push(`Progress: ${completedItems}/${totalItems} items`);
          }
        } else if (eventType === "TASK_REASSIGNED") {
          const { completedOrders, totalOrders, completedItems, totalItems } =
            metadata.progress;
          // Prefer orders for packing tasks, fall back to items
          if (completedOrders !== undefined && totalOrders !== undefined) {
            parts.push(`Progress: ${completedOrders}/${totalOrders} orders`);
          } else if (completedItems !== undefined && totalItems !== undefined) {
            parts.push(`Progress: ${completedItems}/${totalItems} items`);
          }
        }
      }
      return parts.join(" • ");
    }

    // Picking descriptions
    if (type === "PICKING") {
      if (metadata.location) parts.push(`Location: ${metadata.location}`);
      if (metadata.scannedCode) parts.push(`Code: ${metadata.scannedCode}`);
      if (eventType === "ITEM_SHORT_PICKED" && event.data?.reason) {
        parts.push(`Reason: ${event.data.reason}`);
      }
    }

    // Packing descriptions
    if (type === "PACKING" && metadata.progress) {
      const { completedItems, totalItems, completedOrders, totalOrders } =
        metadata.progress;
      // Prefer showing orders for packing
      if (totalOrders !== undefined && totalOrders > 0) {
        parts.push(`${completedOrders || 0}/${totalOrders} orders`);
      }
      if (totalItems !== undefined && totalItems > 0) {
        parts.push(`${completedItems || 0}/${totalItems} items`);
      }
    }

    // Shipping descriptions
    // if (type === "SHIPPING") {
    //   if (metadata.trackingNumber) parts.push(metadata.trackingNumber);
    //   if (metadata.carrier) parts.push(metadata.carrier);
    //   if (metadata.service) parts.push(metadata.service);
    // }
    // Add to getEventDescription function
    if (type === "SHIPPING") {
      const parts: string[] = [];

      if (metadata.trackingNumber)
        parts.push(`Tracking: ${metadata.trackingNumber}`);
      if (metadata.carrier) parts.push(metadata.carrier);
      if (metadata.serviceLevel) parts.push(metadata.serviceLevel);
      if (metadata.weight) parts.push(`${metadata.weight}oz`);
      if (metadata.shippingCost) parts.push(`$${metadata.shippingCost}`);
      if (metadata.insuranceAmount)
        parts.push(`Insurance: $${metadata.insuranceAmount}`);
      if (metadata.voidReason) parts.push(`Reason: ${metadata.voidReason}`);

      // Dimensions
      if (metadata.dimensions) {
        const dims = metadata.dimensions;
        parts.push(`${dims.length}×${dims.width}×${dims.height}in`);
      }

      // Reassignment details
      if (eventType === "TASK_REASSIGNED" && metadata.reassignmentReason) {
        parts.push(`Reason: ${metadata.reassignmentReason.replace(/_/g, " ")}`);
      }

      // Progress for shipping tasks
      if (metadata.progress) {
        const { completedOrders, totalOrders, completedItems, totalItems } =
          metadata.progress;
        if (totalOrders !== undefined && totalOrders > 0) {
          parts.push(`${completedOrders || 0}/${totalOrders} orders`);
        }
        if (totalItems !== undefined && totalItems > 0) {
          parts.push(`${completedItems || 0}/${totalItems} packages`);
        }
      }

      return parts.join(" • ");
    }

    // Back order descriptions
    if (type === "BACK_ORDER") {
      if (metadata.quantity) parts.push(`${metadata.quantity}x`);
      if (metadata.sku) parts.push(metadata.sku);
      if (eventType === "CREATED" && metadata.reason) {
        parts.push(metadata.reason.replace(/_/g, " "));
      }
    }

    return parts.join(" • ");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Failed to load audit trail
        </p>
      </div>
    );
  }

  const timeline = data?.timeline || [];

  if (timeline.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Events */}
        <div className="space-y-6">
          {timeline.map((event: AuditEvent) => (
            <div key={event.id} className="relative pl-12">
              {/* Icon circle - centered on vertical line */}
              <div className="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-zinc-900 border-2 border-gray-200 dark:border-gray-700">
                {getEventIcon(event)}
              </div>

              {/* Event card */}
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-zinc-900">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">{getEventTitle(event)}</h4>
                    {getEventDescription(event) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {getEventDescription(event)}
                      </p>
                    )}
                    {event.notes && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 italic">
                        Note: {event.notes}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="ml-2 whitespace-nowrap">
                    {event.eventType?.replace(/_/g, " ") || event.type}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1 text-blue-500">
                    <Clock className="w-3 h-3" />
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                  {event.user && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {event.user.name || event.user.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
