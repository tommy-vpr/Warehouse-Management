"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  ArrowRight,
  Loader2,
  PlayCircle,
  PauseCircle,
  SkipForward,
  Box,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PickListProgressProps {
  pickListId: string;
}

interface PickListItem {
  id: string;
  sequence: number;
  status: string;
  order: {
    orderNumber: string;
    customerName: string;
  };
  product: {
    sku: string;
    name: string;
    upc?: string;
    barcode?: string;
  };
  location: {
    name: string;
    zone?: string;
    aisle?: string;
    shelf?: string;
  };
  quantityToPick: number;
  quantityPicked: number;
  pickedAt?: string;
  pickedBy?: string;
  shortPickReason?: string;
  notes?: string;
}

interface PickListStats {
  totalItems: number;
  pickedItems: number;
  progress: number;
  pendingItems: number;
  shortPicks: number;
  skippedItems: number;
  estimatedTimeRemaining: number;
  uniqueOrders: string[];
  uniqueLocations: string[];
  totalValue: number;
}

interface PickListData {
  pickList: {
    id: string;
    batchNumber: string;
    status: string;
    assignedTo?: { name: string; email: string };
    priority: number;
    startTime?: string;
    endTime?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  };
  items: PickListItem[];
  stats: PickListStats;
  events?: any[];
}

export default function PickListProgressView({
  pickListId,
}: PickListProgressProps) {
  const router = useRouter();

  // Fetch pick list details with auto-refresh
  const { data, isLoading, error, refetch } = useQuery<PickListData>({
    queryKey: ["pickList", pickListId],
    queryFn: async () => {
      const response = await fetch(`/api/picking/lists/${pickListId}`);
      if (!response.ok) throw new Error("Failed to fetch pick list");
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchOnWindowFocus: true,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ASSIGNED":
      case "PENDING":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "PICKED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "SHORT_PICK":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "SKIPPED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getItemStatusIcon = (status: string) => {
    switch (status) {
      case "PICKED":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "SHORT_PICK":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case "SKIPPED":
        return <SkipForward className="w-5 h-5 text-purple-600" />;
      case "IN_PROGRESS":
        return <PlayCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleStartPicking = () => {
    router.push(`/dashboard/picking/mobile/${pickListId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading Picking Progress...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Error Loading Pick List
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  const { pickList, items, stats } = data;
  const hasStarted = !!pickList.startTime || stats.pickedItems > 0;
  const isCompleted = pickList.status === "COMPLETED";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {pickList.batchNumber}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {pickList.assignedTo?.name
              ? `Assigned to ${pickList.assignedTo.name}`
              : "Unassigned"}
          </p>
        </div>
        <Badge className={getStatusColor(pickList.status)}>
          {pickList.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <p className="text-lg font-bold">
                  {stats.pickedItems}/{stats.totalItems}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Items
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-lg font-bold">{stats.progress}%</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Complete
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-orange-600 mr-2" />
              <div>
                <p className="text-lg font-bold">{stats.pendingItems}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
              <div>
                <p className="text-lg font-bold">{stats.shortPicks}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Short Picks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Box className="w-5 h-5 text-purple-600 mr-2" />
              <div>
                <p className="text-lg font-bold">{stats.uniqueOrders.length}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Orders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MapPin className="w-5 h-5 text-indigo-600 mr-2" />
              <div>
                <p className="text-lg font-bold">
                  {stats.uniqueLocations.length}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Locations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold">{stats.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>
              {pickList.startTime
                ? `Started ${new Date(pickList.startTime).toLocaleTimeString()}`
                : "Not started"}
            </span>
            {stats.estimatedTimeRemaining > 0 && !isCompleted && (
              <span>~{stats.estimatedTimeRemaining} min remaining</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!isCompleted && (
        <div className="flex gap-3">
          <Button
            onClick={handleStartPicking}
            className="flex-1 sm:flex-none"
            size="lg"
          >
            <PlayCircle className="w-5 h-5" />
            {hasStarted ? "Continue Picking" : "Start Picking"}
          </Button>
          {hasStarted && (
            <Button variant="outline" size="lg">
              <PauseCircle className="w-5 h-5" />
              Pause
            </Button>
          )}
        </div>
      )}

      {/* Pick List Items */}
      <Card>
        <CardHeader>
          <CardTitle>Pick List Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item, index) => (
              <PickListItemCard key={item.id} item={item} index={index + 1} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual Pick List Item Card
function PickListItemCard({
  item,
  index,
}: {
  item: PickListItem;
  index: number;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PICKED":
        return "border-green-500 bg-green-50 dark:bg-green-900/10";
      case "SHORT_PICK":
        return "border-orange-500 bg-orange-50 dark:bg-orange-900/10";
      case "SKIPPED":
        return "border-purple-500 bg-purple-50 dark:bg-purple-900/10";
      case "IN_PROGRESS":
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10";
      default:
        return "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PICKED":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "SHORT_PICK":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case "SKIPPED":
        return <SkipForward className="w-5 h-5 text-purple-600" />;
      case "IN_PROGRESS":
        return <PlayCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const progress =
    item.quantityToPick > 0
      ? (item.quantityPicked / item.quantityToPick) * 100
      : 0;

  return (
    <div
      className={`border-2 rounded-lg p-4 transition-all ${getStatusColor(
        item.status
      )}`}
    >
      <div className="flex items-start gap-4">
        {/* Sequence Number */}
        <div className="flex-shrink-0">
          {/* <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
            {index}
          </div> */}
          <Badge variant="outline">{index}</Badge>
        </div>

        {/* Item Details */}
        <div className="flex-1 min-w-0">
          {/* Product Info */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {item.product.name}
              </h4>
              <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  SKU: {item.product.sku}
                </span>
                {item.product.upc && (
                  <span className="flex items-center gap-1">
                    UPC: {item.product.upc}
                  </span>
                )}
              </div>
            </div>
            {getStatusIcon(item.status)}
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 mb-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {item.location.name}
            </span>
            {item.location.zone && (
              <span className="text-gray-500 dark:text-gray-400">
                Zone: {item.location.zone}
              </span>
            )}
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Quantity:{" "}
              </span>
              <span className="font-semibold">
                {item.quantityPicked}/{item.quantityToPick}
              </span>
            </div>
            {item.status !== "PENDING" && (
              <Badge variant="outline">{item.status.replace("_", " ")}</Badge>
            )}
          </div>

          {/* Progress Bar */}
          {item.quantityPicked > 0 && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full ${
                  progress === 100
                    ? "bg-green-500"
                    : item.status === "SHORT_PICK"
                    ? "bg-orange-500"
                    : "bg-blue-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Order Reference */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Order: {item.order.orderNumber}</span>
            <ArrowRight className="w-3 h-3" />
            <span>{item.order.customerName}</span>
          </div>

          {/* Additional Info */}
          {(item.shortPickReason || item.notes || item.pickedBy) && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {item.pickedBy && (
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <User className="w-3 h-3" />
                  <span>Picked by {item.pickedBy}</span>
                  {item.pickedAt && (
                    <span className="ml-2">
                      at {new Date(item.pickedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}
              {item.shortPickReason && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">
                  Reason: {item.shortPickReason}
                </div>
              )}
              {item.notes && (
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 rounded px-2 py-1">
                  Note: {item.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
