"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface PickList {
  id: string;
  batchNumber: string;
  status: string;
  assignedTo: string;
  totalItems: number;
  pickedItems: number;
  completionRate: number;
  itemsRemaining: number;
  createdAt: string;
  assignedUser?: {
    id: string;
    name: string;
    email: string;
  };
}

interface PickListResponse {
  pickLists: PickList[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

export default function PickListsDashboard() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const itemsPerPage = 20;

  // Fetch pick lists with TanStack Query
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
        return "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-400";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-400";
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400";
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-600/30 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pick Lists</span>
            {isFiltering && <Loader2 className="w-5 h-5 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter Buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={statusFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter("ALL");
                setCurrentPage(1);
              }}
            >
              All
            </Button>
            <Button
              variant={statusFilter === "ASSIGNED" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter("ASSIGNED");
                setCurrentPage(1);
              }}
            >
              Assigned
            </Button>
            <Button
              variant={statusFilter === "IN_PROGRESS" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter("IN_PROGRESS");
                setCurrentPage(1);
              }}
            >
              In Progress
            </Button>
            <Button
              variant={statusFilter === "COMPLETED" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter("COMPLETED");
                setCurrentPage(1);
              }}
            >
              Completed
            </Button>
          </div>

          {/* Pick Lists Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
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
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pickLists.map((pickList) => (
                  <tr
                    key={pickList.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium">{pickList.batchNumber}</div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={getStatusColor(pickList.status)}>
                        {pickList.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        {pickList.assignedUser?.name || "Unassigned"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {pickList.completionRate}%
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                          <div
                            className="bg-green-200 dark:bg-green-600 h-2 rounded-full transition-all"
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
                        {new Date(pickList.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pickLists.length === 0 && !isFiltering && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No pick lists found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your filters.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            Showing page {currentPage} of {totalPages}
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
            <div className="flex gap-1">
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
  );
}
