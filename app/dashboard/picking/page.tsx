"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  Plus,
  Clock,
  Play,
  MapPin,
  Pause,
  CheckCircle,
  Eye,
  Users,
  TrendingUp,
  Loader,
} from "lucide-react";
import { usePathname } from "next/navigation";

interface PickListItem {
  id: string;
  productSku: string;
  productName: string;
  quantity: number;
  pickedQuantity: number;
  location: string;
  status: "PENDING" | "PICKED" | "SKIPPED";
  order: {
    orderNumber: string;
    customerName: string;
    totalAmount: string;
  };
}

interface PickListEvent {
  id: string;
  type:
    | "CREATED"
    | "STARTED"
    | "ITEM_PICKED"
    | "ITEM_SKIPPED"
    | "PAUSED"
    | "RESUMED"
    | "COMPLETED";
  user: string;
  location?: string;
  notes?: string;
  createdAt: string;
}

interface PickList {
  id: string;
  batchNumber: string;
  status: "PENDING" | "IN_PROGRESS" | "PAUSED" | "COMPLETED";
  orders: string[];
  totalItems: number;
  pickedItems: number;
  progress: number;
  priority: "LOW" | "MEDIUM" | "HIGH";
  assignedUser?: string;
  estimatedTime: number;
  createdAt: string;
  startTime?: string;
  endTime?: string;
  completedAt?: string;
}

interface PickListDetails {
  pickList: {
    id: string;
    batchNumber: string;
    status: string;
    assignedTo?: { id: string; name: string; email: string };
    priority: number;
    startTime?: string;
    endTime?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  };
  items: {
    id: string;
    sequence: number;
    status: string;
    order: {
      orderNumber: string;
      customerName: string;
      totalAmount: string;
    };
    product: {
      sku: string;
      name: string;
      costPrice: string;
      sellingPrice: string;
    };
    location: {
      name: string;
      zone: string;
      aisle: string;
      shelf: string;
    };
    quantityToPick: number;
    quantityPicked: number;
    pickedAt?: string;
    pickedBy?: string;
    shortPickReason?: string;
    notes?: string;
  }[];
  events: {
    id: string;
    type: string;
    user: string;
    location?: string;
    scannedCode?: string;
    notes?: string;
    createdAt: string;
  }[];
  stats: {
    totalItems: number;
    pickedItems: number;
    progress: number;
    pendingItems: number;
    shortPicks: number;
    skippedItems: number;
    estimatedTimeRemaining: number;
    uniqueOrders: string[];
    uniqueLocations: string[];
    totalValue: number;
  };
}

export default function PickManagementDashboard() {
  const [pickLists, setPickLists] = useState<PickList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedPickList, setSelectedPickList] = useState<string | null>(null);
  const [details, setDetails] = useState<PickListDetails | null>(null);
  const [activeTab, setActiveTab] = useState("items");
  const [isGenerating, setIsGenerating] = useState(false);

  const path = usePathname();

  console.log(path);

  const filteredPickLists = pickLists.filter((pickList) => {
    const matchesSearch =
      pickList.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pickList.orders.some((order) =>
        order.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      (pickList.assignedUser &&
        pickList.assignedUser.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" || pickList.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    activeLists: pickLists.filter(
      (pl) => pl.status === "PENDING" || pl.status === "IN_PROGRESS"
    ).length,
    inProgress: pickLists.filter((pl) => pl.status === "IN_PROGRESS").length,
    completedToday: pickLists.filter((pl) => {
      if (!pl.endTime) return false;
      const today = new Date().toDateString();
      const completedDate = new Date(pl.endTime).toDateString();
      return today === completedDate;
    }).length,
    averageProgress: Math.round(
      pickLists
        .filter((pl) => pl.status !== "COMPLETED")
        .reduce((sum, pl) => sum + pl.progress, 0) /
        Math.max(pickLists.filter((pl) => pl.status !== "COMPLETED").length, 1)
    ),
  };

  const generatePickList = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/picking/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickingStrategy: "BATCH", // Match your API parameter names
          maxItems: 50,
          priority: "FIFO",
        }),
      });

      if (response.ok) {
        // Reload pick lists to show the new one
        await loadPickLists();
      }
    } catch (error) {
      console.error("Failed to generate pick list:", error);
    }
    setIsGenerating(false);
  };
  const startPicking = async (pickListId: string) => {
    try {
      const response = await fetch(`/api/picking/lists/${pickListId}/start`, {
        method: "POST",
      });

      if (response.ok) {
        setPickLists((prev) =>
          prev.map((pl) =>
            pl.id === pickListId
              ? {
                  ...pl,
                  status: "IN_PROGRESS" as const,
                  startTime: new Date().toISOString(),
                }
              : pl
          )
        );
      }
    } catch (error) {
      console.error("Failed to start picking:", error);
    }
  };

  const viewDetails = async (pickListId: string) => {
    setSelectedPickList(pickListId);
    console.log("Setting selectedPickList to:", pickListId);

    try {
      // Use pickListId directly, not selectedPickList
      const response = await fetch(`/api/picking/lists/${pickListId}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Pick list details:", data);
        setDetails(data);
      } else {
        console.error("Failed to fetch pick list details:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch pick list details:", error);
      setDetails(null);
    }
  };

  const closeDetails = () => {
    setSelectedPickList(null);
    setDetails(null);
    setActiveTab("items");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "PAUSED":
        return "bg-orange-100 text-orange-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 2) return "HIGH";
    if (priority >= 1) return "MEDIUM";
    return "LOW";
  };

  // Add after the state declarations:
  useEffect(() => {
    loadPickLists();
  }, []);

  const loadPickLists = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/picking/generate"); // GET endpoint
      if (response.ok) {
        const data = await response.json();
        console.log("Loaded pick lists:", data);

        // Transform API response to match component interface
        const transformedLists =
          data.pickLists?.map((list: any) => ({
            id: list.id,
            batchNumber: list.batchNumber,
            status: list.status,
            assignedUser: list.assignedTo, // ← Fixed this line
            priority: getPriorityLabel(list.priority || 0), // ← Also fix this to convert number to string
            totalItems: list.totalItems,
            pickedItems: list.pickedItems,
            progress: list.progress,
            estimatedTime: Math.ceil(list.totalItems * 1.5),
            startTime: list.startTime,
            createdAt: list.createdAt,
            endTime: list.endTime,
            orders: list.orders || [],
          })) || [];

        setPickLists(transformedLists);
      }
    } catch (error) {
      console.error("Failed to load pick lists:", error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Pick Management
              </h1>
              <p className="text-gray-600">
                Manage warehouse picking operations
              </p>
            </div>
            <Button
              onClick={generatePickList}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {isGenerating ? "Generating..." : "Generate Pick List"}
            </Button>
          </div>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Package className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">{stats.activeLists}</p>
                    <p className="text-gray-600">Active Lists</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">{stats.inProgress}</p>
                    <p className="text-gray-600">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">{stats.completedToday}</p>
                    <p className="text-gray-600">Completed Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">
                      {stats.averageProgress}%
                    </p>
                    <p className="text-gray-600">Avg Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search pick lists, orders, or users..."
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
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center py-12 gap-2 mt-4">
              {/* <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div> */}
              <Loader className="animate-spin text2xl" />
              <p className="text-gray-600">Loading pick lists...</p>
            </div>
          ) : filteredPickLists.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No pick lists found
              </h3>
              <Button onClick={generatePickList} disabled={isGenerating}>
                Generate First Pick List
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {filteredPickLists.map((pickList) => (
                <Card
                  key={pickList.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {pickList.batchNumber}
                        </CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge className={getStatusColor(pickList.status)}>
                            {pickList.status.replace("_", " ")}
                          </Badge>
                          <Badge
                            className={getPriorityColor(pickList.priority)}
                          >
                            {pickList.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Items</div>
                        <div className="font-semibold">
                          {pickList.pickedItems}/{pickList.totalItems}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{pickList.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${pickList.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Orders */}
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Orders:</div>
                      <div className="flex flex-wrap gap-1">
                        {pickList.orders.slice(0, 3).map((order) => (
                          <Badge
                            key={order}
                            variant="secondary"
                            className="text-xs"
                          >
                            {order}
                          </Badge>
                        ))}
                        {pickList.orders.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{pickList.orders.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Timing */}
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Created:{" "}
                        {new Date(pickList.createdAt).toLocaleDateString()}
                      </div>
                      {pickList.startTime && (
                        <div className="flex items-center">
                          <Play className="w-4 h-4 mr-1" />
                          Started:{" "}
                          {new Date(pickList.startTime).toLocaleTimeString()}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {pickList.status === "PENDING" && (
                        <Button
                          onClick={() => startPicking(pickList.id)}
                          className="flex-1"
                          size="sm"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Picking
                        </Button>
                      )}

                      {pickList.status === "IN_PROGRESS" && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `${path}/mobile/${pickList.id}`,
                              "_blank"
                            )
                          }
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          View Mobile
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewDetails(pickList.id)}
                      >
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Details Modal */}
        {details && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <Card className="h-full">
                <CardHeader className="border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl">
                        {details.pickList.batchNumber} Details
                      </CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge
                          className={getStatusColor(details.pickList.status)}
                        >
                          {details.pickList.status.replace("_", " ")}
                        </Badge>
                        <Badge
                          className={getPriorityColor(
                            getPriorityLabel(details.pickList.priority)
                          )}
                        >
                          {getPriorityLabel(details.pickList.priority)}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="outline" onClick={closeDetails}>
                      Close
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {/* Statistics */}
                  <div className="p-6 border-b bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {details.items.reduce(
                            (sum, item) => sum + item.quantityToPick,
                            0
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Total Qty</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {details.stats.pickedItems}
                        </div>
                        <div className="text-sm text-gray-600">Picked</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {details.stats.totalItems}
                        </div>
                        <div className="text-sm text-gray-600">Products</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {details.stats.uniqueOrders.length}
                        </div>
                        <div className="text-sm text-gray-600">Orders</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(details.stats.totalValue)}
                        </div>
                        <div className="text-sm text-gray-600">Value</div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-b">
                    <div className="flex">
                      {["items", "events", "orders"].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                            activeTab === tab
                              ? "border-blue-500 text-blue-600"
                              : "border-transparent text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6 max-h-96 overflow-y-auto">
                    {activeTab === "items" && (
                      <div className="space-y-3">
                        {details.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="text-sm font-mono text-gray-500">
                                #{item.sequence}
                              </div>
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  item.status === "PICKED"
                                    ? "bg-green-500"
                                    : item.status === "SKIPPED"
                                    ? "bg-red-500"
                                    : item.status === "SHORT_PICK"
                                    ? "bg-yellow-500"
                                    : "bg-gray-300"
                                }`}
                              />
                              <div>
                                <div className="font-medium">
                                  {item.product.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  SKU: {item.product.sku} | Location:{" "}
                                  {item.location.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Order: {item.order.orderNumber} (
                                  {item.order.customerName})
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {item.quantityPicked}/{item.quantityToPick}
                              </div>
                              <Badge className={getStatusColor(item.status)}>
                                {item.status.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "events" && (
                      <div className="space-y-3">
                        {details.events.map((event) => (
                          <div
                            key={event.id}
                            className="border-l-4 border-blue-500 pl-4 py-2"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">
                                  {event.type.replace("_", " ").toLowerCase()}
                                </div>
                                <div className="text-sm text-gray-600">
                                  by {event.user}
                                  {event.location && ` at ${event.location}`}
                                </div>
                                {event.notes && (
                                  <div className="text-sm text-gray-500 mt-1">
                                    {event.notes}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(event.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "orders" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {details.stats.uniqueOrders.map((orderNumber) => {
                          const orderItems = details.items.filter(
                            (item) => item.order.orderNumber === orderNumber
                          );
                          const firstItem = orderItems[0];
                          return (
                            <Card key={orderNumber}>
                              <CardContent className="p-4">
                                <div className="font-medium mb-2">
                                  {orderNumber}
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                  Customer: {firstItem?.order.customerName}
                                </div>
                                <div className="text-sm">
                                  <div>Items: {orderItems.length}</div>
                                  <div>
                                    Value: $
                                    {Number(
                                      firstItem?.order.totalAmount || 0
                                    ).toFixed(2)}
                                  </div>
                                  <div>
                                    Progress:{" "}
                                    {
                                      orderItems.filter(
                                        (item) => item.status === "PICKED"
                                      ).length
                                    }
                                    /{orderItems.length}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t p-6">
                    <div className="flex gap-3">
                      {details.pickList.status === "IN_PROGRESS" && (
                        <>
                          <Button
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <Pause className="w-4 h-4" />
                            Pause
                          </Button>
                          <Button className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Complete
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() =>
                          window.open(
                            `${path}/mobile/${details.pickList.id}`,
                            "_blank"
                          )
                        }
                      >
                        <MapPin className="w-4 h-4" />
                        Mobile View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
