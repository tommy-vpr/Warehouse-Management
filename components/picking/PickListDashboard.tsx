"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { Loader2, User, Package, UserCog } from "lucide-react";
import { PickListsTableSkeleton } from "@/components/skeleton/PickliststableSkeleton";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { ReassignPickListModal } from "@/components/ReassignPickListModal";

interface PickList {
  id: string;
  batchNumber: string;
  status: string;
  assignedTo: string | null;
  totalItems: number;
  pickedItems: number;
  completionRate: number;
  itemsRemaining: number;
  createdAt: string;
  updatedAt: string;
  assignedUser?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface PickListResponse {
  pickLists: PickList[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

type StatusFilter =
  | "ALL"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "PAUSED";

export default function PickListsDashboard() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const itemsPerPage = 10;

  const [selectedPickListIds, setSelectedPickListIds] = useState<string[]>([]);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const response = await fetch(
        "/api/users?role=STAFF&includeWorkload=true"
      );
      if (response.ok) {
        const staffData = await response.json();
        setStaff(staffData);
      }
    } catch (error) {
      console.error("Error loading staff:", error);
    }
  };

  const { data, isLoading, isFetching, isError } = useQuery<PickListResponse>({
    queryKey: ["pickLists", statusFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      params.set("page", currentPage.toString());
      params.set("limit", itemsPerPage.toString());

      const response = await fetch(`/api/pick-lists?${params}`);
      if (!response.ok) throw new Error("Failed to fetch pick lists");
      return response.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const isFiltering = isFetching && data !== undefined;
  const pickLists = data?.pickLists || [];
  const totalPages = data?.totalPages || 1;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ASSIGNED":
        return "rounded-full bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-400";
      case "IN_PROGRESS":
        return "rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-400";
      case "COMPLETED":
        return "rounded-full bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400";
      case "CANCELLED":
        return "rounded-full bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-400";
      case "PAUSED":
        return "rounded-full bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-400";
      default:
        return "rounded-full bg-gray-100 text-gray-800 dark:bg-gray-600/30 dark:text-gray-400";
    }
  };

  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  // Add these handler functions
  const togglePickList = (pickListId: string) => {
    setSelectedPickListIds((prev) =>
      prev.includes(pickListId)
        ? prev.filter((id) => id !== pickListId)
        : [...prev, pickListId]
    );
  };

  const toggleAllPickLists = () => {
    if (selectedPickListIds.length === pickLists.length) {
      setSelectedPickListIds([]);
    } else {
      setSelectedPickListIds(pickLists.map((pl) => pl.id));
    }
  };

  const handleReassignClick = () => {
    if (selectedPickListIds.length === 0) {
      alert("Please select at least one pick list");
      return;
    }
    setShowReassignModal(true);
  };

  const selectedPickListsData = pickLists.filter((pl) =>
    selectedPickListIds.includes(pl.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl sm:text-2xl">Pick Lists</CardTitle>

              {/* Reassign Button - Shows when pick lists are selected */}
              {selectedPickListIds.length > 0 && (
                <Button
                  onClick={handleReassignClick}
                  className="flex items-center gap-2"
                >
                  <UserCog className="w-4 h-4" />
                  Reassign ({selectedPickListIds.length})
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {/* Filter Buttons - Scrollable on mobile */}
            <div className="mb-4 -mx-6 px-6 sm:mx-0 sm:px-0">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 min-w-max sm:min-w-0">
                  <Button
                    variant={statusFilter === "ALL" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange("ALL")}
                    className="whitespace-nowrap"
                  >
                    All
                  </Button>
                  <Button
                    variant={
                      statusFilter === "ASSIGNED" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleFilterChange("ASSIGNED")}
                    className="whitespace-nowrap"
                  >
                    Assigned
                  </Button>
                  <Button
                    variant={
                      statusFilter === "IN_PROGRESS" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleFilterChange("IN_PROGRESS")}
                    className="whitespace-nowrap"
                  >
                    In Progress
                  </Button>
                  <Button
                    variant={statusFilter === "PAUSED" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange("PAUSED")}
                    className="whitespace-nowrap"
                  >
                    Paused
                  </Button>
                  <Button
                    variant={
                      statusFilter === "COMPLETED" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleFilterChange("COMPLETED")}
                    className="whitespace-nowrap"
                  >
                    Completed
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop: Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={
                          selectedPickListIds.length === pickLists.length &&
                          pickLists.length > 0
                        }
                        onCheckedChange={toggleAllPickLists}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Batch Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Assigned To
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Items
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                  </tr>
                </thead>

                {isFiltering ? (
                  <PickListsTableSkeleton />
                ) : (
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {pickLists.map((pickList) => (
                      <tr
                        key={pickList.id}
                        onClick={() =>
                          router.push(
                            `/dashboard/picking/progress/${pickList.id}`
                          )
                        }
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      >
                        <td className="px-4 py-4">
                          <Checkbox
                            checked={selectedPickListIds.includes(pickList.id)}
                            onCheckedChange={() => togglePickList(pickList.id)}
                            onClick={(e) => e.stopPropagation()} // Prevent row click
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium">
                            {pickList.batchNumber}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={getStatusColor(pickList.status)}>
                            {pickList.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            {pickList.assignedUser?.name ||
                              pickList.assignedUser?.email ||
                              "Unassigned"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {pickList.completionRate}%
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                              <div
                                className="bg-blue-400 dark:bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${pickList.completionRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            {pickList.pickedItems} / {pickList.totalItems}
                          </div>
                          <div className="text-xs text-gray-500">
                            {pickList.itemsRemaining} remaining
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            {new Date(pickList.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(pickList.createdAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>

              {pickLists.length === 0 && !isFiltering && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
                    No pick lists found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your filters.
                  </p>
                </div>
              )}
            </div>

            {/* Mobile: Card View */}
            <div className="lg:hidden space-y-3">
              {isFiltering ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse"
                  >
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  </div>
                ))
              ) : pickLists.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-2">
                    No pick lists found
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Try adjusting your filters.
                  </p>
                </div>
              ) : (
                pickLists.map((pickList) => (
                  <div
                    key={pickList.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-colors"
                  >
                    {/* ✅ ADD: Checkbox + Content Container */}
                    <div className="flex items-start gap-3">
                      {/* ✅ Checkbox */}
                      <Checkbox
                        checked={selectedPickListIds.includes(pickList.id)}
                        onCheckedChange={() => togglePickList(pickList.id)}
                        className="mt-1 flex-shrink-0"
                      />

                      {/* ✅ Clickable Content Area (everything except checkbox) */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer hover:opacity-80"
                        onClick={() =>
                          router.push(
                            `/dashboard/picking/progress/${pickList.id}`
                          )
                        }
                      >
                        {/* Header with badge */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate">
                              {pickList.batchNumber}
                            </div>
                          </div>
                          <Badge
                            className={`${getStatusColor(
                              pickList.status
                            )} ml-2 whitespace-nowrap text-xs`}
                          >
                            {pickList.status}
                          </Badge>
                        </div>

                        {/* Assigned user */}
                        <div className="flex items-center gap-2 mb-3">
                          <User className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {pickList.assignedUser?.name ||
                              pickList.assignedUser?.email ||
                              "Unassigned"}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Progress
                            </span>
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                              {pickList.completionRate}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                            <div
                              className="bg-blue-400 dark:bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${pickList.completionRate}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Items
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {pickList.pickedItems} / {pickList.totalItems}
                            </div>
                            <div className="text-xs text-gray-500">
                              {pickList.itemsRemaining} remaining
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Created
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {new Date(
                                pickList.createdAt
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(pickList.createdAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        {/* Pagination Controls - Your Style */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 mt-4">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isFiltering}
              >
                Previous
              </Button>

              {/* Simplified pagination for mobile */}
              <div className="hidden sm:flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum =
                    currentPage <= 3
                      ? i + 1
                      : currentPage >= totalPages - 2
                      ? totalPages - 4 + i
                      : currentPage - 2 + i;

                  if (pageNum < 1 || pageNum > totalPages) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                      disabled={isFiltering}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages || isFiltering}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
      {showReassignModal && (
        <ReassignPickListModal
          open={showReassignModal}
          onClose={() => {
            setShowReassignModal(false);
            setSelectedPickListIds([]); // Clear selection after closing
          }}
          selectedPickLists={selectedPickListsData}
          staff={staff}
        />
      )}
    </div>
  );
}

// "use client";

// import React, { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { useQuery } from "@tanstack/react-query";
// import { keepPreviousData } from "@tanstack/react-query";
// import { Loader2, Clock, User, Package } from "lucide-react";
// import { PickListsTableSkeleton } from "@/components/skeleton/PickliststableSkeleton";
// import { useRouter } from "next/navigation";

// interface PickList {
//   id: string;
//   batchNumber: string;
//   status: string;
//   assignedTo: string;
//   totalItems: number;
//   pickedItems: number;
//   completionRate: number;
//   itemsRemaining: number;
//   createdAt: string;
//   assignedUser?: {
//     id: string;
//     name: string | null;
//     email: string;
//   } | null;
// }

// interface PickListResponse {
//   pickLists: PickList[];
//   totalPages: number;
//   currentPage: number;
//   totalCount: number;
// }

// type StatusFilter =
//   | "ALL"
//   | "ASSIGNED"
//   | "IN_PROGRESS"
//   | "COMPLETED"
//   | "CANCELLED";

// export default function PickListsDashboard() {
//   const [currentPage, setCurrentPage] = useState(1);
//   const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
//   const itemsPerPage = 10;
//   const router = useRouter();

//   // Fetch pick lists with TanStack Query
//   const { data, isLoading, isFetching, isError } = useQuery<PickListResponse>({
//     queryKey: ["pickLists", statusFilter, currentPage],
//     queryFn: async () => {
//       const params = new URLSearchParams();
//       if (statusFilter !== "ALL") params.set("status", statusFilter);
//       params.set("page", currentPage.toString());
//       params.set("limit", itemsPerPage.toString());

//       const response = await fetch(`/api/pick-lists?${params}`);
//       if (!response.ok) throw new Error("Failed to fetch pick lists");
//       return response.json();
//     },
//     staleTime: 30000,
//     refetchOnWindowFocus: false,
//     placeholderData: keepPreviousData,
//   });

//   const isFiltering = isFetching && data !== undefined;
//   const pickLists = data?.pickLists || [];
//   const totalPages = data?.totalPages || 1;

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case "ASSIGNED":
//         return "rounded-full bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-400";
//       case "IN_PROGRESS":
//         return "rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-400";
//       case "COMPLETED":
//         return "rounded-full bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400";
//       case "CANCELLED":
//         return "rounded-full bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-400";
//       default:
//         return "rounded-full bg-gray-100 text-gray-800 dark:bg-gray-600/30 dark:text-gray-400";
//     }
//   };

//   const handleFilterChange = (filter: StatusFilter) => {
//     setStatusFilter(filter);
//     setCurrentPage(1);
//   };

//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background p-3 sm:p-6 overflow-x-hidden">
//       <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
//         <Card>
//           <CardHeader className="pb-3 sm:pb-6">
//             <CardTitle className="text-xl sm:text-2xl">Pick Lists</CardTitle>
//           </CardHeader>
//           <CardContent>
//             {/* Filter Buttons - Scrollable on mobile */}
//             <div className="mb-4 -mx-6 px-6 sm:mx-0 sm:px-0">
//               <div className="overflow-x-auto scrollbar-hide">
//                 <div className="flex gap-2 min-w-max sm:min-w-0">
//                   <Button
//                     variant={statusFilter === "ALL" ? "default" : "outline"}
//                     size="sm"
//                     onClick={() => handleFilterChange("ALL")}
//                     className="whitespace-nowrap"
//                   >
//                     All
//                   </Button>
//                   <Button
//                     variant={
//                       statusFilter === "ASSIGNED" ? "default" : "outline"
//                     }
//                     size="sm"
//                     onClick={() => handleFilterChange("ASSIGNED")}
//                     className="whitespace-nowrap"
//                   >
//                     Assigned
//                   </Button>
//                   <Button
//                     variant={
//                       statusFilter === "IN_PROGRESS" ? "default" : "outline"
//                     }
//                     size="sm"
//                     onClick={() => handleFilterChange("IN_PROGRESS")}
//                     className="whitespace-nowrap"
//                   >
//                     In Progress
//                   </Button>
//                   <Button
//                     variant={
//                       statusFilter === "COMPLETED" ? "default" : "outline"
//                     }
//                     size="sm"
//                     onClick={() => handleFilterChange("COMPLETED")}
//                     className="whitespace-nowrap"
//                   >
//                     Completed
//                   </Button>
//                 </div>
//               </div>
//             </div>

//             {/* Desktop: Table View */}
//             <div className="hidden lg:block overflow-x-auto">
//               <table className="w-full">
//                 <thead className="bg-gray-50 dark:bg-gray-800">
//                   <tr>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                       Batch Number
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                       Status
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                       Assigned To
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                       Progress
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                       Items
//                     </th>
//                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                       Created
//                     </th>
//                   </tr>
//                 </thead>

//                 {isFiltering ? (
//                   <PickListsTableSkeleton />
//                 ) : (
//                   <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
//                     {pickLists.map((pickList) => (
//                       <tr
//                         key={pickList.id}
//                         onClick={() =>
//                           router.push(
//                             `/dashboard/picking/progress/${pickList.id}`
//                           )
//                         }
//                         className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
//                       >
//                         <td className="px-4 py-4">
//                           <div className="font-medium">
//                             {pickList.batchNumber}
//                           </div>
//                         </td>
//                         <td className="px-4 py-4">
//                           <Badge className={getStatusColor(pickList.status)}>
//                             {pickList.status}
//                           </Badge>
//                         </td>
//                         <td className="px-4 py-4">
//                           <div className="text-sm">
//                             {pickList.assignedUser?.name ||
//                               pickList.assignedUser?.email ||
//                               "Unassigned"}
//                           </div>
//                         </td>
//                         <td className="px-4 py-4">
//                           <div className="space-y-1">
//                             <div className="text-sm font-medium">
//                               {pickList.completionRate}%
//                             </div>
//                             <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
//                               <div
//                                 className="bg-blue-400 dark:bg-blue-500 h-2 rounded-full transition-all"
//                                 style={{ width: `${pickList.completionRate}%` }}
//                               />
//                             </div>
//                           </div>
//                         </td>
//                         <td className="px-4 py-4">
//                           <div className="text-sm">
//                             {pickList.pickedItems} / {pickList.totalItems}
//                           </div>
//                           <div className="text-xs text-gray-500">
//                             {pickList.itemsRemaining} remaining
//                           </div>
//                         </td>
//                         <td className="px-4 py-4">
//                           <div className="text-sm">
//                             {new Date(pickList.createdAt).toLocaleDateString()}
//                           </div>
//                           <div className="text-xs text-gray-500">
//                             {new Date(pickList.createdAt).toLocaleTimeString(
//                               [],
//                               {
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                               }
//                             )}
//                           </div>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 )}
//               </table>

//               {pickLists.length === 0 && !isFiltering && (
//                 <div className="text-center py-12">
//                   <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
//                   <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
//                     No pick lists found
//                   </h3>
//                   <p className="text-gray-600 dark:text-gray-400">
//                     Try adjusting your filters.
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Mobile: Card View */}
//             <div className="lg:hidden space-y-3">
//               {isFiltering ? (
//                 // Mobile skeleton
//                 Array.from({ length: 5 }).map((_, i) => (
//                   <div
//                     key={i}
//                     className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse"
//                   >
//                     <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
//                     <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
//                     <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
//                   </div>
//                 ))
//               ) : pickLists.length === 0 ? (
//                 <div className="text-center py-12">
//                   <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
//                   <h3 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-2">
//                     No pick lists found
//                   </h3>
//                   <p className="text-sm text-gray-600 dark:text-gray-400">
//                     Try adjusting your filters.
//                   </p>
//                 </div>
//               ) : (
//                 pickLists.map((pickList) => (
//                   <div
//                     key={pickList.id}
//                     onClick={() =>
//                       router.push(`/dashboard/picking/progress/${pickList.id}`)
//                     }
//                     className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
//                   >
//                     {/* Header */}
//                     <div className="flex items-start justify-between mb-3">
//                       <div className="flex-1 min-w-0">
//                         <div className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate">
//                           {pickList.batchNumber}
//                         </div>
//                       </div>
//                       <Badge
//                         className={`${getStatusColor(
//                           pickList.status
//                         )} ml-2 whitespace-nowrap text-xs`}
//                       >
//                         {pickList.status}
//                       </Badge>
//                     </div>

//                     {/* Assigned To */}
//                     <div className="flex items-center gap-2 mb-3">
//                       <User className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
//                       <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
//                         {pickList.assignedUser?.name ||
//                           pickList.assignedUser?.email ||
//                           "Unassigned"}
//                       </span>
//                     </div>

//                     {/* Progress Bar */}
//                     <div className="mb-3">
//                       <div className="flex items-center justify-between mb-1">
//                         <span className="text-xs text-gray-600 dark:text-gray-400">
//                           Progress
//                         </span>
//                         <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
//                           {pickList.completionRate}%
//                         </span>
//                       </div>
//                       <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
//                         <div
//                           className="bg-blue-400 dark:bg-blue-500 h-2 rounded-full transition-all"
//                           style={{ width: `${pickList.completionRate}%` }}
//                         />
//                       </div>
//                     </div>

//                     {/* Stats Grid */}
//                     <div className="grid grid-cols-2 gap-3 mb-3">
//                       <div>
//                         <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
//                           Items
//                         </div>
//                         <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                           {pickList.pickedItems} / {pickList.totalItems}
//                         </div>
//                         <div className="text-xs text-gray-500">
//                           {pickList.itemsRemaining} remaining
//                         </div>
//                       </div>
//                       <div>
//                         <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
//                           Created
//                         </div>
//                         <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                           {new Date(pickList.createdAt).toLocaleDateString()}
//                         </div>
//                         <div className="text-xs text-gray-500">
//                           {new Date(pickList.createdAt).toLocaleTimeString([], {
//                             hour: "2-digit",
//                             minute: "2-digit",
//                           })}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))
//               )}
//             </div>
//           </CardContent>
//         </Card>

//         {/* Pagination Controls - Responsive */}
//         {totalPages > 1 && (
//           <Card className="p-3 sm:p-4">
//             <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
//               {/* Page Info */}
//               <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
//                 Page {currentPage} of {totalPages}
//               </div>

//               {/* Pagination Buttons */}
//               <div className="flex items-center gap-2">
//                 {/* Previous Button */}
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() =>
//                     setCurrentPage((prev) => Math.max(1, prev - 1))
//                   }
//                   disabled={currentPage === 1 || isFiltering}
//                   className="text-xs sm:text-sm"
//                 >
//                   Previous
//                 </Button>

//                 {/* Page Numbers - Hidden on very small screens */}
//                 <div className="hidden sm:flex gap-1">
//                   {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
//                     const pageNum =
//                       currentPage <= 3
//                         ? i + 1
//                         : currentPage >= totalPages - 2
//                         ? totalPages - 4 + i
//                         : currentPage - 2 + i;

//                     if (pageNum < 1 || pageNum > totalPages) return null;

//                     return (
//                       <Button
//                         key={pageNum}
//                         variant={
//                           currentPage === pageNum ? "default" : "outline"
//                         }
//                         size="sm"
//                         onClick={() => setCurrentPage(pageNum)}
//                         className="w-9 sm:w-10"
//                         disabled={isFiltering}
//                       >
//                         {pageNum}
//                       </Button>
//                     );
//                   })}
//                 </div>

//                 {/* Mobile: Current page indicator */}
//                 <div className="sm:hidden px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium">
//                   {currentPage}
//                 </div>

//                 {/* Next Button */}
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() =>
//                     setCurrentPage((prev) => Math.min(totalPages, prev + 1))
//                   }
//                   disabled={currentPage === totalPages || isFiltering}
//                   className="text-xs sm:text-sm"
//                 >
//                   Next
//                 </Button>
//               </div>
//             </div>
//           </Card>
//         )}
//       </div>
//     </div>
//   );
// }
