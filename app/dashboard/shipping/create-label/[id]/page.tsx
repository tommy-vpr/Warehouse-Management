"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Minus,
  Package,
  Truck,
  AlertCircle,
  Loader2,
  X,
  Check,
  Split,
  Copy,
  Download,
  Eye,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useParams } from "next/navigation";

// TypeScript interfaces
interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  weight?: number;
  dimensions?: any;
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
  weight?: number;
}

interface Shipment {
  id: string;
  name: string;
  items: ShipmentItem[];
  shippingConfig: {
    carrierId: string;
    serviceCode: string;
    packageCode: string;
    weight: string;
    dimensions: {
      length: string;
      width: string;
      height: string;
    };
  };
  notes: string;
}

interface CompletedShipment {
  splitName: string;
  trackingNumber: string;
  labelUrl: string;
  cost: string;
  carrier: string;
  items: ShipmentItem[];
}

const OrderSplitter: React.FC = () => {
  const [order, setOrder] = useState<Order | null>(null);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [carriersLoading, setCarriersLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [completedShipments, setCompletedShipments] = useState<
    CompletedShipment[]
  >([]);
  const [selectedItemForSplit, setSelectedItemForSplit] = useState<{
    itemId: string;
    availableQty: number;
  } | null>(null);
  const [splitQuantity, setSplitQuantity] = useState(1);

  const params = useParams<{ id: string }>();
  const id = params.id;

  // Generate unique ID
  const generateId = useCallback(
    () => Date.now().toString(36) + Math.random().toString(36).substr(2),
    []
  );

  // Calculate remaining quantity for each original item
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

  // Get summary of allocated items
  const getAllocationSummary = useMemo(() => {
    if (!order) return [];

    return order.items.map((item) => ({
      ...item,
      remaining: getRemainingQuantity(item.id),
      allocated: item.quantity - getRemainingQuantity(item.id),
    }));
  }, [order, getRemainingQuantity]);

  useEffect(() => {
    if (id) {
      loadOrderDetails();
      loadCarriers();
    }
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      setError("");
      const response = await fetch(`/api/shipping/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to load order: ${response.status}`);
      }

      const data = await response.json();
      setOrder(data.order);

      // Initialize with one empty shipment
      const initialShipment: Shipment = {
        id: generateId(),
        name: "Shipment 1",
        items: [],
        shippingConfig: {
          carrierId: "",
          serviceCode: "",
          packageCode: "",
          weight: "",
          dimensions: {
            length: "10",
            width: "8",
            height: "6",
          },
        },
        notes: "",
      };

      setShipments([initialShipment]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadCarriers = async () => {
    try {
      const response = await fetch("/api/carriers");
      if (!response.ok) {
        throw new Error(`Failed to load carriers: ${response.status}`);
      }
      const carriersData = await response.json();
      setCarriers(carriersData);
    } catch (err) {
      console.error("Failed to load carriers:", err);
    } finally {
      setCarriersLoading(false);
    }
  };

  // Create new shipment
  const createNewShipment = () => {
    const newShipment: Shipment = {
      id: generateId(),
      name: `Shipment ${shipments.length + 1}`,
      items: [],
      shippingConfig: {
        carrierId: "",
        serviceCode: "",
        packageCode: "",
        weight: "",
        dimensions: {
          length: "10",
          width: "8",
          height: "6",
        },
      },
      notes: "",
    };

    setShipments([...shipments, newShipment]);
  };

  // Remove shipment
  const removeShipment = (shipmentId: string) => {
    if (shipments.length <= 1) return;
    setShipments(shipments.filter((s) => s.id !== shipmentId));
  };

  // Add item to shipment
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

        // Check if item already exists in this shipment
        const existingItemIndex = shipment.items.findIndex(
          (item) => item.itemId === itemId
        );

        if (existingItemIndex >= 0) {
          // Update existing item quantity
          const updatedItems = [...shipment.items];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + validQuantity,
          };
          return { ...shipment, items: updatedItems };
        } else {
          // Add new item to shipment
          const newItem: ShipmentItem = {
            itemId: originalItem.id,
            productName: originalItem.productName,
            sku: originalItem.sku,
            unitPrice: parseFloat(originalItem.unitPrice),
            quantity: validQuantity,
            weight: originalItem.weight,
          };
          return { ...shipment, items: [...shipment.items, newItem] };
        }
      })
    );

    // Close split modal
    setSelectedItemForSplit(null);
    setSplitQuantity(1);
  };

  // Remove item from shipment
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

  // Update item quantity in shipment
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

  // Update shipping configuration
  const updateShippingConfig = (
    shipmentId: string,
    field: string,
    value: string
  ) => {
    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;

        const newConfig = { ...shipment.shippingConfig };

        if (field.includes(".")) {
          const [parent, child] = field.split(".");
          if (parent === "dimensions") {
            newConfig.dimensions = { ...newConfig.dimensions, [child]: value };
          }
        } else {
          (newConfig as any)[field] = value;
          if (field === "carrierId") {
            newConfig.serviceCode = "";
            newConfig.packageCode = "";
          }
        }

        return { ...shipment, shippingConfig: newConfig };
      })
    );
  };

  // Get carrier options
  const getCarrierOptions = (carrierId: string) => {
    const carrier = carriers.find((c) => c.carrier_id === carrierId);
    return {
      services: carrier?.services || [],
      packages: carrier?.packages || [],
    };
  };

  // Validation
  const validateShipments = (): string[] => {
    const errors: string[] = [];

    if (!order) return ["Order not loaded"];

    // Check that shipments have items
    shipments.forEach((shipment) => {
      if (shipment.items.length === 0) {
        errors.push(`${shipment.name} must have at least one item`);
      }

      const { carrierId, serviceCode, packageCode, weight } =
        shipment.shippingConfig;
      if (shipment.items.length > 0) {
        if (!carrierId || !serviceCode || !packageCode) {
          errors.push(
            `${shipment.name} needs carrier, service, and package selected`
          );
        }
        if (!weight || parseFloat(weight) <= 0) {
          errors.push(`${shipment.name} needs valid weight`);
        }
      }
    });

    // Check for unallocated items
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

    return errors;
  };

  // Process shipments
  const processShipments = async () => {
    const validationErrors = validateShipments();
    if (validationErrors.length > 0) {
      setError(validationErrors.join("; "));
      return;
    }

    if (!order) {
      setError("Order not loaded");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const results = [];
      const validShipments = shipments.filter((s) => s.items.length > 0);

      for (const shipment of validShipments) {
        const selectedCarrier = carriers.find(
          (c) => c.carrier_id === shipment.shippingConfig.carrierId
        );
        if (!selectedCarrier) {
          throw new Error(`Carrier not found for ${shipment.name}`);
        }

        const shipmentData = {
          orderId: order.id,
          carrierCode: selectedCarrier.carrier_code,
          serviceCode: shipment.shippingConfig.serviceCode,
          packages: [
            {
              packageCode: shipment.shippingConfig.packageCode,
              weight: parseFloat(shipment.shippingConfig.weight),
              length: parseFloat(shipment.shippingConfig.dimensions.length),
              width: parseFloat(shipment.shippingConfig.dimensions.width),
              height: parseFloat(shipment.shippingConfig.dimensions.height),
            },
          ],
          shippingAddress: {
            name: order.customerName,
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
      }

      setCompletedShipments(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  // Loading states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="text-blue-500 w-8 h-8 animate-spin mr-3" />
          <span>Loading order details...</span>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center mb-2">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="font-semibold text-red-800">
            Error Loading Order
          </span>
        </div>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  // Success state
  if (completedShipments.length > 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center mb-4">
            <Check className="w-6 h-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-green-800">
              Order Split Successfully!
            </h2>
          </div>

          <div className="space-y-4">
            {completedShipments.map((shipment, index) => (
              <div key={index} className="bg-white p-4 rounded border">
                <h3 className="font-medium mb-2">{shipment.splitName}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">
                      <strong>Tracking:</strong> {shipment.trackingNumber}
                    </p>
                    <p className="text-gray-600 mb-1">
                      <strong>Cost:</strong> ${shipment.cost}
                    </p>
                    <p className="text-gray-600 mb-3">
                      <strong>Carrier:</strong> {shipment.carrier}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Items:</p>
                    <ul className="text-sm text-gray-600">
                      {shipment.items.map((item) => (
                        <li key={item.itemId}>
                          {item.sku} - {item.productName} (Qty: {item.quantity})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {shipment.labelUrl && (
                  <button
                    onClick={() => window.open(shipment.labelUrl, "_blank")}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Label
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setCompletedShipments([]);
              setShipments([
                {
                  id: generateId(),
                  name: "Shipment 1",
                  items: [],
                  shippingConfig: {
                    carrierId: "",
                    serviceCode: "",
                    packageCode: "",
                    weight: "",
                    dimensions: { length: "10", width: "8", height: "6" },
                  },
                  notes: "",
                },
              ]);
            }}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Create New Split
          </button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
          <p className="text-gray-600">
            {order.customerName} ({order.customerEmail})
          </p>
          <p className="text-gray-600">
            {order.shippingAddress.address1}, {order.shippingAddress.city},{" "}
            {order.shippingAddress.province} {order.shippingAddress.zip}
          </p>
        </div>
        <button
          onClick={createNewShipment}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Shipment
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original Order Items */}
        <div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Order Items
            </h3>
            <div className="space-y-3">
              {getAllocationSummary.map((item) => (
                <div key={item.id} className="bg-white p-3 rounded border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {item.productName}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        SKU: {item.sku} • ${item.unitPrice} each
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
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
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
        </div>

        {/* Shipments */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center">
            <Truck className="w-5 h-5 mr-2" />
            Shipments ({shipments.length})
          </h3>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="border rounded-lg p-4 bg-white">
                {/* Shipment Header */}
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
                  <h5 className="text-xs font-medium text-gray-700 mb-2">
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
                          className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs"
                        >
                          <div>
                            <span className="font-medium">{item.sku}</span>
                            <span className="text-gray-600 ml-2">
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
                              className="w-5 h-5 bg-white border rounded flex items-center justify-center hover:bg-gray-50"
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
                              className="w-5 h-5 bg-white border rounded flex items-center justify-center hover:bg-gray-50"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() =>
                                removeItemFromShipment(shipment.id, item.itemId)
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

                {/* Shipping Config - Only show if shipment has items */}
                {shipment.items.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-xs font-medium text-gray-700">
                      Shipping Configuration
                    </h5>

                    {/* Carrier Selection */}
                    <select
                      value={shipment.shippingConfig.carrierId}
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

                    {/* Service Selection */}
                    {shipment.shippingConfig.carrierId && (
                      <select
                        value={shipment.shippingConfig.serviceCode}
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
                        {getCarrierOptions(
                          shipment.shippingConfig.carrierId
                        ).services.map((service) => (
                          <option
                            key={service.service_code}
                            value={service.service_code}
                          >
                            {service.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Package Selection */}
                    {shipment.shippingConfig.carrierId && (
                      <select
                        value={shipment.shippingConfig.packageCode}
                        onChange={(e) =>
                          updateShippingConfig(
                            shipment.id,
                            "packageCode",
                            e.target.value
                          )
                        }
                        className="w-full px-2 py-1 border rounded text-xs"
                      >
                        <option value="">Select Package</option>
                        {getCarrierOptions(
                          shipment.shippingConfig.carrierId
                        ).packages.map((pkg) => (
                          <option
                            key={pkg.package_code}
                            value={pkg.package_code}
                          >
                            {pkg.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Weight and Dimensions */}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={shipment.shippingConfig.weight}
                        onChange={(e) =>
                          updateShippingConfig(
                            shipment.id,
                            "weight",
                            e.target.value
                          )
                        }
                        className="px-2 py-1 border rounded text-xs"
                        placeholder="Weight (lbs)"
                      />
                      <input
                        type="text"
                        value={shipment.notes}
                        onChange={(e) =>
                          setShipments(
                            shipments.map((s) =>
                              s.id === shipment.id
                                ? { ...s, notes: e.target.value }
                                : s
                            )
                          )
                        }
                        className="px-2 py-1 border rounded text-xs"
                        placeholder="Notes (optional)"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={shipment.shippingConfig.dimensions.length}
                        onChange={(e) =>
                          updateShippingConfig(
                            shipment.id,
                            "dimensions.length",
                            e.target.value
                          )
                        }
                        placeholder="L"
                        className="px-2 py-1 border rounded text-xs"
                      />
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={shipment.shippingConfig.dimensions.width}
                        onChange={(e) =>
                          updateShippingConfig(
                            shipment.id,
                            "dimensions.width",
                            e.target.value
                          )
                        }
                        placeholder="W"
                        className="px-2 py-1 border rounded text-xs"
                      />
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={shipment.shippingConfig.dimensions.height}
                        onChange={(e) =>
                          updateShippingConfig(
                            shipment.id,
                            "dimensions.height",
                            e.target.value
                          )
                        }
                        placeholder="H"
                        className="px-2 py-1 border rounded text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Process Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={processShipments}
          disabled={processing || shipments.every((s) => s.items.length === 0)}
          className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating Shipments...
            </>
          ) : (
            <>
              {/* <Truck className="w-5 h-5 mr-2" /> */}
              Create Shipments & Labels
            </>
          )}
        </button>
      </div>

      {/* Split Modal */}
      {selectedItemForSplit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Split Item</h3>

            {(() => {
              const item = order.items.find(
                (i) => i.id === selectedItemForSplit.itemId
              );
              return item ? (
                <div className="mb-4">
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                  <p className="text-sm text-gray-600">
                    Available to split: {selectedItemForSplit.availableQty}{" "}
                    units
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
                  className="w-8 h-8 border rounded flex items-center justify-center hover:bg-gray-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={selectedItemForSplit.availableQty}
                  value={splitQuantity}
                  onChange={(e) =>
                    setSplitQuantity(
                      Math.min(
                        selectedItemForSplit.availableQty,
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    )
                  }
                  className="w-20 text-center px-2 py-1 border rounded"
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
                  className="w-8 h-8 border rounded flex items-center justify-center hover:bg-gray-50"
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
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Add to first shipment if none selected
                  if (shipments.length > 0) {
                    addItemToShipment(
                      shipments[0].id,
                      selectedItemForSplit.itemId,
                      splitQuantity
                    );
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add to {shipments[0]?.name || "Shipment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSplitter;
