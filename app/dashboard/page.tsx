"use client";

import React, { useState } from "react";
import {
  Package,
  ShoppingCart,
  Truck,
  Scan,
  Bell,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateItemModal } from "@/components/modal/CreateItemModal";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      return res.json();
    },
    refetchInterval: 30000,
  });

  console.log(stats);

  const { data: activity } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/activity");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/low-stock");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const displayStats = stats || {
    totalProducts: 0,
    lowStock: 0,
    pendingOrders: 0,
    todayShipments: 0,
    // New stats for workflow
    ordersToPick: 0,
    ordersToPack: 0,
    ordersToShip: 0,
  };

  const displayActivity = activity || [];
  const displayLowStockItems = lowStockItems || [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case "inventory":
        return <Package className="w-4 h-4 text-green-500" />;
      case "shipment":
        return <Truck className="w-4 h-4 text-teal-500" />;
      case "scan":
        return <Scan className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500 dark:text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayStats.totalProducts.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Low Stock Items
              </CardTitle>
              <Badge variant="destructive" className="text-xs">
                {displayStats.lowStock}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {displayStats.lowStock}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Orders to Pick
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayStats.ordersToPick || displayStats.pendingOrders}
              </div>
              <p className="text-xs text-muted-foreground">Ready for picking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Shipments
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayStats.todayShipments}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  To Pick
                </span>
                <Badge variant="secondary">
                  {displayStats.ordersToPick || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Orders allocated and ready for picking
              </p>
              <Link href="/dashboard/picking">
                <Button size="sm" className="w-full">
                  Start Picking
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  To Pack
                </span>
                <Badge variant="secondary">
                  {displayStats.ordersToPack || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Picked orders ready for packing
              </p>
              <Link href="/dashboard/packing">
                <Button size="sm" className="w-full" variant="outline">
                  Pack Orders
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center">
                  <Truck className="w-4 h-4 mr-2" />
                  To Ship
                </span>
                <Badge variant="secondary">
                  {displayStats.ordersToShip || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Packed orders ready for shipping
              </p>
              <Link href="/dashboard/shipping">
                <Button size="sm" className="w-full" variant="outline">
                  Create Labels
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="xl:max-h-[600px] overflow-y-scroll">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Activity
                <Badge variant="outline">{displayActivity.length}</Badge>
              </CardTitle>
              <CardDescription>Latest warehouse operations</CardDescription>
            </CardHeader>
            <CardContent>
              {!activity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : displayActivity.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {displayActivity.map((activity: any) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-3"
                      >
                        {getActivityIcon(activity.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-200">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.time}
                            {activity.userName && (
                              <span className="ml-1 text-blue-500">
                                • by {activity.userName}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => router.push("/dashboard/activity")}
                  >
                    View All
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Items */}
          <Card className="xl:max-h-[600px] overflow-y-scroll">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Low Stock Items
                <Badge variant="outline">{displayLowStockItems.length}</Badge>
              </CardTitle>
              <CardDescription>Items below minimum threshold</CardDescription>
            </CardHeader>
            <CardContent>
              {!lowStockItems ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : displayLowStockItems.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {displayLowStockItems.map((item: any) => (
                      <div
                        key={item.sku}
                        className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                      >
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            SKU: {item.sku} • {item.location}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            {item.current}/{item.minimum}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Current/Min
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() =>
                      router.push(
                        "/dashboard/purchasing/inventory?status=CRITICAL"
                      )
                    }
                  >
                    View All
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">All items are well stocked</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Core WMS Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Core warehouse operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Pick Orders */}
              <Link href="/dashboard/picking">
                <Button
                  variant="outline"
                  className="h-20 flex-col w-full cursor-pointer"
                >
                  <ShoppingCart className="w-6 h-6 mb-2" />
                  <span className="text-sm">Pick Orders</span>
                </Button>
              </Link>

              {/* Pack Orders */}
              <Link href="/dashboard/packing">
                <Button
                  variant="outline"
                  className="h-20 flex-col w-full cursor-pointer"
                >
                  <Package className="w-6 h-6 mb-2" />
                  <span className="text-sm">Pack Orders</span>
                </Button>
              </Link>

              {/* Receive Items */}
              <Link href="/dashboard/inventory/receive">
                <Button
                  variant="outline"
                  className="h-20 flex-col w-full cursor-pointer"
                >
                  <Scan className="w-6 h-6 mb-2" />
                  <span className="text-sm">Receive Stock</span>
                </Button>
              </Link>

              {/* Cycle Count */}
              <Link href="/dashboard/inventory/count">
                <Button
                  variant="outline"
                  className="h-20 flex-col w-full cursor-pointer"
                >
                  <ClipboardCheck className="w-6 h-6 mb-2" />
                  <span className="text-sm">Cycle Count</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Item Modal */}
      <CreateItemModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

// "use client";

// import React, { useState } from "react";
// import {
//   Package,
//   ShoppingCart,
//   Truck,
//   Scan,
//   Bell,
//   Loader2,
//   ClipboardCheck,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { CreateItemModal } from "@/components/modal/CreateItemModal";
// import Link from "next/link";
// import { useQuery } from "@tanstack/react-query";
// import { useRouter } from "next/navigation";

// export default function Dashboard() {
//   const router = useRouter();
//   const [createOpen, setCreateOpen] = useState(false);

//   const { data: stats } = useQuery({
//     queryKey: ["dashboard-stats"],
//     queryFn: async () => {
//       const res = await fetch("/api/dashboard/stats");
//       return res.json();
//     },
//     refetchInterval: 30000, // Refresh every 30 seconds
//   });

//   const { data: activity } = useQuery({
//     queryKey: ["dashboard-activity"],
//     queryFn: async () => {
//       const res = await fetch("/api/dashboard/activity");
//       return res.json();
//     },
//     refetchInterval: 10000, // Refresh every 10 seconds
//   });

//   const { data: lowStockItems } = useQuery({
//     queryKey: ["dashboard-low-stock"],
//     queryFn: async () => {
//       const res = await fetch("/api/dashboard/low-stock");
//       return res.json();
//     },
//     refetchInterval: 60000, // Refresh every minute
//   });

//   const displayStats = stats || {
//     totalProducts: 0,
//     lowStock: 0,
//     pendingOrders: 0,
//     todayShipments: 0,
//   };

//   const displayActivity = activity || [];
//   const displayLowStockItems = lowStockItems || [];

//   const getActivityIcon = (type: string) => {
//     switch (type) {
//       case "order":
//         return <ShoppingCart className="w-4 h-4 text-blue-500" />;
//       case "inventory":
//         return <Package className="w-4 h-4 text-green-500" />;
//       case "shipment":
//         return <Truck className="w-4 h-4 text-teal-500" />;
//       case "scan":
//         return <Scan className="w-4 h-4 text-orange-500" />;
//       default:
//         return <Bell className="w-4 h-4 text-gray-500 dark:text-blue-500" />;
//     }
//   };

//   return (
//     <div className="min-h-screen bg-background">
//       <div className="space-y-6">
//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Total Products
//               </CardTitle>
//               <Package className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">
//                 {displayStats.totalProducts.toLocaleString()}
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Low Stock Items
//               </CardTitle>
//               <Badge variant="destructive" className="text-xs">
//                 {displayStats.lowStock}
//               </Badge>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-red-400">
//                 {displayStats.lowStock}
//               </div>
//               <p className="text-xs text-muted-foreground">
//                 Requires attention
//               </p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Pending Orders
//               </CardTitle>
//               <ShoppingCart className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">
//                 {displayStats.pendingOrders}
//               </div>
//               <p className="text-xs text-muted-foreground">
//                 Ready for fulfillment
//               </p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Today's Shipments
//               </CardTitle>
//               <Truck className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">
//                 {displayStats.todayShipments}
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {/* Recent Activity */}
//           <Card className="xl:max-h-[600px] overflow-y-scroll">
//             <CardHeader>
//               <CardTitle className="flex items-center justify-between">
//                 Recent Activity
//                 <Badge variant="outline">{displayActivity.length}</Badge>
//               </CardTitle>
//               <CardDescription>Latest warehouse operations</CardDescription>
//             </CardHeader>
//             <CardContent>
//               {!activity ? (
//                 <div className="flex items-center justify-center py-8">
//                   <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
//                 </div>
//               ) : displayActivity.length > 0 ? (
//                 <>
//                   <div className="space-y-4">
//                     {displayActivity.map((activity: any) => (
//                       <div
//                         key={activity.id}
//                         className="flex items-start space-x-3"
//                       >
//                         {getActivityIcon(activity.type)}
//                         <div className="flex-1 min-w-0">
//                           <p className="text-sm text-gray-900 dark:text-gray-200">
//                             {activity.message}
//                           </p>
//                           <p className="text-xs text-gray-500 dark:text-gray-400">
//                             {activity.time}
//                             {activity.userName && (
//                               <span className="ml-1 text-blue-500">
//                                 • by {activity.userName}
//                               </span>
//                             )}
//                           </p>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                   <Button
//                     variant="outline"
//                     className="w-full mt-4"
//                     onClick={() => router.push("/dashboard/activity")}
//                   >
//                     View All
//                   </Button>
//                 </>
//               ) : (
//                 <div className="text-center py-8 text-gray-500">
//                   <p className="text-sm">No recent activity</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>

//           {/* Low Stock Items */}
//           <Card className="xl:max-h-[600px] overflow-y-scroll">
//             <CardHeader>
//               <CardTitle className="flex items-center justify-between">
//                 Low Stock Items
//                 <Badge variant="outline">{displayLowStockItems.length}</Badge>
//               </CardTitle>
//               <CardDescription>Items below minimum threshold</CardDescription>
//             </CardHeader>
//             <CardContent>
//               {!lowStockItems ? (
//                 <div className="flex items-center justify-center py-8">
//                   <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
//                 </div>
//               ) : displayLowStockItems.length > 0 ? (
//                 <>
//                   <div className="space-y-3">
//                     {displayLowStockItems.map((item: any) => (
//                       <div
//                         key={item.sku}
//                         className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
//                       >
//                         <div>
//                           <p className="font-medium text-sm">{item.name}</p>
//                           <p className="text-xs text-gray-600 dark:text-gray-400">
//                             SKU: {item.sku} • {item.location}
//                           </p>
//                         </div>
//                         <div className="text-right">
//                           <p className="text-sm font-medium text-red-600 dark:text-red-400">
//                             {item.current}/{item.minimum}
//                           </p>
//                           <p className="text-xs text-gray-500 dark:text-gray-400">
//                             Current/Min
//                           </p>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                   <Button
//                     variant="outline"
//                     className="w-full mt-4"
//                     onClick={() =>
//                       router.push(
//                         "/dashboard/purchasing/inventory?status=CRITICAL"
//                       )
//                     }
//                   >
//                     View All
//                   </Button>
//                 </>
//               ) : (
//                 <div className="text-center py-8 text-gray-500">
//                   <p className="text-sm">All items are well stocked</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </div>

//         {/* Quick Actions */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Quick Actions</CardTitle>
//             <CardDescription>Common warehouse operations</CardDescription>
//           </CardHeader>
//           <CardContent>
//             {/* Quick Actions - Updated */}
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//               {/* Pick Orders */}
//               <Link href="/dashboard/picking">
//                 <Button
//                   variant="outline"
//                   className="h-20 flex-col w-full cursor-pointer"
//                 >
//                   <ShoppingCart className="w-6 h-6 mb-2" />
//                   <span className="text-sm">Pick Orders</span>
//                 </Button>
//               </Link>

//               {/* Pack Orders */}
//               <Link href="/dashboard/packing">
//                 <Button
//                   variant="outline"
//                   className="h-20 flex-col w-full cursor-pointer"
//                 >
//                   <Package className="w-6 h-6 mb-2" />
//                   <span className="text-sm">Pack Orders</span>
//                 </Button>
//               </Link>

//               {/* Receive Items */}
//               <Link href="/dashboard/inventory/receive">
//                 <Button
//                   variant="outline"
//                   className="h-20 flex-col w-full cursor-pointer"
//                 >
//                   <Scan className="w-6 h-6 mb-2" />
//                   <span className="text-sm">Receive Stock</span>
//                 </Button>
//               </Link>

//               {/* Cycle Count */}
//               <Link href="/dashboard/inventory/count">
//                 <Button
//                   variant="outline"
//                   className="h-20 flex-col w-full cursor-pointer"
//                 >
//                   <ClipboardCheck className="w-6 h-6 mb-2" />
//                   <span className="text-sm">Cycle Count</span>
//                 </Button>
//               </Link>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Create Item Modal */}
//       <CreateItemModal open={createOpen} onOpenChange={setCreateOpen} />
//     </div>
//   );
// }
