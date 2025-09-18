"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Loader2,
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

interface PackageInput {
  packageCode: string;
  weight: string;
  length: string;
  width: string;
  height: string;
}

export default function PackingInterface() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [packingInfo, setPackingInfo] = useState<PackingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPacking, setIsPacking] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [isCarriersLoading, setIsCarriersLoading] = useState(true);

  // Error states
  const [error, setError] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Dynamic ShipEngine data
  const [carriers, setCarriers] = useState<any[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [selectedCarrierCode, setSelectedCarrierCode] = useState("");

  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState("");
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState("");

  // Packing form state
  const [actualWeight, setActualWeight] = useState("");
  const [dimensions, setDimensions] = useState({
    length: "10",
    width: "8",
    height: "6",
  });
  const [packingNotes, setPackingNotes] = useState("");
  const [shippingLabel, setShippingLabel] = useState<any>(null);

  const [packagesList, setPackagesList] = useState<PackageInput[]>([
    { packageCode: "", weight: "", length: "10", width: "8", height: "6" },
  ]);

  const [numPackages, setNumPackages] = useState(1);

  useEffect(() => {
    loadOrderDetails();
    loadCarriers();
  }, []);

  const loadOrderDetails = async () => {
    try {
      setError("");
      const response = await fetch(`/api/shipping/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setOrder(data.order);
      setPackingInfo(data.packingInfo);

      if (data.packingInfo?.totalWeight) {
        setActualWeight(data.packingInfo.totalWeight.toString());
      }
    } catch (error) {
      console.error("Failed to load order:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load order details";
      setError(errorMessage);
    }
    setIsLoading(false);
  };

  const loadCarriers = async () => {
    try {
      const res = await fetch("/api/carriers");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to load carriers");
      }
      const data = await res.json();
      setCarriers(data);
    } catch (err) {
      console.error("Failed to load carriers:", err);
      setError("Failed to load shipping carriers. Please refresh the page.");
    }
    setIsCarriersLoading(false);
  };

  const handleCarrierChange = (carrierId: string) => {
    setSelectedCarrier(carrierId);
    const carrier = carriers.find((c) => c.carrier_id === carrierId);
    setSelectedCarrierCode(carrier?.carrier_code || ""); // Store the actual carrier code
    console.log("carrier changed:", selectedCarrier);
    console.log("carrier code changed:", selectedCarrierCode);
  };

  // Update services and packages when carrier changes
  useEffect(() => {
    const carrier = carriers.find((c) => c.carrier_id === selectedCarrier);
    setServices(carrier?.services || []);
    setPackages(carrier?.packages || []);
    setSelectedService("");
    setSelectedPackage("");
  }, [selectedCarrier, carriers]);

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!selectedCarrier) errors.carrier = "Please select a carrier";
    if (!selectedService) errors.service = "Please select a shipping service";
    if (!selectedPackage) errors.package = "Please select a package type";

    const weight = parseFloat(actualWeight);
    if (!actualWeight || isNaN(weight) || weight <= 0) {
      errors.weight = "Please enter a valid weight greater than 0";
    }

    const length = parseFloat(dimensions.length);
    const width = parseFloat(dimensions.width);
    const height = parseFloat(dimensions.height);

    if (isNaN(length) || length <= 0)
      errors.length = "Length must be greater than 0";
    if (isNaN(width) || width <= 0)
      errors.width = "Width must be greater than 0";
    if (isNaN(height) || height <= 0)
      errors.height = "Height must be greater than 0";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const completePacking = async () => {
    if (!order || !validateForm()) return;

    setIsPacking(true);
    setError("");

    try {
      const response = await fetch("/api/packing/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          boxType: selectedPackage,
          actualWeight: parseFloat(actualWeight),
          shippingService: selectedService,
          carrierCode: selectedCarrier,
          notes: packingNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete packing");
      }

      await createShippingLabel();
    } catch (error) {
      console.error("Failed to complete packing:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to complete packing";
      setError(errorMessage);
    }
    setIsPacking(false);
  };

  const createShippingLabel = async () => {
    if (!order || !validateForm()) return;

    setIsShipping(true);
    setError("");

    try {
      const payload = {
        orderId: order.id,
        carrierCode: selectedCarrierCode, // Use carrier_code instead of carrier_id
        serviceCode: selectedService,
        packages: [
          {
            packageCode: selectedPackage, // This should remain as selected
            weight: parseFloat(actualWeight),
            length: parseFloat(dimensions.length),
            width: parseFloat(dimensions.width),
            height: parseFloat(dimensions.height),
          },
        ],
        shippingAddress: order.shippingAddress,
        notes: packingNotes || `Packed with ${selectedPackage}`,
      };

      console.log("Label payload: ", payload);

      const response = await fetch("/api/shipping/shipengine/create-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create shipping label");
      }

      const data = await response.json();
      if (data.success && data.label) {
        setShippingLabel(data.label);
      } else {
        throw new Error("Invalid response from shipping service");
      }
    } catch (error) {
      console.error("Failed to create shipping label:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create shipping label";
      setError(errorMessage);
    }
    setIsShipping(false);
  };

  // Safe address rendering
  const renderAddress = (address: any) => {
    if (!address) return <p className="text-gray-500">No address provided</p>;

    return (
      <div className="text-sm">
        <div>{address.address1 || "Address not available"}</div>
        {address.address2 && <div>{address.address2}</div>}
        <div>
          {address.city || "City"},{" "}
          {address.province || address.state || "State"}{" "}
          {address.zip || address.postalCode || ""}
        </div>
        <div>{address.country || "Country"}</div>
      </div>
    );
  };

  // --- UI States ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            variant="outline"
            className="mr-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button onClick={loadOrderDetails}>Try Again</Button>
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

  if (shippingLabel) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Order Packed & Shipped!
          </h2>
          <p className="text-green-700 mb-6">
            {order.orderNumber} has been shipped
          </p>

          <div className="bg-white p-4 rounded-lg mb-6 text-left">
            <h3 className="font-semibold mb-2">Shipping Details:</h3>
            <p className="text-sm">Tracking: {shippingLabel.trackingNumber}</p>
            <p className="text-sm">Cost: ${shippingLabel.cost}</p>
            <p className="text-sm">Service: {selectedService}</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => window.open(shippingLabel.labelUrl, "_blank")}
              className="w-full"
              disabled={!shippingLabel.labelUrl}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Label
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="w-full"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Label
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

  // --- Main Packing UI ---
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
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

        {/* Error Display */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      {renderAddress(order.shippingAddress)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Items to Pack ({order.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items?.map((item) => (
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
          </div>

          {/* Packing Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Weight className="w-5 h-5 mr-2" />
                  Packing Information
                  {isCarriersLoading && (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  )}
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
                      <span className="text-gray-500">Est. Ship Cost:</span>
                      <div className="font-medium">
                        ${packingInfo.estimatedShippingCost.toFixed(2)}
                      </div>
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
                    onChange={(e) => handleCarrierChange(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md ${
                      validationErrors.carrier ? "border-red-500" : ""
                    }`}
                    disabled={isCarriersLoading}
                  >
                    <option value="">
                      {isCarriersLoading
                        ? "Loading carriers..."
                        : "Select Carrier"}
                    </option>
                    {carriers.map((c) => (
                      <option key={c.carrier_id} value={c.carrier_id}>
                        {c.friendly_name || c.carrier_code}
                      </option>
                    ))}
                  </select>
                  {validationErrors.carrier && (
                    <p className="text-sm text-red-600 mt-1">
                      {validationErrors.carrier}
                    </p>
                  )}
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
                      className={`w-full px-3 py-2 border rounded-md ${
                        validationErrors.service ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">Select Service</option>
                      {services.map((s) => (
                        <option key={s.service_code} value={s.service_code}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.service && (
                      <p className="text-sm text-red-600 mt-1">
                        {validationErrors.service}
                      </p>
                    )}
                  </div>
                )}

                {/* Package */}
                {packages.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Package Type:
                    </label>
                    <select
                      value={selectedPackage}
                      onChange={(e) => setSelectedPackage(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md ${
                        validationErrors.package ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">Select Package</option>
                      {packages.map((p) => (
                        <option key={p.package_code} value={p.package_code}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.package && (
                      <p className="text-sm text-red-600 mt-1">
                        {validationErrors.package}
                      </p>
                    )}
                  </div>
                )}

                {/* Weight */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Actual Weight (lbs):
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={actualWeight}
                    onChange={(e) => setActualWeight(e.target.value)}
                    placeholder="Enter actual weight"
                    className={validationErrors.weight ? "border-red-500" : ""}
                  />
                  {validationErrors.weight && (
                    <p className="text-sm text-red-600 mt-1">
                      {validationErrors.weight}
                    </p>
                  )}
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Package Dimensions (inches):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={dimensions.length}
                        onChange={(e) =>
                          setDimensions({
                            ...dimensions,
                            length: e.target.value,
                          })
                        }
                        placeholder="Length"
                        className={
                          validationErrors.length ? "border-red-500" : ""
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">Length</p>
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={dimensions.width}
                        onChange={(e) =>
                          setDimensions({
                            ...dimensions,
                            width: e.target.value,
                          })
                        }
                        placeholder="Width"
                        className={
                          validationErrors.width ? "border-red-500" : ""
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">Width</p>
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={dimensions.height}
                        onChange={(e) =>
                          setDimensions({
                            ...dimensions,
                            height: e.target.value,
                          })
                        }
                        placeholder="Height"
                        className={
                          validationErrors.height ? "border-red-500" : ""
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">Height</p>
                    </div>
                  </div>
                </div>

                {/* Number of Packages */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Number of Packages:
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={numPackages}
                    onChange={(e) =>
                      setNumPackages(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    placeholder="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    All packages will use the same weight and dimensions.
                  </p>
                </div>

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
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {packingNotes.length}/500 characters
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={completePacking}
                disabled={
                  isPacking ||
                  isShipping ||
                  isCarriersLoading ||
                  !selectedCarrier ||
                  !selectedService ||
                  !selectedPackage ||
                  !actualWeight ||
                  parseFloat(actualWeight) <= 0
                }
                className="w-full h-12 text-lg"
              >
                {isPacking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Packing...
                  </>
                ) : isShipping ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Label...
                  </>
                ) : (
                  "Pack & Ship Order"
                )}
              </Button>
              <p className="text-sm text-gray-600 text-center">
                This will mark the order as packed and create a shipping label
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
