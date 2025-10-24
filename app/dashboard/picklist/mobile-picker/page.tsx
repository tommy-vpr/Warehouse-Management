import React, { useState, useEffect, useRef } from "react";
import {
  QrCode,
  Camera,
  CheckCircle,
  AlertCircle,
  Package,
  MapPin,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

function MobilePicker() {
  const [pickList, setPickList] = useState(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [scanMode, setScanMode] = useState("location"); // 'location' or 'product'
  const [scannedCode, setScannedCode] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    // Load assigned pick list for current user
    loadMyPickList();
  }, []);

  const loadMyPickList = async () => {
    // In real app, get userId from auth
    const userId = "current-user-id";
    const response = await fetch(
      `/api/pick-lists?assignedTo=${userId}&status=IN_PROGRESS,ASSIGNED`
    );
    const lists = await response.json();

    if (lists.length > 0) {
      setPickList(lists[0]);
    }
  };

  const currentItem = pickList?.items[currentItemIndex];
  const remainingQty = currentItem
    ? currentItem.quantityToPick - currentItem.quantityPicked
    : 0;

  const handleScan = async () => {
    if (!scannedCode.trim()) return;

    setError("");

    // Step 1: Scan location
    if (scanMode === "location") {
      if (
        scannedCode === currentItem.location.barcode ||
        scannedCode === currentItem.location.name
      ) {
        setScanMode("product");
        setScannedCode("");
        inputRef.current?.focus();
      } else {
        setError("Wrong location! Please go to " + currentItem.location.name);
      }
      return;
    }

    // Step 2: Scan product and enter quantity
    if (scanMode === "product") {
      const qty = parseInt(quantityInput) || 0;

      if (qty <= 0 || qty > remainingQty) {
        setError(`Invalid quantity. Need to pick ${remainingQty} units.`);
        return;
      }

      try {
        const response = await fetch(
          `/api/pick-lists/${pickList.id}/items/${currentItem.id}/pick`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quantityPicked: qty,
              userId: "current-user-id",
              scannedCode: scannedCode,
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();

          // Show success animation
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 1500);

          // Update local state
          const updatedItems = [...pickList.items];
          updatedItems[currentItemIndex] = result.item;
          setPickList({ ...pickList, items: updatedItems });

          // Move to next item or show completion
          if (
            result.isComplete &&
            currentItemIndex < pickList.items.length - 1
          ) {
            setCurrentItemIndex(currentItemIndex + 1);
            setScanMode("location");
            setScannedCode("");
            setQuantityInput("");
          } else if (result.isComplete) {
            // Pick list complete!
            alert("Pick list completed! 🎉");
            loadMyPickList();
          } else {
            // Partial pick - stay on same item
            setQuantityInput("");
          }
        } else {
          const error = await response.json();
          setError(error.error || "Failed to record pick");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      }
    }
  };

  const handleShortPick = () => {
    const reason = prompt("Reason for short pick:");
    if (reason) {
      // Record partial pick with reason
      fetch(`/api/pick-lists/${pickList.id}/items/${currentItem.id}/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityPicked: parseInt(quantityInput) || 0,
          userId: "current-user-id",
          scannedCode: scannedCode,
          notes: reason,
        }),
      }).then(() => {
        setCurrentItemIndex(currentItemIndex + 1);
        setScanMode("location");
        setScannedCode("");
        setQuantityInput("");
      });
    }
  };

  if (!pickList) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No Active Pick List
          </h2>
          <p className="text-gray-600 mb-4">
            You don't have any pick lists assigned. Check with your supervisor.
          </p>
          <button
            onClick={loadMyPickList}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            All Done! 🎉
          </h2>
          <p className="text-gray-600">
            Pick list {pickList.batchNumber} completed!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg font-bold">{pickList.batchNumber}</h1>
            <span className="bg-blue-500 px-3 py-1 rounded-full text-sm">
              {currentItemIndex + 1} / {pickList.items.length}
            </span>
          </div>
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  ((currentItemIndex + 1) / pickList.items.length) * 100
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Current Step Indicator */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-3">
            {scanMode === "location" ? (
              <>
                <MapPin className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    Step 1
                  </div>
                  <div className="font-bold text-gray-900">Scan Location</div>
                </div>
              </>
            ) : (
              <>
                <QrCode className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    Step 2
                  </div>
                  <div className="font-bold text-gray-900">
                    Scan Product & Enter Qty
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Location Card */}
        <div
          className={`bg-white rounded-lg shadow p-4 ${
            scanMode === "location" ? "ring-2 ring-blue-600" : ""
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-gray-600" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Location
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {currentItem.location.name}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Aisle {currentItem.location.aisle} • Bay {currentItem.location.bay}
          </div>
        </div>

        {/* Product Card */}
        <div
          className={`bg-white rounded-lg shadow p-4 ${
            scanMode === "product" ? "ring-2 ring-blue-600" : ""
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-gray-600" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Product
            </span>
          </div>
          <div className="font-bold text-gray-900 text-lg mb-1">
            {currentItem.productVariant.product.name}
          </div>
          <div className="text-sm text-gray-600 mb-3">
            SKU: {currentItem.productVariant.sku}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-sm text-gray-600">Pick Quantity</div>
            <div className="text-3xl font-bold text-blue-600">
              {remainingQty} units
            </div>
            {currentItem.quantityPicked > 0 && (
              <div className="text-xs text-orange-600 mt-1">
                {currentItem.quantityPicked} already picked
              </div>
            )}
          </div>
        </div>

        {/* Scan Input */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {scanMode === "location"
              ? "Scan Location Barcode"
              : "Scan Product Barcode"}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={scannedCode}
            onChange={(e) => setScannedCode(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleScan()}
            placeholder="Use scanner or type code..."
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-blue-600 focus:outline-none"
            autoFocus
          />
        </div>

        {/* Quantity Input (only when scanning product) */}
        {scanMode === "product" && (
          <div className="bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity Picked
            </label>
            <input
              type="number"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              placeholder="Enter quantity..."
              min="1"
              max={remainingQty}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-blue-600 focus:outline-none"
            />
            <div className="flex gap-2 mt-2">
              {[10, 25, 50, 100].map((qty) => (
                <button
                  key={qty}
                  onClick={() =>
                    setQuantityInput(Math.min(qty, remainingQty).toString())
                  }
                  disabled={qty > remainingQty}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
                >
                  {qty}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {scanMode === "product" && (
            <button
              onClick={handleShortPick}
              className="flex-1 bg-orange-50 border-2 border-orange-300 text-orange-700 py-3 rounded-lg font-semibold hover:bg-orange-100"
            >
              Short Pick
            </button>
          )}
          <button
            onClick={handleScan}
            disabled={
              !scannedCode || (scanMode === "product" && !quantityInput)
            }
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanMode === "location" ? "Verify Location" : "Confirm Pick"}
          </button>
        </div>
      </div>

      {/* Success Animation */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-2xl">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4 animate-bounce" />
            <div className="text-xl font-bold text-gray-900 text-center">
              Item Picked!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MobilePicker;
