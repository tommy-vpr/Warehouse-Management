"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import {
  Camera,
  Package,
  MapPin,
  Plus,
  Check,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Barcode,
  Building2,
  Box,
} from "lucide-react";

import { toast } from "@/hooks/use-toast";

interface ProductVariant {
  id: string;
  sku: string;
  upc?: string;
  barcode?: string;
  name: string;
  productName: string;
  category?: string;
  brand?: string;
  supplier?: string;
  inventory: {
    locationId: string;
    locationName: string;
    quantityOnHand: number;
    quantityReserved: number;
  }[];
}

interface Location {
  id: string;
  name: string;
  type:
    | "RECEIVING"
    | "STORAGE"
    | "PICKING"
    | "PACKING"
    | "SHIPPING"
    | "RETURNS"
    | "GENERAL";
  zone?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
  isReceivable: boolean;
  currentInventory: {
    productVariantId: string;
    sku: string;
    productName: string;
    quantityOnHand: number;
    quantityReserved: number;
  }[];
}

interface ReceivedItem {
  id: string;
  productVariant: ProductVariant;
  location: Location;
  quantityReceived: number;
  notes?: string;
}

export default function SchemaEnhancedReceiving() {
  const [currentStep, setCurrentStep] = useState<
    "product" | "location" | "quantity"
  >("product");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<"product" | "location">(
    "product"
  );

  // Current receiving state
  const [currentProduct, setCurrentProduct] = useState<ProductVariant | null>(
    null
  );
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  // Batch receiving
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const quantityInputRef = useRef<HTMLInputElement>(null);

  const [stopStream, setStopStream] = useState(false);

  const resetCurrentReceiving = () => {
    setCurrentProduct(null);
    setCurrentLocation(null);
    setQuantity("");
    setNotes("");
    setCurrentStep("product");
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setLoading(true);
    setError("");

    try {
      if (scannerTarget === "product") {
        const response = await fetch(
          `/api/inventory/product/lookup?barcode=${encodeURIComponent(barcode)}`
        );

        if (response.ok) {
          const product = await response.json();
          console.log("[DEBUG] Scanned Product:", product); // ← ADD THIS LINE

          setCurrentProduct(product);
          setCurrentStep("location");
          setScannerTarget("location");
          setShowScanner(false);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Product not found");
        }
      } else if (scannerTarget === "location") {
        const response = await fetch(
          `/api/inventory/location/lookup?barcode=${encodeURIComponent(
            barcode
          )}`
        );

        if (response.ok) {
          const location = await response.json();

          if (!location.isReceivable) {
            setError("This location is not configured for receiving");
            return;
          }

          setCurrentLocation(location);
          setCurrentStep("quantity");
          setShowScanner(false);

          // Auto-focus quantity input
          setTimeout(() => {
            if (quantityInputRef.current) {
              quantityInputRef.current.focus();
            }
          }, 100);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Location not found");
        }
      }
    } catch (error) {
      console.error("Barcode scan error:", error);
      setError("Error processing barcode scan");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToReceiving = () => {
    if (!currentProduct || !currentLocation || !quantity) {
      setError("Please complete all required fields");
      return;
    }

    const quantityNum = parseInt(quantity);
    if (quantityNum <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    const newItem: ReceivedItem = {
      id: Date.now().toString(),
      productVariant: currentProduct,
      location: currentLocation,
      quantityReceived: quantityNum,
      notes: notes || undefined,
    };

    setReceivedItems((prev) => [...prev, newItem]);
    resetCurrentReceiving();
    setError("");
  };

  const handleFinalizeReceiving = async () => {
    if (receivedItems.length === 0) {
      setError("No items to receive");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/inventory/receive/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: receivedItems.map((item) => ({
            productVariant: {
              id: item.productVariant.id,
              sku: item.productVariant.sku,
              name: item.productVariant.name,
            },
            location: {
              id: item.location.id,
              name: item.location.name,
            },
            quantityReceived: item.quantityReceived,
            notes: item.notes,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setReceivedItems([]);
        setError("");
        toast({
          title: "✅ Success",
          description: `Successfully received ${result.results.length} items!`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to receive items",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Finalize receiving error:", error);
      setError("Error finalizing receiving");
    } finally {
      resetCurrentReceiving();
      setLoading(false);
    }
  };

  const removeReceivedItem = (itemId: string) => {
    setReceivedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const getLocationTypeColor = (type: string) => {
    const colors = {
      RECEIVING: "bg-blue-100 text-blue-800",
      STORAGE: "bg-green-100 text-green-800",
      PICKING: "bg-purple-100 text-purple-800",
      PACKING: "bg-orange-100 text-orange-800",
      SHIPPING: "bg-red-100 text-red-800",
      RETURNS: "bg-yellow-100 text-yellow-800",
      GENERAL: "bg-gray-100 text-gray-800",
    };
    return colors[type as keyof typeof colors] || colors.GENERAL;
  };

  const handleCancelReceiving = () => {
    // reset in-progress fields
    resetCurrentReceiving();
    setReceivedItems([]); // clear batch (optional — or ask confirm)
    setError("");
    setShowScanner(false); // close scanner + release camera
  };

  const handleCloseScanner = () => {
    setStopStream(true);
    setTimeout(() => setShowScanner(false), 100); // delay unmount one tick
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="hidden">Receiving Progress</span>
            <div className="flex gap-2">
              <Badge
                variant={currentStep === "product" ? "default" : "secondary"}
              >
                1. Product
              </Badge>
              <Badge
                variant={currentStep === "location" ? "default" : "secondary"}
              >
                2. Location
              </Badge>
              <Badge
                variant={currentStep === "quantity" ? "default" : "secondary"}
              >
                3. Quantity
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-red-600">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError("")}
                className="ml-auto"
              >
                ✕
              </Button>
            </div>
          )}

          {/* Step 1: Product Scanning */}
          {currentStep === "product" && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Scan or Enter Product
              </h4>
              <div className="flex gap-3">
                <Input
                  placeholder="Scan barcode, UPC, or enter SKU"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = (e.target as HTMLInputElement).value;
                      if (value.trim()) {
                        handleBarcodeScanned(value.trim());
                      }
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setScannerTarget("product");
                    setStopStream(false);
                    setShowScanner(true);
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {currentProduct && (
                <div className="p-4 bg-green-50 rounded border border-green-200">
                  <p className="text-green-800 text-sm mb-3">
                    ✅ <strong>Product found:</strong>{" "}
                    {currentProduct.productName} ({currentProduct.sku})
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-green-800">
                      {currentProduct.productName}
                    </h5>
                    <Badge>{currentProduct.sku}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-green-600">
                    {currentProduct.category && (
                      <div>
                        <span className="font-medium">Category:</span>{" "}
                        {currentProduct.category}
                      </div>
                    )}
                    {currentProduct.brand && (
                      <div>
                        <span className="font-medium">Brand:</span>{" "}
                        {currentProduct.brand}
                      </div>
                    )}
                    {currentProduct.supplier && (
                      <div>
                        <span className="font-medium">Supplier:</span>{" "}
                        {currentProduct.supplier}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Current Locations:</span>{" "}
                      {currentProduct.inventory.length}
                    </div>
                  </div>

                  {/* Show current inventory levels */}
                  {currentProduct.inventory.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-green-700 mb-2">
                        Current Inventory:
                      </p>
                      <div className="space-y-1">
                        {currentProduct.inventory
                          .slice(0, 3)
                          .map((inv, idx) => (
                            <div
                              key={idx}
                              className="text-xs text-green-600 flex justify-between"
                            >
                              <span>{inv.locationName}</span>
                              <span>{inv.quantityOnHand} on hand</span>
                            </div>
                          ))}
                        {currentProduct.inventory.length > 3 && (
                          <div className="text-xs text-green-600">
                            + {currentProduct.inventory.length - 3} more
                            locations
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Location Scanning */}
          {currentStep === "location" && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                Scan Destination Location
              </h4>
              <div className="flex gap-3">
                <Input
                  placeholder="Scan location barcode or enter location code"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = (e.target as HTMLInputElement).value;
                      if (value.trim()) {
                        handleBarcodeScanned(value.trim());
                      }
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setScannerTarget("location");
                    setStopStream(false);
                    setShowScanner(true);
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {currentLocation && (
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-blue-800">
                      {currentLocation.name}
                    </h5>
                    <Badge
                      className={getLocationTypeColor(currentLocation.type)}
                    >
                      {currentLocation.type}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-blue-600">
                    {currentLocation.zone && (
                      <div>
                        <span className="font-medium">Zone:</span>{" "}
                        {currentLocation.zone}
                      </div>
                    )}
                    {currentLocation.aisle && (
                      <div>
                        <span className="font-medium">Aisle:</span>{" "}
                        {currentLocation.aisle}
                      </div>
                    )}
                    {currentLocation.shelf && (
                      <div>
                        <span className="font-medium">Shelf:</span>{" "}
                        {currentLocation.shelf}
                      </div>
                    )}
                    {currentLocation.bin && (
                      <div>
                        <span className="font-medium">Bin:</span>{" "}
                        {currentLocation.bin}
                      </div>
                    )}
                  </div>

                  {currentLocation.currentInventory.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-blue-700 mb-2">
                        Current Items:
                      </p>
                      <div className="space-y-1">
                        {currentLocation.currentInventory
                          .slice(0, 3)
                          .map((inv, idx) => (
                            <div
                              key={idx}
                              className="text-xs text-blue-600 flex justify-between"
                            >
                              <span>{inv.sku}</span>
                              <span>{inv.quantityOnHand} units</span>
                            </div>
                          ))}
                        {currentLocation.currentInventory.length > 3 && (
                          <div className="text-xs text-blue-600">
                            + {currentLocation.currentInventory.length - 3} more
                            items
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Quantity Entry */}
          {currentStep === "quantity" && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <Box className="w-4 h-4 mr-2" />
                Enter Quantity and Notes
              </h4>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Input
                    ref={quantityInputRef}
                    type="number"
                    placeholder="Quantity received"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                  />
                  <Button
                    onClick={handleAddToReceiving}
                    disabled={!quantity || loading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                <Input
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                {/* Summary of what's being added */}
                {currentProduct && currentLocation && quantity && (
                  <div className="p-3 bg-background rounded border">
                    <p className="text-sm">
                      <strong>Adding:</strong> {quantity} units of{" "}
                      {currentProduct.sku} to {currentLocation.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Received Items List */}
      {receivedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Items to Receive ({receivedItems.length})</span>
              <Button onClick={handleFinalizeReceiving} disabled={loading}>
                {loading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Finalize Receiving
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {receivedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-medium">
                        {item.productVariant.productName}
                      </h5>
                      <Badge variant="outline">{item.productVariant.sku}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {item.location.name}
                        <Badge
                          className={`ml-2 ${getLocationTypeColor(
                            item.location.type
                          )}`}
                        >
                          {item.location.type}
                        </Badge>
                      </div>
                      <div className="flex items-center">
                        <Package className="w-3 h-3 mr-1" />
                        {item.quantityReceived} units
                      </div>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-500 mt-1">
                        Notes: {item.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeReceivedItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={handleCloseScanner}
        onScan={handleBarcodeScanned}
        stopStream={stopStream} // <-- NEW
        title={
          scannerTarget === "product"
            ? "Scan Product Barcode"
            : "Scan Location Barcode"
        }
        placeholder={
          scannerTarget === "product"
            ? "Point camera at product barcode/UPC"
            : "Point camera at location barcode"
        }
      />
    </div>
  );
}
