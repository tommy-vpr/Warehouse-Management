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
} from "lucide-react";
import { useParams } from "next/navigation";
import ShippingLabelForm from "@/components/shipping/ShippingLabelForm";

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
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
      if (response.ok) {
        const data: ApiResponse = await response.json();
        setOrder(data.order);
        setPackingInfo(data.packingInfo);

        // Pre-select suggested box
        if (data.packingInfo.suggestedBox) {
          setSelectedBox(data.packingInfo.suggestedBox);
        }
      }
    } catch (error) {
      console.error("Failed to load order:", error);
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
      case 2: // Select box → Pack items
        return selectedBox !== "";
      case 3: // Pack items → Create Label
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

      // Move to Step 3 (shipping label form)
      setCurrentStep(3);
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
      title: "Select Box",
      icon: Box,
      completed: canProceedToStep(2),
    },
    {
      number: 2,
      title: "Pack Items",
      icon: Package,
      completed: canProceedToStep(3),
    },
    {
      number: 3,
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
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
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
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/dashboard/orders")}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {order.orderNumber}
              </p>
            </div>
          </div>
        </div>

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
                          ? "bg-blue-600 text-white"
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
                        currentStep >= 2 && toggleItemVerification(item.id)
                      }
                      className={`p-2 rounded-lg transition-colors ${
                        currentStep >= 2 ? "cursor-pointer" : ""
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
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold">×{item.quantity}</div>
                          {verifiedItems.has(item.id) && (
                            <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                          )}
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
                  <div className="flex justify-between font-semibold mt-1">
                    <span>Total Value:</span>
                    <span>${order.totalAmount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Packing Steps */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Select Box */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Box className="w-5 h-5 mr-2" />
                    Step 1: Select Box Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {BOX_TYPES.map((box) => (
                      <div
                        key={box.id}
                        onClick={() => setSelectedBox(box.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedBox === box.id
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-semibold">{box.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {box.dimensions}"
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Max: {box.maxWeight} lbs
                        </div>
                        {box.cost > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            ${box.cost.toFixed(2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedBox === "CUSTOM" && (
                    <div className="mt-4 p-4 bg-background rounded-lg">
                      <h4 className="font-medium mb-3">
                        Custom Dimensions (inches)
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-sm">Length</label>
                          <Input
                            type="number"
                            value={customDimensions.length}
                            onChange={(e) =>
                              setCustomDimensions({
                                ...customDimensions,
                                length: e.target.value,
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-sm">Width</label>
                          <Input
                            type="number"
                            value={customDimensions.width}
                            onChange={(e) =>
                              setCustomDimensions({
                                ...customDimensions,
                                width: e.target.value,
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-sm">Height</label>
                          <Input
                            type="number"
                            value={customDimensions.height}
                            onChange={(e) =>
                              setCustomDimensions({
                                ...customDimensions,
                                height: e.target.value,
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={!canProceedToStep(2)}
                    className="w-full mt-4"
                  >
                    Continue to Pack Items
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Pack Items */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Step 2: Pack & Verify Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm">
                        Click each item as you pack it into the{" "}
                        <strong>
                          {BOX_TYPES.find((b) => b.id === selectedBox)?.name}
                        </strong>
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">
                        Packing Materials (Optional)
                      </h4>
                      <div className="space-y-2">
                        {Object.entries({
                          bubbleWrap: "Bubble Wrap",
                          voidFill: "Void Fill / Packing Peanuts",
                          fragileSticker: "Fragile Sticker",
                          extraTape: "Extra Tape",
                        }).map(([key, label]) => (
                          <label
                            key={key}
                            className="flex items-center cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={
                                packingMaterials[
                                  key as keyof typeof packingMaterials
                                ]
                              }
                              onChange={(e) =>
                                setPackingMaterials({
                                  ...packingMaterials,
                                  [key]: e.target.checked,
                                })
                              }
                              className="mr-2"
                            />
                            <span className="text-sm">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={proceedToCreateLabel}
                        disabled={!canProceedToStep(3) || isPacking}
                        className="flex-1"
                      >
                        {isPacking
                          ? "Marking as Packed..."
                          : "Continue to Create Label"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Create Shipping Label */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="w-5 h-5 mr-2" />
                    Step 3: Create Shipping Label
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ShippingLabelForm
                    order={order}
                    embedded={true}
                    initialWeight={calculatedWeightLbs}
                    onSuccess={handleLabelSuccess}
                    onCancel={() => setCurrentStep(2)}
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

// "use client";

// import React, { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import {
//   Package,
//   ArrowLeft,
//   CheckCircle,
//   User,
//   MapPin,
//   AlertTriangle,
//   Truck,
// } from "lucide-react";
// import { useParams } from "next/navigation";

// interface OrderItem {
//   id: string;
//   productName: string;
//   sku: string;
//   quantity: number;
//   unitPrice: string;
//   totalPrice: string;
//   weight: number;
// }

// interface OrderDetails {
//   id: string;
//   orderNumber: string;
//   customerName: string;
//   customerEmail: string;
//   status: string;
//   totalAmount: string;
//   shippingAddress: any;
//   items: OrderItem[];
// }

// export default function PackingInterface() {
//   const params = useParams<{ id: string }>();
//   const id = params.id;

//   const [order, setOrder] = useState<OrderDetails | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isPacking, setIsPacking] = useState(false);
//   const [isPackingComplete, setIsPackingComplete] = useState(false);

//   useEffect(() => {
//     loadOrderDetails();
//   }, []);

//   const loadOrderDetails = async () => {
//     try {
//       const response = await fetch(`/api/packing/pack/${id}`);
//       if (response.ok) {
//         const data = await response.json();
//         setOrder(data.order);
//       }
//     } catch (error) {
//       console.error("Failed to load order:", error);
//     }
//     setIsLoading(false);
//   };

//   const markOrderAsPacked = async () => {
//     if (!order) return;

//     setIsPacking(true);
//     try {
//       const response = await fetch(`/api/packing/complete`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           orderId: order.id,
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || "Failed to mark as packed");
//       }

//       const data = await response.json();
//       if (data.success) {
//         setIsPackingComplete(true);
//         setOrder({ ...order, status: "PACKED" });
//       }
//     } catch (error) {
//       console.error("Failed to mark order as packed:", error);
//       alert(
//         `Failed to pack order: ${
//           error instanceof Error ? error.message : "Unknown error"
//         }`
//       );
//     }
//     setIsPacking(false);
//   };

//   // Loading state
//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center p-4">
//         <div className="text-center">
//           <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
//           <p className="text-gray-600 dark:text-gray-200">
//             Loading order details...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // Error state
//   if (!order) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center p-4">
//         <div className="text-center">
//           <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
//           <p className="text-gray-600">
//             Order not found or not ready for packing
//           </p>
//           <Button
//             variant="outline"
//             className="mt-4"
//             onClick={() => window.history.back()}
//           >
//             <ArrowLeft className="w-4 h-4 mr-2" />
//             Go Back
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   // Success state
//   if (isPackingComplete || order.status === "PACKED") {
//     return (
//       <div className="min-h-screen bg-green-50 dark:bg-background flex items-center justify-center p-4">
//         <div className="text-center max-w-md">
//           <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
//           <h2 className="text-2xl font-bold text-green-800 mb-2">
//             Order Packed Successfully!
//           </h2>
//           <p className="text-green-700 mb-6">
//             {order.orderNumber} has been marked as packed and is ready for
//             shipping
//           </p>

//           <div className="space-y-3">
//             <Button
//               onClick={() =>
//                 (window.location.href = `/dashboard/shipping/create-label/${order.id}`)
//               }
//               className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
//             >
//               <Truck className="w-5 h-5 mr-2" />
//               Ship Now
//             </Button>
//             <Button
//               variant="outline"
//               onClick={() => (window.location.href = "/dashboard/packing")}
//               className="w-full"
//             >
//               <ArrowLeft className="w-4 h-4 mr-2" />
//               Back to Pack Station
//             </Button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background p-4">
//       <div className="max-w-4xl mx-auto">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-6">
//           <div className="flex items-center">
//             <Button
//               variant="ghost"
//               onClick={() => window.history.back()}
//               className="mr-4"
//             >
//               <ArrowLeft className="w-4 h-4" />
//             </Button>
//             <div>
//               <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
//                 Pack Order
//               </h1>
//               <p className="text-gray-600 dark:text-gray-400">
//                 {order.orderNumber}
//               </p>
//             </div>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {/* Customer Info */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <User className="w-5 h-5 mr-2" />
//                 Customer Information
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-2">
//                 <div>
//                   <span className="font-medium">{order.customerName}</span>
//                 </div>
//                 <div className="text-sm text-gray-600 dark:text-gray-400">
//                   {order.customerEmail}
//                 </div>
//                 <div className="pt-2">
//                   <div className="flex items-start">
//                     <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-500" />
//                     <div className="text-sm">
//                       <div>{order.shippingAddress.address1}</div>
//                       {order.shippingAddress.address2 && (
//                         <div>{order.shippingAddress.address2}</div>
//                       )}
//                       <div>
//                         {order.shippingAddress.city},{" "}
//                         {order.shippingAddress.province}{" "}
//                         {order.shippingAddress.zip}
//                       </div>
//                       <div>{order.shippingAddress.country}</div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Items to Pack */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <Package className="w-5 h-5 mr-2" />
//                 Items to Pack ({order.items.length})
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-3">
//                 {order.items.map((item) => (
//                   <div
//                     key={item.id}
//                     className="flex justify-between items-center p-3 bg-background rounded-lg"
//                   >
//                     <div>
//                       <div className="font-medium">{item.productName}</div>
//                       <div className="text-sm text-gray-600 dark:text-gray-400">
//                         SKU: {item.sku}
//                       </div>
//                       <div className="text-sm text-gray-600 dark:text-gray-400">
//                         Weight: {item.weight} lbs each
//                       </div>
//                     </div>
//                     <div className="text-right">
//                       <div className="font-semibold">×{item.quantity}</div>
//                       {/* <div className="text-sm text-gray-600 dark:text-gray-400">
//                         ${item.totalPrice}
//                       </div> */}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//               <div className="border-t pt-3 mt-3">
//                 <div className="flex justify-between font-semibold">
//                   <span>Total Value:</span>
//                   <span>${order.totalAmount}</span>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Pack Button */}
//         <div className="mt-8 flex justify-center">
//           <div className="w-full max-w-md space-y-3">
//             <Button
//               onClick={markOrderAsPacked}
//               disabled={isPacking}
//               className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 cursor-pointer"
//             >
//               {isPacking ? (
//                 <>
//                   <Package className="w-5 h-5 mr-2 animate-pulse" />
//                   Marking as Packed...
//                 </>
//               ) : (
//                 <>
//                   <CheckCircle className="w-5 h-5 mr-2" />
//                   Mark as Packed
//                 </>
//               )}
//             </Button>
//             <p className="text-sm text-gray-600 text-center">
//               This will mark the order as packed and ready for shipping
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
