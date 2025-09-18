"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  ArrowLeft,
  Weight,
  CheckCircle,
  User,
  MapPin,
  AlertTriangle,
  Download,
  Printer,
  Truck,
  Plus,
  Minus,
  Box,
  Split,
  Move,
  Trash2,
} from "lucide-react";
import { useParams } from "next/navigation";

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  weight: number;
  dimensions?: any;
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

interface PackingInfo {
  totalWeight: number;
  totalVolume: number;
  suggestedBox: string;
  estimatedShippingCost: number;
}

interface PackageItem {
  itemId: string;
  productName: string;
  sku: string;
  quantity: number;
  weight: number;
}

interface PackageData {
  id: string;
  name: string;
  items: PackageItem[];
  packageCode: string;
  weight: number;
  length: number;
  width: number;
  height: number;
}

export default function PackingInterface() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [packingInfo, setPackingInfo] = useState<PackingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPacking, setIsPacking] = useState(false);
  const [isShipping, setIsShipping] = useState(false);

  // Package splitting state
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [showSplitView, setShowSplitView] = useState(false);

  // Dynamic ShipEngine data
  const [carriers, setCarriers] = useState<any[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState("");
  const [packageTypes, setPackageTypes] = useState<any[]>([]);

  // Packing form state
  const [packingNotes, setPackingNotes] = useState("");
  const [shippingLabels, setShippingLabels] = useState<any[]>([]);

  useEffect(() => {
    loadOrderDetails();
    loadCarriers();
  }, []);

  useEffect(() => {
    const carrier = carriers.find((c) => c.carrier_id === selectedCarrier);
    setServices(carrier?.services || []);
    setPackageTypes(carrier?.packages || []);
    setSelectedService("");
  }, [selectedCarrier, carriers]);

  // Initialize single package when order loads
  useEffect(() => {
    if (order && packages.length === 0) {
      const initialPackage: PackageData = {
        id: "pkg-1",
        name: "Package 1",
        items: order.items.map((item) => ({
          itemId: item.id,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          weight: item.weight * item.quantity,
        })),
        packageCode: "package",
        weight: order.items.reduce(
          (total, item) => total + item.weight * item.quantity,
          0
        ),
        length: 10,
        width: 8,
        height: 6,
      };
      setPackages([initialPackage]);
    }
  }, [order]);

  const loadOrderDetails = async () => {
    try {
      const response = await fetch(`/api/packing/pack/${id}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        setPackingInfo(data.packingInfo);
      }
    } catch (error) {
      console.error("Failed to load order:", error);
    }
    setIsLoading(false);
  };

  const loadCarriers = async () => {
    try {
      const res = await fetch("/api/carriers");
      if (res.ok) {
        const data = await res.json();
        setCarriers(data);
      }
    } catch (err) {
      console.error("Failed to load carriers:", err);
    }
  };

  // Package management functions
  const addPackage = () => {
    const newPackage: PackageData = {
      id: `pkg-${Date.now()}`,
      name: `Package ${packages.length + 1}`,
      items: [],
      packageCode: "package",
      weight: 0,
      length: 10,
      width: 8,
      height: 6,
    };
    setPackages([...packages, newPackage]);
  };

  const removePackage = (packageId: string) => {
    if (packages.length <= 1) return; // Keep at least one package

    const packageToRemove = packages.find((p) => p.id === packageId);
    if (!packageToRemove) return;

    // Move items back to first package
    const updatedPackages = packages.filter((p) => p.id !== packageId);
    if (packageToRemove.items.length > 0 && updatedPackages.length > 0) {
      updatedPackages[0].items.push(...packageToRemove.items);
      updatedPackages[0].weight = updatedPackages[0].items.reduce(
        (total, item) => total + item.weight,
        0
      );
    }

    setPackages(updatedPackages);
  };

  const moveItemToPackage = (
    itemId: string,
    fromPackageId: string,
    toPackageId: string,
    quantity: number
  ) => {
    setPackages((prevPackages) => {
      const newPackages = [...prevPackages];

      const fromPackage = newPackages.find((p) => p.id === fromPackageId);
      const toPackage = newPackages.find((p) => p.id === toPackageId);

      if (!fromPackage || !toPackage) return prevPackages;

      const itemIndex = fromPackage.items.findIndex(
        (item) => item.itemId === itemId
      );
      if (itemIndex === -1) return prevPackages;

      const item = fromPackage.items[itemIndex];
      const moveQuantity = Math.min(quantity, item.quantity);

      if (moveQuantity <= 0) return prevPackages;

      // Calculate weight per unit
      const weightPerUnit = item.weight / item.quantity;
      const moveWeight = weightPerUnit * moveQuantity;

      // Update from package
      if (moveQuantity === item.quantity) {
        fromPackage.items.splice(itemIndex, 1);
      } else {
        fromPackage.items[itemIndex] = {
          ...item,
          quantity: item.quantity - moveQuantity,
          weight: item.weight - moveWeight,
        };
      }
      fromPackage.weight = fromPackage.items.reduce(
        (total, item) => total + item.weight,
        0
      );

      // Update to package
      const existingItemIndex = toPackage.items.findIndex(
        (item) => item.itemId === itemId
      );
      if (existingItemIndex >= 0) {
        toPackage.items[existingItemIndex].quantity += moveQuantity;
        toPackage.items[existingItemIndex].weight += moveWeight;
      } else {
        toPackage.items.push({
          itemId: item.itemId,
          productName: item.productName,
          sku: item.sku,
          quantity: moveQuantity,
          weight: moveWeight,
        });
      }
      toPackage.weight = toPackage.items.reduce(
        (total, item) => total + item.weight,
        0
      );

      return newPackages;
    });
  };

  const updatePackageDetails = (
    packageId: string,
    field: string,
    value: any
  ) => {
    setPackages((prevPackages) =>
      prevPackages.map((pkg) =>
        pkg.id === packageId ? { ...pkg, [field]: value } : pkg
      )
    );
  };

  const createShippingLabels = async () => {
    if (!order || !selectedCarrier || !selectedService || packages.length === 0)
      return;

    setIsShipping(true);
    try {
      const payload = {
        orderId: order.id,
        carrierCode: selectedCarrier,
        serviceCode: selectedService,
        packages: packages.map((pkg) => ({
          packageCode: pkg.packageCode,
          weight: pkg.weight,
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
        })),
        shippingAddress: order.shippingAddress,
        notes: packingNotes || `Shipped in ${packages.length} package(s)`,
      };

      const response = await fetch("/api/shipping/shipengine/create-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create labels");
      }

      const data = await response.json();
      if (data.success && data.labels) {
        setShippingLabels(data.labels);
      }
    } catch (error) {
      console.error("Failed to create shipping labels:", error);
    }
    setIsShipping(false);
  };

  // UI States
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">
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

  if (shippingLabels.length > 0) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Order Packed & Shipped!
          </h2>
          <p className="text-green-700 mb-6">
            {order.orderNumber} has been shipped in {shippingLabels.length}{" "}
            package(s)
          </p>

          <div className="bg-white p-4 rounded-lg mb-6 text-left">
            <h3 className="font-semibold mb-2">Shipping Details:</h3>
            {shippingLabels.map((label, index) => (
              <div key={index} className="mb-2 pb-2 border-b last:border-b-0">
                <p className="text-sm">
                  Package {index + 1} - Tracking: {label.trackingNumber}
                </p>
                <p className="text-sm">Cost: ${label.cost}</p>
              </div>
            ))}
            <p className="text-sm">Service: {selectedService}</p>
          </div>

          <div className="space-y-3">
            {shippingLabels.map((label, index) => (
              <Button
                key={index}
                onClick={() => window.open(label.labelUrl, "_blank")}
                className="w-full"
                variant={index === 0 ? "default" : "outline"}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Label {index + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="w-full"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print All Labels
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/packing")}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pack Station
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
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
              <h1 className="text-2xl font-bold text-gray-900">Pack Order</h1>
              <p className="text-gray-600">{order.orderNumber}</p>
            </div>
          </div>
          <Button
            onClick={() => setShowSplitView(!showSplitView)}
            variant={showSplitView ? "default" : "outline"}
          >
            <Split className="w-4 h-4 mr-2" />
            {showSplitView ? "Simple View" : "Split Packages"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">{order.customerName}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.customerEmail}
                  </div>
                  <div className="pt-2">
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

            {!showSplitView && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Items to Pack ({order.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-gray-600">
                            SKU: {item.sku}
                          </div>
                          <div className="text-sm text-gray-600">
                            Weight: {item.weight} lbs each
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">×{item.quantity}</div>
                          <div className="text-sm text-gray-600">
                            ${item.totalPrice}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total Value:</span>
                      <span>${order.totalAmount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Package Splitting View */}
          {showSplitView && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Box className="w-5 h-5 mr-2" />
                    Packages ({packages.length})
                  </CardTitle>
                  <Button onClick={addPackage} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Package
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {packages.map((pkg, pkgIndex) => (
                    <div key={pkg.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{pkg.name}</h4>
                        {packages.length > 1 && (
                          <Button
                            onClick={() => removePackage(pkg.id)}
                            size="sm"
                            variant="outline"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2 mb-3">
                        {pkg.items.map((item) => (
                          <div
                            key={`${pkg.id}-${item.itemId}`}
                            className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                          >
                            <div>
                              <div className="font-medium">
                                {item.productName}
                              </div>
                              <div className="text-gray-600">{item.sku}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span>×{item.quantity}</span>
                              <span>{item.weight.toFixed(1)} lbs</span>
                              {packages.length > 1 && (
                                <select
                                  onChange={(e) => {
                                    const toPackageId = e.target.value;
                                    if (toPackageId && toPackageId !== pkg.id) {
                                      moveItemToPackage(
                                        item.itemId,
                                        pkg.id,
                                        toPackageId,
                                        1
                                      );
                                    }
                                  }}
                                  className="text-xs border rounded px-1"
                                >
                                  <option value="">Move to...</option>
                                  {packages
                                    .filter((p) => p.id !== pkg.id)
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                </select>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Total Weight:</span>
                          <div className="font-medium">
                            {pkg.weight.toFixed(1)} lbs
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Items:</span>
                          <div className="font-medium">
                            {pkg.items.reduce(
                              (sum, item) => sum + item.quantity,
                              0
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Shipping Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="w-5 h-5 mr-2" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {packingInfo && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Est. Weight:</span>
                      <div className="font-medium">
                        {packingInfo.totalWeight.toFixed(1)} lbs
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Packages:</span>
                      <div className="font-medium">{packages.length}</div>
                    </div>
                  </div>
                )}

                {/* Carrier */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Carrier:
                  </label>
                  <select
                    value={selectedCarrier}
                    onChange={(e) => setSelectedCarrier(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select Carrier</option>
                    {carriers.map((c) => (
                      <option key={c.carrier_id} value={c.carrier_id}>
                        {c.friendly_name || c.carrier_code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service */}
                {services.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Shipping Service:
                    </label>
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select Service</option>
                      {services.map((s) => (
                        <option key={s.service_code} value={s.service_code}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Package Details for each package */}
                {showSplitView &&
                  packages.map((pkg, index) => (
                    <div key={pkg.id} className="border rounded-lg p-3">
                      <h4 className="font-medium mb-2">{pkg.name} Details</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            Package Type:
                          </label>
                          <select
                            value={pkg.packageCode}
                            onChange={(e) =>
                              updatePackageDetails(
                                pkg.id,
                                "packageCode",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-sm border rounded"
                          >
                            {packageTypes.map((p) => (
                              <option
                                key={p.package_code}
                                value={p.package_code}
                              >
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            Weight (lbs):
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            value={pkg.weight}
                            onChange={(e) =>
                              updatePackageDetails(
                                pkg.id,
                                "weight",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            Length (in):
                          </label>
                          <Input
                            type="number"
                            value={pkg.length}
                            onChange={(e) =>
                              updatePackageDetails(
                                pkg.id,
                                "length",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            Width (in):
                          </label>
                          <Input
                            type="number"
                            value={pkg.width}
                            onChange={(e) =>
                              updatePackageDetails(
                                pkg.id,
                                "width",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Packing Notes (Optional):
                  </label>
                  <textarea
                    value={packingNotes}
                    onChange={(e) => setPackingNotes(e.target.value)}
                    placeholder="Special instructions..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={createShippingLabels}
                disabled={isShipping || !selectedCarrier || !selectedService}
                className="w-full h-12 text-lg"
              >
                {isShipping
                  ? "Creating Labels..."
                  : `Create ${packages.length} Shipping Label${
                      packages.length > 1 ? "s" : ""
                    }`}
              </Button>
              <p className="text-sm text-gray-600 text-center">
                This will create shipping labels for {packages.length} package
                {packages.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
