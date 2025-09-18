"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Eye,
  BarChart3,
  MapPin,
  Box,
  Archive,
  ShoppingCart,
  Plus,
  Minus,
  Edit,
  History,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface InventoryItem {
  id: string;
  productVariantId: string;
  productName: string;
  sku: string;
  upc?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderPoint?: number;
  maxQuantity?: number;
  costPrice?: string;
  sellingPrice?: string;
  weight?: number;
  locations: {
    locationId: string;
    locationName: string;
    quantity: number;
    zone?: string;
    aisle?: string;
    shelf?: string;
  }[];
  lastCounted?: string;
  reorderStatus: "OK" | "LOW" | "CRITICAL" | "OVERSTOCK";
  category?: string;
  supplier?: string;
  updatedAt: string;
}

interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStock: number;
  outOfStock: number;
  overstock: number;
  recentTransactions: number;
}

export default function InventoryDashboard() {
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  useEffect(() => {
    loadInventory();
    const interval = setInterval(loadInventory, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [searchTerm, locationFilter, statusFilter, categoryFilter]);

  const loadInventory = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (locationFilter !== "ALL") params.set("location", locationFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);

      const response = await fetch(`/api/inventory?${params}`);
      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to load inventory:", error);
    }
    setIsLoading(false);
  };

  const handleQuickAction = async (
    action: string,
    itemId: string,
    quantity?: number
  ) => {
    setIsPerformingAction(true);
    try {
      const response = await fetch("/api/inventory/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          itemId,
          quantity,
        }),
      });

      if (response.ok) {
        await loadInventory();
      }
    } catch (error) {
      console.error(`Failed to perform ${action}:`, error);
    }
    setIsPerformingAction(false);
  };

  const navigateToProduct = (productVariantId: string) => {
    router.push(`/dashboard/inventory/product/${productVariantId}`);
  };

  const getStockStatusColor = (status: string) => {
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

  const getStockIcon = (status: string) => {
    switch (status) {
      case "LOW":
        return <TrendingDown className="w-4 h-4" />;
      case "CRITICAL":
        return <AlertTriangle className="w-4 h-4" />;
      case "OVERSTOCK":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Box className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Inventory Management
              </h1>
              <p className="text-gray-600">
                Track stock levels, locations, and product details
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={loadInventory}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => router.push("/dashboard/inventory/receive")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Receive Stock
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Package className="w-6 h-6 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">{stats.totalProducts}</p>
                      <p className="text-xs text-gray-600">Products</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">
                        ${stats.totalValue.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">Total Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <TrendingDown className="w-6 h-6 text-yellow-600" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">{stats.lowStock}</p>
                      <p className="text-xs text-gray-600">Low Stock</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">{stats.outOfStock}</p>
                      <p className="text-xs text-gray-600">Out of Stock</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">{stats.overstock}</p>
                      <p className="text-xs text-gray-600">Overstock</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <History className="w-6 h-6 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-lg font-bold">
                        {stats.recentTransactions}
                      </p>
                      <p className="text-xs text-gray-600">Recent Moves</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by SKU, product name, or UPC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="OK">In Stock</option>
              <option value="LOW">Low Stock</option>
              <option value="CRITICAL">Critical</option>
              <option value="OVERSTOCK">Overstock</option>
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Locations</option>
              <option value="A">Zone A</option>
              <option value="B">Zone B</option>
              <option value="C">Zone C</option>
              <option value="RECEIVING">Receiving</option>
              <option value="SHIPPING">Shipping</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="ELECTRONICS">Electronics</option>
              <option value="CLOTHING">Clothing</option>
              <option value="BOOKS">Books</option>
              <option value="HOME">Home & Garden</option>
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Inventory Items ({inventory.length})</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard/inventory/count")}
              >
                <Archive className="w-4 h-4 mr-2" />
                Cycle Count
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Level
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location(s)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Count
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventory.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-gray-50 cursor-pointer">
                        <td
                          className="px-4 py-4"
                          onClick={() =>
                            navigateToProduct(item.productVariantId)
                          }
                        >
                          <div>
                            <div className="font-medium text-blue-600 hover:text-blue-800">
                              {item.productName}
                            </div>
                            <div className="text-sm text-gray-500">
                              SKU: {item.sku}
                            </div>
                            {item.upc && (
                              <div className="text-xs text-gray-400">
                                UPC: {item.upc}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium">
                              {item.quantityOnHand} on hand
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.quantityReserved} reserved
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              {item.quantityAvailable} available
                            </div>
                            {item.reorderPoint && (
                              <div className="text-xs text-gray-400">
                                Reorder at: {item.reorderPoint}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            className={getStockStatusColor(item.reorderStatus)}
                          >
                            <span className="flex items-center">
                              {getStockIcon(item.reorderStatus)}
                              <span className="ml-1">{item.reorderStatus}</span>
                            </span>
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            {item.locations.slice(0, 2).map((location) => (
                              <div
                                key={location.locationId}
                                className="text-sm"
                              >
                                <span className="font-medium">
                                  {location.locationName}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  ({location.quantity})
                                </span>
                              </div>
                            ))}
                            {item.locations.length > 2 && (
                              <div
                                className="text-xs text-blue-600 cursor-pointer"
                                onClick={() =>
                                  setExpandedItem(
                                    expandedItem === item.id ? null : item.id
                                  )
                                }
                              >
                                +{item.locations.length - 2} more locations
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            {item.costPrice && (
                              <div className="text-sm">
                                Cost: ${item.costPrice}
                              </div>
                            )}
                            {item.sellingPrice && (
                              <div className="text-sm font-medium">
                                Sell: ${item.sellingPrice}
                              </div>
                            )}
                            {item.costPrice && (
                              <div className="text-xs text-gray-500">
                                Total: $
                                {(
                                  parseFloat(item.costPrice) *
                                  item.quantityOnHand
                                ).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            {item.lastCounted
                              ? new Date(item.lastCounted).toLocaleDateString()
                              : "Never"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigateToProduct(item.productVariantId)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const qty = prompt("Adjust quantity by:");
                                if (qty)
                                  handleQuickAction(
                                    "ADJUST",
                                    item.id,
                                    parseInt(qty)
                                  );
                              }}
                              disabled={isPerformingAction}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {item.reorderStatus === "CRITICAL" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleQuickAction("REORDER", item.id)
                                }
                                disabled={isPerformingAction}
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Location Details */}
                      {expandedItem === item.id && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 bg-gray-50">
                            <div className="space-y-2">
                              <h4 className="font-medium">All Locations:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {item.locations.map((location) => (
                                  <div
                                    key={location.locationId}
                                    className="bg-white p-3 rounded border"
                                  >
                                    <div className="font-medium">
                                      {location.locationName}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Quantity: {location.quantity}
                                    </div>
                                    {location.zone && (
                                      <div className="text-xs text-gray-500">
                                        {location.zone}
                                        {location.aisle &&
                                          ` - ${location.aisle}`}
                                        {location.shelf &&
                                          ` - ${location.shelf}`}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {inventory.length === 0 && (
                <div className="text-center py-12">
                  <Box className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No inventory found
                  </h3>
                  <p className="text-gray-600">
                    Try adjusting your filters or search terms.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
