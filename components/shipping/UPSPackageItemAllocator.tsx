"use client";

import React, { useState } from "react";
import { Plus, Minus, X, Package, AlertCircle } from "lucide-react";

interface PackageItemAllocation {
  itemId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  weightOz?: number;
}

interface PackageWithItems {
  id: string;
  packageCode: string;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  items: PackageItemAllocation[];
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
  shippingAddress: any;
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

interface PackageConfig {
  id: string;
  packageCode: string;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  items?: PackageItemAllocation[];
}

interface ShipmentItem {
  itemId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  weightOz?: number;
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

interface UPSPackageItemAllocatorProps {
  order: Order;
  carriers: Carrier[];
  shipment: Shipment;
  onComplete: (packages: PackageWithItems[]) => void;
  onCancel: () => void;
}

export default function UPSPackageItemAllocator({
  order,
  carriers,
  shipment,
  onComplete,
  onCancel,
}: UPSPackageItemAllocatorProps) {
  const orderItems = order.items;

  const [packages, setPackages] = useState<PackageWithItems[]>(
    shipment.packages.map((pkg) => ({
      ...pkg,
      items: pkg.items || [],
    }))
  );

  const [selectedItem, setSelectedItem] = useState<{
    itemId: string;
    packageId: string;
  } | null>(null);
  const [allocationQty, setAllocationQty] = useState(1);

  // Calculate remaining quantity for an item
  const getRemainingQuantity = (itemId: string): number => {
    const originalItem = orderItems.find((item) => item.id === itemId);
    if (!originalItem) return 0;

    const totalAllocated = packages.reduce((total, pkg) => {
      return (
        total +
        pkg.items.reduce((pkgTotal, item) => {
          return item.itemId === itemId ? pkgTotal + item.quantity : pkgTotal;
        }, 0)
      );
    }, 0);

    return originalItem.quantity - totalAllocated;
  };

  // Get allocation summary for all items
  const getAllocationSummary = () => {
    return orderItems.map((item) => ({
      ...item,
      remaining: getRemainingQuantity(item.id),
      allocated: item.quantity - getRemainingQuantity(item.id),
    }));
  };

  // Add item to package
  const addItemToPackage = (
    packageId: string,
    itemId: string,
    quantity: number
  ) => {
    const originalItem = orderItems.find((item) => item.id === itemId);
    if (!originalItem) return;

    const remainingQty = getRemainingQuantity(itemId);
    const validQuantity = Math.min(quantity, remainingQty);

    if (validQuantity <= 0) return;

    setPackages(
      packages.map((pkg) => {
        if (pkg.id !== packageId) return pkg;

        const existingItemIndex = pkg.items.findIndex(
          (item) => item.itemId === itemId
        );

        if (existingItemIndex >= 0) {
          const updatedItems = [...pkg.items];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + validQuantity,
          };
          return { ...pkg, items: updatedItems };
        } else {
          return {
            ...pkg,
            items: [
              ...pkg.items,
              {
                itemId: originalItem.id,
                sku: originalItem.sku,
                productName: originalItem.productName,
                quantity: validQuantity,
                unitPrice: parseFloat(originalItem.unitPrice),
                weightOz: originalItem.weightOz,
              },
            ],
          };
        }
      })
    );

    setSelectedItem(null);
    setAllocationQty(1);
  };

  // Remove item from package
  const removeItemFromPackage = (packageId: string, itemId: string) => {
    setPackages(
      packages.map((pkg) => {
        if (pkg.id !== packageId) return pkg;
        return {
          ...pkg,
          items: pkg.items.filter((item) => item.itemId !== itemId),
        };
      })
    );
  };

  // Update item quantity in package
  const updateItemQuantity = (
    packageId: string,
    itemId: string,
    newQuantity: number
  ) => {
    const remainingQty = getRemainingQuantity(itemId);
    const currentPkg = packages.find((p) => p.id === packageId);
    const currentItem = currentPkg?.items.find((i) => i.itemId === itemId);
    const maxAllowed = remainingQty + (currentItem?.quantity || 0);

    const validQuantity = Math.max(0, Math.min(newQuantity, maxAllowed));

    if (validQuantity === 0) {
      removeItemFromPackage(packageId, itemId);
      return;
    }

    setPackages(
      packages.map((pkg) => {
        if (pkg.id !== packageId) return pkg;
        return {
          ...pkg,
          items: pkg.items.map((item) =>
            item.itemId === itemId ? { ...item, quantity: validQuantity } : item
          ),
        };
      })
    );
  };

  // Update package config
  const updatePackageConfig = (
    packageId: string,
    field: string,
    value: string
  ) => {
    setPackages(
      packages.map((pkg) => {
        if (pkg.id !== packageId) return pkg;

        if (field.includes(".")) {
          const [parent, child] = field.split(".");
          return {
            ...pkg,
            [parent]: {
              ...pkg.dimensions,
              [child]: value,
            },
          };
        }

        return { ...pkg, [field]: value };
      })
    );
  };

  // Add new package
  const addPackage = () => {
    setPackages([
      ...packages,
      {
        id: `pkg-${Date.now()}`,
        packageCode: "",
        weight: "",
        dimensions: { length: "12", width: "10", height: "6" },
        items: [],
      },
    ]);
  };

  // Remove package
  const removePackage = (packageId: string) => {
    if (packages.length <= 1) return;
    setPackages(packages.filter((p) => p.id !== packageId));
  };

  // Get carrier package options
  const getCarrierPackages = () => {
    const carrier = carriers.find((c) => c.carrier_id === shipment.carrierId);
    return carrier?.packages || [];
  };

  const allocationSummary = getAllocationSummary();
  const hasUnallocatedItems = allocationSummary.some(
    (item) => item.remaining > 0
  );

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Multi-Package Item Allocation</h2>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Back to Simple Mode
          </button>
        </div>

        {hasUnallocatedItems && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-300">
                  Items Not Fully Allocated
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                  You must allocate all items to packages before creating
                  labels.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Order Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Order Items
              </h3>
            </div>

            <div className="space-y-3">
              {allocationSummary.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border-2 ${
                    item.remaining === 0
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-background border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        SKU: {item.sku}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">Qty: {item.quantity}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        ${parseFloat(item.unitPrice).toFixed(2)} each
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Allocated:
                      </span>
                      <span
                        className={
                          item.allocated > 0
                            ? "text-blue-600 dark:text-blue-400 font-medium"
                            : "text-gray-500"
                        }
                      >
                        {item.allocated} units
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Remaining:
                      </span>
                      <span
                        className={
                          item.remaining > 0
                            ? "text-amber-600 dark:text-amber-400 font-medium"
                            : "text-green-600 dark:text-green-400 font-medium"
                        }
                      >
                        {item.remaining} units
                      </span>
                    </div>

                    {item.remaining > 0 && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{
                            width: `${(item.remaining / item.quantity) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Show where this item is allocated */}
                  {item.allocated > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Allocated to:
                      </div>
                      {packages.map((pkg, idx) => {
                        const pkgItem = pkg.items.find(
                          (i) => i.itemId === item.id
                        );
                        if (!pkgItem) return null;
                        return (
                          <div
                            key={pkg.id}
                            className="text-xs text-gray-700 dark:text-gray-300 flex items-center justify-between"
                          >
                            <span>Package {idx + 1}</span>
                            <span className="font-medium">
                              {pkgItem.quantity} units
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Packages */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Packages ({packages.length})
              </h3>
              <button
                onClick={addPackage}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Package
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {packages.map((pkg, pkgIndex) => (
                <div
                  key={pkg.id}
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-background"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Package {pkgIndex + 1}
                    </h4>
                    {packages.length > 1 && (
                      <button
                        onClick={() => removePackage(pkg.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Package Items */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Items ({pkg.items.length})
                      </span>
                      <button
                        onClick={() =>
                          setSelectedItem({
                            itemId: "",
                            packageId: pkg.id,
                          })
                        }
                        className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      >
                        + Add Item
                      </button>
                    </div>

                    {pkg.items.length === 0 ? (
                      <p className="text-sm text-gray-500 italic py-2">
                        No items added to this package
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {pkg.items.map((item) => (
                          <div
                            key={item.itemId}
                            className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded text-sm"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{item.sku}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {item.productName}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  updateItemQuantity(
                                    pkg.id,
                                    item.itemId,
                                    item.quantity - 1
                                  )
                                }
                                className="w-6 h-6 border rounded flex items-center justify-center hover:bg-background"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 1;
                                  updateItemQuantity(
                                    pkg.id,
                                    item.itemId,
                                    value
                                  );
                                }}
                                className="w-14 text-center px-1 py-1 border rounded text-sm"
                              />
                              <button
                                onClick={() =>
                                  updateItemQuantity(
                                    pkg.id,
                                    item.itemId,
                                    item.quantity + 1
                                  )
                                }
                                className="w-6 h-6 border rounded flex items-center justify-center hover:bg-background"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  removeItemFromPackage(pkg.id, item.itemId)
                                }
                                className="ml-1 text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Package Configuration */}
                  <div className="space-y-3 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium block mb-1">
                          Package Type
                        </label>
                        <select
                          value={pkg.packageCode}
                          onChange={(e) =>
                            updatePackageConfig(
                              pkg.id,
                              "packageCode",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="">Select</option>
                          {getCarrierPackages().map((option) => (
                            <option
                              key={option.package_code}
                              value={option.package_code}
                            >
                              {option.name}
                            </option>
                          ))}
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
                              pkg.id,
                              "weight",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
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
                          placeholder="L"
                          value={pkg.dimensions.length}
                          onChange={(e) =>
                            updatePackageConfig(
                              pkg.id,
                              "dimensions.length",
                              e.target.value
                            )
                          }
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="W"
                          value={pkg.dimensions.width}
                          onChange={(e) =>
                            updatePackageConfig(
                              pkg.id,
                              "dimensions.width",
                              e.target.value
                            )
                          }
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="H"
                          value={pkg.dimensions.height}
                          onChange={(e) =>
                            updatePackageConfig(
                              pkg.id,
                              "dimensions.height",
                              e.target.value
                            )
                          }
                          className="px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onComplete(packages)}
            disabled={hasUnallocatedItems}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Create Labels
          </button>
        </div>
      </div>

      {/* Add Item Modal */}
      {selectedItem && selectedItem.itemId === "" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Item to Package</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Select Item
              </label>
              <select
                className="w-full px-3 py-2 border rounded"
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedItem({
                      ...selectedItem,
                      itemId: e.target.value,
                    });
                  }
                }}
                defaultValue=""
              >
                <option value="">Choose an item...</option>
                {allocationSummary
                  .filter((item) => item.remaining > 0)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sku} - {item.productName} ({item.remaining}{" "}
                      available)
                    </option>
                  ))}
              </select>
            </div>

            {selectedItem.itemId && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setAllocationQty(Math.max(1, allocationQty - 1))
                    }
                    className="w-8 h-8 border rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={getRemainingQuantity(selectedItem.itemId)}
                    value={allocationQty}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      const max = getRemainingQuantity(selectedItem.itemId);
                      setAllocationQty(Math.min(max, Math.max(1, value)));
                    }}
                    className="flex-1 text-center px-3 py-2 border rounded"
                  />
                  <button
                    onClick={() =>
                      setAllocationQty(
                        Math.min(
                          getRemainingQuantity(selectedItem.itemId),
                          allocationQty + 1
                        )
                      )
                    }
                    className="w-8 h-8 border rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Max: {getRemainingQuantity(selectedItem.itemId)} units
                  available
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setAllocationQty(1);
                }}
                className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedItem.itemId) {
                    addItemToPackage(
                      selectedItem.packageId,
                      selectedItem.itemId,
                      allocationQty
                    );
                  }
                }}
                disabled={!selectedItem.itemId}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
