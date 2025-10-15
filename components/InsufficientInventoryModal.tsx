import React, { useState } from "react";
import { AlertTriangle, Package, FileText, X } from "lucide-react";

// Types
interface InsufficientInventoryItem {
  sku: string;
  productName: string;
  locationName: string;
  locationId: string;
  requested: number;
  available: number;
  shortage: number;
}

interface AllocationModalProps {
  items: InsufficientInventoryItem[];
  orderNumber: string;
  orderId: string;
  onClose: () => void;
  onAction: (action: "count" | "backorder" | "cancel") => Promise<void>;
}

export default function InsufficientInventoryModal({
  items,
  orderNumber,
  orderId,
  onClose,
  onAction,
}: AllocationModalProps) {
  const [selectedAction, setSelectedAction] = useState<
    "count" | "backorder" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!selectedAction) return;

    setLoading(true);
    try {
      await onAction(selectedAction);
      onClose();
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalShortage = items.reduce((sum, item) => sum + item.shortage, 0);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Insufficient Inventory
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Order {orderNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Alert Message */}
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Cannot allocate inventory.</strong> {items.length} product
              {items.length > 1 ? "s have" : " has"} insufficient stock (
              {totalShortage} units short).
            </p>
          </div>

          {/* Items List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Affected Items
            </h3>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        SKU: {item.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                        Short by {item.shortage} units
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Location
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.locationName}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Requested
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.requested}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Available
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.available}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Options */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              What would you like to do?
            </h3>
            <div className="space-y-3">
              {/* Physical Count Option */}
              <button
                onClick={() => setSelectedAction("count")}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAction === "count"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      Create Cycle Count Task
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Send picker to physically count the items at their
                      locations. System inventory may be incorrect.
                    </p>
                    {selectedAction === "count" && (
                      <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded text-sm text-blue-800 dark:text-blue-200">
                        ✓ A cycle count task will be created for each location.
                        Pickers will verify actual quantities.
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Back Order Option */}
              <button
                onClick={() => setSelectedAction("backorder")}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAction === "backorder"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      Create Back Order
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Create back orders for the missing items. Allocate
                      available stock and fulfill the rest later.
                    </p>
                    {selectedAction === "backorder" && (
                      <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 rounded text-sm text-green-800 dark:text-green-200">
                        ✓ Available stock will be allocated. Back orders will be
                        created for {totalShortage} units.
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Notes */}
          {selectedAction && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedAction || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Processing..."
              : selectedAction === "count"
              ? "Create Count Tasks"
              : "Create Back Orders"}
          </button>
        </div>
      </div>
    </div>
  );
}
