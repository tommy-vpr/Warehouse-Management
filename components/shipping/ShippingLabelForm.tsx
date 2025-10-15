"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Plus,
  Minus,
  Package,
  Truck,
  AlertCircle,
  Loader2,
  X,
  Check,
} from "lucide-react";

interface PackageConfig {
  id: string;
  packageCode: string;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
}

interface Shipment {
  id: string;
  name: string;
  items: ShipmentItem[];
  carrierId: string;
  serviceCode: string;
  packages: PackageConfig[];
  notes: string;
}

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  weightOz?: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: string;
  items: OrderItem[];
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

interface Carrier {
  carrier_id: string;
  carrier_code: string;
  friendly_name: string;
  services: Array<{
    service_code: string;
    name: string;
  }>;
  packages: Array<{
    package_code: string;
    name: string;
  }>;
}

interface ShipmentItem {
  itemId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  weightOz?: number;
}

interface ShippingLabelFormProps {
  order: Order;
  onSuccess?: (results: any[]) => void;
  onCancel?: () => void;
  embedded?: boolean;
  initialWeight?: number;
  initialDimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export default function ShippingLabelForm({
  order,
  onSuccess,
  onCancel,
  embedded = false,
  initialWeight,
  initialDimensions,
}: ShippingLabelFormProps) {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [carriersLoading, setCarriersLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [selectedItemForSplit, setSelectedItemForSplit] = useState<{
    itemId: string;
    availableQty: number;
  } | null>(null);
  const [splitQuantity, setSplitQuantity] = useState(1);
  const [splitMode, setSplitMode] = useState(false);

  // Number of packages input for UPS
  const [numberOfPackages, setNumberOfPackages] = useState("");

  // ✅ NEW: Track if dimensions have been applied
  const dimensionsAppliedRef = useRef(false);

  const generateId = useCallback(
    () => Date.now().toString(36) + Math.random().toString(36).substr(2),
    []
  );

  const getRemainingQuantity = useCallback(
    (itemId: string): number => {
      const originalItem = order?.items.find((item) => item.id === itemId);
      if (!originalItem) return 0;

      const totalAllocated = shipments.reduce((total, shipment) => {
        return (
          total +
          shipment.items.reduce((shipmentTotal, item) => {
            return item.itemId === itemId
              ? shipmentTotal + item.quantity
              : shipmentTotal;
          }, 0)
        );
      }, 0);

      return originalItem.quantity - totalAllocated;
    },
    [order, shipments]
  );

  const getAllocationSummary = useMemo(() => {
    if (!order) return [];

    return order.items.map((item) => ({
      ...item,
      remaining: getRemainingQuantity(item.id),
      allocated: item.quantity - getRemainingQuantity(item.id),
    }));
  }, [order, getRemainingQuantity]);

  useEffect(() => {
    loadCarriers();
    initializeShipment();
  }, []);

  useEffect(() => {
    if (
      (initialDimensions || initialWeight) &&
      shipments.length > 0 &&
      !dimensionsAppliedRef.current
    ) {
      setShipments((prevShipments) => {
        const updatedShipments = [...prevShipments];
        const firstShipment = updatedShipments[0];

        if (firstShipment && firstShipment.packages.length > 0) {
          updatedShipments[0] = {
            ...firstShipment,
            packages: [
              {
                ...firstShipment.packages[0],
                weight: initialWeight
                  ? initialWeight.toString()
                  : firstShipment.packages[0].weight,
                dimensions: {
                  length:
                    initialDimensions?.length?.toString() ||
                    firstShipment.packages[0].dimensions.length,
                  width:
                    initialDimensions?.width?.toString() ||
                    firstShipment.packages[0].dimensions.width,
                  height:
                    initialDimensions?.height?.toString() ||
                    firstShipment.packages[0].dimensions.height,
                },
              },
              ...firstShipment.packages.slice(1),
            ],
          };
        }

        return updatedShipments;
      });

      dimensionsAppliedRef.current = true; // Mark as applied
    }
  }, [initialWeight, initialDimensions, shipments.length]);

  const loadCarriers = async () => {
    try {
      const response = await fetch("/api/carriers");
      if (!response.ok) throw new Error("Failed to load carriers");
      const carriersData = await response.json();
      setCarriers(carriersData);
    } catch (err) {
      console.error("Failed to load carriers:", err);
      setError("Failed to load carriers");
    } finally {
      setCarriersLoading(false);
    }
  };

  const initializeShipment = () => {
    const initialShipment: Shipment = {
      id: generateId(),
      name: "Shipment 1",
      items: order.items.map((item) => ({
        itemId: item.id,
        productName: item.productName,
        sku: item.sku,
        unitPrice: parseFloat(item.unitPrice),
        quantity: item.quantity,
        weightOz: item.weightOz,
      })),
      carrierId: "",
      serviceCode: "",
      packages: [
        {
          id: generateId(),
          packageCode: "",
          // ✅ Use initialWeight from props
          weight: initialWeight ? initialWeight.toString() : "",
          dimensions: {
            // ✅ Use initialDimensions from props
            length: initialDimensions?.length?.toString() || "12",
            width: initialDimensions?.width?.toString() || "10",
            height: initialDimensions?.height?.toString() || "6",
          },
        },
      ],
      notes: "",
    };

    setShipments([initialShipment]);
    dimensionsAppliedRef.current = false; // Reset when initializing
  };
  // ✅ CHECK: Is current carrier Stamps.com?
  const isStampsCarrier = (carrierId: string): boolean => {
    const carrier = carriers.find((c) => c.carrier_id === carrierId);
    return carrier?.carrier_code === "stamps_com" || false;
  };

  const enableSplitMode = () => {
    setSplitMode(true);
    if (shipments.length === 1) {
      setShipments([
        ...shipments,
        {
          id: generateId(),
          name: "Shipment 2",
          items: [],
          carrierId: "",
          serviceCode: "",
          packages: [
            {
              id: generateId(),
              packageCode: "",
              weight: "",
              dimensions: { length: "12", width: "10", height: "6" },
            },
          ],
          notes: "",
        },
      ]);
    }
  };

  const createNewShipment = () => {
    setShipments([
      ...shipments,
      {
        id: generateId(),
        name: `Shipment ${shipments.length + 1}`,
        items: [],
        carrierId: "",
        serviceCode: "",
        packages: [
          {
            id: generateId(),
            packageCode: "",
            weight: "",
            dimensions: { length: "12", width: "10", height: "6" },
          },
        ],
        notes: "",
      },
    ]);
  };

  const addPackageToShipment = (shipmentId: string) => {
    setShipments(
      shipments.map((shipment) =>
        shipment.id === shipmentId
          ? {
              ...shipment,
              packages: [
                ...shipment.packages,
                {
                  id: generateId(),
                  packageCode: "",
                  weight: "",
                  dimensions: { length: "12", width: "10", height: "6" },
                },
              ],
            }
          : shipment
      )
    );
  };

  // ✅ NEW: Add multiple packages at once (for UPS)
  const addMultiplePackages = (shipmentId: string, count: number) => {
    const newPackages: PackageConfig[] = [];
    for (let i = 0; i < count; i++) {
      newPackages.push({
        id: generateId(),
        packageCode: "",
        weight: "",
        dimensions: { length: "12", width: "10", height: "6" },
      });
    }

    setShipments(
      shipments.map((shipment) =>
        shipment.id === shipmentId
          ? {
              ...shipment,
              packages: [...shipment.packages, ...newPackages],
            }
          : shipment
      )
    );

    setNumberOfPackages(""); // Clear input after adding
  };

  const removePackageFromShipment = (shipmentId: string, packageId: string) => {
    setShipments(
      shipments.map((shipment) =>
        shipment.id === shipmentId
          ? {
              ...shipment,
              packages: shipment.packages.filter((p) => p.id !== packageId),
            }
          : shipment
      )
    );
  };

  const updatePackageConfig = (
    shipmentId: string,
    packageId: string,
    field: string,
    value: string
  ) => {
    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;
        return {
          ...shipment,
          packages: shipment.packages.map((pkg) =>
            pkg.id === packageId
              ? field.includes(".")
                ? {
                    ...pkg,
                    dimensions: {
                      ...pkg.dimensions,
                      [field.split(".")[1]]: value,
                    },
                  }
                : { ...pkg, [field]: value }
              : pkg
          ),
        };
      })
    );
  };

  const removeShipment = (shipmentId: string) => {
    if (shipments.length <= 1) return;
    setShipments(shipments.filter((s) => s.id !== shipmentId));
  };

  const addItemToShipment = (
    shipmentId: string,
    itemId: string,
    quantity: number
  ) => {
    const originalItem = order?.items.find((item) => item.id === itemId);
    if (!originalItem) return;

    const remainingQty = getRemainingQuantity(itemId);
    const validQuantity = Math.min(quantity, remainingQty);

    if (validQuantity <= 0) return;

    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;

        const existingItemIndex = shipment.items.findIndex(
          (item) => item.itemId === itemId
        );

        if (existingItemIndex >= 0) {
          const updatedItems = [...shipment.items];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + validQuantity,
          };
          return { ...shipment, items: updatedItems };
        } else {
          const newItem: ShipmentItem = {
            itemId: originalItem.id,
            productName: originalItem.productName,
            sku: originalItem.sku,
            unitPrice: parseFloat(originalItem.unitPrice),
            quantity: validQuantity,
            weightOz: originalItem.weightOz,
          };
          return { ...shipment, items: [...shipment.items, newItem] };
        }
      })
    );

    setSelectedItemForSplit(null);
    setSplitQuantity(1);
  };

  const removeItemFromShipment = (shipmentId: string, itemId: string) => {
    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;
        return {
          ...shipment,
          items: shipment.items.filter((item) => item.itemId !== itemId),
        };
      })
    );
  };

  const updateItemQuantityInShipment = (
    shipmentId: string,
    itemId: string,
    newQuantity: number
  ) => {
    const remainingQty = getRemainingQuantity(itemId);
    const currentShipment = shipments.find((s) => s.id === shipmentId);
    const currentItem = currentShipment?.items.find((i) => i.itemId === itemId);
    const maxAllowed = remainingQty + (currentItem?.quantity || 0);

    const validQuantity = Math.max(0, Math.min(newQuantity, maxAllowed));

    if (validQuantity === 0) {
      removeItemFromShipment(shipmentId, itemId);
      return;
    }

    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;
        return {
          ...shipment,
          items: shipment.items.map((item) =>
            item.itemId === itemId ? { ...item, quantity: validQuantity } : item
          ),
        };
      })
    );
  };

  const updateShippingConfig = (
    shipmentId: string,
    field: string,
    value: string
  ) => {
    setShipments(
      shipments.map((shipment) =>
        shipment.id === shipmentId ? { ...shipment, [field]: value } : shipment
      )
    );
  };

  const getCarrierOptions = (carrierId: string) => {
    const carrier = carriers.find((c) => c.carrier_id === carrierId);
    return {
      services: carrier?.services || [],
      packages: carrier?.packages || [],
    };
  };

  const validateShipments = (): string[] => {
    const errors: string[] = [];

    shipments.forEach((shipment) => {
      if (shipment.items.length === 0) {
        errors.push(`${shipment.name} must have at least one item`);
      }

      if (shipment.items.length > 0) {
        if (!shipment.carrierId || !shipment.serviceCode) {
          errors.push(`${shipment.name} needs carrier and service selected`);
        }

        if (shipment.packages.length === 0) {
          errors.push(`${shipment.name} must have at least one package`);
        } else {
          shipment.packages.forEach((pkg, i) => {
            if (!pkg.packageCode) {
              errors.push(
                `${shipment.name} package ${i + 1} needs a package type`
              );
            }
            if (!pkg.weight || parseFloat(pkg.weight) <= 0) {
              errors.push(
                `${shipment.name} package ${i + 1} needs a valid weight`
              );
            }
          });
        }
      }
    });

    if (splitMode) {
      const unallocatedItems = getAllocationSummary.filter(
        (item) => item.remaining > 0
      );
      if (unallocatedItems.length > 0) {
        errors.push(
          `Unallocated items: ${unallocatedItems
            .map((item) => `${item.sku} (${item.remaining})`)
            .join(", ")}`
        );
      }
    }

    return errors;
  };

  const processShipments = async () => {
    const validationErrors = validateShipments();
    if (validationErrors.length > 0) {
      setError(validationErrors.join("; "));
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const results = [];
      const validShipments = shipments.filter((s) => s.items.length > 0);

      for (const shipment of validShipments) {
        const selectedCarrier = carriers.find(
          (c) => c.carrier_id === shipment.carrierId
        );
        if (!selectedCarrier) {
          throw new Error(`Carrier not found for ${shipment.name}`);
        }

        const shipmentData = {
          orderId: order.id,
          carrierCode: selectedCarrier.carrier_code,
          serviceCode: shipment.serviceCode,
          packages: shipment.packages.map((pkg) => ({
            packageCode: pkg.packageCode,
            weight: parseFloat(pkg.weight),
            length: parseFloat(pkg.dimensions.length),
            width: parseFloat(pkg.dimensions.width),
            height: parseFloat(pkg.dimensions.height),
          })),
          shippingAddress: {
            name: order.shippingAddress.name || order.customerName,
            address1: order.shippingAddress.address1,
            city: order.shippingAddress.city,
            zip: order.shippingAddress.zip,
            province: order.shippingAddress.province,
            province_code: order.shippingAddress.province_code,
            country_code: order.shippingAddress.country_code || "US",
          },
          notes:
            shipment.notes ||
            `${shipment.name} - Items: ${shipment.items
              .map((i) => `${i.sku}(${i.quantity})`)
              .join(", ")}`,
        };

        const response = await fetch("/api/shipping/shipengine/create-label", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shipmentData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Failed to create ${shipment.name}: ${
              errorData.error || response.statusText
            }`
          );
        }

        const result = await response.json();
        results.push({
          splitName: shipment.name,
          trackingNumber: result.label.trackingNumber,
          labelUrl: result.label.labelUrl,
          cost: result.label.cost,
          carrier: selectedCarrier.friendly_name,
          items: shipment.items,
        });

        if (result.label?.labelUrl) {
          window.open(result.label.labelUrl, "_blank");
        }
      }

      if (onSuccess) {
        onSuccess(results);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  // ✅ FIXED: Smart package generation with weight distribution
  const addMultiplePackagesWithWeightDistribution = (
    shipmentId: string,
    count: number
  ) => {
    const shipment = shipments.find((s) => s.id === shipmentId);
    if (!shipment) return;

    // Calculate total weight from SHIPMENT items (not all order items)
    const totalWeightOz = shipment.items.reduce((sum, item) => {
      return sum + (item.weightOz || 0) * item.quantity;
    }, 0);
    const totalWeightLbs = totalWeightOz / 16;

    // Divide weight evenly across packages
    const weightPerPackage = (totalWeightLbs / count).toFixed(2);

    // Get the first package config to copy settings from
    const firstPackage = shipment.packages[0];
    const defaultPackageCode = firstPackage?.packageCode || "";
    const defaultDimensions = firstPackage?.dimensions || {
      length: "12",
      width: "10",
      height: "6",
    };

    // ✅ CREATE NEW PACKAGES (not add to existing)
    const newPackages: PackageConfig[] = [];
    for (let i = 0; i < count; i++) {
      newPackages.push({
        id: generateId(),
        packageCode: defaultPackageCode, // Copy package type from first
        weight: weightPerPackage,
        dimensions: { ...defaultDimensions }, // Copy dimensions from first
      });
    }

    // ✅ REPLACE packages instead of adding to existing
    setShipments(
      shipments.map((s) =>
        s.id === shipmentId
          ? {
              ...s,
              packages: newPackages, // Replace, not append
            }
          : s
      )
    );

    setNumberOfPackages(""); // Clear input
  };
  return (
    <div className={embedded ? "" : "p-6"}>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* ✅ UPDATED: Only show for Stamps.com in single shipment mode */}
        {!splitMode &&
          shipments.length === 1 &&
          shipments[0].carrierId &&
          isStampsCarrier(shipments[0].carrierId) && (
            <div className="flex justify-end">
              <button
                onClick={enableSplitMode}
                className="cursor-pointer px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
              >
                <Package className="w-4 h-4 mr-2" />
                Split into Multiple Shipments
              </button>
            </div>
          )}

        {/* Split Mode Active (Stamps.com only) */}
        {splitMode && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Available Items */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Order Items
              </h3>
              <div className="space-y-3">
                {getAllocationSummary.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 dark:bg-gray-800 p-3 rounded border"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {item.productName}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          SKU: {item.sku}
                        </div>

                        <div className="flex items-center text-xs space-x-4">
                          <span className="text-gray-500">
                            Qty: {item.quantity}
                          </span>
                          <span className="text-blue-600">
                            Split: {item.allocated}
                          </span>
                          <span
                            className={`font-medium ${
                              item.remaining > 0
                                ? "text-blue-600"
                                : "text-green-600"
                            }`}
                          >
                            Available: {item.remaining}
                          </span>
                        </div>

                        {item.remaining > 0 && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full"
                                style={{
                                  width: `${
                                    (item.remaining / item.quantity) * 100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {item.remaining > 0 && (
                        <button
                          onClick={() =>
                            setSelectedItemForSplit({
                              itemId: item.id,
                              availableQty: item.remaining,
                            })
                          }
                          className="ml-3 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Split
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Shipments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center">
                  <Truck className="w-5 h-5 mr-2" />
                  Shipments ({shipments.length})
                </h3>
                <button
                  onClick={createNewShipment}
                  className="cursor-pointer px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Shipment
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="border rounded-lg p-4 bg-background"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">{shipment.name}</h4>
                      {shipments.length > 1 && (
                        <button
                          onClick={() => removeShipment(shipment.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Items in shipment */}
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-2">
                        Items ({shipment.items.length})
                      </h5>
                      {shipment.items.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">
                          No items added
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {shipment.items.map((item) => (
                            <div
                              key={item.itemId}
                              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs"
                            >
                              <div>
                                <span className="font-medium">{item.sku}</span>
                                <span className="text-gray-600 dark:text-gray-400 ml-2">
                                  Qty: {item.quantity}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() =>
                                    updateItemQuantityInShipment(
                                      shipment.id,
                                      item.itemId,
                                      item.quantity - 1
                                    )
                                  }
                                  className="w-5 h-5 border rounded flex items-center justify-center hover:bg-background"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateItemQuantityInShipment(
                                      shipment.id,
                                      item.itemId,
                                      item.quantity + 1
                                    )
                                  }
                                  className="cursor-pointer w-5 h-5 border rounded flex items-center justify-center hover:bg-background"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() =>
                                    removeItemFromShipment(
                                      shipment.id,
                                      item.itemId
                                    )
                                  }
                                  className="ml-2 text-red-600 hover:text-red-800"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Shipping Configuration */}
                    {shipment.items.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400">
                          Shipping Configuration
                        </h5>

                        <select
                          value={shipment.carrierId}
                          onChange={(e) =>
                            updateShippingConfig(
                              shipment.id,
                              "carrierId",
                              e.target.value
                            )
                          }
                          disabled={carriersLoading}
                          className="w-full px-2 py-1 border rounded text-xs"
                        >
                          <option value="">
                            {carriersLoading ? "Loading..." : "Select Carrier"}
                          </option>
                          {carriers.map((carrier) => (
                            <option
                              key={carrier.carrier_id}
                              value={carrier.carrier_id}
                            >
                              {carrier.friendly_name}
                            </option>
                          ))}
                        </select>

                        {shipment.carrierId && (
                          <select
                            value={shipment.serviceCode}
                            onChange={(e) =>
                              updateShippingConfig(
                                shipment.id,
                                "serviceCode",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-xs"
                          >
                            <option value="">Select Service</option>
                            {getCarrierOptions(shipment.carrierId).services.map(
                              (service) => (
                                <option
                                  key={service.service_code}
                                  value={service.service_code}
                                >
                                  {service.name}
                                </option>
                              )
                            )}
                          </select>
                        )}

                        {/* Packages - compact for split mode */}
                        <div className="space-y-3 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400">
                              Packages ({shipment.packages.length})
                            </h5>
                            <button
                              onClick={() => addPackageToShipment(shipment.id)}
                              className="cursor-pointer px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 flex items-center"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </button>
                          </div>

                          {shipment.packages.map((pkg, pkgIndex) => (
                            <div
                              key={pkg.id}
                              className="border p-3 rounded bg-gray-50 dark:bg-gray-800 space-y-2"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium">
                                  Package {pkgIndex + 1}
                                </span>
                                {shipment.packages.length > 1 && (
                                  <button
                                    onClick={() =>
                                      removePackageFromShipment(
                                        shipment.id,
                                        pkg.id
                                      )
                                    }
                                    className="text-red-400 hover:text-red-500 cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={pkg.packageCode}
                                  onChange={(e) =>
                                    updatePackageConfig(
                                      shipment.id,
                                      pkg.id,
                                      "packageCode",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1 text-xs"
                                >
                                  <option value="">Package Type</option>
                                  {getCarrierOptions(
                                    shipment.carrierId
                                  ).packages.map((option) => (
                                    <option
                                      key={option.package_code}
                                      value={option.package_code}
                                    >
                                      {option.name}
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="number"
                                  step="0.1"
                                  placeholder="Weight (lbs)"
                                  value={pkg.weight}
                                  onChange={(e) =>
                                    updatePackageConfig(
                                      shipment.id,
                                      pkg.id,
                                      "weight",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1 text-xs"
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <input
                                  type="number"
                                  placeholder="L"
                                  value={pkg.dimensions.length}
                                  onChange={(e) =>
                                    updatePackageConfig(
                                      shipment.id,
                                      pkg.id,
                                      "dimensions.length",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1 text-xs"
                                />
                                <input
                                  type="number"
                                  placeholder="W"
                                  value={pkg.dimensions.width}
                                  onChange={(e) =>
                                    updatePackageConfig(
                                      shipment.id,
                                      pkg.id,
                                      "dimensions.width",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1 text-xs"
                                />
                                <input
                                  type="number"
                                  placeholder="H"
                                  value={pkg.dimensions.height}
                                  onChange={(e) =>
                                    updatePackageConfig(
                                      shipment.id,
                                      pkg.id,
                                      "dimensions.height",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1 text-xs"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Single Shipment Mode */}
        {!splitMode && shipments.length === 1 && (
          <div className="space-y-4">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Carrier
                    </label>
                    <select
                      value={shipment.carrierId}
                      onChange={(e) =>
                        updateShippingConfig(
                          shipment.id,
                          "carrierId",
                          e.target.value
                        )
                      }
                      disabled={carriersLoading}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="">
                        {carriersLoading ? "Loading..." : "Select Carrier"}
                      </option>
                      {carriers.map((carrier) => (
                        <option
                          key={carrier.carrier_id}
                          value={carrier.carrier_id}
                        >
                          {carrier.friendly_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {shipment.carrierId && (
                    <div>
                      <label className="text-sm font-medium block mb-2">
                        Service
                      </label>
                      <select
                        value={shipment.serviceCode}
                        onChange={(e) =>
                          updateShippingConfig(
                            shipment.id,
                            "serviceCode",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="">Select Service</option>
                        {getCarrierOptions(shipment.carrierId).services.map(
                          (service) => (
                            <option
                              key={service.service_code}
                              value={service.service_code}
                            >
                              {service.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* ✅ UPDATED: Package Details with Quick Add for UPS */}
                <div>
                  {shipment.carrierId &&
                    !isStampsCarrier(shipment.carrierId) && (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium">
                            Package Details
                          </label>
                          <div className="flex items-center gap-2">
                            {/* Quick Add Multiple Packages */}
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="20"
                                value={numberOfPackages}
                                onChange={(e) =>
                                  setNumberOfPackages(e.target.value)
                                }
                                placeholder="# of packages"
                                className="w-32 px-2 py-1 text-sm border rounded"
                              />
                              <button
                                onClick={() => {
                                  const count = parseInt(numberOfPackages);
                                  if (count > 0 && count <= 20) {
                                    addMultiplePackagesWithWeightDistribution(
                                      shipment.id,
                                      count
                                    );
                                  }
                                }}
                                disabled={
                                  !numberOfPackages ||
                                  parseInt(numberOfPackages) <= 0
                                }
                                className="cursor-pointer px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Add {numberOfPackages || "X"}
                              </button>
                            </div>

                            {/* Manual Add Button */}
                            {shipment.packages.length < 20 && (
                              <button
                                onClick={() =>
                                  addPackageToShipment(shipment.id)
                                }
                                className="cursor-pointer px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Package
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Package List */}
                        {shipment.packages.map((pkg, pkgIndex) => (
                          <div
                            key={pkg.id}
                            className="border p-4 rounded bg-gray-50 dark:bg-zinc-800 space-y-3 mb-3"
                          >
                            {/* ...package fields here... */}
                          </div>
                        ))}
                      </>
                    )}

                  {shipment.packages.map((pkg, pkgIndex) => (
                    <div
                      key={pkg.id}
                      className="border p-4 rounded bg-gray-50 dark:bg-zinc-800 space-y-3 mb-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-md font-medium text-emerald-500">
                          Package {pkgIndex + 1}
                        </span>
                        {shipment.packages.length > 1 && (
                          <button
                            onClick={() =>
                              removePackageFromShipment(shipment.id, pkg.id)
                            }
                            className="text-red-600 hover:text-red-800 cursor-pointer"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium block mb-1">
                            Package Type
                          </label>
                          <select
                            value={pkg.packageCode}
                            onChange={(e) =>
                              updatePackageConfig(
                                shipment.id,
                                pkg.id,
                                "packageCode",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border rounded text-sm"
                          >
                            <option value="">Select Type</option>
                            {getCarrierOptions(shipment.carrierId).packages.map(
                              (option) => (
                                <option
                                  key={option.package_code}
                                  value={option.package_code}
                                >
                                  {option.name}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-medium block mb-1">
                            Weight (lbs)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={pkg.weight}
                            onChange={(e) =>
                              updatePackageConfig(
                                shipment.id,
                                pkg.id,
                                "weight",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border rounded text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium block mb-1">
                          Dimensions (inches)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            placeholder="Length"
                            value={pkg.dimensions.length}
                            onChange={(e) =>
                              updatePackageConfig(
                                shipment.id,
                                pkg.id,
                                "dimensions.length",
                                e.target.value
                              )
                            }
                            className="px-3 py-2 border rounded text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Width"
                            value={pkg.dimensions.width}
                            onChange={(e) =>
                              updatePackageConfig(
                                shipment.id,
                                pkg.id,
                                "dimensions.width",
                                e.target.value
                              )
                            }
                            className="px-3 py-2 border rounded text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Height"
                            value={pkg.dimensions.height}
                            onChange={(e) =>
                              updatePackageConfig(
                                shipment.id,
                                pkg.id,
                                "dimensions.height",
                                e.target.value
                              )
                            }
                            className="px-3 py-2 border rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          {onCancel && (
            <button
              onClick={onCancel}
              className="cursor-pointer px-6 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              disabled={processing}
            >
              Cancel
            </button>
          )}
          <button
            onClick={processShipments}
            disabled={
              processing || shipments.every((s) => s.items.length === 0)
            }
            className="cursor-pointer px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Labels...
              </>
            ) : (
              <>
                <Truck className="w-5 h-5 mr-2" />
                Create{" "}
                {shipments.filter((s) => s.items.length > 0).length > 1
                  ? `${
                      shipments.filter((s) => s.items.length > 0).length
                    } Labels`
                  : "Label"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Split Item Modal */}
      {selectedItemForSplit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Split Item</h3>

            {(() => {
              const item = order.items.find(
                (i) => i.id === selectedItemForSplit.itemId
              );
              return item ? (
                <div className="mb-4">
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    SKU: {item.sku}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Available: {selectedItemForSplit.availableQty} units
                  </p>
                </div>
              ) : null;
            })()}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Quantity to add:
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    setSplitQuantity(Math.max(1, splitQuantity - 1))
                  }
                  className="cursor-pointer w-8 h-8 border rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={selectedItemForSplit.availableQty}
                  value={splitQuantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setSplitQuantity(
                      Math.min(
                        selectedItemForSplit.availableQty,
                        Math.max(1, value)
                      )
                    );
                  }}
                  className="flex-1 text-center px-3 py-2 border rounded"
                />
                <button
                  onClick={() =>
                    setSplitQuantity(
                      Math.min(
                        selectedItemForSplit.availableQty,
                        splitQuantity + 1
                      )
                    )
                  }
                  className="cursor-pointer w-8 h-8 border rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Add to shipment:
              </label>
              <select
                className="w-full px-3 py-2 border rounded"
                onChange={(e) => {
                  if (e.target.value) {
                    addItemToShipment(
                      e.target.value,
                      selectedItemForSplit.itemId,
                      splitQuantity
                    );
                  }
                }}
                defaultValue=""
              >
                <option value="">Select shipment...</option>
                {shipments.map((shipment) => (
                  <option key={shipment.id} value={shipment.id}>
                    {shipment.name} ({shipment.items.length} items)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedItemForSplit(null);
                  setSplitQuantity(1);
                }}
                className="cursor-pointer px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
