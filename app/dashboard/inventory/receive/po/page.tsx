// app/dashboard/inventory/receive/po/page.tsx
// UPDATED - Now passes barcodeId to button for smart "Generate" vs "View Label" behavior
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Package,
  Loader2,
  Calendar,
  BadgeCheck,
  FileText,
  Search,
  AlignLeft,
  RefreshCw,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import GeneratePOBarcodeButton from "@/components/inventory/GeneratePOBarcodeButton";
import Link from "next/link";
import { POListSkeleton } from "@/components/skeleton/POListSkeleton";

interface PurchaseOrder {
  id: string;
  reference: string;
  vendor_name: string;
  status: string;
  created_at: string;
  expected_date?: string;
  total_cost?: number;
  currency?: string;
  line_items?: Array<{
    sku: string;
    quantity_ordered: number;
  }>;
  hasPendingSession?: boolean;
  // ✅ NEW: Barcode fields
  barcodeId?: string | null;
  barcodeStatus?: string | null;
  hasBarcode?: boolean;
}

interface POResponse {
  success: boolean;
  purchaseOrders: PurchaseOrder[];
  meta: {
    total?: number;
  };
}

// Skeleton Component
// function POSkeleton() {
//   return (
//     <div className="space-y-4">
//       {[1, 2, 3, 4, 5].map((i) => (
//         <Card key={i} className="animate-pulse">
//           <CardContent className="p-6">
//             <div className="flex items-center justify-between">
//               <div className="flex-1">
//                 <div className="flex items-center flex-wrap gap-x-6 gap-y-3">
//                   <div className="flex items-center gap-2">
//                     <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
//                     <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
//                   </div>
//                   <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
//                   <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
//                     <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
//                     <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
//                   </div>
//                   <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
//                   <div className="flex gap-2">
//                     <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
//                     <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
//                   </div>
//                 </div>
//               </div>
//               <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded ml-4" />
//             </div>
//           </CardContent>
//         </Card>
//       ))}
//     </div>
//   );
// }

export default function POListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [statusFilter, setStatusFilter] = useState("open");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data, isLoading, isFetching, error, refetch } = useQuery<POResponse>({
    queryKey: ["purchase-orders", statusFilter, currentPage, itemsPerPage],
    queryFn: async () => {
      const res = await fetch(
        `/api/inventory-planner/purchase-orders?status=${statusFilter}&limit=${itemsPerPage}&page=${currentPage}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch POs");
      }

      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const isFiltering = isFetching && data !== undefined;

  // Filter by search term (client-side)
  const filteredPOs = data?.purchaseOrders?.filter((po) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      po.reference.toLowerCase().includes(searchLower) ||
      po.vendor_name?.toLowerCase().includes(searchLower) ||
      po.id.toLowerCase().includes(searchLower)
    );
  });

  // Calculate pagination
  const totalItems = data?.meta?.total || filteredPOs?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(0);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(0);
  };

  const handleReceiveClick = (po: PurchaseOrder) => {
    if (po.hasPendingSession) {
      toast({
        variant: "destructive",
        title: "⏳ Pending Approval",
        description: `PO ${po.reference} already has a receiving session pending approval. Please wait for approval before creating a new count.`,
      });
      return;
    }
    router.push(`/dashboard/inventory/receive/po/${po.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading purchase orders...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Failed to load purchase orders</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {error.message}
          </p>
          <Button onClick={() => refetch()} className="cursor-pointer">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard/inventory/receive")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Receiving
          </button>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Purchase Orders
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Select a PO to begin receiving
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={mounted ? isLoading : false}
                className="cursor-pointer transition"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    mounted && (isLoading || isFetching) ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push("/dashboard/inventory/receive/pending")
                }
                className="cursor-pointer transition"
              >
                {/* <FileText className="w-4 h-4 mr-2" /> */}
                Pending Approvals
              </Button>
              <Link href="/dashboard/inventory/receive/labels">
                <Button variant="outline" className="cursor-pointer transition">
                  {/* <FileText className="w-4 h-4 mr-2" /> */}
                  Generated POs
                </Button>
              </Link>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Package className="w-8 h-8 text-blue-500" />
                  <div className="ml-3">
                    <p className="text-2xl font-bold">{totalItems}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total POs
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-2xl font-bold">
                      {data?.purchaseOrders?.filter(
                        (po) => po.status === "open"
                      ).length || 0}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Open
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlignLeft className="w-8 h-8 text-gray-700 dark:text-gray-200" />
                  <div className="ml-3">
                    <p className="text-2xl font-bold">
                      {mounted
                        ? data?.purchaseOrders
                            ?.reduce(
                              (sum, po) => sum + (po.line_items?.length || 0),
                              0
                            )
                            .toLocaleString() || 0
                        : data?.purchaseOrders?.reduce(
                            (sum, po) => sum + (po.line_items?.length || 0),
                            0
                          ) || 0}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Items
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 text-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by PO#, vendor, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 dark:border-zinc-700"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={itemsPerPage.toString()}
              onChange={(e) =>
                handleItemsPerPageChange(parseInt(e.target.value))
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>

        {/* PO List */}
        {isFiltering ? (
          <POListSkeleton />
        ) : (
          <div className="space-y-4">
            {filteredPOs && filteredPOs.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No purchase orders found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchTerm
                      ? "No purchase orders match your search"
                      : `No ${statusFilter} purchase orders found`}
                  </p>
                </CardContent>
              </Card>
            )}

            {filteredPOs?.map((po) => {
              const totalItemsCount = po.line_items?.length || 0;
              const totalQty =
                po.line_items?.reduce(
                  (sum, item) => sum + item.quantity_ordered,
                  0
                ) || 0;
              const hasPending = po.hasPendingSession;

              return (
                <Card
                  key={po.id}
                  // className={`hover:shadow-lg transition-shadow ${
                  //   hasPending
                  //     ? "cursor-not-allowed opacity-60"
                  //     : "cursor-pointer hover:bg-background"
                  // }`}
                  className="hover:shadow-lg transition-shadow"
                  onClick={() => !hasPending && handleReceiveClick(po)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-x-6 gap-y-3">
                          {/* PO Number */}
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              PO #{po.reference}
                            </h3>
                          </div>

                          {/* Status */}
                          <Badge
                            className={
                              po.status === "open"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200"
                            }
                          >
                            {po.status.toUpperCase()}
                          </Badge>

                          {/* Vendor */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <BadgeCheck className="w-4 h-4" />
                            <span className="font-medium">
                              {po.vendor_name || "Unknown Vendor"}
                            </span>
                          </div>

                          {/* Created Date */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {mounted
                                ? new Date(po.created_at).toLocaleDateString()
                                : po.created_at}
                            </span>
                          </div>

                          {/* Expected Date */}
                          {po.expected_date && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Due:{" "}
                              {mounted
                                ? new Date(
                                    po.expected_date
                                  ).toLocaleDateString()
                                : po.expected_date}
                            </div>
                          )}

                          {/* Items & Units */}
                          {totalItemsCount > 0 && (
                            <div className="flex gap-2 text-sm">
                              <Badge variant="outline" className="text-xs">
                                <Package className="w-3 h-3 mr-1" />
                                {totalItemsCount} items
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {mounted ? totalQty.toLocaleString() : totalQty}{" "}
                                units
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        {/* ✅ Smart Barcode Button - passes existingBarcodeId */}
                        <GeneratePOBarcodeButton
                          poId={po.id}
                          poReference={po.reference}
                          existingBarcodeId={po.barcodeId}
                        />

                        {/* Receive Button */}
                        {hasPending && (
                          <Button variant={"outline"} disabled>
                            <p>Pending Approval</p>
                          </Button>
                        )}
                        {/* <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReceiveClick(po);
                          }}
                          disabled={hasPending}
                          className={`transition cursor-pointer ${
                            hasPending
                              ? "bg-gray-400 text-black dark:bg-gray-200 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-500 text-white"
                          }`}
                        >
                          {hasPending ? "Pending" : "Receive"}
                        </Button> */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && !isFiltering && (
          <div className="flex items-center justify-between py-3 mt-4">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              Showing page {currentPage + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={!hasPrevPage || isFiltering}
                className="cursor-pointer"
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum =
                    currentPage <= 2
                      ? i
                      : currentPage >= totalPages - 3
                      ? totalPages - 5 + i
                      : currentPage - 2 + i;

                  if (pageNum < 0 || pageNum >= totalPages) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10 cursor-pointer"
                      disabled={isFiltering}
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
                }
                disabled={!hasNextPage || isFiltering}
                className="cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// // app/dashboard/inventory/receive/po/page.tsx
// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { useQuery } from "@tanstack/react-query";
// import { keepPreviousData } from "@tanstack/react-query";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Input } from "@/components/ui/input";
// import {
//   ArrowLeft,
//   Package,
//   Loader2,
//   Calendar,
//   BadgeCheck,
//   FileText,
//   Search,
//   AlignLeft,
//   RefreshCw,
//   AlertCircle,
//   Clock,
// } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import GeneratePOBarcodeButton from "@/components/inventory/GeneratePOBarcodeButton";

// interface PurchaseOrder {
//   id: string;
//   reference: string;
//   vendor_name: string;
//   status: string;
//   created_at: string;
//   expected_date?: string;
//   total_cost?: number;
//   currency?: string;
//   line_items?: Array<{
//     sku: string;
//     quantity_ordered: number;
//   }>;
//   hasPendingSession?: boolean; // New field
// }

// interface POResponse {
//   success: boolean;
//   purchaseOrders: PurchaseOrder[];
//   meta: {
//     total?: number;
//   };
// }

// // Skeleton Component
// function POSkeleton() {
//   return (
//     <div className="space-y-4">
//       {[1, 2, 3, 4, 5].map((i) => (
//         <Card key={i} className="animate-pulse">
//           <CardContent className="p-6">
//             <div className="flex items-center justify-between">
//               <div className="flex-1">
//                 <div className="flex items-center flex-wrap gap-x-6 gap-y-3">
//                   <div className="flex items-center gap-2">
//                     <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
//                     <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
//                   </div>
//                   <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
//                   <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
//                     <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
//                     <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
//                   </div>
//                   <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
//                   <div className="flex gap-2">
//                     <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
//                     <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
//                   </div>
//                 </div>
//               </div>
//               <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded ml-4" />
//             </div>
//           </CardContent>
//         </Card>
//       ))}
//     </div>
//   );
// }

// export default function POListPage() {
//   const router = useRouter();
//   const { toast } = useToast();
//   const [mounted, setMounted] = useState(false);
//   useEffect(() => setMounted(true), []);

//   const [statusFilter, setStatusFilter] = useState("open");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [currentPage, setCurrentPage] = useState(0);
//   const [itemsPerPage, setItemsPerPage] = useState(20);

//   const { data, isLoading, isFetching, error, refetch } = useQuery<POResponse>({
//     queryKey: ["purchase-orders", statusFilter, currentPage, itemsPerPage],
//     queryFn: async () => {
//       const res = await fetch(
//         `/api/inventory-planner/purchase-orders?status=${statusFilter}&limit=${itemsPerPage}&page=${currentPage}`
//       );

//       if (!res.ok) {
//         const errorData = await res.json();
//         throw new Error(errorData.error || "Failed to fetch POs");
//       }

//       return res.json();
//     },
//     staleTime: 30000,
//     refetchOnWindowFocus: false,
//     placeholderData: keepPreviousData,
//   });

//   const isFiltering = isFetching && data !== undefined;

//   // Filter by search term (client-side)
//   const filteredPOs = data?.purchaseOrders?.filter((po) => {
//     const searchLower = searchTerm.toLowerCase();
//     return (
//       po.reference.toLowerCase().includes(searchLower) ||
//       po.vendor_name?.toLowerCase().includes(searchLower) ||
//       po.id.toLowerCase().includes(searchLower)
//     );
//   });

//   // Calculate pagination
//   const totalItems = data?.meta?.total || filteredPOs?.length || 0;
//   const totalPages = Math.ceil(totalItems / itemsPerPage);
//   const hasNextPage = currentPage < totalPages - 1;
//   const hasPrevPage = currentPage > 0;

//   const handleStatusChange = (status: string) => {
//     setStatusFilter(status);
//     setCurrentPage(0);
//   };

//   const handleItemsPerPageChange = (value: number) => {
//     setItemsPerPage(value);
//     setCurrentPage(0);
//   };

//   const handleReceiveClick = (po: PurchaseOrder) => {
//     if (po.hasPendingSession) {
//       toast({
//         variant: "destructive",
//         title: "⏳ Pending Approval",
//         description: `PO ${po.reference} already has a receiving session pending approval. Please wait for approval before creating a new count.`,
//       });
//       return;
//     }
//     router.push(`/dashboard/inventory/receive/po/${po.id}`);
//   };

//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center p-4">
//         <div className="text-center">
//           <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
//           <p className="text-gray-600 dark:text-gray-400">
//             Loading purchase orders...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center p-4">
//         <div className="text-center">
//           <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
//           <p className="text-red-600 mb-2">Failed to load purchase orders</p>
//           <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
//             {error.message}
//           </p>
//           <Button onClick={() => refetch()} className="cursor-pointer">
//             <RefreshCw className="w-4 h-4 mr-2" />
//             Retry
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background p-6">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="mb-8">
//           <button
//             onClick={() => router.push("/dashboard/inventory/receive")}
//             className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 mb-4 transition"
//           >
//             <ArrowLeft className="w-5 h-5" />
//             Back to Receiving
//           </button>

//           <div className="flex items-center justify-between mb-6">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
//                 Purchase Orders
//               </h1>
//               <p className="text-gray-600 dark:text-gray-400">
//                 Select a PO to begin receiving
//               </p>
//             </div>
//             <div className="flex gap-3">
//               <Button
//                 variant="outline"
//                 onClick={() => refetch()}
//                 disabled={mounted ? isLoading : false}
//                 className="cursor-pointer transition"
//               >
//                 <RefreshCw
//                   className={`w-4 h-4 ${
//                     mounted && (isLoading || isFetching) ? "animate-spin" : ""
//                   }`}
//                 />
//                 Refresh
//               </Button>
//               <Button
//                 variant="outline"
//                 onClick={() =>
//                   router.push("/dashboard/inventory/receive/pending")
//                 }
//                 className="cursor-pointer transition"
//               >
//                 <FileText className="w-4 h-4 mr-2" />
//                 Pending Approvals
//               </Button>
//             </div>
//           </div>

//           {/* Statistics Cards */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//             <Card>
//               <CardContent className="p-4">
//                 <div className="flex items-center">
//                   <Package className="w-8 h-8 text-blue-500" />
//                   <div className="ml-3">
//                     <p className="text-2xl font-bold">{totalItems}</p>
//                     <p className="text-sm text-gray-600 dark:text-gray-400">
//                       Total POs
//                     </p>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//             <Card>
//               <CardContent className="p-4">
//                 <div className="flex items-center">
//                   <FileText className="w-8 h-8 text-green-600" />
//                   <div className="ml-3">
//                     <p className="text-2xl font-bold">
//                       {data?.purchaseOrders?.filter(
//                         (po) => po.status === "open"
//                       ).length || 0}
//                     </p>
//                     <p className="text-sm text-gray-600 dark:text-gray-400">
//                       Open
//                     </p>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//             <Card>
//               <CardContent className="p-4">
//                 <div className="flex items-center">
//                   <AlignLeft className="w-8 h-8 text-gray-700 dark:text-gray-200" />
//                   <div className="ml-3">
//                     <p className="text-2xl font-bold">
//                       {mounted
//                         ? data?.purchaseOrders
//                             ?.reduce(
//                               (sum, po) => sum + (po.line_items?.length || 0),
//                               0
//                             )
//                             .toLocaleString() || 0
//                         : data?.purchaseOrders?.reduce(
//                             (sum, po) => sum + (po.line_items?.length || 0),
//                             0
//                           ) || 0}
//                     </p>
//                     <p className="text-sm text-gray-600 dark:text-gray-400">
//                       Total Items
//                     </p>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           {/* Filters */}
//           <div className="flex flex-col sm:flex-row gap-4 mb-6 text-sm">
//             <div className="relative flex-1">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
//               <Input
//                 placeholder="Search by PO#, vendor, or ID..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10 dark:border-zinc-700"
//               />
//             </div>
//             <select
//               value={statusFilter}
//               onChange={(e) => handleStatusChange(e.target.value)}
//               className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="all">All Status</option>
//               <option value="open">Open</option>
//               <option value="closed">Closed</option>
//             </select>
//             <select
//               value={itemsPerPage.toString()}
//               onChange={(e) =>
//                 handleItemsPerPageChange(parseInt(e.target.value))
//               }
//               className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="20">20 per page</option>
//               <option value="50">50 per page</option>
//               <option value="100">100 per page</option>
//             </select>
//           </div>
//         </div>

//         {/* PO List */}
//         {isFiltering ? (
//           <POSkeleton />
//         ) : (
//           <div className="space-y-4">
//             {filteredPOs && filteredPOs.length === 0 && (
//               <Card>
//                 <CardContent className="p-12 text-center">
//                   <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
//                   <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
//                     No purchase orders found
//                   </h3>
//                   <p className="text-gray-600 dark:text-gray-400">
//                     {searchTerm
//                       ? "No purchase orders match your search"
//                       : `No ${statusFilter} purchase orders found`}
//                   </p>
//                 </CardContent>
//               </Card>
//             )}

//             {filteredPOs?.map((po) => {
//               const totalItemsCount = po.line_items?.length || 0;
//               const totalQty =
//                 po.line_items?.reduce(
//                   (sum, item) => sum + item.quantity_ordered,
//                   0
//                 ) || 0;
//               const hasPending = po.hasPendingSession;

//               return (
//                 <Card
//                   key={po.id}
//                   className={`hover:shadow-lg transition-shadow ${
//                     hasPending
//                       ? "cursor-not-allowed opacity-60"
//                       : "cursor-pointer hover:bg-background"
//                   }`}
//                   onClick={() => !hasPending && handleReceiveClick(po)}
//                 >
//                   <CardContent className="p-6">
//                     <div className="flex items-center justify-between">
//                       <div className="flex-1">
//                         <div className="flex items-center flex-wrap gap-x-6 gap-y-3">
//                           {/* PO Number */}
//                           <div className="flex items-center gap-2">
//                             <FileText className="w-5 h-5 text-blue-600" />
//                             <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
//                               PO #{po.reference}
//                             </h3>
//                           </div>

//                           {/* Status */}
//                           <Badge
//                             className={
//                               po.status === "open"
//                                 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
//                                 : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200"
//                             }
//                           >
//                             {po.status.toUpperCase()}
//                           </Badge>

//                           {/* Pending Badge */}
//                           {/* {hasPending && (
//                             <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300">
//                               <Clock className="w-3 h-3 mr-1" />
//                               PENDING APPROVAL
//                             </Badge>
//                           )} */}

//                           {/* Vendor */}
//                           <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
//                             <BadgeCheck className="w-4 h-4" />
//                             <span className="font-medium">
//                               {po.vendor_name || "Unknown Vendor"}
//                             </span>
//                           </div>

//                           {/* Created Date */}
//                           <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
//                             <Calendar className="w-4 h-4" />
//                             <span>
//                               {mounted
//                                 ? new Date(po.created_at).toLocaleDateString()
//                                 : po.created_at}
//                             </span>
//                           </div>

//                           {/* Expected Date */}
//                           {po.expected_date && (
//                             <div className="text-sm text-gray-600 dark:text-gray-400">
//                               Due:{" "}
//                               {mounted
//                                 ? new Date(
//                                     po.expected_date
//                                   ).toLocaleDateString()
//                                 : po.expected_date}
//                             </div>
//                           )}

//                           {/* Items & Units */}
//                           {totalItemsCount > 0 && (
//                             <div className="flex gap-2 text-sm">
//                               <Badge variant="outline" className="text-xs">
//                                 <Package className="w-3 h-3 mr-1" />
//                                 {totalItemsCount} items
//                               </Badge>
//                               <Badge variant="outline" className="text-xs">
//                                 {mounted ? totalQty.toLocaleString() : totalQty}{" "}
//                                 units
//                               </Badge>
//                             </div>
//                           )}
//                         </div>
//                       </div>

//                       <div className="flex gap-2 ml-4">
//                         {/* Generate Barcode Label Button */}
//                         <GeneratePOBarcodeButton
//                           poId={po.id}
//                           poReference={po.reference}
//                         />

//                         {/* Receive Button */}
//                         <Button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             handleReceiveClick(po);
//                           }}
//                           disabled={hasPending}
//                           className={`transition cursor-pointer ${
//                             hasPending
//                               ? "bg-gray-400 text-black dark:bg-gray-200 cursor-not-allowed"
//                               : "bg-blue-600 hover:bg-blue-500 text-white"
//                           }`}
//                         >
//                           <Package className="w-4 h-4 mr-2" />
//                           {hasPending ? "Pending" : "Receive"}
//                         </Button>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               );
//             })}
//           </div>
//         )}

//         {/* Pagination Controls */}
//         {totalPages > 1 && !isFiltering && (
//           <div className="flex items-center justify-between py-3 mt-4">
//             <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
//               Showing page {currentPage + 1} of {totalPages}
//             </div>
//             <div className="flex gap-2">
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
//                 disabled={!hasPrevPage || isFiltering}
//                 className="cursor-pointer"
//               >
//                 Previous
//               </Button>
//               <div className="flex gap-1">
//                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
//                   const pageNum =
//                     currentPage <= 2
//                       ? i
//                       : currentPage >= totalPages - 3
//                       ? totalPages - 5 + i
//                       : currentPage - 2 + i;

//                   if (pageNum < 0 || pageNum >= totalPages) return null;

//                   return (
//                     <Button
//                       key={pageNum}
//                       variant={currentPage === pageNum ? "default" : "outline"}
//                       size="sm"
//                       onClick={() => setCurrentPage(pageNum)}
//                       className="w-10 cursor-pointer"
//                       disabled={isFiltering}
//                     >
//                       {pageNum + 1}
//                     </Button>
//                   );
//                 })}
//               </div>
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() =>
//                   setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
//                 }
//                 disabled={!hasNextPage || isFiltering}
//                 className="cursor-pointer"
//               >
//                 Next
//               </Button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
