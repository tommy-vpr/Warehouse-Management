// app/dashboard/warehouse/returns/inspect/[rmaNumber]/client.tsx
// Mobile-optimized inspection interface for returned items with batch-splitting support

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type ReturnCondition =
  | "NEW_UNOPENED"
  | "NEW_OPENED"
  | "LIKE_NEW"
  | "GOOD"
  | "FAIR"
  | "POOR"
  | "DEFECTIVE"
  | "DAMAGED"
  | "EXPIRED"
  | "MISSING_PARTS";

type ReturnDisposition =
  | "RESTOCK"
  | "DISPOSE"
  | "REPAIR"
  | "VENDOR_RETURN"
  | "QUARANTINE";

interface ReturnItem {
  id: string;
  productVariantId: string;
  quantityRequested: number;
  quantityReceived: number;
  unitPrice: number; // Decimal from database
  refundAmount: number; // Decimal from database
  status: string;
  productVariant: {
    sku: string;
    name: string;
    upc?: string;
  };
}

interface Location {
  id: string;
  name: string;
  barcode?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
  quantityOnHand?: number; // From inventory records
}

interface Inspection {
  quantity: number;
  condition: ReturnCondition;
  disposition: ReturnDisposition;
  conditionNotes?: string;
  dispositionNotes?: string;
  restockLocationId?: string;
  photoUrls?: string[];
}

export default function InspectionClient({ rmaNumber }: { rmaNumber: string }) {
  const router = useRouter();

  const [returnOrder, setReturnOrder] = useState<any>(null);
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [quantityReceived, setQuantityReceived] = useState(0);
  const [inspections, setInspections] = useState<Inspection[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{
    type: "success" | "error" | null;
    message: string;
  } | null>(null);
  const [estimatedRefund, setEstimatedRefund] = useState(0);

  const currentItem = items[currentItemIndex];
  const progress =
    items.length > 0 ? ((currentItemIndex + 1) / items.length) * 100 : 0;

  // ---------- Fetch Data ----------
  useEffect(() => {
    fetchReturnDetails();
  }, [rmaNumber]);

  // Fetch locations when current item changes
  useEffect(() => {
    if (currentItem) {
      fetchLocationsForItem(currentItem.productVariant.sku);
    }
  }, [currentItem]);

  const fetchReturnDetails = async () => {
    try {
      const response = await fetch(`/api/returns/${rmaNumber}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch return: ${response.statusText}`);
      }
      const data = await response.json();
      setReturnOrder(data);
      setItems(data.items);

      if (data.items.length > 0) {
        const first = data.items[0];
        setQuantityReceived(first.quantityRequested);
        setInspections([
          {
            quantity: first.quantityRequested,
            condition: "GOOD",
            disposition: "RESTOCK",
          },
        ]);
      }
    } catch (err: any) {
      console.error("Error fetching return details:", err);
      setError(err.message || "Failed to load return details");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationsForItem = async (sku: string) => {
    setLocationsLoading(true);
    try {
      // Fetch inventory locations for this specific SKU
      const response = await fetch(`/api/inventory/locations?sku=${sku}`);
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
        console.log(`📍 Found ${data.length} locations for SKU ${sku}`);
      } else {
        console.warn(
          "No locations found for SKU, falling back to all locations"
        );
        // Fallback to all storage locations if no inventory found
        const fallbackResponse = await fetch(
          "/api/locations?type=STORAGE,PICKING"
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setLocations(fallbackData);
        }
      }
    } catch (err) {
      console.error("Failed to load locations:", err);
      // Try fallback
      try {
        const fallbackResponse = await fetch(
          "/api/locations?type=STORAGE,PICKING"
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setLocations(fallbackData);
        }
      } catch (fallbackErr) {
        console.error("Fallback location fetch also failed");
      }
    } finally {
      setLocationsLoading(false);
    }
  };

  // ---------- Inspection Utilities ----------
  const updateInspection = (index: number, updates: Partial<Inspection>) => {
    setInspections((prev) =>
      prev.map((insp, i) => (i === index ? { ...insp, ...updates } : insp))
    );
  };

  const removeInspection = (index: number) => {
    setInspections((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- Barcode Logic ----------
  const handleBarcodeScanned = (barcode: string) => {
    if (!currentItem) return;
    if (
      barcode === currentItem.productVariant.sku ||
      barcode === currentItem.productVariant.upc
    ) {
      setAlertState({ type: "success", message: "Barcode verified!" });
    } else {
      setAlertState({
        type: "error",
        message: "Barcode does not match expected item",
      });
    }
    setBarcodeInput("");
    setTimeout(() => setAlertState(null), 4500);
  };

  // ---------- Refund Calculation ----------
  useEffect(() => {
    if (!currentItem) return;

    const refundRates: Record<ReturnCondition, number> = {
      NEW_UNOPENED: 1.0,
      NEW_OPENED: 0.85,
      LIKE_NEW: 0.85,
      GOOD: 0.75,
      FAIR: 0.5,
      POOR: 0.5,
      DEFECTIVE: 1.0,
      DAMAGED: 1.0,
      EXPIRED: 1.0,
      MISSING_PARTS: 0.5,
    };

    // Get actual unit price from current item
    const unitPrice = Number(currentItem.unitPrice) || 0;

    const total = inspections.reduce((sum, i) => {
      const rate = refundRates[i.condition] || 0;
      return sum + unitPrice * i.quantity * rate;
    }, 0);

    setEstimatedRefund(total);
  }, [inspections, currentItem]);

  // ---------- Submit Handler ----------
  const handleInspectItem = async () => {
    if (!currentItem) return;

    const totalQty = inspections.reduce((sum, i) => sum + i.quantity, 0);
    if (totalQty !== quantityReceived) {
      setError(
        `Total inspection quantities (${totalQty}) must equal received quantity (${quantityReceived})`
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        returnItemId: currentItem.id,
        inspections,
      };

      console.log("📤 Submitting inspection:", payload);

      const response = await fetch(`/api/returns/${rmaNumber}/inspect-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save inspection");
      }

      console.log("✅ Inspection saved:", result);

      // Go to next item or summary
      if (currentItemIndex < items.length - 1) {
        const nextIndex = currentItemIndex + 1;
        const nextItem = items[nextIndex];
        setCurrentItemIndex(nextIndex);
        setQuantityReceived(nextItem.quantityRequested);
        setInspections([
          {
            quantity: nextItem.quantityRequested,
            condition: "GOOD",
            disposition: "RESTOCK",
          },
        ]);
        setBarcodeInput("");
        setLocations([]); // Reset locations - will be fetched by useEffect
      } else {
        // All items inspected - redirect to detail page or summary
        router.push(`/dashboard/returns/${rmaNumber}`);
      }
    } catch (err: any) {
      console.error("❌ Error saving inspection:", err);
      setError(err.message || "Failed to save inspection");
    } finally {
      setSaving(false);
    }
  };

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading inspection...
          </p>
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">No items to inspect</p>
      </div>
    );
  }

  const conditionOptions: Array<{
    value: ReturnCondition;
    label: string;
  }> = [
    { value: "NEW_UNOPENED", label: "New Unopened" },
    { value: "NEW_OPENED", label: "New Opened" },
    { value: "LIKE_NEW", label: "Like New" },
    { value: "GOOD", label: "Good" },
    { value: "FAIR", label: "Fair" },
    { value: "POOR", label: "Poor" },
    { value: "DEFECTIVE", label: "Defective" },
    { value: "DAMAGED", label: "Damaged" },
    { value: "EXPIRED", label: "Expired" },
    { value: "MISSING_PARTS", label: "Missing Parts" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Inspect Return
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {rmaNumber}
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Item {currentItemIndex + 1} of {items.length}
            </p>
          </div>
          <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Item Info */}
        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-lg shadow-sm dark:shadow-zinc-900/50 border border-gray-200 dark:border-zinc-700/50">
          <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
            {currentItem.productVariant.name}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            SKU: {currentItem.productVariant.sku}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Expected: {currentItem.quantityRequested} units
          </p>
        </div>

        {/* Barcode */}
        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-lg shadow-sm dark:shadow-zinc-900/50 border border-gray-200 dark:border-zinc-700/50">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Scan Product Barcode
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && barcodeInput)
                  handleBarcodeScanned(barcodeInput);
              }}
              placeholder="Scan or type barcode"
              className="flex-1 p-2 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => barcodeInput && handleBarcodeScanned(barcodeInput)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition"
            >
              Verify
            </button>
          </div>

          {alertState && (
            <div
              className={`mt-4 rounded-lg border p-4 ${
                alertState.type === "success"
                  ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900/50"
                  : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50"
              }`}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  {alertState.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3
                    className={`text-sm font-medium ${
                      alertState.type === "success"
                        ? "text-green-800 dark:text-green-200"
                        : "text-red-800 dark:text-red-200"
                    }`}
                  >
                    {alertState.type === "success" ? "Success" : "Warning"}
                  </h3>
                  <p
                    className={`mt-1 text-sm ${
                      alertState.type === "success"
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {alertState.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-lg shadow-sm dark:shadow-zinc-900/50 border border-gray-200 dark:border-zinc-700/50">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quantity Received
          </label>
          <input
            type="number"
            min="0"
            max={currentItem.quantityRequested}
            value={quantityReceived}
            onChange={(e) => setQuantityReceived(Number(e.target.value) || 0)}
            className="block w-full p-2 text-2xl text-center border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-center text-gray-500 dark:text-gray-400">
            Max: {currentItem.quantityRequested}
          </p>
        </div>

        {/* Split Batches */}
        <button
          onClick={() =>
            setInspections([
              ...inspections,
              { quantity: 0, condition: "GOOD", disposition: "RESTOCK" },
            ])
          }
          className="w-full mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium border border-gray-300 dark:border-zinc-600 rounded-md py-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
        >
          + Split Batch
        </button>

        {inspections.map((insp, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-2 mt-2 bg-gray-50 dark:bg-zinc-900/50 rounded-lg p-3 border border-gray-200 dark:border-zinc-700"
          >
            <input
              type="number"
              min={0}
              value={insp.quantity}
              onChange={(e) =>
                updateInspection(i, { quantity: Number(e.target.value) })
              }
              className="text-center border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 rounded p-2"
              placeholder="Qty"
            />
            <select
              value={insp.condition}
              onChange={(e) =>
                updateInspection(i, {
                  condition: e.target.value as ReturnCondition,
                })
              }
              className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 rounded p-2 text-sm"
            >
              {conditionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={insp.disposition}
              onChange={(e) =>
                updateInspection(i, {
                  disposition: e.target.value as ReturnDisposition,
                })
              }
              className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 rounded p-2 text-sm"
            >
              <option value="RESTOCK">Restock</option>
              <option value="DISPOSE">Dispose</option>
              <option value="REPAIR">Repair</option>
              <option value="VENDOR_RETURN">Vendor Return</option>
              <option value="QUARANTINE">Quarantine</option>
            </select>
            <button
              onClick={() => removeInspection(i)}
              className="text-red-500 dark:text-red-400 text-sm hover:text-red-700 dark:hover:text-red-300 transition"
            >
              ✕
            </button>

            {/* Restock Location */}
            {insp.disposition === "RESTOCK" && (
              <>
                <select
                  value={insp.restockLocationId || ""}
                  onChange={(e) =>
                    updateInspection(i, { restockLocationId: e.target.value })
                  }
                  className="col-span-4 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 rounded p-2 mt-2 text-sm"
                  disabled={locationsLoading}
                >
                  <option value="">
                    {locationsLoading
                      ? "Loading locations..."
                      : locations.length === 0
                      ? "No locations available"
                      : "Select location..."}
                  </option>
                  {locations.map((loc) => {
                    // Build location code (e.g., "A1-2-3")
                    const locCode = [loc.aisle, loc.shelf, loc.bin]
                      .filter(Boolean)
                      .join("-");

                    // Build display label
                    const label = [
                      loc.name,
                      locCode ? `(${locCode})` : null,
                      loc.quantityOnHand
                        ? `- ${loc.quantityOnHand} units`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <option key={loc.id} value={loc.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                {locations.length > 0 && (
                  <p className="col-span-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    📍 Showing locations with this SKU in stock
                  </p>
                )}
              </>
            )}

            {/* Notes */}
            <textarea
              placeholder="Notes..."
              value={insp.conditionNotes || ""}
              onChange={(e) =>
                updateInspection(i, { conditionNotes: e.target.value })
              }
              className="col-span-4 mt-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded p-2 text-sm"
            />
          </div>
        ))}

        {/* Estimated Refund */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-900/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Estimated Refund:
            </span>
            <span className="text-2xl font-bold text-blue-900 dark:text-blue-200">
              ${estimatedRefund.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleInspectItem}
          disabled={saving}
          className="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50 font-medium text-lg transition"
        >
          {saving
            ? "Saving..."
            : currentItemIndex < items.length - 1
            ? `Next Item (${items.length - currentItemIndex - 1} remaining)`
            : "Complete Inspection"}
        </button>
      </div>
    </div>
  );
}

// // app/dashboard/warehouse/returns/inspect/[rmaNumber]/client.tsx
// // Mobile-optimized inspection interface for returned items with batch-splitting support

// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
// import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// type ReturnCondition =
//   | "NEW_UNOPENED"
//   | "NEW_OPENED"
//   | "LIKE_NEW"
//   | "GOOD"
//   | "FAIR"
//   | "POOR"
//   | "DEFECTIVE"
//   | "DAMAGED"
//   | "EXPIRED"
//   | "MISSING_PARTS";

// type ReturnDisposition =
//   | "RESTOCK"
//   | "DISPOSE"
//   | "REPAIR"
//   | "VENDOR_RETURN"
//   | "QUARANTINE";

// interface ReturnItem {
//   id: string;
//   productVariantId: string;
//   quantityRequested: number;
//   quantityReceived: number;
//   status: string;
//   productVariant: {
//     sku: string;
//     name: string;
//     upc?: string;
//   };
// }

// interface Location {
//   id: string;
//   name: string;
//   barcode?: string;
// }

// interface Inspection {
//   quantity: number;
//   condition: ReturnCondition;
//   disposition: ReturnDisposition;
//   conditionNotes?: string;
//   dispositionNotes?: string;
//   restockLocationId?: string;
//   photoUrls?: string[];
// }

// export default function InspectionClient({ rmaNumber }: { rmaNumber: string }) {
//   const router = useRouter();

//   const [returnOrder, setReturnOrder] = useState<any>(null);
//   const [items, setItems] = useState<ReturnItem[]>([]);
//   const [currentItemIndex, setCurrentItemIndex] = useState(0);
//   const [locations, setLocations] = useState<Location[]>([]);

//   const [barcodeInput, setBarcodeInput] = useState("");
//   const [quantityReceived, setQuantityReceived] = useState(0);
//   const [inspections, setInspections] = useState<Inspection[]>([]);

//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [alertState, setAlertState] = useState<{
//     type: "success" | "error" | null;
//     message: string;
//   } | null>(null);
//   const [estimatedRefund, setEstimatedRefund] = useState(0);

//   const currentItem = items[currentItemIndex];
//   const progress =
//     items.length > 0 ? ((currentItemIndex + 1) / items.length) * 100 : 0;

//   // ---------- Fetch Data ----------
//   useEffect(() => {
//     fetchReturnDetails();
//     fetchLocations();
//   }, [rmaNumber]);

//   const fetchReturnDetails = async () => {
//     try {
//       const response = await fetch(`/api/returns/${rmaNumber}`);
//       if (!response.ok) {
//         throw new Error(`Failed to fetch return: ${response.statusText}`);
//       }
//       const data = await response.json();
//       setReturnOrder(data);
//       setItems(data.items);

//       if (data.items.length > 0) {
//         const first = data.items[0];
//         setQuantityReceived(first.quantityRequested);
//         setInspections([
//           {
//             quantity: first.quantityRequested,
//             condition: "GOOD",
//             disposition: "RESTOCK",
//           },
//         ]);
//       }
//     } catch (err: any) {
//       console.error("Error fetching return details:", err);
//       setError(err.message || "Failed to load return details");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchLocations = async () => {
//     try {
//       const response = await fetch("/api/locations?type=STORAGE,PICKING");
//       if (response.ok) {
//         const data = await response.json();
//         setLocations(data);
//       }
//     } catch (err) {
//       console.error("Failed to load locations:", err);
//     }
//   };

//   // ---------- Inspection Utilities ----------
//   const updateInspection = (index: number, updates: Partial<Inspection>) => {
//     setInspections((prev) =>
//       prev.map((insp, i) => (i === index ? { ...insp, ...updates } : insp))
//     );
//   };

//   const removeInspection = (index: number) => {
//     setInspections((prev) => prev.filter((_, i) => i !== index));
//   };

//   // ---------- Barcode Logic ----------
//   const handleBarcodeScanned = (barcode: string) => {
//     if (!currentItem) return;
//     if (
//       barcode === currentItem.productVariant.sku ||
//       barcode === currentItem.productVariant.upc
//     ) {
//       setAlertState({ type: "success", message: "✓ Barcode verified!" });
//     } else {
//       setAlertState({
//         type: "error",
//         message: "⚠️ Barcode does not match expected item",
//       });
//     }
//     setBarcodeInput("");
//     setTimeout(() => setAlertState(null), 3000);
//   };

//   // ---------- Refund Calculation ----------
//   useEffect(() => {
//     if (!currentItem) return;

//     const refundRates: Record<ReturnCondition, number> = {
//       NEW_UNOPENED: 1.0,
//       NEW_OPENED: 0.85,
//       LIKE_NEW: 0.85,
//       GOOD: 0.75,
//       FAIR: 0.5,
//       POOR: 0.5,
//       DEFECTIVE: 1.0,
//       DAMAGED: 1.0,
//       EXPIRED: 1.0,
//       MISSING_PARTS: 0.5,
//     };

//     const unitPrice = 20; // placeholder
//     const total = inspections.reduce((sum, i) => {
//       const rate = refundRates[i.condition] || 0;
//       return sum + unitPrice * i.quantity * rate;
//     }, 0);

//     setEstimatedRefund(total);
//   }, [inspections, currentItem]);

//   // ---------- Submit Handler ----------
//   const handleInspectItem = async () => {
//     if (!currentItem) return;

//     const totalQty = inspections.reduce((sum, i) => sum + i.quantity, 0);
//     if (totalQty !== quantityReceived) {
//       setError(
//         `Total inspection quantities (${totalQty}) must equal received quantity (${quantityReceived})`
//       );
//       return;
//     }

//     setSaving(true);
//     setError(null);

//     try {
//       const payload = {
//         returnItemId: currentItem.id,
//         inspections,
//       };

//       console.log("📤 Submitting inspection:", payload);

//       const response = await fetch(`/api/returns/${rmaNumber}/inspect-item`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const result = await response.json();

//       if (!response.ok) {
//         throw new Error(result.error || "Failed to save inspection");
//       }

//       console.log("✅ Inspection saved:", result);

//       // Go to next item or summary
//       if (currentItemIndex < items.length - 1) {
//         const nextIndex = currentItemIndex + 1;
//         const nextItem = items[nextIndex];
//         setCurrentItemIndex(nextIndex);
//         setQuantityReceived(nextItem.quantityRequested);
//         setInspections([
//           {
//             quantity: nextItem.quantityRequested,
//             condition: "GOOD",
//             disposition: "RESTOCK",
//           },
//         ]);
//         setBarcodeInput("");
//       } else {
//         // All items inspected - redirect to detail page or summary
//         router.push(`/admin/returns/${rmaNumber}`);
//       }
//     } catch (err: any) {
//       console.error("❌ Error saving inspection:", err);
//       setError(err.message || "Failed to save inspection");
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ---------- UI ----------
//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center p-4">
//         <div className="text-center">
//           <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
//           <p className="text-gray-600">Loading inspection...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!currentItem) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <p className="text-gray-600">No items to inspect</p>
//       </div>
//     );
//   }

//   const conditionOptions: Array<{
//     value: ReturnCondition;
//     label: string;
//   }> = [
//     { value: "NEW_UNOPENED", label: "New Unopened" },
//     { value: "NEW_OPENED", label: "New Opened" },
//     { value: "LIKE_NEW", label: "Like New" },
//     { value: "GOOD", label: "Good" },
//     { value: "FAIR", label: "Fair" },
//     { value: "POOR", label: "Poor" },
//     { value: "DEFECTIVE", label: "Defective" },
//     { value: "DAMAGED", label: "Damaged" },
//     { value: "EXPIRED", label: "Expired" },
//     { value: "MISSING_PARTS", label: "Missing Parts" },
//   ];

//   return (
//     <div className="min-h-screen bg-gray-50 pb-20">
//       {/* Header */}
//       <div className="bg-white border-b sticky top-0 z-10">
//         <div className="max-w-4xl mx-auto px-4 py-4">
//           <div className="flex justify-between items-center">
//             <div>
//               <h1 className="text-lg font-bold">Inspect Return</h1>
//               <p className="text-sm text-gray-600">{rmaNumber}</p>
//             </div>
//             <p className="text-sm text-gray-500">
//               Item {currentItemIndex + 1} of {items.length}
//             </p>
//           </div>
//           <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
//             <div
//               className="bg-blue-600 h-2 rounded-full transition-all duration-300"
//               style={{ width: `${progress}%` }}
//             />
//           </div>
//         </div>
//       </div>

//       <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
//         {/* Item Info */}
//         <div className="bg-white p-4 rounded-lg shadow">
//           <h2 className="font-medium text-gray-900 mb-1">
//             {currentItem.productVariant.name}
//           </h2>
//           <p className="text-sm text-gray-600">
//             SKU: {currentItem.productVariant.sku}
//           </p>
//           <p className="text-sm text-gray-600">
//             Expected: {currentItem.quantityRequested} units
//           </p>
//         </div>

//         {/* Barcode */}
//         <div className="bg-white p-4 rounded-lg shadow">
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Scan Product Barcode
//           </label>
//           <div className="flex space-x-2">
//             <input
//               type="text"
//               value={barcodeInput}
//               onChange={(e) => setBarcodeInput(e.target.value)}
//               onKeyDown={(e) => {
//                 if (e.key === "Enter" && barcodeInput)
//                   handleBarcodeScanned(barcodeInput);
//               }}
//               placeholder="Scan or type barcode"
//               className="flex-1 p-2 rounded-md border-gray-300 border"
//             />
//             <button
//               onClick={() => barcodeInput && handleBarcodeScanned(barcodeInput)}
//               className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//             >
//               Verify
//             </button>
//           </div>

//           {alertState && (
//             <Alert
//               variant={alertState.type === "error" ? "destructive" : "default"}
//               className="mt-4"
//             >
//               {alertState.type === "success" ? (
//                 <CheckCircle2 className="text-green-600" />
//               ) : (
//                 <AlertTriangle className="text-red-600" />
//               )}
//               <AlertTitle>
//                 {alertState.type === "success" ? "Success" : "Warning"}
//               </AlertTitle>
//               <AlertDescription>{alertState.message}</AlertDescription>
//             </Alert>
//           )}
//         </div>

//         {/* Quantity */}
//         <div className="bg-white p-4 rounded-lg shadow">
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Quantity Received
//           </label>
//           <input
//             type="number"
//             min="0"
//             max={currentItem.quantityRequested}
//             value={quantityReceived}
//             onChange={(e) => setQuantityReceived(Number(e.target.value) || 0)}
//             className="block w-full p-2 text-2xl text-center border rounded-md"
//           />
//           <p className="mt-1 text-sm text-center text-gray-500">
//             Max: {currentItem.quantityRequested}
//           </p>
//         </div>

//         {/* Split Batches */}
//         <button
//           onClick={() =>
//             setInspections([
//               ...inspections,
//               { quantity: 0, condition: "GOOD", disposition: "RESTOCK" },
//             ])
//           }
//           className="w-full mt-3 text-blue-600 text-sm font-medium border rounded-md py-2 hover:bg-blue-50"
//         >
//           + Split Batch
//         </button>

//         {inspections.map((insp, i) => (
//           <div
//             key={i}
//             className="grid grid-cols-4 gap-2 mt-2 bg-gray-50 rounded-lg p-3"
//           >
//             <input
//               type="number"
//               min={0}
//               value={insp.quantity}
//               onChange={(e) =>
//                 updateInspection(i, { quantity: Number(e.target.value) })
//               }
//               className="text-center border rounded p-2"
//               placeholder="Qty"
//             />
//             <select
//               value={insp.condition}
//               onChange={(e) =>
//                 updateInspection(i, {
//                   condition: e.target.value as ReturnCondition,
//                 })
//               }
//               className="border rounded p-2"
//             >
//               {conditionOptions.map((opt) => (
//                 <option key={opt.value} value={opt.value}>
//                   {opt.label}
//                 </option>
//               ))}
//             </select>
//             <select
//               value={insp.disposition}
//               onChange={(e) =>
//                 updateInspection(i, {
//                   disposition: e.target.value as ReturnDisposition,
//                 })
//               }
//               className="border rounded p-2"
//             >
//               <option value="RESTOCK">Restock</option>
//               <option value="DISPOSE">Dispose</option>
//               <option value="REPAIR">Repair</option>
//               <option value="VENDOR_RETURN">Vendor Return</option>
//               <option value="QUARANTINE">Quarantine</option>
//             </select>
//             <button
//               onClick={() => removeInspection(i)}
//               className="text-red-500 text-sm hover:text-red-700"
//             >
//               ✕
//             </button>

//             {/* Restock Location */}
//             {insp.disposition === "RESTOCK" && (
//               <select
//                 value={insp.restockLocationId || ""}
//                 onChange={(e) =>
//                   updateInspection(i, { restockLocationId: e.target.value })
//                 }
//                 className="col-span-4 border rounded p-2 mt-2"
//               >
//                 <option value="">Select location...</option>
//                 {locations.map((loc) => (
//                   <option key={loc.id} value={loc.id}>
//                     {loc.name}
//                   </option>
//                 ))}
//               </select>
//             )}

//             {/* Notes */}
//             <textarea
//               placeholder="Notes..."
//               value={insp.conditionNotes || ""}
//               onChange={(e) =>
//                 updateInspection(i, { conditionNotes: e.target.value })
//               }
//               className="col-span-4 mt-2 border rounded p-2 text-sm"
//             />
//           </div>
//         ))}

//         {/* Estimated Refund */}
//         <div className="bg-blue-50 rounded-lg p-4">
//           <div className="flex justify-between items-center">
//             <span className="text-sm text-gray-700">Estimated Refund:</span>
//             <span className="text-2xl font-bold text-blue-900">
//               ${estimatedRefund.toFixed(2)}
//             </span>
//           </div>
//         </div>

//         {/* Error */}
//         {error && (
//           <div className="rounded-md bg-red-50 p-4 text-red-700 text-sm">
//             {error}
//           </div>
//         )}

//         {/* Submit Button */}
//         <button
//           onClick={handleInspectItem}
//           disabled={saving}
//           className="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-lg"
//         >
//           {saving
//             ? "Saving..."
//             : currentItemIndex < items.length - 1
//             ? `Next Item (${items.length - currentItemIndex - 1} remaining)`
//             : "Complete Inspection"}
//         </button>
//       </div>
//     </div>
//   );
// }
