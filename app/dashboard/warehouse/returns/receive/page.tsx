// dashboard/warehouse/returns/receive/page.tsx
// Warehouse interface for receiving returned packages

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReturnOrderDetails {
  id: string;
  rmaNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  reasonDetails?: string;
  order: {
    orderNumber: string;
    shippedAt: string;
  };
  items: Array<{
    id: string;
    productVariant: {
      sku: string;
      name: string;
    };
    quantityRequested: number;
    status: string;
  }>;
}

export default function WarehouseReceivingPage() {
  const router = useRouter();

  const [rmaInput, setRmaInput] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [returnDetails, setReturnDetails] = useState<ReturnOrderDetails | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);

  // Handle RMA scan/lookup
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReturnDetails(null);

    try {
      const response = await fetch(`/api/returns/${rmaInput}`);

      if (!response.ok) {
        throw new Error("Return not found");
      }

      const data: ReturnOrderDetails = await response.json();

      // Validate status
      if (!["APPROVED", "IN_TRANSIT"].includes(data.status)) {
        setError(
          `Cannot receive return with status: ${data.status}. Must be APPROVED or IN_TRANSIT.`
        );
        return;
      }

      setReturnDetails(data);
    } catch (err: any) {
      setError(err.message || "Failed to lookup RMA");
    } finally {
      setLoading(false);
    }
  };

  // Handle package receiving
  const handleReceive = async () => {
    if (!returnDetails) return;

    setReceiving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/returns/${returnDetails.rmaNumber}/receive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingNumber: trackingNumber || undefined }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to receive package");
      }

      // Success - redirect to inspection
      router.push(
        `/dashboard/warehouse/returns/inspect/${returnDetails.rmaNumber}`
      );
    } catch (err: any) {
      setError(err.message || "Failed to receive package");
    } finally {
      setReceiving(false);
    }
  };

  // Handle barcode scanner input (typically scans with Enter key)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && rmaInput.trim()) {
      handleLookup(e as any);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Receive Return Package
          </h1>
          <p className="mt-2 text-gray-600">
            Scan or enter RMA barcode to begin receiving process
          </p>
        </div>

        {/* RMA Scanner */}
        {!returnDetails && (
          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleLookup}>
              <div className="mb-4">
                <label
                  htmlFor="rmaInput"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  RMA Number or Barcode
                </label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    id="rmaInput"
                    value={rmaInput}
                    onChange={(e) => setRmaInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="RMA-2025-0001 or scan barcode"
                    autoFocus
                    className="flex-1 p-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-lg"
                  />
                  <button
                    type="submit"
                    disabled={loading || !rmaInput.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Looking up..." : "Lookup"}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  💡 Tip: Use a barcode scanner for faster input
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Return Details */}
        {returnDetails && (
          <div className="space-y-6">
            {/* Package Info Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Return Details
                </h2>
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                  {returnDetails.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">RMA Number</p>
                    <p className="text-lg font-mono font-bold text-gray-900">
                      {returnDetails.rmaNumber}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium text-gray-900">
                      {returnDetails.customerName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {returnDetails.customerEmail}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Original Order</p>
                    <p className="font-medium text-gray-900">
                      {returnDetails.order.orderNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      Shipped:{" "}
                      {new Date(
                        returnDetails.order.shippedAt
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Return Reason</p>
                    <p className="font-medium text-gray-900">
                      {returnDetails.reason.replace(/_/g, " ")}
                    </p>
                    {returnDetails.reasonDetails && (
                      <p className="mt-1 text-sm text-gray-600 italic">
                        "{returnDetails.reasonDetails}"
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Total Items Expected
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {returnDetails.items.reduce(
                        (sum, item) => sum + item.quantityRequested,
                        0
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expected Items */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Expected Items
              </h3>
              <div className="space-y-3">
                {returnDetails.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.productVariant.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        SKU: {item.productVariant.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {item.quantityRequested}
                      </p>
                      <p className="text-xs text-gray-500">units</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking Number (Optional) */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Shipping Information (Optional)
              </h3>
              <div>
                <label
                  htmlFor="trackingNumber"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Tracking Number
                </label>
                <input
                  type="text"
                  id="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="1Z999AA10123456784"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter if visible on package label
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setReturnDetails(null);
                    setRmaInput("");
                    setTrackingNumber("");
                    setError(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceive}
                  disabled={receiving}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {receiving
                    ? "Receiving..."
                    : "✓ Confirm Receipt & Start Inspection"}
                </button>
              </div>

              <p className="mt-3 text-sm text-center text-gray-500">
                This will mark the package as received and open the inspection
                interface
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
