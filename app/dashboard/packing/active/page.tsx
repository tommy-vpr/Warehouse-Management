"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { Loader2, Package } from "lucide-react";

interface PackingTask {
  id: string;
  taskNumber: string;
  status: string;
  assignedTo: string;
  priority: number;
  totalOrders: number;
  completedOrders: number;
  totalItems: number;
  completionRate: number;
  createdAt: string;
  assignedUser?: {
    id: string;
    name: string;
    email: string;
  };
  taskItems: Array<{
    id: string;
    orderId: string;
    quantityRequired: number;
    order: {
      id: string;
      orderNumber: string;
      customerName: string;
    };
  }>;
}

interface PackingTaskResponse {
  tasks: PackingTask[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

export default function PackingTasksDashboard() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const itemsPerPage = 20;

  // Fetch packing tasks with TanStack Query
  const { data, isLoading, isFetching, isError } =
    useQuery<PackingTaskResponse>({
      queryKey: ["packingTasks", statusFilter, currentPage],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        params.set("page", currentPage.toString());
        params.set("limit", itemsPerPage.toString());

        const response = await fetch(`/api/packing-tasks?${params}`);
        if (!response.ok) throw new Error("Failed to fetch packing tasks");
        return response.json();
      },
      staleTime: 30000,
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData,
    });

  const isFiltering = isFetching && data !== undefined;
  const tasks = data?.tasks || [];
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

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "bg-red-100 text-red-800";
    if (priority >= 5) return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return "High";
    if (priority >= 5) return "Medium";
    return "Normal";
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
            <span>Packing Tasks</span>
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

          {/* Packing Tasks Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Task Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Orders
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
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium">{task.taskNumber}</div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={getPriorityColor(task.priority)}>
                        {getPriorityLabel(task.priority)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        {task.assignedUser?.name || "Unassigned"}
                      </div>
                      {task.assignedUser?.email && (
                        <div className="text-xs text-gray-500">
                          {task.assignedUser.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {task.completionRate}%
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                          <div
                            className="bg-green-200 dark:bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${task.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        {task.completedOrders} / {task.totalOrders}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{task.totalItems}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(task.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {tasks.length === 0 && !isFiltering && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
                  No packing tasks found
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
      {true && (
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

// "use client";

// import React, { useState, useEffect } from "react";
// import {
//   Box,
//   User,
//   Clock,
//   CheckCircle,
//   AlertCircle,
//   Search,
//   Loader2,
//   Package,
// } from "lucide-react";

// function PackingTasksDashboard() {
//   const [tasks, setTasks] = useState([]);
//   const [selectedTask, setSelectedTask] = useState(null);
//   const [filter, setFilter] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     loadTasks();
//   }, [filter]);

//   const loadTasks = async () => {
//     setLoading(true);
//     try {
//       const params = filter !== "all" ? `?status=${filter}` : "";
//       const response = await fetch(`/api/packing-tasks${params}`);
//       const data = await response.json();
//       setTasks(data);
//     } catch (error) {
//       console.error("Error loading packing tasks:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   console.log(tasks);

//   const filteredTasks = tasks.filter((task) => {
//     const matchesSearch =
//       task.taskNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       task.assignedUser?.name?.toLowerCase().includes(searchTerm.toLowerCase());
//     return matchesSearch;
//   });

//   const getStatusColor = (status) => {
//     const colors = {
//       PENDING: "bg-gray-100 text-gray-800",
//       ASSIGNED: "bg-blue-100 text-blue-800",
//       IN_PROGRESS: "bg-yellow-100 text-yellow-800",
//       PAUSED: "bg-orange-100 text-orange-800",
//       PARTIALLY_COMPLETED: "bg-purple-100 text-purple-800",
//       COMPLETED: "bg-green-100 text-green-800",
//       CANCELLED: "bg-red-100 text-red-800",
//     };
//     return colors[status] || colors.PENDING;
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto">
//       {/* Header */}
//       <div className="mb-6">
//         <h1 className="text-3xl font-bold text-gray-900 mb-2">
//           Active Packing Tasks
//         </h1>
//         <p className="text-gray-600">Monitor packing operations in real-time</p>
//       </div>

//       {/* Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
//         <StatCard
//           label="Total Active"
//           value={
//             tasks.filter((t) =>
//               ["ASSIGNED", "IN_PROGRESS", "PAUSED"].includes(t.status)
//             ).length
//           }
//           icon={<Box className="w-5 h-5" />}
//           color="blue"
//         />
//         <StatCard
//           label="In Progress"
//           value={tasks.filter((t) => t.status === "IN_PROGRESS").length}
//           icon={<Package className="w-5 h-5" />}
//           color="yellow"
//         />
//         <StatCard
//           label="Completed Today"
//           value={
//             tasks.filter((t) => {
//               if (t.status !== "COMPLETED") return false;
//               const today = new Date().toDateString();
//               return new Date(t.updatedAt).toDateString() === today;
//             }).length
//           }
//           icon={<CheckCircle className="w-5 h-5" />}
//           color="green"
//         />
//         <StatCard
//           label="Paused"
//           value={tasks.filter((t) => t.status === "PAUSED").length}
//           icon={<AlertCircle className="w-5 h-5" />}
//           color="orange"
//         />
//       </div>

//       {/* Filters */}
//       <div className="bg-white rounded-lg shadow mb-6 p-4">
//         <div className="flex flex-col md:flex-row gap-3">
//           <div className="flex-1 relative">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search tasks..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//             />
//           </div>

//           <div className="flex gap-2">
//             {["all", "ASSIGNED", "IN_PROGRESS", "PAUSED", "COMPLETED"].map(
//               (status) => (
//                 <button
//                   key={status}
//                   onClick={() => setFilter(status)}
//                   className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
//                     filter === status
//                       ? "bg-blue-600 text-white"
//                       : "bg-gray-100 text-gray-700 hover:bg-gray-200"
//                   }`}
//                 >
//                   {status === "all" ? "All" : status.replace("_", " ")}
//                 </button>
//               )
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Tasks Grid */}
//       {filteredTasks.length === 0 ? (
//         <div className="bg-white rounded-lg shadow p-12 text-center">
//           <Box className="w-16 h-16 text-gray-400 mx-auto mb-4" />
//           <h3 className="text-lg font-medium text-gray-900 mb-2">
//             No Packing Tasks Found
//           </h3>
//           <p className="text-gray-600">
//             {searchTerm
//               ? "Try adjusting your search"
//               : "No tasks match the selected filter"}
//           </p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {filteredTasks.map((task) => (
//             <PackingTaskCard
//               key={task.id}
//               task={task}
//               onSelect={() => setSelectedTask(task)}
//               onReload={loadTasks}
//               getStatusColor={getStatusColor}
//             />
//           ))}
//         </div>
//       )}

//       {/* Detail Modal */}
//       {selectedTask && (
//         <PackingTaskDetailModal
//           task={selectedTask}
//           onClose={() => setSelectedTask(null)}
//           onReload={loadTasks}
//           getStatusColor={getStatusColor}
//         />
//       )}
//     </div>
//   );
// }

// function StatCard({ label, value, icon, color }) {
//   const colors = {
//     blue: "bg-blue-50 text-blue-600",
//     yellow: "bg-yellow-50 text-yellow-600",
//     green: "bg-green-50 text-green-600",
//     orange: "bg-orange-50 text-orange-600",
//   };

//   return (
//     <div className="bg-white rounded-lg shadow p-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <p className="text-sm text-gray-600 mb-1">{label}</p>
//           <p className="text-2xl font-bold text-gray-900">{value}</p>
//         </div>
//         <div className={`p-3 rounded-lg ${colors[color]}`}>{icon}</div>
//       </div>
//     </div>
//   );
// }

// function PackingTaskCard({ task, onSelect, onReload, getStatusColor }) {
//   const completionRate =
//     task.totalOrders > 0
//       ? Math.round((task.completedOrders / task.totalOrders) * 100)
//       : 0;

//   const getTimeElapsed = () => {
//     if (!task.startedAt) return null;
//     const start = new Date(task.startedAt);
//     const end = task.completedAt ? new Date(task.completedAt) : new Date();
//     const diffMs = end - start;
//     const diffMins = Math.floor(diffMs / 60000);
//     const hours = Math.floor(diffMins / 60);
//     const mins = diffMins % 60;
//     return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
//   };

//   return (
//     <div
//       className="bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
//       onClick={onSelect}
//     >
//       <div className="p-6">
//         {/* Header */}
//         <div className="flex justify-between items-start mb-4">
//           <div>
//             <h3 className="text-lg font-semibold text-gray-900">
//               {task.taskNumber}
//             </h3>
//             <p className="text-sm text-gray-500">
//               {new Date(task.createdAt).toLocaleDateString()} at{" "}
//               {new Date(task.createdAt).toLocaleTimeString([], {
//                 hour: "2-digit",
//                 minute: "2-digit",
//               })}
//             </p>
//           </div>
//           <span
//             className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
//               task.status
//             )}`}
//           >
//             {task.status.replace("_", " ")}
//           </span>
//         </div>

//         {/* Progress Bar */}
//         <div className="mb-4">
//           <div className="flex justify-between text-sm text-gray-600 mb-2">
//             <span>Progress</span>
//             <span className="font-medium">{completionRate}%</span>
//           </div>
//           <div className="w-full bg-gray-200 rounded-full h-2.5">
//             <div
//               className={`h-2.5 rounded-full transition-all duration-300 ${
//                 completionRate === 100
//                   ? "bg-green-500"
//                   : completionRate > 0
//                   ? "bg-yellow-500"
//                   : "bg-gray-300"
//               }`}
//               style={{ width: `${completionRate}%` }}
//             />
//           </div>
//         </div>

//         {/* Stats Grid */}
//         <div className="grid grid-cols-2 gap-4 mb-4">
//           <div className="flex items-center gap-2">
//             <Box className="w-4 h-4 text-gray-400" />
//             <div>
//               <p className="text-xs text-gray-500">Orders</p>
//               <p className="text-sm font-semibold">
//                 {task.completedOrders}/{task.totalOrders}
//               </p>
//             </div>
//           </div>

//           <div className="flex items-center gap-2">
//             <User className="w-4 h-4 text-gray-400" />
//             <div>
//               <p className="text-xs text-gray-500">Assigned</p>
//               <p className="text-sm font-semibold truncate">
//                 {task.assignedUser?.name || "Unassigned"}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Items Info */}
//         <div className="flex items-center gap-2 text-sm text-gray-600 pt-3 border-t">
//           <Package className="w-4 h-4" />
//           <span>{task.totalItems} items to pack</span>
//         </div>

//         {/* Time Info */}
//         {getTimeElapsed() && (
//           <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
//             <Clock className="w-4 h-4" />
//             <span>
//               {task.status === "COMPLETED" ? "Completed in" : "Time elapsed"}:{" "}
//               {getTimeElapsed()}
//             </span>
//           </div>
//         )}

//         {/* Continuation Badge */}
//         {task.parentTask && (
//           <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2">
//             <p className="text-xs text-blue-800 flex items-center gap-1">
//               <AlertCircle className="w-3 h-3" />
//               Continuation of {task.parentTask.taskNumber}
//             </p>
//           </div>
//         )}

//         {/* Priority Indicator */}
//         {task.priority > 0 && (
//           <div className="mt-3">
//             <span
//               className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
//                 task.priority === 2
//                   ? "bg-red-100 text-red-700"
//                   : "bg-orange-100 text-orange-700"
//               }`}
//             >
//               {task.priority === 2 ? "🔥 Urgent" : "⚡ High Priority"}
//             </span>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// function PackingTaskDetailModal({ task, onClose, onReload, getStatusColor }) {
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     loadItems();
//   }, [task.id]);

//   const loadItems = async () => {
//     setLoading(true);
//     try {
//       const response = await fetch(`/api/packing-tasks/${task.id}`);
//       const data = await response.json();
//       setItems(data.taskItems || []);
//     } catch (error) {
//       console.error("Error loading items:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div
//       className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//       onClick={onClose}
//     >
//       <div
//         className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
//         onClick={(e) => e.stopPropagation()}
//       >
//         {/* Header */}
//         <div className="p-6 border-b">
//           <div className="flex justify-between items-start">
//             <div>
//               <div className="flex items-center gap-3 mb-2">
//                 <h2 className="text-2xl font-bold">{task.taskNumber}</h2>
//                 <span
//                   className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
//                     task.status
//                   )}`}
//                 >
//                   {task.status.replace("_", " ")}
//                 </span>
//               </div>
//               <p className="text-gray-600">
//                 Assigned to {task.assignedUser?.name || "Unassigned"}
//               </p>
//             </div>
//             <button
//               onClick={onClose}
//               className="text-gray-400 hover:text-gray-600"
//             >
//               <span className="text-2xl">×</span>
//             </button>
//           </div>

//           {/* Progress Summary */}
//           <div className="mt-4 grid grid-cols-3 gap-4">
//             <div className="text-center">
//               <div className="text-2xl font-bold text-gray-900">
//                 {task.totalOrders}
//               </div>
//               <div className="text-xs text-gray-500">Total Orders</div>
//             </div>
//             <div className="text-center">
//               <div className="text-2xl font-bold text-green-600">
//                 {task.completedOrders}
//               </div>
//               <div className="text-xs text-gray-500">Packed</div>
//             </div>
//             <div className="text-center">
//               <div className="text-2xl font-bold text-blue-600">
//                 {Math.round((task.completedOrders / task.totalOrders) * 100)}%
//               </div>
//               <div className="text-xs text-gray-500">Complete</div>
//             </div>
//           </div>
//         </div>

//         {/* Orders List */}
//         <div className="flex-1 overflow-y-auto p-6">
//           {loading ? (
//             <div className="flex justify-center py-12">
//               <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
//             </div>
//           ) : items.length === 0 ? (
//             <div className="text-center py-12 text-gray-500">
//               <Box className="w-12 h-12 mx-auto mb-3 text-gray-400" />
//               <p>No items found</p>
//             </div>
//           ) : (
//             <div className="space-y-3">
//               {items.map((item, idx) => (
//                 <PackingTaskItemRow key={item.id} item={item} index={idx + 1} />
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="p-6 border-t bg-gray-50">
//           <button
//             onClick={onClose}
//             className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
//           >
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function PackingTaskItemRow({ item, index }) {
//   const getStatusIcon = () => {
//     if (item.status === "COMPLETED")
//       return <CheckCircle className="w-5 h-5 text-green-600" />;
//     if (item.status === "IN_PROGRESS")
//       return <Clock className="w-5 h-5 text-yellow-600" />;
//     return <Box className="w-5 h-5 text-gray-400" />;
//   };

//   return (
//     <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
//       <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
//         {index}
//       </div>

//       <div className="flex-1">
//         <div className="flex items-start justify-between mb-2">
//           <div>
//             <h4 className="font-semibold text-gray-900">
//               Order {item.order?.orderNumber}
//             </h4>
//             <p className="text-sm text-gray-600">{item.order?.customerName}</p>
//             <p className="text-xs text-gray-500">
//               {item.quantityRequired} items
//             </p>
//           </div>
//           <div className="text-right">
//             <div
//               className={`text-sm font-medium ${
//                 item.status === "COMPLETED" ? "text-green-600" : "text-gray-600"
//               }`}
//             >
//               {item.status}
//             </div>
//           </div>
//         </div>

//         {item.notes && (
//           <p className="text-xs text-gray-600 bg-white rounded px-2 py-1">
//             Note: {item.notes}
//           </p>
//         )}
//       </div>

//       <div className="flex-shrink-0">{getStatusIcon()}</div>
//     </div>
//   );
// }

// export default PackingTasksDashboard;
