"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Package,
  MapPin,
  CheckCircle,
  X,
  Minus,
  ArrowLeft,
  ArrowRight,
  Clock,
  User,
  AlertTriangle,
  Home,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface PickListItem {
  id: string;
  sequence: number;
  status: string;
  order: {
    orderNumber: string;
    customerName: string;
    totalAmount: string;
  };
  product: {
    sku: string;
    name: string;
    sellingPrice: string;
  };
  location: {
    name: string;
    zone: string;
    aisle: string;
    shelf: string;
  };
  quantityToPick: number;
  quantityPicked: number;
}

interface PickListDetails {
  pickList: {
    id: string;
    batchNumber: string;
    status: string;
    assignedTo?: { name: string };
    startTime?: string;
  };
  items: PickListItem[];
  stats: {
    totalItems: number;
    pickedItems: number;
    progress: number;
    pendingItems: number;
  };
}

export default function MobilePickingInterface({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [pickList, setPickList] = useState<PickListDetails | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showShortPickModal, setShowShortPickModal] = useState(false);
  const [shortPickQuantity, setShortPickQuantity] = useState("");
  const [shortPickReason, setShortPickReason] = useState("");
  const { id } = useParams<{ id: string }>();

  console.log("ID:", id);

  useEffect(() => {
    loadPickList();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPickList, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPickList = async () => {
    try {
      const response = await fetch(`/api/picking/lists/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPickList(data);

        // Find next pending item
        const nextPendingIndex = data.items.findIndex(
          (item: PickListItem) => item.status === "PENDING"
        );
        if (nextPendingIndex !== -1) {
          setCurrentItemIndex(nextPendingIndex);
        }
      } else {
        console.error("Failed to load pick list:", response.status);
        setPickList(null);
      }
    } catch (error) {
      console.error("Failed to load pick list:", error);
      setPickList(null);
    }
    setIsLoading(false);
  };

  const processItem = async (
    action: "PICK" | "SHORT_PICK" | "SKIP",
    options: any = {}
  ) => {
    if (!pickList) return;

    const currentItem = pickList.items[currentItemIndex];
    setIsProcessing(true);

    try {
      const response = await fetch(
        `/api/picking/items/${currentItem.id}/pick`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            quantityPicked: options.quantity || currentItem.quantityToPick,
            reason: options.reason,
            location: currentItem.location.name,
            notes: options.notes,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        await loadPickList();

        // Check if pick list is completed
        if (result.progress.completed) {
          // The completion screen will show automatically after loadPickList()
          return;
        }

        // Move to next pending item
        moveToNextItem();

        if (action === "SHORT_PICK") {
          setShowShortPickModal(false);
          setShortPickQuantity("");
          setShortPickReason("");
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to ${action.toLowerCase()}: ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Failed to ${action.toLowerCase()} item:`, error);
      alert(`Network error: Failed to ${action.toLowerCase()} item`);
    }
    setIsProcessing(false);
  };

  const moveToNextItem = () => {
    if (!pickList) return;

    // Find next pending item after current index
    const nextIndex = pickList.items.findIndex(
      (item, index) => index > currentItemIndex && item.status === "PENDING"
    );

    if (nextIndex !== -1) {
      setCurrentItemIndex(nextIndex);
    } else {
      // No more pending items, stay on current or go to first pending
      const firstPending = pickList.items.findIndex(
        (item) => item.status === "PENDING"
      );
      if (firstPending !== -1) {
        setCurrentItemIndex(firstPending);
      }
    }
  };
  const moveToPreviousItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  const moveToNextAvailableItem = () => {
    if (!pickList) return;

    const nextIndex = pickList.items.findIndex(
      (item, index) => index > currentItemIndex && item.status === "PENDING"
    );

    if (nextIndex !== -1) {
      setCurrentItemIndex(nextIndex);
    } else {
      // Find first pending item from the beginning
      const firstPendingIndex = pickList.items.findIndex(
        (item) => item.status === "PENDING"
      );
      if (firstPendingIndex !== -1) {
        setCurrentItemIndex(firstPendingIndex);
      }
    }
  };

  const handleShortPick = () => {
    const quantity = parseInt(shortPickQuantity) || 0;
    processItem("SHORT_PICK", {
      quantity,
      reason: shortPickReason,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading pick list...</p>
        </div>
      </div>
    );
  }

  if (!pickList) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Pick list not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const currentItem = pickList.items[currentItemIndex];
  const pendingItems = pickList.items.filter(
    (item) => item.status === "PENDING"
  );

  // Check if all items are completed
  if (pendingItems.length === 0) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Pick List Complete!
          </h2>
          <p className="text-green-700 mb-6">
            All items have been processed for {pickList.pickList.batchNumber}
          </p>
          <div className="space-y-2">
            <Link
              href={"/dashboard"}
              className="m-auto rounded w-fit px-4 py-2 flex gap-2 items-center justify-center bg-zinc-900 text-white"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-center">
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button> */}
            <div className="text-center">
              <h1 className="font-semibold text-lg">
                {pickList.pickList.batchNumber}
              </h1>
              <p className="text-sm text-gray-600">Picking</p>
            </div>
            {/* <div className="w-8"></div> */}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>
              {pickList.stats.progress}% ({pickList.stats.pickedItems}/
              {pickList.stats.totalItems})
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${pickList.stats.progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>
              Item {currentItemIndex + 1} of {pickList.items.length}
            </span>
            <span>{pendingItems.length} remaining</span>
          </div>
        </div>
      </div>

      {/* Current Item */}
      <div className="max-w-md mx-auto p-4">
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge
                variant={
                  currentItem.status === "PENDING" ? "secondary" : "default"
                }
              >
                #{currentItem.sequence}
              </Badge>
              <Badge
                className={
                  currentItem.status === "PICKED"
                    ? "bg-green-100 text-green-800"
                    : currentItem.status === "SKIPPED"
                    ? "bg-red-100 text-red-800"
                    : currentItem.status === "SHORT_PICK"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }
              >
                {currentItem.status.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Location */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-semibold text-blue-800">Location</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {currentItem.location.name}
              </div>
              <div className="text-sm text-blue-700">
                Zone {currentItem.location.zone} • Aisle{" "}
                {currentItem.location.aisle} • Shelf{" "}
                {currentItem.location.shelf}
              </div>
            </div>

            {/* Product Info */}
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {currentItem.product.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">SKU:</span>
                  <div className="font-mono font-medium">
                    {currentItem.product.sku}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Price:</span>
                  <div className="font-medium">
                    ${currentItem.product.sellingPrice}
                  </div>
                </div>
              </div>
            </div>

            {/* Quantity */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Quantity to Pick:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {currentItem.quantityToPick}
                </span>
              </div>
              {currentItem.quantityPicked > 0 && (
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-gray-500">Already Picked:</span>
                  <span className="text-green-600 font-medium">
                    {currentItem.quantityPicked}
                  </span>
                </div>
              )}
            </div>

            {/* Order Info */}
            <div className="text-sm text-gray-600">
              <div className="flex items-center mb-1">
                <User className="w-4 h-4 mr-1" />
                Order: {currentItem.order.orderNumber}
              </div>
              <div>Customer: {currentItem.order.customerName}</div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {currentItem.status === "PENDING" && (
          <div className="space-y-3">
            {/* Pick Button */}
            <Button
              onClick={() => processItem("PICK")}
              disabled={isProcessing}
              className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-6 h-6 mr-3" />
              Pick {currentItem.quantityToPick} Units
            </Button>

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowShortPickModal(true)}
                disabled={isProcessing}
                variant="outline"
                className="h-12"
              >
                <Minus className="w-5 h-5 mr-2" />
                Short Pick
              </Button>

              <Button
                onClick={() => processItem("SKIP")}
                disabled={isProcessing}
                variant="outline"
                className="h-12"
              >
                <X className="w-5 h-5 mr-2" />
                Skip
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            onClick={moveToPreviousItem}
            disabled={currentItemIndex === 0}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <Button onClick={moveToNextAvailableItem} variant="outline" size="sm">
            Next
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Short Pick Modal */}
      {showShortPickModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Short Pick</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quantity Picked (max: {currentItem.quantityToPick})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={currentItem.quantityToPick}
                    value={shortPickQuantity}
                    onChange={(e) => setShortPickQuantity(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Reason
                  </label>
                  <textarea
                    value={shortPickReason}
                    onChange={(e) => setShortPickReason(e.target.value)}
                    placeholder="Why was this item short picked?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowShortPickModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleShortPick}
                  disabled={!shortPickReason.trim()}
                  className="flex-1"
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
