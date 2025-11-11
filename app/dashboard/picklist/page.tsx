// "use client";

// import React, { useState, useEffect } from "react";
// import {
//   Package,
//   User,
//   AlertCircle,
//   CheckCircle2,
//   Clock,
//   ArrowRight,
//   SplitSquareHorizontal,
//   Users,
// } from "lucide-react";

// // Main Pick List Dashboard
// function PickListDashboard() {
//   const [pickLists, setPickLists] = useState([]);
//   const [selectedList, setSelectedList] = useState(null);
//   const [filter, setFilter] = useState("all");
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     loadPickLists();
//   }, [filter]);

//   const loadPickLists = async () => {
//     setLoading(true);
//     const params = filter !== "all" ? `?status=${filter}` : "";
//     const response = await fetch(`/api/pick-lists${params}`);
//     const data = await response.json();
//     setPickLists(data);
//     setLoading(false);
//   };

//   const getStatusColor = (status) => {
//     const colors = {
//       PENDING: "bg-gray-100 text-gray-800",
//       ASSIGNED: "bg-blue-100 text-blue-800",
//       IN_PROGRESS: "bg-yellow-100 text-yellow-800",
//       PARTIALLY_COMPLETED: "bg-orange-100 text-orange-800",
//       COMPLETED: "bg-green-100 text-green-800",
//       CANCELLED: "bg-red-100 text-red-800",
//     };
//     return colors[status] || colors.PENDING;
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto p-6">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-3xl font-bold text-gray-900">Pick Lists</h1>
//         <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
//           Create New Pick List
//         </button>
//       </div>

//       {/* Filters */}
//       <div className="flex gap-2 mb-6">
//         {["all", "ASSIGNED", "IN_PROGRESS", "PARTIALLY_COMPLETED"].map(
//           (status) => (
//             <button
//               key={status}
//               onClick={() => setFilter(status)}
//               className={`px-4 py-2 rounded-lg transition ${
//                 filter === status
//                   ? "bg-blue-600 text-white"
//                   : "bg-gray-100 text-gray-700 hover:bg-gray-200"
//               }`}
//             >
//               {status === "all" ? "All" : status.replace("_", " ")}
//             </button>
//           )
//         )}
//       </div>

//       {/* Pick List Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//         {pickLists.map((list) => (
//           <PickListCard
//             key={list.id}
//             list={list}
//             onSelect={() => setSelectedList(list)}
//             onReload={loadPickLists}
//           />
//         ))}
//       </div>

//       {/* Detail Modal */}
//       {selectedList && (
//         <PickListDetailModal
//           list={selectedList}
//           onClose={() => setSelectedList(null)}
//           onReload={loadPickLists}
//         />
//       )}
//     </div>
//   );
// }

// // Pick List Card Component
// function PickListCard({ list, onSelect, onReload }) {
//   const [showReassign, setShowReassign] = useState(false);

//   const getStatusColor = (status) => {
//     const colors = {
//       PENDING: "bg-gray-100 text-gray-800",
//       ASSIGNED: "bg-blue-100 text-blue-800",
//       IN_PROGRESS: "bg-yellow-100 text-yellow-800",
//       PARTIALLY_COMPLETED: "bg-orange-100 text-orange-800",
//       COMPLETED: "bg-green-100 text-green-800",
//       CANCELLED: "bg-red-100 text-red-800",
//     };
//     return colors[status] || colors.PENDING;
//   };

//   return (
//     <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 cursor-pointer">
//       <div onClick={onSelect}>
//         <div className="flex justify-between items-start mb-4">
//           <div>
//             <h3 className="text-lg font-semibold text-gray-900">
//               {list.batchNumber}
//             </h3>
//             <p className="text-sm text-gray-500">
//               Created {new Date(list.createdAt).toLocaleDateString()}
//             </p>
//           </div>
//           <span
//             className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
//               list.status
//             )}`}
//           >
//             {list.status}
//           </span>
//         </div>

//         {/* Progress Bar */}
//         <div className="mb-4">
//           <div className="flex justify-between text-sm text-gray-600 mb-1">
//             <span>Progress</span>
//             <span>{list.completionRate}%</span>
//           </div>
//           <div className="w-full bg-gray-200 rounded-full h-2">
//             <div
//               className="bg-blue-600 h-2 rounded-full transition-all duration-300"
//               style={{ width: `${list.completionRate}%` }}
//             />
//           </div>
//         </div>

//         {/* Stats */}
//         <div className="grid grid-cols-2 gap-4 mb-4">
//           <div className="flex items-center gap-2">
//             <Package className="w-4 h-4 text-gray-400" />
//             <div>
//               <p className="text-xs text-gray-500">Items</p>
//               <p className="text-sm font-semibold">
//                 {list.pickedItems}/{list.totalItems}
//               </p>
//             </div>
//           </div>
//           <div className="flex items-center gap-2">
//             <User className="w-4 h-4 text-gray-400" />
//             <div>
//               <p className="text-xs text-gray-500">Assigned</p>
//               <p className="text-sm font-semibold">
//                 {list.assignedUser?.name || "Unassigned"}
//               </p>
//             </div>
//           </div>
//         </div>

//         {list.parentPickList && (
//           <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
//             <p className="text-xs text-blue-800 flex items-center gap-1">
//               <ArrowRight className="w-3 h-3" />
//               Continuation of {list.parentPickList.batchNumber}
//             </p>
//           </div>
//         )}
//       </div>

//       {/* Action Buttons */}
//       <div className="flex gap-2 pt-3 border-t">
//         {list.status === "IN_PROGRESS" && (
//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               setShowReassign(true);
//             }}
//             className="flex-1 bg-orange-50 text-orange-700 px-3 py-2 rounded hover:bg-orange-100 transition text-sm font-medium"
//           >
//             Reassign
//           </button>
//         )}
//         {list.status === "ASSIGNED" && (
//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               onSelect();
//             }}
//             className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition text-sm font-medium"
//           >
//             Start Picking
//           </button>
//         )}
//       </div>

//       {showReassign && (
//         <ReassignModal
//           list={list}
//           onClose={() => setShowReassign(false)}
//           onSuccess={onReload}
//         />
//       )}
//     </div>
//   );
// }

// // Reassign Modal Component
// function ReassignModal({ list, onClose, onSuccess }) {
//   const [newStaffId, setNewStaffId] = useState("");
//   const [strategy, setStrategy] = useState("split");
//   const [loading, setLoading] = useState(false);
//   const [staff, setStaff] = useState([]);

//   useEffect(() => {
//     fetch("/api/users?role=STAFF")
//       .then((res) => res.json())
//       .then((data) => setStaff(data));
//   }, []);

//   const handleReassign = async () => {
//     setLoading(true);
//     try {
//       const response = await fetch(`/api/pick-lists/${list.id}/reassign`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ newStaffId, strategy }),
//       });

//       if (response.ok) {
//         onSuccess();
//         onClose();
//       } else {
//         const error = await response.json();
//         alert(error.error || "Failed to reassign");
//       }
//     } catch (error) {
//       alert("Error reassigning pick list");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div
//       className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
//       onClick={onClose}
//     >
//       <div
//         className="bg-white rounded-lg p-6 max-w-md w-full m-4"
//         onClick={(e) => e.stopPropagation()}
//       >
//         <h2 className="text-xl font-bold mb-4">Reassign Pick List</h2>

//         <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
//           <p className="text-sm text-yellow-800">
//             <strong>{list.batchNumber}</strong> has {list.pickedItems}/
//             {list.totalItems} items picked
//           </p>
//         </div>

//         <div className="mb-4">
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             New Staff Member
//           </label>
//           <select
//             value={newStaffId}
//             onChange={(e) => setNewStaffId(e.target.value)}
//             className="w-full border border-gray-300 rounded-lg px-3 py-2"
//           >
//             <option value="">Select staff...</option>
//             {staff.map((s) => (
//               <option key={s.id} value={s.id}>
//                 {s.name}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className="mb-6">
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Reassignment Strategy
//           </label>
//           <div className="space-y-2">
//             <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
//               <input
//                 type="radio"
//                 value="split"
//                 checked={strategy === "split"}
//                 onChange={(e) => setStrategy(e.target.value)}
//                 className="mt-1"
//               />
//               <div>
//                 <div className="font-medium text-sm">
//                   Create New Pick List (Recommended)
//                 </div>
//                 <div className="text-xs text-gray-600">
//                   Creates a continuation pick list for remaining work. Clean
//                   separation of completed vs pending items.
//                 </div>
//               </div>
//             </label>

//             <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
//               <input
//                 type="radio"
//                 value="in-place"
//                 checked={strategy === "in-place"}
//                 onChange={(e) => setStrategy(e.target.value)}
//                 className="mt-1"
//               />
//               <div>
//                 <div className="font-medium text-sm">Split Items In-Place</div>
//                 <div className="text-xs text-gray-600">
//                   Splits partial items within the same pick list. All work stays
//                   under original batch number.
//                 </div>
//               </div>
//             </label>
//           </div>
//         </div>

//         <div className="flex gap-3">
//           <button
//             onClick={onClose}
//             className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleReassign}
//             disabled={!newStaffId || loading}
//             className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
//           >
//             {loading ? "Reassigning..." : "Reassign"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Pick List Detail Modal
// function PickListDetailModal({ list, onClose, onReload }) {
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetch(`/api/pick-lists/${list.id}`)
//       .then((res) => res.json())
//       .then((data) => {
//         setItems(data.items);
//         setLoading(false);
//       });
//   }, [list.id]);

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
//               <h2 className="text-2xl font-bold">{list.batchNumber}</h2>
//               <p className="text-gray-600 mt-1">
//                 Assigned to {list.assignedUser?.name || "Unassigned"}
//               </p>
//             </div>
//             <button
//               onClick={onClose}
//               className="text-gray-400 hover:text-gray-600"
//             >
//               <span className="text-2xl">×</span>
//             </button>
//           </div>
//         </div>

//         {/* Items List */}
//         <div className="flex-1 overflow-y-auto p-6">
//           {loading ? (
//             <div className="flex justify-center py-12">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//             </div>
//           ) : (
//             <div className="space-y-3">
//               {items.map((item, idx) => (
//                 <PickListItemRow key={item.id} item={item} index={idx + 1} />
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// // Pick List Item Row
// function PickListItemRow({ item, index }) {
//   const getStatusIcon = () => {
//     if (item.status === "PICKED")
//       return <CheckCircle2 className="w-5 h-5 text-green-600" />;
//     if (item.status === "SHORT_PICK")
//       return <AlertCircle className="w-5 h-5 text-orange-600" />;
//     return <Clock className="w-5 h-5 text-gray-400" />;
//   };

//   const progress =
//     item.quantityToPick > 0
//       ? (item.quantityPicked / item.quantityToPick) * 100
//       : 0;

//   return (
//     <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
//       <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
//         {index}
//       </div>

//       <div className="flex-1">
//         <div className="flex items-start justify-between mb-2">
//           <div>
//             <h4 className="font-semibold text-gray-900">
//               {item.productVariant.product.name}
//             </h4>
//             <p className="text-sm text-gray-600">
//               SKU: {item.productVariant.sku}
//             </p>
//             <p className="text-xs text-gray-500">
//               Location: {item.location.name}
//             </p>
//           </div>
//           <div className="text-right">
//             <div className="text-lg font-bold text-gray-900">
//               {item.quantityPicked}/{item.quantityToPick}
//             </div>
//             <div className="text-xs text-gray-500">units</div>
//           </div>
//         </div>

//         {/* Progress bar */}
//         {item.quantityPicked > 0 && (
//           <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
//             <div
//               className={`h-1.5 rounded-full ${
//                 progress === 100 ? "bg-green-500" : "bg-orange-500"
//               }`}
//               style={{ width: `${progress}%` }}
//             />
//           </div>
//         )}

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

// // Export the main component
// export default PickListDashboard;
