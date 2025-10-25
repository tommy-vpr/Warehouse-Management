// components/backorders/BackOrderShippingManager.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BackOrder {
  id: string;
  sku: string;
  productName: string;
  quantityBackOrdered: number;
  quantityFulfilled: number;
  remainingNeeded: number;
  status: string;
  availableInventory: number;
  canFulfill: boolean;
  weight: number | null;
  dimensions: {
    length: number | null;
    width: number | null;
    height: number | null;
  };
  package: {
    id: string;
    packageNumber: number;
    trackingNumber: string;
    shippingLabelUrl: string;
  } | null;
}

interface OrderGroup {
  orderId: string;
  orderNumber: string;
  customerName: string;
  backOrderCount: number;
  totalBackOrdered: number;
  totalRemaining: number;
  allPacked: boolean;
  readyToShipTogether: boolean;
  estimatedWeight: number;
  estimatedDimensions: {
    length: number;
    width: number;
    height: number;
  };
  hasShippingAddress: boolean;
  backOrders: BackOrder[];
}

interface Stats {
  totalOrders: number;
  ordersWithMultipleBackOrders: number;
  ordersReadyToShip: number;
  totalBackOrders: number;
}

export function BackOrderShippingManager() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/backorders/grouped?readyForShipping=true"
      );

      if (!response.ok) throw new Error("Failed to load orders");

      const data = await response.json();
      setOrders(data.orders || []);
      setStats(data.stats);
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

  const toggleOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const selectAll = () => {
    const readyOrders = orders.filter(
      (o) => o.readyToShipTogether && o.hasShippingAddress
    );
    setSelectedOrders(new Set(readyOrders.map((o) => o.orderId)));
  };

  const deselectAll = () => {
    setSelectedOrders(new Set());
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      PENDING: { variant: "secondary", label: "Pending" },
      ALLOCATED: { variant: "outline", label: "Allocated" },
      PICKING: { variant: "outline", label: "Picking" },
      PICKED: { variant: "outline", label: "Picked" },
      PACKED: { variant: "default", label: "Packed" },
      FULFILLED: { variant: "default", label: "Fulfilled" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
    };

    const config = statusConfig[status] || {
      variant: "secondary",
      label: status,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Orders Ready
                  </p>
                  <h3 className="text-2xl font-bold">{stats.totalOrders}</h3>
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
                    Ready to Ship
                  </p>
                  <h3 className="text-2xl font-bold">
                    {stats.ordersReadyToShip}
                  </h3>
                </div>
                <Truck className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Multiple Items
                  </p>
                  <h3 className="text-2xl font-bold">
                    {stats.ordersWithMultipleBackOrders}
                  </h3>
                </div>
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Items
                  </p>
                  <h3 className="text-2xl font-bold">
                    {stats.totalBackOrders}
                  </h3>
                </div>
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Orders with Back Orders Ready to Ship</CardTitle>
        </CardHeader>
        <CardContent>
          {!orders || orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No back orders ready for shipping labels</p>
              <p className="text-sm">Back orders must be in PACKED status</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.orderId} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Order Header */}
                    <div className="flex items-center justify-between p-4 bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {order.orderNumber}
                            </span>
                            {!order.hasShippingAddress && (
                              <Badge variant="destructive">No Address</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.customerName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="font-medium">
                            {order.backOrderCount} item
                            {order.backOrderCount > 1 ? "s" : ""}
                          </p>
                          <p className="text-muted-foreground">
                            {order.estimatedWeight.toFixed(1)} oz
                          </p>
                        </div>

                        {/* ✅ CHANGED: Link to packing interface instead of API call */}
                        <Link href={`/dashboard/packing/pack/${order.orderId}`}>
                          <Button
                            disabled={
                              !order.readyToShipTogether ||
                              !order.hasShippingAddress
                            }
                            size="sm"
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            Create Label
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Back Orders Table */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Weight</TableHead>
                          <TableHead>Tracking</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.backOrders.map((backOrder) => (
                          <TableRow key={backOrder.id}>
                            <TableCell className="font-mono text-sm">
                              {backOrder.sku}
                            </TableCell>
                            <TableCell>{backOrder.productName}</TableCell>
                            <TableCell className="text-right">
                              {backOrder.quantityBackOrdered}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(backOrder.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              {backOrder.weight
                                ? `${(
                                    (backOrder.weight / 28.3495) *
                                    backOrder.quantityBackOrdered
                                  ).toFixed(1)} oz`
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {backOrder.package ? (
                                <a
                                  href={backOrder.package.shippingLabelUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  {backOrder.package.trackingNumber}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// // components/backorders/BackOrderShippingManager.tsx
// "use client";

// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Package,
//   Truck,
//   CheckCircle2,
//   AlertCircle,
//   Loader2,
//   ExternalLink,
// } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";

// interface BackOrder {
//   id: string;
//   sku: string;
//   productName: string;
//   quantityBackOrdered: number;
//   quantityFulfilled: number;
//   remainingNeeded: number;
//   status: string;
//   availableInventory: number;
//   canFulfill: boolean;
//   weight: number | null;
//   dimensions: {
//     length: number | null;
//     width: number | null;
//     height: number | null;
//   };
//   package: {
//     id: string;
//     packageNumber: number;
//     trackingNumber: string;
//     shippingLabelUrl: string;
//   } | null;
// }

// interface OrderGroup {
//   orderId: string;
//   orderNumber: string;
//   customerName: string;
//   backOrderCount: number;
//   totalBackOrdered: number;
//   totalRemaining: number;
//   allPacked: boolean;
//   readyToShipTogether: boolean;
//   estimatedWeight: number;
//   estimatedDimensions: {
//     length: number;
//     width: number;
//     height: number;
//   };
//   hasShippingAddress: boolean;
//   backOrders: BackOrder[];
// }

// interface Stats {
//   totalOrders: number;
//   ordersWithMultipleBackOrders: number;
//   ordersReadyToShip: number;
//   totalBackOrders: number;
// }

// export function BackOrderShippingManager() {
//   const [orders, setOrders] = useState<OrderGroup[]>([]);
//   const [stats, setStats] = useState<Stats | null>(null);
//   const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
//   const [loading, setLoading] = useState(false);
//   const [carrierCode, setCarrierCode] = useState("usps");
//   const [serviceCode, setServiceCode] = useState("usps_priority_mail");
//   const [insuranceAmount, setInsuranceAmount] = useState("0");
//   const { toast } = useToast();

//   useEffect(() => {
//     loadOrders();
//   }, []);

//   const loadOrders = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(
//         "/api/backorders/grouped?readyForShipping=true"
//       );

//       if (!response.ok) throw new Error("Failed to load orders");

//       const data = await response.json();
//       setOrders(data.orders);
//       setStats(data.stats);
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to load back orders",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const toggleOrderSelection = (orderId: string) => {
//     const newSelection = new Set(selectedOrders);
//     if (newSelection.has(orderId)) {
//       newSelection.delete(orderId);
//     } else {
//       newSelection.add(orderId);
//     }
//     setSelectedOrders(newSelection);
//   };

//   const selectAll = () => {
//     const readyOrders = orders.filter(
//       (o) => o.readyToShipTogether && o.hasShippingAddress
//     );
//     setSelectedOrders(new Set(readyOrders.map((o) => o.orderId)));
//   };

//   const deselectAll = () => {
//     setSelectedOrders(new Set());
//   };

//   const createSingleLabel = async (orderId: string) => {
//     try {
//       setLoading(true);
//       const response = await fetch("/api/backorders/shipping-label", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           orderId,
//           carrierCode,
//           serviceCode,
//           insuranceAmount: parseFloat(insuranceAmount) || 0,
//         }),
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || "Failed to create label");
//       }

//       const result = await response.json();

//       toast({
//         title: "Success",
//         description: `Shipping label created: ${result.data.trackingNumber}`,
//       });

//       // Reload orders
//       await loadOrders();
//     } catch (error) {
//       toast({
//         title: "Error",
//         description:
//           error instanceof Error ? error.message : "Failed to create label",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const createBulkLabels = async () => {
//     if (selectedOrders.size === 0) {
//       toast({
//         title: "No orders selected",
//         description: "Please select at least one order",
//         variant: "destructive",
//       });
//       return;
//     }

//     try {
//       setLoading(true);
//       const response = await fetch("/api/backorders/bulk-shipping-labels", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           orderIds: Array.from(selectedOrders),
//           carrierCode,
//           serviceCode,
//           insuranceAmount: parseFloat(insuranceAmount) || 0,
//         }),
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || "Failed to create labels");
//       }

//       const result = await response.json();

//       toast({
//         title: "Bulk processing complete",
//         description: `${result.summary.succeeded} labels created, ${result.summary.failed} failed`,
//       });

//       // Clear selection and reload
//       setSelectedOrders(new Set());
//       await loadOrders();
//     } catch (error) {
//       toast({
//         title: "Error",
//         description:
//           error instanceof Error ? error.message : "Failed to create labels",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getStatusBadge = (status: string) => {
//     const statusConfig: Record<
//       string,
//       {
//         label: string;
//         variant: "default" | "secondary" | "destructive" | "outline";
//       }
//     > = {
//       PENDING: { label: "Pending", variant: "secondary" },
//       ALLOCATED: { label: "Allocated", variant: "default" },
//       PICKING: { label: "Picking", variant: "default" },
//       PICKED: { label: "Picked", variant: "default" },
//       PACKED: { label: "Packed", variant: "outline" },
//       FULFILLED: { label: "Fulfilled", variant: "outline" },
//     };

//     const config = statusConfig[status] || {
//       label: status,
//       variant: "default",
//     };
//     return <Badge variant="outline">{config.label}</Badge>;
//   };

//   if (loading && orders.length === 0) {
//     return (
//       <div className="flex items-center justify-center p-8">
//         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Stats */}
//       {stats && (
//         <div className="grid gap-4 md:grid-cols-4">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Orders Ready
//               </CardTitle>
//               <Package className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">
//                 {stats.ordersReadyToShip}
//               </div>
//               <p className="text-xs text-muted-foreground">
//                 of {stats.totalOrders} with back orders
//               </p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Multiple Items
//               </CardTitle>
//               <Package className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">
//                 {stats.ordersWithMultipleBackOrders}
//               </div>
//               <p className="text-xs text-muted-foreground">
//                 orders with 2+ back orders
//               </p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Total Back Orders
//               </CardTitle>
//               <Truck className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{stats.totalBackOrders}</div>
//               <p className="text-xs text-muted-foreground">
//                 items ready to ship
//               </p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">Selected</CardTitle>
//               <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{selectedOrders.size}</div>
//               <p className="text-xs text-muted-foreground">
//                 orders for bulk processing
//               </p>
//             </CardContent>
//           </Card>
//         </div>
//       )}

//       {/* Shipping Settings */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Shipping Settings</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="grid gap-4 md:grid-cols-4">
//             <div className="space-y-2">
//               <Label>Carrier</Label>
//               <Select value={carrierCode} onValueChange={setCarrierCode}>
//                 <SelectTrigger>
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="usps">USPS</SelectItem>
//                   <SelectItem value="ups">UPS</SelectItem>
//                   <SelectItem value="fedex">FedEx</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>

//             <div className="space-y-2">
//               <Label>Service</Label>
//               <Select value={serviceCode} onValueChange={setServiceCode}>
//                 <SelectTrigger>
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="usps_priority_mail">
//                     Priority Mail
//                   </SelectItem>
//                   <SelectItem value="usps_first_class_mail">
//                     First Class
//                   </SelectItem>
//                   <SelectItem value="usps_priority_mail_express">
//                     Priority Express
//                   </SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>

//             <div className="space-y-2">
//               <Label>Insurance Amount ($)</Label>
//               <Input
//                 type="number"
//                 value={insuranceAmount}
//                 onChange={(e) => setInsuranceAmount(e.target.value)}
//                 placeholder="0.00"
//                 step="0.01"
//               />
//             </div>

//             <div className="space-y-2">
//               <Label className="invisible">Actions</Label>
//               <div className="flex gap-2">
//                 <Button
//                   onClick={selectAll}
//                   variant="outline"
//                   size="sm"
//                   className="flex-1"
//                 >
//                   Select All
//                 </Button>
//                 <Button
//                   onClick={deselectAll}
//                   variant="outline"
//                   size="sm"
//                   className="flex-1"
//                 >
//                   Clear
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Bulk Actions */}
//       {selectedOrders.size > 0 && (
//         <Card className="border-primary">
//           <CardContent className="pt-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="font-medium">
//                   {selectedOrders.size} order
//                   {selectedOrders.size > 1 ? "s" : ""} selected
//                 </p>
//                 <p className="text-sm text-muted-foreground">
//                   Create shipping labels for all selected orders
//                 </p>
//               </div>
//               <Button onClick={createBulkLabels} disabled={loading}>
//                 {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
//                 <Truck className="mr-2 h-4 w-4" />
//                 Create {selectedOrders.size} Label
//                 {selectedOrders.size > 1 ? "s" : ""}
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {/* Orders List */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Orders with Back Orders Ready to Ship</CardTitle>
//         </CardHeader>
//         <CardContent>
//           {!orders || orders.length === 0 ? (
//             <div className="text-center py-8 text-muted-foreground">
//               <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
//               <p>No back orders ready for shipping labels</p>
//               <p className="text-sm">Back orders must be in PACKED status</p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {orders.map((order) => (
//                 <Card key={order.orderId} className="overflow-hidden">
//                   <CardContent className="p-0">
//                     {/* Order Header */}
//                     <div className="flex items-center justify-between p-4 bg-muted/50">
//                       <div className="flex items-center gap-3">
//                         <Checkbox
//                           checked={selectedOrders.has(order.orderId)}
//                           onCheckedChange={() =>
//                             toggleOrderSelection(order.orderId)
//                           }
//                           disabled={
//                             !order.readyToShipTogether ||
//                             !order.hasShippingAddress
//                           }
//                         />
//                         <div>
//                           <div className="flex items-center gap-2">
//                             <span className="font-medium">
//                               {order.orderNumber}
//                             </span>
//                             {!order.hasShippingAddress && (
//                               <Badge variant="destructive">No Address</Badge>
//                             )}
//                           </div>
//                           <p className="text-sm text-muted-foreground">
//                             {order.customerName}
//                           </p>
//                         </div>
//                       </div>

//                       <div className="flex items-center gap-4">
//                         <div className="text-right text-sm">
//                           <p className="font-medium">
//                             {order.backOrderCount} item
//                             {order.backOrderCount > 1 ? "s" : ""}
//                           </p>
//                           <p className="text-muted-foreground">
//                             {order.estimatedWeight.toFixed(1)} oz
//                           </p>
//                         </div>

//                         <Button
//                           onClick={() => createSingleLabel(order.orderId)}
//                           disabled={
//                             loading ||
//                             !order.readyToShipTogether ||
//                             !order.hasShippingAddress
//                           }
//                           size="sm"
//                         >
//                           {loading && (
//                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                           )}
//                           <Truck className="mr-2 h-4 w-4" />
//                           Create Label
//                         </Button>
//                       </div>
//                     </div>

//                     {/* Back Orders Table */}
//                     <Table>
//                       <TableHeader>
//                         <TableRow>
//                           <TableHead>SKU</TableHead>
//                           <TableHead>Product</TableHead>
//                           <TableHead className="text-right">Quantity</TableHead>
//                           <TableHead>Status</TableHead>
//                           <TableHead className="text-right">Weight</TableHead>
//                           <TableHead>Tracking</TableHead>
//                         </TableRow>
//                       </TableHeader>
//                       <TableBody>
//                         {order.backOrders.map((backOrder) => (
//                           <TableRow key={backOrder.id}>
//                             <TableCell className="font-mono text-sm">
//                               {backOrder.sku}
//                             </TableCell>
//                             <TableCell>{backOrder.productName}</TableCell>
//                             <TableCell className="text-right">
//                               {backOrder.quantityBackOrdered}
//                             </TableCell>
//                             <TableCell>
//                               {getStatusBadge(backOrder.status)}
//                             </TableCell>
//                             <TableCell className="text-right">
//                               {backOrder.weight
//                                 ? `${(
//                                     (backOrder.weight / 28.3495) *
//                                     backOrder.quantityBackOrdered
//                                   ).toFixed(1)} oz`
//                                 : "—"}
//                             </TableCell>
//                             <TableCell>
//                               {backOrder.package ? (
//                                 <a
//                                   href={backOrder.package.shippingLabelUrl}
//                                   target="_blank"
//                                   rel="noopener noreferrer"
//                                   className="flex items-center gap-1 text-primary hover:underline"
//                                 >
//                                   {backOrder.package.trackingNumber}
//                                   <ExternalLink className="h-3 w-3" />
//                                 </a>
//                               ) : (
//                                 <span className="text-muted-foreground">—</span>
//                               )}
//                             </TableCell>
//                           </TableRow>
//                         ))}
//                       </TableBody>
//                     </Table>
//                   </CardContent>
//                 </Card>
//               ))}
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
