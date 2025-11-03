// components/backorders/ImprovedBackOrderAllocationManager.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface BackOrder {
  id: string;
  sku: string;
  productName: string;
  quantityBackOrdered: number;
  quantityFulfilled: number;
  status: string;
  reason: string;
  availableInventory: number;
  canFulfill: boolean;
  createdAt: string;
}

interface OrderGroup {
  orderId: string;
  orderNumber: string;
  customerName: string;
  backOrderCount: number;
  totalBackOrdered: number;
  allCanFulfill: boolean;
  backOrders: BackOrder[];
}

export default function ImprovedBackOrderAllocationManager() {
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [allocatingOrders, setAllocatingOrders] = useState<Set<string>>(
    new Set()
  );
  const [allocatingBackOrders, setAllocatingBackOrders] = useState<Set<string>>(
    new Set()
  );
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadBackOrders();
  }, []);

  const loadBackOrders = async () => {
    try {
      setLoading(true);
      // Get orders grouped by order, filtered to PENDING status
      const response = await fetch("/api/backorders/grouped?status=PENDING");

      if (!response.ok) throw new Error("Failed to load back orders");

      const data = await response.json();
      setOrderGroups(data.orders || []);

      // Auto-expand orders that have back orders ready to allocate
      const readyOrders = data.orders
        .filter((o: OrderGroup) =>
          o.backOrders.some((bo: BackOrder) => bo.canFulfill)
        )
        .map((o: OrderGroup) => o.orderId);
      setExpandedOrders(new Set(readyOrders));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load back orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Allocate ALL back orders for an order at once (batch)
  // This just loops through and calls the individual endpoint
  const allocateAllForOrder = async (orderId: string) => {
    const order = orderGroups.find((o) => o.orderId === orderId);
    if (!order) return;

    setAllocatingOrders((prev) => new Set(prev).add(orderId));

    const results = [];

    // Allocate each back order individually
    for (const backOrder of order.backOrders) {
      if (backOrder.canFulfill) {
        try {
          const response = await fetch(
            `/api/backorders/${backOrder.id}/fulfill`,
            {
              method: "POST",
            }
          );

          if (response.ok) {
            results.push({ success: true, sku: backOrder.sku });
          } else {
            const error = await response.json();
            results.push({
              success: false,
              sku: backOrder.sku,
              error: error.error,
            });
          }
        } catch (error) {
          results.push({ success: false, sku: backOrder.sku });
        }
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    if (failed.length > 0) {
      toast({
        title: "Partial Success",
        description: `Allocated ${succeeded} of ${results.length} back orders. ${failed.length} failed.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Allocated ${succeeded} back order(s)`,
      });
    }

    setAllocatingOrders((prev) => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      return newSet;
    });

    // Reload data
    await loadBackOrders();
  };

  // Allocate a single back order individually
  const allocateSingle = async (backOrderId: string) => {
    setAllocatingBackOrders((prev) => new Set(prev).add(backOrderId));

    try {
      const response = await fetch(`/api/backorders/${backOrderId}/fulfill`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to allocate back order");
      }

      toast({
        title: "Success",
        description: "Back order allocated successfully",
      });

      // Reload data
      await loadBackOrders();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to allocate",
        variant: "destructive",
      });
    } finally {
      setAllocatingBackOrders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(backOrderId);
        return newSet;
      });
    }
  };

  const toggleExpanded = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: "secondary", label: "Pending" },
      ALLOCATED: { variant: "default", label: "Allocated" },
      PICKING: { variant: "outline", label: "Picking" },
      PACKED: { variant: "default", label: "Packed" },
    };

    const statusConfig = config[status] || {
      variant: "secondary",
      label: status,
    };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  const getReasonBadge = (reason: string) => {
    const config: Record<string, string> = {
      INSUFFICIENT_STOCK_AT_ALLOCATION: "Out of Stock",
      SHORT_PICK: "Short Pick",
      ITEM_SKIPPED: "Skipped",
      DAMAGED_PRODUCT: "Damaged",
      LOCATION_EMPTY: "Location Empty",
      OTHER: "Other",
    };

    return (
      <Badge variant="outline" className="text-xs">
        {config[reason] || reason}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Orders with Back Orders
                </p>
                <h3 className="text-2xl font-bold">{orderGroups.length}</h3>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Back Orders
                </p>
                <h3 className="text-2xl font-bold">
                  {orderGroups.reduce((sum, o) => sum + o.backOrderCount, 0)}
                </h3>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ready to Allocate
                </p>
                <h3 className="text-2xl font-bold">
                  {orderGroups.filter((o) => o.allCanFulfill).length}
                </h3>
              </div>
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Back Orders Grouped by Order</CardTitle>
        </CardHeader>
        <CardContent>
          {orderGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending back orders</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orderGroups.map((orderGroup) => {
                const isExpanded = expandedOrders.has(orderGroup.orderId);
                const isAllocating = allocatingOrders.has(orderGroup.orderId);
                const readyCount = orderGroup.backOrders.filter(
                  (bo) => bo.canFulfill
                ).length;

                return (
                  <Collapsible
                    key={orderGroup.orderId}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(orderGroup.orderId)}
                  >
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {orderGroup.orderNumber}
                                </span>
                                <Badge variant="secondary">
                                  {orderGroup.backOrderCount} back order
                                  {orderGroup.backOrderCount > 1 ? "s" : ""}
                                </Badge>
                                {readyCount > 0 && (
                                  <Badge variant="default">
                                    {readyCount} ready
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {orderGroup.customerName}
                              </p>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Batch Allocate Button */}
                            {orderGroup.allCanFulfill && (
                              <Button
                                onClick={() =>
                                  allocateAllForOrder(orderGroup.orderId)
                                }
                                disabled={isAllocating}
                                size="sm"
                                className="mr-2"
                              >
                                {isAllocating ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Allocating...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Allocate All ({orderGroup.backOrderCount})
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">
                                  Quantity
                                </TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead className="text-right">
                                  Available
                                </TableHead>
                                <TableHead className="text-right">
                                  Action
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orderGroup.backOrders.map((backOrder) => {
                                const isAllocatingThis =
                                  allocatingBackOrders.has(backOrder.id);

                                return (
                                  <TableRow key={backOrder.id}>
                                    <TableCell className="font-mono text-sm">
                                      {backOrder.sku}
                                    </TableCell>
                                    <TableCell>
                                      {backOrder.productName}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {backOrder.quantityBackOrdered}
                                    </TableCell>
                                    <TableCell>
                                      {getStatusBadge(backOrder.status)}
                                    </TableCell>
                                    <TableCell>
                                      {getReasonBadge(backOrder.reason)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <span
                                        className={
                                          backOrder.canFulfill
                                            ? "text-green-600 font-medium"
                                            : "text-destructive"
                                        }
                                      >
                                        {backOrder.availableInventory}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {backOrder.canFulfill ? (
                                        <Button
                                          onClick={() =>
                                            allocateSingle(backOrder.id)
                                          }
                                          disabled={isAllocatingThis}
                                          size="sm"
                                          variant="outline"
                                        >
                                          {isAllocatingThis ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            "Allocate"
                                          )}
                                        </Button>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">
                                          Awaiting stock
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
