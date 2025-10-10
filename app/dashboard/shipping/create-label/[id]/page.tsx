"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import ShippingLabelForm from "@/components/shipping/ShippingLabelForm";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: string;
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    weightOz?: number;
  }>;
  shippingAddress: {
    address1: string;
    city: string;
    province: string;
    province_code: string;
    zip: string;
    name?: string;
    country?: string;
    country_code?: string;
  };
}

interface CreateLabelPageProps {
  params: Promise<{ id: string }>;
}

export default function CreateLabelPage({ params }: CreateLabelPageProps) {
  const router = useRouter();
  const [id, setid] = useState<string>("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Unwrap params promise
  useEffect(() => {
    params.then(({ id: id }) => {
      setid(id);
    });
  }, [params]);

  // Fetch order when id is available
  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  console.log(order);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch order");
      }

      const data = await response.json();
      setOrder(data);
    } catch (err) {
      console.error("Error fetching order:", err);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (results: any[]) => {
    console.log("Labels created:", results);
    // Redirect to order detail page
    router.push(`/dashboard/orders/${id}`);
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading || !id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-800 dark:text-red-400">
              {error || "Order not found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-foreground">
                Create Shipping Label
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Order #{order.orderNumber} - {order.customerName}
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Order Total
              </div>
              <div className="text-2xl font-bold text-foreground">
                ${parseFloat(order.totalAmount).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border">
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b dark:border-border last:border-0"
              >
                <div className="flex-1">
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    SKU: {item.sku}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">Qty: {item.quantity}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    ${parseFloat(item.totalPrice).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping Address Card */}
        <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border">
          <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
          <div className="text-gray-700 dark:text-gray-300">
            <p className="font-medium">
              {order.shippingAddress.name || order.customerName}
            </p>
            <p>{order.shippingAddress.address1}</p>
            <p>
              {order.shippingAddress.city},{" "}
              {order.shippingAddress.province_code} {order.shippingAddress.zip}
            </p>
            <p>{order.shippingAddress.country || "United States"}</p>
          </div>
        </div>

        {/* Shipping Label Form */}
        <div className="bg-white dark:bg-card rounded-lg shadow dark:shadow-lg border dark:border-border">
          <div className="p-6 border-b dark:border-border">
            <h2 className="text-lg font-semibold">Configure Shipping</h2>
          </div>

          <div className="p-6">
            <ShippingLabelForm
              order={order}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              embedded={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
// "use client";
// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import {
//   Plus,
//   Minus,
//   Package,
//   Truck,
//   AlertCircle,
//   Loader2,
//   X,
//   Check,
//   Split,
//   Copy,
//   Download,
//   Eye,
//   RefreshCw,
//   ArrowRight,
// } from "lucide-react";
// import { useParams } from "next/navigation";

// interface PackageConfig {
//   id: string;
//   packageCode: string;
//   weight: string;
//   dimensions: {
//     length: string;
//     width: string;
//     height: string;
//   };
// }

// interface Shipment {
//   id: string;
//   name: string;
//   items: ShipmentItem[];
//   carrierId: string;
//   serviceCode: string;
//   packages: PackageConfig[]; // 👈 multiple packages
//   notes: string;
// }

// // TypeScript interfaces
// interface OrderItem {
//   id: string;
//   productName: string;
//   sku: string;
//   quantity: number;
//   unitPrice: string;
//   totalPrice: string;
//   weight?: number;
//   dimensions?: any;
// }

// interface Order {
//   id: string;
//   orderNumber: string;
//   customerName: string;
//   customerEmail: string;
//   status: string;
//   totalAmount: string;
//   items: OrderItem[];
//   shippingAddress: {
//     address1: string;
//     city: string;
//     province: string;
//     province_code: string;
//     zip: string;
//     name?: string;
//     country?: string;
//     country_code?: string;
//   };
// }

// interface Carrier {
//   carrier_id: string;
//   carrier_code: string;
//   friendly_name: string;
//   services: Array<{
//     service_code: string;
//     name: string;
//   }>;
//   packages: Array<{
//     package_code: string;
//     name: string;
//   }>;
// }

// interface ShipmentItem {
//   itemId: string;
//   productName: string;
//   sku: string;
//   unitPrice: number;
//   quantity: number;
//   weight?: number;
// }

// interface CompletedShipment {
//   splitName: string;
//   trackingNumber: string;
//   labelUrl: string;
//   cost: string;
//   carrier: string;
//   items: ShipmentItem[];
// }

// const OrderSplitter: React.FC = () => {
//   const [order, setOrder] = useState<Order | null>(null);
//   const [carriers, setCarriers] = useState<Carrier[]>([]);
//   const [shipments, setShipments] = useState<Shipment[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [carriersLoading, setCarriersLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [processing, setProcessing] = useState(false);
//   const [completedShipments, setCompletedShipments] = useState<
//     CompletedShipment[]
//   >([]);
//   const [selectedItemForSplit, setSelectedItemForSplit] = useState<{
//     itemId: string;
//     availableQty: number;
//   } | null>(null);
//   const [splitQuantity, setSplitQuantity] = useState(1);

//   const params = useParams<{ id: string }>();
//   const id = params.id;

//   // Generate unique ID
//   const generateId = useCallback(
//     () => Date.now().toString(36) + Math.random().toString(36).substr(2),
//     []
//   );

//   // Calculate remaining quantity for each original item
//   const getRemainingQuantity = useCallback(
//     (itemId: string): number => {
//       const originalItem = order?.items.find((item) => item.id === itemId);
//       if (!originalItem) return 0;

//       const totalAllocated = shipments.reduce((total, shipment) => {
//         return (
//           total +
//           shipment.items.reduce((shipmentTotal, item) => {
//             return item.itemId === itemId
//               ? shipmentTotal + item.quantity
//               : shipmentTotal;
//           }, 0)
//         );
//       }, 0);

//       return originalItem.quantity - totalAllocated;
//     },
//     [order, shipments]
//   );

//   // Get summary of allocated items
//   const getAllocationSummary = useMemo(() => {
//     if (!order) return [];

//     return order.items.map((item) => ({
//       ...item,
//       remaining: getRemainingQuantity(item.id),
//       allocated: item.quantity - getRemainingQuantity(item.id),
//     }));
//   }, [order, getRemainingQuantity]);

//   useEffect(() => {
//     if (id) {
//       loadOrderDetails();
//       loadCarriers();
//     }
//   }, [id]);

//   const loadOrderDetails = async () => {
//     try {
//       setError("");
//       const response = await fetch(`/api/shipping/${id}`);

//       if (!response.ok) {
//         throw new Error(`Failed to load order: ${response.status}`);
//       }

//       const data = await response.json();
//       setOrder(data.order);

//       // Initialize with one empty shipment
//       const initialShipment: Shipment = {
//         id: generateId(),
//         name: "Shipment 1",
//         items: [],
//         carrierId: "",
//         serviceCode: "",
//         packages: [
//           {
//             id: generateId(),
//             packageCode: "",
//             weight: "",
//             dimensions: { length: "10", width: "8", height: "6" },
//           },
//         ],
//         notes: "",
//       };

//       setShipments([initialShipment]);
//     } catch (err) {
//       const message = err instanceof Error ? err.message : "Unknown error";
//       setError(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadCarriers = async () => {
//     try {
//       const response = await fetch("/api/carriers");
//       if (!response.ok) {
//         throw new Error(`Failed to load carriers: ${response.status}`);
//       }
//       const carriersData = await response.json();
//       setCarriers(carriersData);
//     } catch (err) {
//       console.error("Failed to load carriers:", err);
//     } finally {
//       setCarriersLoading(false);
//     }
//   };

//   // Create new shipment
//   const createNewShipment = () => {
//     const newShipment: Shipment = {
//       id: generateId(),
//       name: `Shipment ${shipments.length + 1}`,
//       items: [],
//       carrierId: "",
//       serviceCode: "",
//       packages: [
//         {
//           id: generateId(),
//           packageCode: "",
//           weight: "",
//           dimensions: { length: "10", width: "8", height: "6" },
//         },
//       ],
//       notes: "",
//     };

//     setShipments([...shipments, newShipment]);
//   };

//   const addPackageToShipment = (shipmentId: string) => {
//     setShipments(
//       shipments.map((shipment) =>
//         shipment.id === shipmentId
//           ? {
//               ...shipment,
//               packages: [
//                 ...shipment.packages,
//                 {
//                   id: generateId(),
//                   packageCode: "",
//                   weight: "",
//                   dimensions: { length: "10", width: "8", height: "6" },
//                 },
//               ],
//             }
//           : shipment
//       )
//     );
//   };

//   const removePackageFromShipment = (shipmentId: string, packageId: string) => {
//     setShipments(
//       shipments.map((shipment) =>
//         shipment.id === shipmentId
//           ? {
//               ...shipment,
//               packages: shipment.packages.filter((p) => p.id !== packageId),
//             }
//           : shipment
//       )
//     );
//   };

//   const updatePackageConfig = (
//     shipmentId: string,
//     packageId: string,
//     field: string,
//     value: string
//   ) => {
//     setShipments(
//       shipments.map((shipment) => {
//         if (shipment.id !== shipmentId) return shipment;
//         return {
//           ...shipment,
//           packages: shipment.packages.map((pkg) =>
//             pkg.id === packageId
//               ? field.includes(".")
//                 ? {
//                     ...pkg,
//                     dimensions: {
//                       ...pkg.dimensions,
//                       [field.split(".")[1]]: value,
//                     },
//                   }
//                 : { ...pkg, [field]: value }
//               : pkg
//           ),
//         };
//       })
//     );
//   };

//   // Remove shipment
//   const removeShipment = (shipmentId: string) => {
//     if (shipments.length <= 1) return;
//     setShipments(shipments.filter((s) => s.id !== shipmentId));
//   };

//   // Add item to shipment
//   const addItemToShipment = (
//     shipmentId: string,
//     itemId: string,
//     quantity: number
//   ) => {
//     const originalItem = order?.items.find((item) => item.id === itemId);
//     if (!originalItem) return;

//     const remainingQty = getRemainingQuantity(itemId);
//     const validQuantity = Math.min(quantity, remainingQty);

//     if (validQuantity <= 0) return;

//     setShipments(
//       shipments.map((shipment) => {
//         if (shipment.id !== shipmentId) return shipment;

//         // Check if item already exists in this shipment
//         const existingItemIndex = shipment.items.findIndex(
//           (item) => item.itemId === itemId
//         );

//         if (existingItemIndex >= 0) {
//           // Update existing item quantity
//           const updatedItems = [...shipment.items];
//           updatedItems[existingItemIndex] = {
//             ...updatedItems[existingItemIndex],
//             quantity: updatedItems[existingItemIndex].quantity + validQuantity,
//           };
//           return { ...shipment, items: updatedItems };
//         } else {
//           // Add new item to shipment
//           const newItem: ShipmentItem = {
//             itemId: originalItem.id,
//             productName: originalItem.productName,
//             sku: originalItem.sku,
//             unitPrice: parseFloat(originalItem.unitPrice),
//             quantity: validQuantity,
//             weight: originalItem.weight,
//           };
//           return { ...shipment, items: [...shipment.items, newItem] };
//         }
//       })
//     );

//     // Close split modal
//     setSelectedItemForSplit(null);
//     setSplitQuantity(1);
//   };

//   // Remove item from shipment
//   const removeItemFromShipment = (shipmentId: string, itemId: string) => {
//     setShipments(
//       shipments.map((shipment) => {
//         if (shipment.id !== shipmentId) return shipment;
//         return {
//           ...shipment,
//           items: shipment.items.filter((item) => item.itemId !== itemId),
//         };
//       })
//     );
//   };

//   // Update item quantity in shipment
//   const updateItemQuantityInShipment = (
//     shipmentId: string,
//     itemId: string,
//     newQuantity: number
//   ) => {
//     const remainingQty = getRemainingQuantity(itemId);
//     const currentShipment = shipments.find((s) => s.id === shipmentId);
//     const currentItem = currentShipment?.items.find((i) => i.itemId === itemId);
//     const maxAllowed = remainingQty + (currentItem?.quantity || 0);

//     const validQuantity = Math.max(0, Math.min(newQuantity, maxAllowed));

//     if (validQuantity === 0) {
//       removeItemFromShipment(shipmentId, itemId);
//       return;
//     }

//     setShipments(
//       shipments.map((shipment) => {
//         if (shipment.id !== shipmentId) return shipment;
//         return {
//           ...shipment,
//           items: shipment.items.map((item) =>
//             item.itemId === itemId ? { ...item, quantity: validQuantity } : item
//           ),
//         };
//       })
//     );
//   };

//   // Update shipping configuration
//   const updateShippingConfig = (
//     shipmentId: string,
//     field: string,
//     value: string
//   ) => {
//     setShipments(
//       shipments.map((shipment) =>
//         shipment.id === shipmentId ? { ...shipment, [field]: value } : shipment
//       )
//     );
//   };

//   // Get carrier options
//   const getCarrierOptions = (carrierId: string) => {
//     const carrier = carriers.find((c) => c.carrier_id === carrierId);
//     return {
//       services: carrier?.services || [],
//       packages: carrier?.packages || [],
//     };
//   };

//   // Validation
//   // Validation
//   const validateShipments = (): string[] => {
//     const errors: string[] = [];
//     if (!order) return ["Order not loaded"];

//     shipments.forEach((shipment) => {
//       if (shipment.items.length === 0) {
//         errors.push(`${shipment.name} must have at least one item`);
//       }

//       const { carrierId, serviceCode, packages } = shipment;

//       if (shipment.items.length > 0) {
//         if (!carrierId || !serviceCode) {
//           errors.push(`${shipment.name} needs carrier and service selected`);
//         }

//         if (packages.length === 0) {
//           errors.push(`${shipment.name} must have at least one package`);
//         } else {
//           packages.forEach((pkg, i) => {
//             if (!pkg.packageCode) {
//               errors.push(
//                 `${shipment.name} package ${i + 1} needs a package type`
//               );
//             }
//             if (!pkg.weight || parseFloat(pkg.weight) <= 0) {
//               errors.push(
//                 `${shipment.name} package ${i + 1} needs a valid weight`
//               );
//             }
//           });
//         }
//       }
//     });

//     // Check for unallocated items - ADD THIS HERE
//     const unallocatedItems = getAllocationSummary.filter(
//       (item) => item.remaining > 0
//     );
//     if (unallocatedItems.length > 0) {
//       errors.push(
//         `Unallocated items: ${unallocatedItems
//           .map((item) => `${item.sku} (${item.remaining})`)
//           .join(", ")}`
//       );
//     }

//     return errors;
//   };

//   // Process shipments
//   const processShipments = async () => {
//     const validationErrors = validateShipments();
//     if (validationErrors.length > 0) {
//       setError(validationErrors.join("; "));
//       return;
//     }

//     if (!order) {
//       setError("Order not loaded");
//       return;
//     }

//     setProcessing(true);
//     setError("");

//     try {
//       const results = [];
//       const validShipments = shipments.filter((s) => s.items.length > 0);

//       for (const shipment of validShipments) {
//         const selectedCarrier = carriers.find(
//           (c) => c.carrier_id === shipment.carrierId
//         );
//         if (!selectedCarrier) {
//           throw new Error(`Carrier not found for ${shipment.name}`);
//         }

//         const shipmentData = {
//           id: order.id,
//           carrierCode: selectedCarrier.carrier_code,
//           serviceCode: shipment.serviceCode,
//           packages: shipment.packages.map((pkg) => ({
//             packageCode: pkg.packageCode,
//             weight: parseFloat(pkg.weight),
//             length: parseFloat(pkg.dimensions.length),
//             width: parseFloat(pkg.dimensions.width),
//             height: parseFloat(pkg.dimensions.height),
//           })),
//           shippingAddress: {
//             name: order.customerName,
//             address1: order.shippingAddress.address1,
//             city: order.shippingAddress.city,
//             zip: order.shippingAddress.zip,
//             province: order.shippingAddress.province,
//             province_code: order.shippingAddress.province_code,
//             country_code: order.shippingAddress.country_code || "US",
//           },
//           notes:
//             shipment.notes ||
//             `${shipment.name} - Items: ${shipment.items
//               .map((i) => `${i.sku}(${i.quantity})`)
//               .join(", ")}`,
//         };

//         const response = await fetch("/api/shipping/shipengine/create-label", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(shipmentData),
//         });

//         if (!response.ok) {
//           const errorData = await response.json();
//           throw new Error(
//             `Failed to create ${shipment.name}: ${
//               errorData.error || response.statusText
//             }`
//           );
//         }

//         const result = await response.json();
//         results.push({
//           splitName: shipment.name,
//           trackingNumber: result.label.trackingNumber,
//           labelUrl: result.label.labelUrl,
//           cost: result.label.cost,
//           carrier: selectedCarrier.friendly_name,
//           items: shipment.items,
//         });
//       }

//       setCompletedShipments(results);
//     } catch (err) {
//       const message = err instanceof Error ? err.message : "Unknown error";
//       setError(message);
//     } finally {
//       setProcessing(false);
//     }
//   };

//   // Loading states
//   if (loading) {
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

//   if (error && !order) {
//     return (
//       <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
//         <div className="flex items-center mb-2">
//           <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
//           <span className="font-semibold text-red-800">
//             Error Loading Order
//           </span>
//         </div>
//         <p className="text-red-700">{error}</p>
//       </div>
//     );
//   }

//   // Success state
//   if (completedShipments.length > 0) {
//     return (
//       <div className="max-w-6xl mx-auto p-6">
//         <div className="p-6 bg-green-50 border border-green-200 dark:border-gray-700 dark:bg-background rounded-lg">
//           <div className="flex items-center mb-4">
//             <Check className="w-6 h-6 text-green-600 mr-2" />
//             <h2 className="text-xl font-semibold text-green-800 dark:text-green-400">
//               Order Shipment Created Successfully!
//             </h2>
//           </div>

//           <div className="space-y-4">
//             {completedShipments.map((shipment, index) => (
//               <div key={index} className="bg-background p-4 rounded border">
//                 <h3 className="font-medium mb-2">{shipment.splitName}</h3>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
//                   <div>
//                     <p className="text-gray-600 dark:text-gray-400 mb-1">
//                       <strong>Tracking:</strong> {shipment.trackingNumber}
//                     </p>
//                     <p className="text-gray-600 dark:text-gray-400 mb-1">
//                       <strong>Cost:</strong> ${shipment.cost}
//                     </p>
//                     <p className="text-gray-600 dark:text-gray-400 mb-3">
//                       <strong>Carrier:</strong> {shipment.carrier}
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium mb-1">Items:</p>
//                     <ul className="text-sm text-gray-600 dark:text-gray-400">
//                       {shipment.items.map((item) => (
//                         <li key={item.itemId}>
//                           {item.sku} - {item.productName} (Qty: {item.quantity})
//                         </li>
//                       ))}
//                     </ul>
//                   </div>
//                 </div>

//                 {shipment.labelUrl && (
//                   <button
//                     onClick={() => window.open(shipment.labelUrl, "_blank")}
//                     className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
//                   >
//                     <Download className="w-4 h-4 mr-2" />
//                     Download Label
//                   </button>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (!order) return null;

//   return (
//     <div className="max-w-7xl mx-auto p-6 space-y-6">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
//           <p className="text-gray-600 dark:text-gray-400">
//             {order.customerName} ({order.customerEmail})
//           </p>
//           <p className="text-gray-600 dark:text-gray-400">
//             {order.shippingAddress.address1}, {order.shippingAddress.city},{" "}
//             {order.shippingAddress.province} {order.shippingAddress.zip}
//           </p>
//         </div>
//         <button
//           onClick={createNewShipment}
//           className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
//         >
//           <Plus className="w-4 h-4 mr-2" />
//           New Shipment
//         </button>
//       </div>

//       {/* Error Display */}
//       {error && (
//         <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
//           <div className="flex items-center">
//             <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
//             <span className="text-red-800">{error}</span>
//           </div>
//         </div>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Original Order Items */}
//         <div>
//           <div className="bg-background p-4 rounded-lg">
//             <h3 className="font-semibold mb-3 flex items-center">
//               <Package className="w-5 h-5 mr-2" />
//               Order Items
//             </h3>
//             <div className="space-y-3">
//               {getAllocationSummary.map((item) => (
//                 <div key={item.id} className="bg-background p-3 rounded border">
//                   <div className="flex justify-between items-start">
//                     <div className="flex-1">
//                       <div className="font-medium text-sm">
//                         {item.productName}
//                       </div>
//                       <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
//                         SKU: {item.sku} • ${item.unitPrice} each
//                       </div>

//                       <div className="flex items-center text-xs space-x-4">
//                         <span className="text-gray-500 dark:text-gray-400">
//                           Qty: {item.quantity}
//                         </span>
//                         <span className="text-blue-600">
//                           Split: {item.allocated}
//                         </span>
//                         <span
//                           className={`font-medium ${
//                             item.remaining > 0
//                               ? "text-blue-600"
//                               : "text-green-600"
//                           }`}
//                         >
//                           Available: {item.remaining}
//                         </span>
//                       </div>

//                       {item.remaining > 0 && (
//                         <div className="mt-2">
//                           <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
//                             <div
//                               className="bg-blue-500 h-1.5 rounded-full"
//                               style={{
//                                 width: `${
//                                   (item.remaining / item.quantity) * 100
//                                 }%`,
//                               }}
//                             />
//                           </div>
//                         </div>
//                       )}
//                     </div>

//                     {item.remaining > 0 && (
//                       <div className="ml-3 flex gap-1">
//                         <button
//                           onClick={() =>
//                             setSelectedItemForSplit({
//                               itemId: item.id,
//                               availableQty: item.remaining,
//                             })
//                           }
//                           className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
//                         >
//                           Split
//                         </button>
//                         <button
//                           onClick={() => {
//                             // Add all remaining quantity to first shipment
//                             if (shipments.length > 0) {
//                               addItemToShipment(
//                                 shipments[0].id,
//                                 item.id,
//                                 item.remaining
//                               );
//                             }
//                           }}
//                           className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
//                         >
//                           Add All
//                         </button>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Shipments */}
//         <div>
//           <h3 className="font-semibold mb-3 flex items-center">
//             <Truck className="w-5 h-5 mr-2" />
//             Shipments ({shipments.length})
//           </h3>

//           <div className="space-y-4 max-h-96 overflow-y-auto">
//             {shipments.map((shipment) => (
//               <div
//                 key={shipment.id}
//                 className="border rounded-lg p-4 bg-background"
//               >
//                 {/* Shipment Header */}
//                 <div className="flex items-center justify-between mb-3">
//                   <h4 className="font-medium text-sm">{shipment.name}</h4>
//                   {shipments.length > 1 && (
//                     <button
//                       onClick={() => removeShipment(shipment.id)}
//                       className="text-red-600 hover:text-red-800"
//                     >
//                       <X className="w-4 h-4" />
//                     </button>
//                   )}
//                 </div>

//                 {/* Items in shipment */}
//                 <div className="mb-4">
//                   <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-2">
//                     Items ({shipment.items.length})
//                   </h5>
//                   {shipment.items.length === 0 ? (
//                     <p className="text-xs text-gray-500 italic">
//                       No items added
//                     </p>
//                   ) : (
//                     <div className="space-y-2">
//                       {shipment.items.map((item) => (
//                         <div
//                           key={item.itemId}
//                           className="flex items-center justify-between bg-background p-2 rounded text-xs"
//                         >
//                           <div>
//                             <span className="font-medium">{item.sku}</span>
//                             <span className="text-gray-600 dark:text-gray-400 ml-2">
//                               Qty: {item.quantity}
//                             </span>
//                           </div>
//                           <div className="flex items-center space-x-1">
//                             <button
//                               onClick={() =>
//                                 updateItemQuantityInShipment(
//                                   shipment.id,
//                                   item.itemId,
//                                   item.quantity - 1
//                                 )
//                               }
//                               className="w-5 h-5 bg-background border rounded flex items-center justify-center hover:bg-background"
//                             >
//                               <Minus className="w-3 h-3" />
//                             </button>
//                             <span className="w-8 text-center">
//                               {item.quantity}
//                             </span>
//                             <button
//                               onClick={() =>
//                                 updateItemQuantityInShipment(
//                                   shipment.id,
//                                   item.itemId,
//                                   item.quantity + 1
//                                 )
//                               }
//                               className="w-5 h-5 bg-background border rounded flex items-center justify-center hover:bg-background"
//                             >
//                               <Plus className="w-3 h-3" />
//                             </button>
//                             <button
//                               onClick={() =>
//                                 removeItemFromShipment(shipment.id, item.itemId)
//                               }
//                               className="ml-2 text-red-600 hover:text-red-800"
//                             >
//                               <X className="w-3 h-3" />
//                             </button>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 {/* Shipping Config - Only show if shipment has items */}
//                 {shipment.items.length > 0 && (
//                   <div className="space-y-3">
//                     <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400">
//                       Shipping Configuration
//                     </h5>

//                     {/* Carrier Selection */}
//                     <select
//                       value={shipment.carrierId}
//                       onChange={(e) =>
//                         updateShippingConfig(
//                           shipment.id,
//                           "carrierId",
//                           e.target.value
//                         )
//                       }
//                       disabled={carriersLoading}
//                       className="w-full px-2 py-1 border rounded text-xs dark:text-gray-400"
//                     >
//                       <option value="">
//                         {carriersLoading ? "Loading..." : "Select Carrier"}
//                       </option>
//                       {carriers.map((carrier) => (
//                         <option
//                           key={carrier.carrier_id}
//                           value={carrier.carrier_id}
//                         >
//                           {carrier.friendly_name}
//                         </option>
//                       ))}
//                     </select>

//                     {/* Service Selection */}
//                     {shipment.carrierId && (
//                       <select
//                         value={shipment.serviceCode}
//                         onChange={(e) =>
//                           updateShippingConfig(
//                             shipment.id,
//                             "serviceCode",
//                             e.target.value
//                           )
//                         }
//                         className="w-full px-2 py-1 border rounded text-xs dark:text-gray-400"
//                       >
//                         <option value="">Select Service</option>
//                         {getCarrierOptions(shipment.carrierId).services.map(
//                           (service) => (
//                             <option
//                               key={service.service_code}
//                               value={service.service_code}
//                             >
//                               {service.name}
//                             </option>
//                           )
//                         )}
//                       </select>
//                     )}

//                     {/* Notes */}
//                     <input
//                       type="text"
//                       value={shipment.notes}
//                       onChange={(e) =>
//                         setShipments(
//                           shipments.map((s) =>
//                             s.id === shipment.id
//                               ? { ...s, notes: e.target.value }
//                               : s
//                           )
//                         )
//                       }
//                       className="w-full px-2 py-1 border rounded text-xs"
//                       placeholder="Notes (optional)"
//                     />

//                     {/* Packages Section */}
//                     <div className="space-y-3 pt-2 border-t">
//                       <div className="flex items-center justify-between">
//                         <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400">
//                           Packages ({shipment.packages.length})
//                         </h5>
//                         <button
//                           onClick={() => addPackageToShipment(shipment.id)}
//                           className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 flex items-center"
//                         >
//                           <Plus className="w-3 h-3 mr-1" />
//                           Add Package
//                         </button>
//                       </div>

//                       {shipment.packages.map((pkg, pkgIndex) => (
//                         <div
//                           key={pkg.id}
//                           className="border p-3 rounded bg-gray-50 dark:bg-zinc-800 space-y-2"
//                         >
//                           <div className="flex items-center justify-between mb-2">
//                             <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
//                               Package {pkgIndex + 1}
//                             </span>
//                             {shipment.packages.length > 1 && (
//                               <button
//                                 onClick={() =>
//                                   removePackageFromShipment(shipment.id, pkg.id)
//                                 }
//                                 className="text-red-400 hover:text-red-500"
//                               >
//                                 <X className="w-5 h-5 cursor-pointer" />
//                               </button>
//                             )}
//                           </div>

//                           <div className="grid grid-cols-2 gap-2">
//                             {/* Package Type */}
//                             <select
//                               value={pkg.packageCode}
//                               onChange={(e) =>
//                                 updatePackageConfig(
//                                   shipment.id,
//                                   pkg.id,
//                                   "packageCode",
//                                   e.target.value
//                                 )
//                               }
//                               className="border rounded px-2 py-1 text-xs dark:text-gray-400"
//                             >
//                               <option value="">Select Package Type</option>
//                               {getCarrierOptions(
//                                 shipment.carrierId
//                               ).packages.map((option) => (
//                                 <option
//                                   key={option.package_code}
//                                   value={option.package_code}
//                                 >
//                                   {option.name}
//                                 </option>
//                               ))}
//                             </select>

//                             {/* Weight */}
//                             <input
//                               type="number"
//                               step="0.1"
//                               min="0.1"
//                               placeholder="Weight (lbs)"
//                               value={pkg.weight}
//                               onChange={(e) =>
//                                 updatePackageConfig(
//                                   shipment.id,
//                                   pkg.id,
//                                   "weight",
//                                   e.target.value
//                                 )
//                               }
//                               className="border rounded px-2 py-1 text-xs"
//                             />
//                           </div>

//                           {/* Dimensions */}
//                           <div className="grid grid-cols-3 gap-2">
//                             <input
//                               type="number"
//                               step="0.1"
//                               min="0.1"
//                               placeholder="Length (in)"
//                               value={pkg.dimensions.length}
//                               onChange={(e) =>
//                                 updatePackageConfig(
//                                   shipment.id,
//                                   pkg.id,
//                                   "dimensions.length",
//                                   e.target.value
//                                 )
//                               }
//                               className="border rounded px-2 py-1 text-xs"
//                             />
//                             <input
//                               type="number"
//                               step="0.1"
//                               min="0.1"
//                               placeholder="Width (in)"
//                               value={pkg.dimensions.width}
//                               onChange={(e) =>
//                                 updatePackageConfig(
//                                   shipment.id,
//                                   pkg.id,
//                                   "dimensions.width",
//                                   e.target.value
//                                 )
//                               }
//                               className="border rounded px-2 py-1 text-xs"
//                             />
//                             <input
//                               type="number"
//                               step="0.1"
//                               min="0.1"
//                               placeholder="Height (in)"
//                               value={pkg.dimensions.height}
//                               onChange={(e) =>
//                                 updatePackageConfig(
//                                   shipment.id,
//                                   pkg.id,
//                                   "dimensions.height",
//                                   e.target.value
//                                 )
//                               }
//                               className="border rounded px-2 py-1 text-xs"
//                             />
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* Process Button */}
//       <div className="flex justify-center pt-4">
//         <button
//           onClick={processShipments}
//           disabled={processing || shipments.every((s) => s.items.length === 0)}
//           className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
//         >
//           {processing ? (
//             <>
//               <Loader2 className="w-5 h-5 mr-2 animate-spin" />
//               Creating Shipments...
//             </>
//           ) : (
//             <>
//               {/* <Truck className="w-5 h-5 mr-2" /> */}
//               Create Shipments & Labels
//             </>
//           )}
//         </button>
//       </div>

//       {/* Split Modal */}
//       {selectedItemForSplit && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
//             <h3 className="text-lg font-semibold mb-4">Split Item</h3>

//             {(() => {
//               const item = order.items.find(
//                 (i) => i.id === selectedItemForSplit.itemId
//               );
//               return item ? (
//                 <div className="mb-4">
//                   <p className="font-medium">{item.productName}</p>
//                   <p className="text-sm text-gray-600 dark:text-gray-400">
//                     SKU: {item.sku}
//                   </p>
//                   <p className="text-sm text-gray-600 dark:text-gray-400">
//                     Available to split: {selectedItemForSplit.availableQty}{" "}
//                     units
//                   </p>
//                 </div>
//               ) : null;
//             })()}

//             <div className="flex items-center space-x-2">
//               <div className="mb-4">
//                 <label className="block text-sm font-medium mb-2">
//                   Quantity to add:
//                 </label>

//                 {/* Quick Add All Button */}
//                 <div className="mb-3">
//                   <button
//                     onClick={() =>
//                       setSplitQuantity(selectedItemForSplit.availableQty)
//                     }
//                     className="w-full px-3 py-2 bg-blue-50 dark:bg-blue-600 text-blue-700 dark:text-blue-200 border rounded hover:bg-blue-100 text-sm font-medium"
//                   >
//                     Add All ({selectedItemForSplit.availableQty} units)
//                   </button>
//                 </div>

//                 {/* Manual Quantity Input */}
//                 <div className="space-y-2">
//                   <div className="flex items-center space-x-2">
//                     <button
//                       onClick={() =>
//                         setSplitQuantity(Math.max(1, splitQuantity - 1))
//                       }
//                       className="w-8 h-8 border rounded flex items-center justify-center hover:bg-background"
//                     >
//                       <Minus className="w-4 h-4" />
//                     </button>
//                     <input
//                       type="number"
//                       min="1"
//                       max={selectedItemForSplit.availableQty}
//                       value={splitQuantity}
//                       onChange={(e) => {
//                         const value = parseInt(e.target.value) || 1;
//                         setSplitQuantity(
//                           Math.min(
//                             selectedItemForSplit.availableQty,
//                             Math.max(1, value)
//                           )
//                         );
//                       }}
//                       className="flex-1 text-center px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       placeholder="Enter quantity"
//                     />
//                     <button
//                       onClick={() =>
//                         setSplitQuantity(
//                           Math.min(
//                             selectedItemForSplit.availableQty,
//                             splitQuantity + 1
//                           )
//                         )
//                       }
//                       className="w-8 h-8 border rounded flex items-center justify-center hover:bg-background"
//                     >
//                       <Plus className="w-4 h-4" />
//                     </button>
//                   </div>

//                   {/* Quick quantity buttons */}
//                   <div className="flex gap-2">
//                     {[1, 5, 10]
//                       .filter((qty) => qty <= selectedItemForSplit.availableQty)
//                       .map((qty) => (
//                         <button
//                           key={qty}
//                           onClick={() => setSplitQuantity(qty)}
//                           className={`px-3 py-1 text-xs border rounded hover:bg-background ${
//                             splitQuantity === qty
//                               ? "bg-blue-100 dark:bg-blue-600 border-blue-300 dark:border-blue-500"
//                               : ""
//                           }`}
//                         >
//                           {qty}
//                         </button>
//                       ))}
//                     {selectedItemForSplit.availableQty > 10 && (
//                       <button
//                         onClick={() =>
//                           setSplitQuantity(
//                             Math.floor(selectedItemForSplit.availableQty / 2)
//                           )
//                         }
//                         className={`px-3 py-1 text-xs border rounded hover:bg-background ${
//                           splitQuantity ===
//                           Math.floor(selectedItemForSplit.availableQty / 2)
//                             ? "bg-blue-100 border-blue-300"
//                             : ""
//                         }`}
//                       >
//                         Half (
//                         {Math.floor(selectedItemForSplit.availableQty / 2)})
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="mb-4">
//               <label className="block text-sm font-medium mb-2">
//                 Add to shipment:
//               </label>
//               <select
//                 className="w-full px-3 py-2 border rounded dark:text-gray-400"
//                 onChange={(e) => {
//                   if (e.target.value) {
//                     addItemToShipment(
//                       e.target.value,
//                       selectedItemForSplit.itemId,
//                       splitQuantity
//                     );
//                   }
//                 }}
//                 defaultValue=""
//               >
//                 <option value="">Select shipment...</option>
//                 {shipments.map((shipment) => (
//                   <option key={shipment.id} value={shipment.id}>
//                     {shipment.name} ({shipment.items.length} items)
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="flex justify-end space-x-3">
//               <button
//                 onClick={() => {
//                   setSelectedItemForSplit(null);
//                   setSplitQuantity(1);
//                 }}
//                 className="px-4 py-2 text-gray-600 border rounded hover:bg-background dark:hover:text-white transition"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={() => {
//                   // Add to first shipment if none selected
//                   if (shipments.length > 0) {
//                     addItemToShipment(
//                       shipments[0].id,
//                       selectedItemForSplit.itemId,
//                       splitQuantity
//                     );
//                   }
//                 }}
//                 className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
//               >
//                 Add to {shipments[0]?.name || "Shipment"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default OrderSplitter;
