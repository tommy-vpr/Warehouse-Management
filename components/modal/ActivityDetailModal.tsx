// components/ActivityDetailModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  MapPin,
  User,
  Clock,
  FileText,
  Hash,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowRight,
} from "lucide-react";

import { getActivityBadgeColor, getActivityIcon } from "@/lib/activity-utils";

interface Activity {
  id: string;
  type: string;
  message: string;
  time: string;
  userName?: string;
  userId?: string;
  details?: {
    productVariantId?: string;
    sku?: string;
    productName?: string;
    locationId?: string;
    locationName?: string;
    quantityChange?: number;
    quantityOnHand?: number;
    referenceId?: string;
    referenceType?: string;
    notes?: string;
    metadata?: any;
    sourceLocation?: string;
    transactionType?: string;
  };
  createdAt: string;
}

interface ActivityDetailModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityDetailModal({
  activity,
  isOpen,
  onClose,
}: ActivityDetailModalProps) {
  if (!activity) return null;

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      receipt: "Receipt",
      sale: "Sale",
      order: "Order",
      scan: "Scan/Count",
      shipment: "Shipment",
    };
    return labels[type.toLowerCase()] || type.toUpperCase();
  };

  const formatQuantityChange = (change?: number) => {
    if (change === undefined || change === null) return null;

    const isPositive = change > 0;
    return (
      <div className="flex items-center gap-2">
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-green-500" />
        ) : change < 0 ? (
          <TrendingDown className="w-4 h-4 text-red-500" />
        ) : null}
        <span
          className={
            isPositive
              ? "text-green-600 dark:text-green-400 font-semibold"
              : change < 0
              ? "text-red-600 dark:text-red-400 font-semibold"
              : "text-gray-600 dark:text-gray-400"
          }
        >
          {isPositive ? "+" : ""}
          {change}
        </span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl xl:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gray-100 dark:bg-muted rounded-lg">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">
                Activity Details
              </DialogTitle>
              <Badge
                className={`${getActivityBadgeColor(activity.type)} text-xs`}
              >
                {getTransactionTypeLabel(activity.type)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Message */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Message
            </h3>
            <p className="text-base text-foreground">{activity.message}</p>
          </div>

          <Separator />

          {/* Transaction ID */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Transaction ID
              </h3>
              <p className="text-sm font-mono text-foreground bg-muted px-3 py-2 rounded">
                {activity.id}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time
              </h3>
              <p className="text-sm text-foreground">{activity.time}</p>
            </div>
          </div>

          <Separator />

          {/* User Information */}
          {activity.userName && (
            <>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Performed By
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-base text-blue-600 dark:text-blue-400 font-medium">
                    {activity.userName}
                  </p>
                  {activity.userId && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      ({activity.userId})
                    </span>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Product Information */}
          {activity.details?.productName && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Product Information
                </h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Product
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {activity.details.productName}
                    </span>
                  </div>
                  {activity.details.sku && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        SKU
                      </span>
                      <span className="text-sm font-mono text-foreground">
                        {activity.details.sku}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Location Information */}
          {activity.details?.locationName && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-base font-medium text-foreground">
                    {activity.details.locationName}
                  </p>
                  {activity.details.locationId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                      ID: {activity.details.locationId}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Quantity Changes */}
          {activity.details?.quantityChange !== undefined && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Quantity Changes
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Change
                    </p>
                    {formatQuantityChange(activity.details.quantityChange)}
                  </div>
                  {activity.details.quantityOnHand !== undefined && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Current Stock
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {activity.details.quantityOnHand}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Reference Information */}
          {(activity.details?.referenceId ||
            activity.details?.referenceType) && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Reference
                </h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  {activity.details.referenceType && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Type
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {activity.details.referenceType}
                      </Badge>
                    </div>
                  )}
                  {activity.details.referenceId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        ID
                      </span>
                      <span className="text-sm font-mono text-foreground">
                        {activity.details.referenceId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Transfer Source */}
          {activity.details?.sourceLocation && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Transfer Source
                </h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-base text-foreground">
                    {activity.details.sourceLocation}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Notes */}
          {activity.details?.notes && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {activity.details.notes}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Metadata */}
          {activity.details?.metadata && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Additional Data
              </h3>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-xs font-mono text-foreground overflow-x-auto">
                  {JSON.stringify(activity.details.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="pt-4 border-t dark:border-border">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>
                Created: {new Date(activity.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
