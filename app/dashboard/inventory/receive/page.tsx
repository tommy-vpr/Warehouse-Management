"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Box,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
  transactionType: string;
  notes?: string;
}

// API functions
const fetchProductByBarcode = async (
  barcode: string
): Promise<ProductVariant> => {
  const response = await fetch(
    `/api/inventory/product/lookup?barcode=${encodeURIComponent(barcode)}`
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Product not found");
  }
  return response.json();
};

const fetchLocationByBarcode = async (barcode: string): Promise<Location> => {
  const response = await fetch(
    `/api/inventory/location/lookup?barcode=${encodeURIComponent(barcode)}`
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Location not found");
  }
  return response.json();
};

const submitBatchReceiving = async (items: ReceivedItem[]) => {
  const response = await fetch("/api/inventory/receive/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((item) => ({
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
        transactionType: item.transactionType,
        notes: item.notes,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to receive items");
  }

  return response.json();
};

export default function SchemaEnhancedReceiving() {
  const queryClient = useQueryClient();
  const [isComponentReady, setIsComponentReady] = useState(false);

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
  const [transactionType, setTransactionType] = useState("PO_RECEIVING");
  const [notes, setNotes] = useState("");

  // Batch receiving
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);

  // UI state
  const [error, setError] = useState("");

  const quantityInputRef = useRef<HTMLInputElement>(null);
  const [stopStream, setStopStream] = useState(false);

  // Component ready check
  useEffect(() => {
    setIsComponentReady(true);
  }, []);

  // Product lookup mutation
  const productLookupMutation = useMutation({
    mutationFn: fetchProductByBarcode,
    onSuccess: (product) => {
      console.log("[DEBUG] Scanned Product:", product);
      setCurrentProduct(product);
      setCurrentStep("location");
      setScannerTarget("location");
      setShowScanner(false);
      setError("");
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Location lookup mutation
  const locationLookupMutation = useMutation({
    mutationFn: fetchLocationByBarcode,
    onSuccess: (location) => {
      if (!location.isReceivable) {
        setError("This location is not configured for receiving");
        return;
      }

      setCurrentLocation(location);
      setCurrentStep("quantity");
      setShowScanner(false);
      setError("");

      setTimeout(() => {
        if (quantityInputRef.current) {
          quantityInputRef.current.focus();
        }
      }, 100);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Batch receiving mutation
  const batchReceivingMutation = useMutation({
    mutationFn: submitBatchReceiving,
    onSuccess: (result) => {
      setReceivedItems([]);
      setError("");
      resetCurrentReceiving();
      toast({
        title: "✅ Success",
        description: `Successfully received ${result.results.length} items!`,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetCurrentReceiving = () => {
    setCurrentProduct(null);
    setCurrentLocation(null);
    setQuantity("");
    setTransactionType("PO_RECEIVING");
    setNotes("");
    setCurrentStep("product");
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setError("");

    if (scannerTarget === "product") {
      productLookupMutation.mutate(barcode);
    } else if (scannerTarget === "location") {
      locationLookupMutation.mutate(barcode);
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
      transactionType,
      notes: notes || undefined,
    };

    setReceivedItems((prev) => [...prev, newItem]);
    resetCurrentReceiving();
    setError("");
  };

  const handleFinalizeReceiving = () => {
    if (receivedItems.length === 0) {
      setError("No items to receive");
      return;
    }

    batchReceivingMutation.mutate(receivedItems);
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

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PO_RECEIVING: "PO Receiving",
      ASN_RECEIVING: "ASN Receiving",
      TRANSFER_RECEIVING: "Transfer Receiving",
      RETURNS: "Returns",
      ADJUSTMENT: "Adjustment",
      COUNT: "Count",
    };
    return labels[type] || type;
  };

  const handleCloseScanner = () => {
    setStopStream(true);
    setTimeout(() => setShowScanner(false), 100);
  };

  const isLoading =
    productLookupMutation.isPending ||
    locationLookupMutation.isPending ||
    batchReceivingMutation.isPending;

  // Show loading spinner while component initializes
  if (!isComponentReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-200">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="hidden">Receiving Progress</span>
            <div className="flex gap-2">
              <Badge
                className={`text-xs rounded-4xl px-2 py-1 ${
                  currentStep === "product"
                    ? "bg-green-600 border border-green-600 dark:bg-green-900/30 dark:text-green-500 "
                    : "text-gray-700 bg-transparent dark:text-gray-300"
                }`}
              >
                1. Product
              </Badge>
              <Badge
                className={`text-xs rounded-4xl px-2 py-1 ${
                  currentStep === "location"
                    ? "bg-green-600 border border-green-600 dark:bg-green-900/30 dark:text-green-500 "
                    : "text-gray-700 bg-transparent dark:text-gray-300"
                }`}
              >
                2. Location
              </Badge>
              <Badge
                className={`text-xs rounded-4xl px-2 py-1 ${
                  currentStep === "quantity"
                    ? "bg-green-600 border border-green-600 dark:bg-green-900/30 dark:text-green-500 "
                    : "text-gray-700 bg-transparent dark:text-gray-300"
                }`}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                >
                  {isLoading ? (
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                >
                  {isLoading ? (
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
                Enter Quantity, Type, and Notes
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
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleAddToReceiving}
                    disabled={!quantity || isLoading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Transaction Type
                  </label>
                  <Select
                    value={transactionType}
                    onValueChange={setTransactionType}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PO_RECEIVING">
                        PO Receiving (Supplier → Warehouse)
                      </SelectItem>
                      <SelectItem value="ASN_RECEIVING">
                        ASN Receiving (Supplier → Warehouse)
                      </SelectItem>
                      <SelectItem value="TRANSFER_RECEIVING">
                        Transfer Receiving (Warehouse → Warehouse)
                      </SelectItem>
                      <SelectItem value="RETURNS">
                        Returns / Reverse Logistics (Customer → Warehouse)
                      </SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                      <SelectItem value="COUNT">Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Notes (Optional)
                  </label>
                  <Textarea
                    placeholder="Add any notes about this receiving..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {currentProduct && currentLocation && quantity && (
                  <div className="p-3 bg-muted rounded border">
                    <p className="text-sm">
                      <strong>Adding:</strong> {quantity} units of{" "}
                      {currentProduct.sku} to {currentLocation.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Type: {getTransactionTypeLabel(transactionType)}
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
              <Button
                onClick={handleFinalizeReceiving}
                disabled={batchReceivingMutation.isPending}
              >
                {batchReceivingMutation.isPending ? (
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
                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
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
                      <Badge variant="outline" className="text-xs">
                        {getTransactionTypeLabel(item.transactionType)}
                      </Badge>
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
                    disabled={batchReceivingMutation.isPending}
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
        stopStream={stopStream}
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
