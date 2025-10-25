"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ArrowLeft,
  CheckCircle,
  User,
  MapPin,
  AlertTriangle,
  Truck,
  Box,
  Check,
  Loader2,
  Dot,
} from "lucide-react";
import { useParams } from "next/navigation";
import ShippingLabelForm from "@/components/shipping/ShippingLabelForm";
import OrderImageUploader from "@/components/order/OrderImageUploader";

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number; // quantityToPack (reduced amount)
  originalQuantity?: number; // ✅ ADD: original order quantity
  quantityBackOrdered?: number; // ✅ ADD: back ordered amount
  unitPrice: string;
  totalPrice: string;
  weightGrams: number;
  weightOz: number;
}

interface PackingInfo {
  totalWeightGrams: number;
  totalWeightOz: number;
  totalWeightLbs: number;
  totalVolume: number;
  suggestedBox: string;
  estimatedShippingCost: number;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: string;
  shippingAddress: any;
  items: OrderItem[];
  images?: Array<{
    // ✅ ADD THIS
    id: string;
    url: string;
    createdAt: string;
  }>;
}

interface ApiResponse {
  success: boolean;
  order: OrderDetails;
  packingInfo: PackingInfo;
}

// Box Types Configuration
const BOX_TYPES = [
  {
    id: "SMALL",
    name: "Small Box",
    dimensions: "10x8x4",
    maxWeight: 5,
    cost: 0.5,
  },
  {
    id: "MEDIUM",
    name: "Medium Box",
    dimensions: "12x10x6",
    maxWeight: 15,
    cost: 1.0,
  },
  {
    id: "LARGE",
    name: "Large Box",
    dimensions: "18x14x8",
    maxWeight: 30,
    cost: 2.0,
  },
  {
    id: "CUSTOM",
    name: "Custom Box",
    dimensions: "Custom",
    maxWeight: 999,
    cost: 0,
  },
];

export default function EnhancedPackingInterface() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  // Order state
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [packingInfo, setPackingInfo] = useState<PackingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Packing state
  const [selectedBox, setSelectedBox] = useState("");
  const [customDimensions, setCustomDimensions] = useState({
    length: "",
    width: "",
    height: "",
  });

  // Packing materials state
  const [packingMaterials, setPackingMaterials] = useState({
    bubbleWrap: false,
    voidFill: false,
    fragileSticker: false,
    extraTape: false,
  });

  // Item verification state
  const [verifiedItems, setVerifiedItems] = useState<Set<string>>(new Set());

  // Process state
  const [currentStep, setCurrentStep] = useState(1);
  const [isPacking, setIsPacking] = useState(false);
  const [isPackingComplete, setIsPackingComplete] = useState(false);

  useEffect(() => {
    loadOrderDetails();
  }, []);

  const loadOrderDetails = async () => {
    try {
      const response = await fetch(`/api/packing/pack/${id}`);
      const data: any = await response.json();

      if (response.ok) {
        setOrder(data.order);
        setPackingInfo(data.packingInfo);

        // Pre-select suggested box
        if (data.packingInfo.suggestedBox) {
          setSelectedBox(data.packingInfo.suggestedBox);
        }
      } else {
        // ✅ Handle specific error cases with detailed information
        console.error("Failed to load order:", data);

        // Show detailed error if available
        if (
          data.details?.pendingItems &&
          data.details.pendingItems.length > 0
        ) {
          const pendingInfo = data.details.pendingItems
            .map(
              (item: any) =>
                `  • ${item.sku}: ${item.quantityPicked}/${item.quantityOrdered} picked`
            )
            .join("\n");

          alert(
            `${data.error}\n\nPending items:\n${pendingInfo}\n\nPlease complete picking these items first.`
          );
        } else {
          alert(data.error || "Order not found or not ready for packing");
        }
      }
    } catch (error) {
      console.error("Failed to load order:", error);
      alert("Failed to load order. Please try again.");
    }
    setIsLoading(false);
  };

  // Calculate total weight in pounds from packing info
  const calculatedWeightLbs = packingInfo?.totalWeightLbs || 0;
  const calculatedWeightOz = packingInfo?.totalWeightOz || 0;

  // Toggle item verification
  const toggleItemVerification = (itemId: string) => {
    const newVerified = new Set(verifiedItems);
    if (newVerified.has(itemId)) {
      newVerified.delete(itemId);
    } else {
      newVerified.add(itemId);
    }
    setVerifiedItems(newVerified);
  };

  // Check if can proceed to next step
  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2: // Pack items → Create Label
        return order ? verifiedItems.size === order.items.length : false;
      default:
        return true;
    }
  };

  // Mark order as packed and move to Step 3
  const proceedToCreateLabel = async () => {
    if (!order) return;

    setIsPacking(true);
    try {
      // Mark order as PACKED
      const response = await fetch(`/api/packing/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          boxType: selectedBox,
          weight: calculatedWeightLbs,
          materials: packingMaterials,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to mark as packed");
      }

      setCurrentStep(2);
    } catch (error) {
      console.error("Failed to complete packing:", error);
      alert(
        `Failed to complete packing: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
    setIsPacking(false);
  };

  // Handle successful label creation
  const handleLabelSuccess = (results: any[]) => {
    console.log("Labels created successfully:", results);
    setIsPackingComplete(true);
  };

  // Packing steps
  const steps = [
    {
      number: 1,
      title: "Pack Items",
      icon: Package,
      completed: canProceedToStep(3),
    },
    {
      number: 2,
      title: "Create Label",
      icon: Truck,
      completed: isPackingComplete,
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-200">
            Loading order details...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-200">
            Order not found or not ready for packing
          </p>
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

  // Success state
  if (isPackingComplete) {
    return (
      <div className="min-h-screen bg-green-50 dark:bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 dark:text-green-600 mb-2">
            Order Packed & Labeled!
          </h2>
          <p className="text-green-700 dark:text-green-600 mb-6">
            {order.orderNumber} is ready for shipping
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => (window.location.href = "/dashboard/packing")}
              className="w-full h-12 text-lg"
            >
              Pack Next Order
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ CORRECT - These calculations are right!
  const totalPackingValue = order.items.reduce((sum, item) => {
    return sum + parseFloat(item.totalPrice);
  }, 0);

  // Items being packed (this is already the reduced quantity from API)
  const totalItemsToPack = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // Back ordered items (from the API response)
  const totalItemsBackOrdered = order.items.reduce((sum, item) => {
    return sum + (item.quantityBackOrdered || 0);
  }, 0);

  // Original order total
  const totalOriginalItems = order.items.reduce((sum, item) => {
    return sum + (item.originalQuantity || item.quantity); // Use originalQuantity if available
  }, 0);

  // Get the selected box details
  const getSelectedBoxDetails = () => {
    if (selectedBox === "CUSTOM") {
      return {
        length: parseFloat(customDimensions.length) || 10,
        width: parseFloat(customDimensions.width) || 8,
        height: parseFloat(customDimensions.height) || 6,
      };
    }

    const box = BOX_TYPES.find((b) => b.id === selectedBox);
    if (!box) return { length: 10, width: 8, height: 6 };

    // Parse dimensions string like "10x8x4" into individual values
    const [length, width, height] = box.dimensions
      .split("x")
      .map((d) => parseFloat(d));

    return {
      length: length || 10,
      width: width || 8,
      height: height || 6,
    };
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Pack Order
                {/* ✅ NEW: Badge for back orders */}
                {totalItemsBackOrdered > 0 &&
                  totalItemsToPack < totalOriginalItems && (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      Back Order
                    </Badge>
                  )}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {order.orderNumber}
                {totalItemsBackOrdered > 0 &&
                  totalItemsToPack < totalOriginalItems && (
                    <span className="ml-2 text-sm text-amber-600 dark:text-amber-400">
                      (Partial Fulfillment)
                    </span>
                  )}
              </p>
            </div>
          </div>
        </div>

        {/* ✅ NEW: Context Banner */}
        {order && (
          <div className="mb-6">
            {totalItemsBackOrdered > 0 &&
            totalItemsToPack < totalOriginalItems ? (
              // Back Order Context
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 dark:text-amber-300">
                      Back Order Fulfillment
                    </h3>
                    <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                      Packing {totalItemsToPack} of {totalOriginalItems} items.
                      The remaining {totalItemsBackOrdered} item(s) were
                      previously back-ordered and will ship separately.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-amber-700 dark:text-amber-500">
                      <span>Items to Pack: {totalItemsToPack}</span>
                      <span>Back Ordered: {totalItemsBackOrdered}</span>
                      <span>
                        This Shipment: ${totalPackingValue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Full Order Context
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-300">
                      Full Order - All {totalItemsToPack} items available
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                      Complete fulfillment • Order Value: $
                      {totalPackingValue.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress Steps */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        currentStep === step.number
                          ? "bg-gray-400 dark:bg-zinc-700 text-white"
                          : step.completed
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {step.completed ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <step.icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className="text-xs mt-2 text-center">
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step.completed
                          ? "bg-green-600"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Info */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <User className="w-4 h-4 mr-2" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="font-medium">{order.customerName}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {order.customerEmail}
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-500" />
                      <div className="text-sm">
                        <div>{order.shippingAddress.address1}</div>
                        {order.shippingAddress.address2 && (
                          <div>{order.shippingAddress.address2}</div>
                        )}
                        <div>
                          {order.shippingAddress.city},{" "}
                          {order.shippingAddress.province}{" "}
                          {order.shippingAddress.zip}
                        </div>
                        <div>{order.shippingAddress.country}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    Items ({order.items.length})
                  </span>
                  {currentStep >= 2 && (
                    <Badge
                      variant={
                        verifiedItems.size === order.items.length
                          ? "default"
                          : "secondary"
                      }
                    >
                      {verifiedItems.size}/{order.items.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() =>
                        currentStep >= 1 && toggleItemVerification(item.id)
                      }
                      className={`p-2 rounded-lg transition-colors ${
                        currentStep >= 1 ? "cursor-pointer" : ""
                      } ${
                        verifiedItems.has(item.id)
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 border"
                          : "bg-background hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {item.productName}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {item.sku} • {item.weightOz.toFixed(2)} oz each
                          </div>
                          {/* ✅ NEW: Show if this item was back-ordered */}
                          {/* {item.quantityBackOrdered &&
                            item.quantityBackOrdered > 0 && (
                              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {item.quantityBackOrdered} unit(s) previously
                                back-ordered
                              </div>
                            )} */}
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold">×{item.quantity}</div>
                          {/* ✅ NEW: Show original quantity if different */}
                          {item.originalQuantity &&
                            item.originalQuantity !== item.quantity && (
                              <div className="text-xs text-gray-500">
                                of {item.originalQuantity}
                              </div>
                            )}
                          {/* {verifiedItems.has(item.id) && (
                            <CheckCircle className="w-4 h-4 text-green-600 ml-auto mt-1" />
                          )} */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-sm">
                    <span>Est. Weight:</span>
                    <span className="font-medium">
                      {calculatedWeightLbs.toFixed(2)} lbs (
                      {calculatedWeightOz.toFixed(2)} oz)
                    </span>
                  </div>

                  {/* Show item count summary */}
                  <div className="flex justify-between text-sm mt-1">
                    <span>Items to box:</span>
                    <span className="font-medium">
                      {totalItemsToPack}
                      {totalItemsBackOrdered > 0 && ` of ${totalOriginalItems}`}
                    </span>
                  </div>

                  <div className="flex justify-between font-semibold mt-1">
                    <span>Total Value:</span>
                    <span>${totalPackingValue.toFixed(2)}</span>
                  </div>

                  {totalPackingValue < parseFloat(order.totalAmount) && (
                    <div className="flex justify-between text-sm text-amber-600 mt-1">
                      <span className="flex items-center gap-1">
                        <AlertTriangle /> Back Ordered:
                      </span>
                      <span>
                        {totalItemsBackOrdered} items ($
                        {(
                          parseFloat(order.totalAmount) - totalPackingValue
                        ).toFixed(2)}
                        )
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Packing Steps */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Pack Items */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Step 1: Pack & Verify Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* ADD IMAGE UPLOADER HERE - Compact version */}
                  <OrderImageUploader
                    orderId={order.id}
                    orderNumber={order.orderNumber}
                    customerName={order.customerName || "Customer"}
                    existingImages={order.images || []} // if you have existing images
                    onUploadSuccess={() => {
                      console.log("Image uploaded!");
                      // Optional: refresh order data
                    }}
                    compact={true} // Use compact layout for inline display
                  />

                  <div className="space-y-4 mt-4">
                    <div className="bg-red-50 border border-red-200 dark:border-red-400 dark:bg-red-900/20 p-4 rounded-lg">
                      <p className="text-sm flex items-center gap-1 text-red-400">
                        <Dot />
                        Click each item as you pack
                        {/* <strong>
                          {BOX_TYPES.find((b) => b.id === selectedBox)?.name}
                        </strong> */}
                      </p>
                    </div>

                    {/* ... packing photos and materials sections ... */}

                    {/* ✅ ADD THIS BUTTON SECTION */}
                    <Button
                      onClick={proceedToCreateLabel}
                      disabled={!canProceedToStep(2) || isPacking}
                      className="w-full bg-blue-500 hover:bg-blue-600"
                    >
                      {isPacking
                        ? "Marking as Packed..."
                        : "Continue to Create Label"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Create Shipping Label */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="w-5 h-5 mr-2" />
                    Step 2: Create Shipping Label
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ShippingLabelForm
                    order={order}
                    embedded={true}
                    initialWeight={calculatedWeightLbs}
                    initialDimensions={getSelectedBoxDetails()}
                    onSuccess={handleLabelSuccess}
                    onCancel={() => setCurrentStep(1)}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
