"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Package,
  MapPin,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Weight,
  Ruler,
  BarChart3,
  History,
  AlertTriangle,
  Edit,
  Save,
  X,
  Plus,
  Minus,
  RefreshCw,
  Camera,
  FileText,
  ShoppingCart,
  Archive,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

interface ProductDetails {
  id: string;
  productId: string;
  sku: string;
  upc?: string;
  name: string;
  description?: string;
  costPrice?: number;
  sellingPrice?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  category?: string;
  supplier?: string;
  shopifyVariantId?: string;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  reorderPoint?: number;
  maxQuantity?: number;
  reorderStatus: "OK" | "LOW" | "CRITICAL" | "OVERSTOCK";
  locations: {
    id: string;
    name: string;
    type: string;
    zone?: string;
    aisle?: string;
    shelf?: string;
    bin?: string;
    quantity: number;
    isPickable: boolean;
    isReceivable: boolean;
    lastCounted?: string;
  }[];
  recentTransactions: {
    id: string;
    type: string;
    quantityChange: number;
    referenceId?: string;
    referenceType?: string;
    userId?: string;
    userName?: string;
    notes?: string;
    createdAt: string;
  }[];
  analytics: {
    monthlyMovement: number;
    averageVelocity: number;
    turnoverRate: number;
    daysSinceLastSale: number;
    totalValue: number;
    profitMargin?: number;
  };
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productVariantId = params.id;

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProductDetails>>({});
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<
    "ADJUSTMENT" | "TRANSFER" | "COUNT"
  >("ADJUSTMENT");
  const [transactionData, setTransactionData] = useState({
    quantity: "",
    locationId: "",
    notes: "",
    reason: "",
  });

  useEffect(() => {
    if (productVariantId) {
      loadProductDetails();
    }
  }, [productVariantId]);

  const loadProductDetails = async () => {
    try {
      const response = await fetch(
        `/api/inventory/product/${productVariantId}`
      );
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
        setEditForm(data);
      } else {
        router.push("/dashboard/inventory");
      }
    } catch (error) {
      console.error("Failed to load product details:", error);
      router.push("/dashboard/inventory");
    }
    setIsLoading(false);
  };

  const handleSaveEdit = async () => {
    setIsPerformingAction(true);
    try {
      const response = await fetch(
        `/api/inventory/product/${productVariantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        }
      );

      if (response.ok) {
        await loadProductDetails();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to update product:", error);
    }
    setIsPerformingAction(false);
  };

  const handleTransaction = async () => {
    setIsPerformingAction(true);
    try {
      const response = await fetch(`/api/inventory/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productVariantId,
          transactionType,
          quantityChange: parseInt(transactionData.quantity),
          locationId: transactionData.locationId || null,
          notes: transactionData.notes,
          referenceType: "MANUAL",
        }),
      });

      if (response.ok) {
        await loadProductDetails();
        setShowTransactionModal(false);
        setTransactionData({
          quantity: "",
          locationId: "",
          notes: "",
          reason: "",
        });
      }
    } catch (error) {
      console.error("Failed to create transaction:", error);
    }
    setIsPerformingAction(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OK":
        return "bg-green-100 text-green-800";
      case "LOW":
        return "bg-yellow-100 text-yellow-800";
      case "CRITICAL":
        return "bg-red-100 text-red-800";
      case "OVERSTOCK":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "RECEIPT":
        return <Plus className="w-4 h-4 text-green-600" />;
      case "SALE":
        return <Minus className="w-4 h-4 text-red-600" />;
      case "ADJUSTMENT":
        return <Edit className="w-4 h-4 text-blue-600" />;
      case "TRANSFER":
        return <RefreshCw className="w-4 h-4 text-purple-600" />;
      case "COUNT":
        return <Archive className="w-4 h-4 text-orange-600" />;
      default:
        return <History className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Product not found</p>
          <Button
            onClick={() => router.push("/dashboard/inventory")}
            className="mt-4"
          >
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/inventory")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600">SKU: {product.sku}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowTransactionModal(true)}
              disabled={isPerformingAction}
            >
              <Edit className="w-4 h-4 mr-2" />
              Adjust Stock
            </Button>
            <Button
              variant={isEditing ? "outline" : "default"}
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                  setEditForm(product);
                } else {
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
            {isEditing && (
              <Button onClick={handleSaveEdit} disabled={isPerformingAction}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Product Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Product Information</span>
                  <Badge className={getStatusColor(product.reorderStatus)}>
                    {product.reorderStatus}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name
                    </label>
                    {isEditing ? (
                      <Input
                        value={editForm.name || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                      />
                    ) : (
                      <p className="text-gray-900">{product.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU
                    </label>
                    <p className="text-gray-900 font-mono">{product.sku}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UPC
                    </label>
                    {isEditing ? (
                      <Input
                        value={editForm.upc || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, upc: e.target.value })
                        }
                      />
                    ) : (
                      <p className="text-gray-900 font-mono">
                        {product.upc || "Not set"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    {isEditing ? (
                      <Input
                        value={editForm.category || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, category: e.target.value })
                        }
                      />
                    ) : (
                      <p className="text-gray-900">
                        {product.category || "Uncategorized"}
                      </p>
                    )}
                  </div>
                </div>

                {product.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    {isEditing ? (
                      <textarea
                        value={editForm.description || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-600">{product.description}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Cost Price
                    </label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm.costPrice || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            costPrice: parseFloat(e.target.value),
                          })
                        }
                      />
                    ) : (
                      <p className="text-gray-900">
                        {product.costPrice
                          ? `${product.costPrice.toFixed(2)}`
                          : "Not set"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Selling Price
                    </label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm.sellingPrice || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            sellingPrice: parseFloat(e.target.value),
                          })
                        }
                      />
                    ) : (
                      <p className="text-gray-900">
                        {product.sellingPrice
                          ? `${product.sellingPrice.toFixed(2)}`
                          : "Not set"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Weight className="w-4 h-4 inline mr-1" />
                      Weight (lbs)
                    </label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={editForm.weight || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            weight: parseFloat(e.target.value),
                          })
                        }
                      />
                    ) : (
                      <p className="text-gray-900">
                        {product.weight ? `${product.weight} lbs` : "Not set"}
                      </p>
                    )}
                  </div>
                </div>

                {product.dimensions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Ruler className="w-4 h-4 inline mr-1" />
                      Dimensions
                    </label>
                    <p className="text-gray-900">
                      {product.dimensions.length}" × {product.dimensions.width}"
                      × {product.dimensions.height}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock Levels Card */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Levels & Reorder Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {product.totalQuantity}
                    </div>
                    <div className="text-sm text-gray-600">On Hand</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {product.totalReserved}
                    </div>
                    <div className="text-sm text-gray-600">Reserved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {product.totalAvailable}
                    </div>
                    <div className="text-sm text-gray-600">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      ${product.analytics.totalValue.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Value</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Point
                    </label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editForm.reorderPoint || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            reorderPoint: parseInt(e.target.value),
                          })
                        }
                      />
                    ) : (
                      <p className="text-gray-900">
                        {product.reorderPoint || "Not set"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Quantity
                    </label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editForm.maxQuantity || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            maxQuantity: parseInt(e.target.value),
                          })
                        }
                      />
                    ) : (
                      <p className="text-gray-900">
                        {product.maxQuantity || "Not set"}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Locations Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Storage Locations ({product.locations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.locations.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-gray-600">
                          {location.zone && `Zone ${location.zone}`}
                          {location.aisle && ` - Aisle ${location.aisle}`}
                          {location.shelf && ` - Shelf ${location.shelf}`}
                          {location.bin && ` - Bin ${location.bin}`}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Badge
                            variant={
                              location.isPickable ? "default" : "secondary"
                            }
                          >
                            {location.isPickable ? "Pickable" : "Non-pickable"}
                          </Badge>
                          <Badge
                            variant={
                              location.isReceivable ? "default" : "secondary"
                            }
                          >
                            {location.isReceivable
                              ? "Receivable"
                              : "Non-receivable"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {location.quantity}
                        </div>
                        <div className="text-sm text-gray-600">units</div>
                        {location.lastCounted && (
                          <div className="text-xs text-gray-500">
                            Counted:{" "}
                            {new Date(
                              location.lastCounted
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Analytics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Monthly Movement
                    </span>
                    <span className="font-medium">
                      {product.analytics.monthlyMovement}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Turnover Rate</span>
                    <span className="font-medium">
                      {product.analytics.turnoverRate.toFixed(1)}x
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Days Since Last Sale
                    </span>
                    <span className="font-medium">
                      {product.analytics.daysSinceLastSale}
                    </span>
                  </div>
                </div>
                {product.analytics.profitMargin && (
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Profit Margin
                      </span>
                      <span className="font-medium">
                        {product.analytics.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowTransactionModal(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Adjust Quantity
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    router.push(
                      `/dashboard/inventory/count?product=${productVariantId}`
                    )
                  }
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Cycle Count
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    router.push(
                      `/dashboard/inventory/transfer?product=${productVariantId}`
                    )
                  }
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Transfer Stock
                </Button>
                {product.reorderStatus === "CRITICAL" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() =>
                      router.push(
                        `/dashboard/purchasing/reorder?product=${productVariantId}`
                      )
                    }
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Create Reorder
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <History className="w-5 h-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.recentTransactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        {getTransactionIcon(transaction.type)}
                        <div className="ml-2">
                          <div className="text-sm font-medium">
                            {transaction.type.replace("_", " ")}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(
                              transaction.createdAt
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-medium ${
                            transaction.quantityChange > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.quantityChange > 0 ? "+" : ""}
                          {transaction.quantityChange}
                        </div>
                        {transaction.userName && (
                          <div className="text-xs text-gray-500">
                            {transaction.userName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {product.recentTransactions.length > 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        router.push(
                          `/dashboard/inventory/transactions?product=${productVariantId}`
                        )
                      }
                    >
                      View All Transactions
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transaction Modal */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Stock Adjustment</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="ADJUSTMENT">Adjustment</option>
                    <option value="COUNT">Cycle Count</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Change
                  </label>
                  <Input
                    type="number"
                    value={transactionData.quantity}
                    onChange={(e) =>
                      setTransactionData({
                        ...transactionData,
                        quantity: e.target.value,
                      })
                    }
                    placeholder="Enter positive or negative number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location (Optional)
                  </label>
                  <select
                    value={transactionData.locationId}
                    onChange={(e) =>
                      setTransactionData({
                        ...transactionData,
                        locationId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Locations</option>
                    {product.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={transactionData.notes}
                    onChange={(e) =>
                      setTransactionData({
                        ...transactionData,
                        notes: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Reason for adjustment..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowTransactionModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTransaction}
                  disabled={isPerformingAction || !transactionData.quantity}
                  className="flex-1"
                >
                  Apply Change
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
