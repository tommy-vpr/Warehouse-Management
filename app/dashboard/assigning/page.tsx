"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
} from "lucide-react";

function AdminReassignmentDashboard() {
  const [staff, setStaff] = useState([]);
  const [pickLists, setPickLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [staffRes, pickListsRes] = await Promise.all([
      fetch("/api/users?role=STAFF"),
      fetch("/api/pick-lists?status=IN_PROGRESS,ASSIGNED,PAUSED"),
    ]);

    const staffData = await staffRes.json();
    const pickListsData = await pickListsRes.json();

    // Calculate workload for each staff
    const staffWithWorkload = staffData.map((s) => {
      const assignedLists = pickListsData.filter(
        (pl) => pl.assignedTo === s.id
      );

      const totalRemaining = assignedLists.reduce(
        (sum, pl) => sum + (pl.totalItems - pl.pickedItems),
        0
      );

      return {
        ...s,
        activeLists: assignedLists.length,
        remainingItems: totalRemaining,
        pickLists: assignedLists,
      };
    });

    setStaff(staffWithWorkload);
    setPickLists(pickListsData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Staff Workload Management
        </h1>
        <p className="text-gray-600">
          Monitor and reassign pick lists across your warehouse team
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Active Staff"
          value={staff.filter((s) => s.activeLists > 0).length}
          color="blue"
        />
        <StatCard
          icon={<Package className="w-6 h-6" />}
          label="Active Pick Lists"
          value={pickLists.length}
          color="green"
        />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6" />}
          label="Paused Lists"
          value={pickLists.filter((pl) => pl.status === "PAUSED").length}
          color="orange"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Items Remaining"
          value={pickLists.reduce(
            (sum, pl) => sum + (pl.totalItems - pl.pickedItems),
            0
          )}
          color="purple"
        />
      </div>

      {/* Staff Workload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {staff.map((member) => (
          <StaffWorkloadCard
            key={member.id}
            staff={member}
            onSelectStaff={() => setSelectedStaff(member)}
            onReload={loadData}
          />
        ))}
      </div>

      {/* Bulk Reassignment Modal */}
      {selectedStaff && (
        <BulkReassignmentModal
          staff={selectedStaff}
          allStaff={staff.filter((s) => s.id !== selectedStaff.id)}
          onClose={() => setSelectedStaff(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`inline-flex p-3 rounded-lg ${colors[color]} mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function StaffWorkloadCard({ staff, onSelectStaff, onReload }) {
  const getWorkloadLevel = () => {
    if (staff.remainingItems === 0) return { label: "Idle", color: "gray" };
    if (staff.remainingItems < 50) return { label: "Light", color: "green" };
    if (staff.remainingItems < 150)
      return { label: "Moderate", color: "yellow" };
    return { label: "Heavy", color: "red" };
  };

  const workload = getWorkloadLevel();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-blue-600">
              {staff.name?.charAt(0) || "?"}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {staff.name}
            </h3>
            <p className="text-sm text-gray-500">{staff.email}</p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            workload.color === "gray"
              ? "bg-gray-100 text-gray-700"
              : workload.color === "green"
              ? "bg-green-100 text-green-700"
              : workload.color === "yellow"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {workload.label}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {staff.activeLists}
          </div>
          <div className="text-xs text-gray-500">Active Lists</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {staff.remainingItems}
          </div>
          <div className="text-xs text-gray-500">Items Left</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {staff.activeLists > 0
              ? Math.round(staff.remainingItems / staff.activeLists)
              : 0}
          </div>
          <div className="text-xs text-gray-500">Avg/List</div>
        </div>
      </div>

      {/* Pick Lists */}
      {staff.pickLists.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="text-xs font-medium text-gray-500 uppercase">
            Current Pick Lists
          </div>
          {staff.pickLists.map((pl) => (
            <div
              key={pl.id}
              className="flex items-center justify-between bg-gray-50 rounded p-2"
            >
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {pl.batchNumber}
                </div>
                <div className="text-xs text-gray-500">
                  {pl.pickedItems}/{pl.totalItems} items ({pl.completionRate}%)
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  pl.status === "IN_PROGRESS"
                    ? "bg-yellow-100 text-yellow-700"
                    : pl.status === "PAUSED"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {pl.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {staff.activeLists > 0 && (
        <button
          onClick={onSelectStaff}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Reassign Work
        </button>
      )}
    </div>
  );
}

function BulkReassignmentModal({ staff, allStaff, onClose, onSuccess }) {
  const [targetStaffId, setTargetStaffId] = useState("");
  const [selectedLists, setSelectedLists] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Select all by default
    setSelectedLists(staff.pickLists.map((pl) => pl.id));
  }, [staff]);

  const handleReassign = async () => {
    if (!targetStaffId || selectedLists.length === 0) return;

    setLoading(true);
    try {
      const promises = selectedLists.map((listId) =>
        fetch(`/api/pick-lists/${listId}/reassign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newStaffId: targetStaffId,
            strategy: "split",
          }),
        })
      );

      await Promise.all(promises);
      onSuccess();
      onClose();
    } catch (error) {
      alert("Error reassigning pick lists");
    } finally {
      setLoading(false);
    }
  };

  const toggleList = (listId) => {
    setSelectedLists((prev) =>
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId]
    );
  };

  const totalItemsReassigning = staff.pickLists
    .filter((pl) => selectedLists.includes(pl.id))
    .reduce((sum, pl) => sum + (pl.totalItems - pl.pickedItems), 0);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold mb-2">
            Reassign Work from {staff.name}
          </h2>
          <p className="text-gray-600">
            Select pick lists to reassign to another staff member
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Target Staff Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            <select
              value={targetStaffId}
              onChange={(e) => setTargetStaffId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">Select staff member...</option>
              {allStaff
                .sort((a, b) => a.remainingItems - b.remainingItems)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - {s.remainingItems} items ({s.activeLists} lists)
                  </option>
                ))}
            </select>
          </div>

          {/* Pick Lists Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Pick Lists
              </label>
              <button
                onClick={() =>
                  setSelectedLists(
                    selectedLists.length === staff.pickLists.length
                      ? []
                      : staff.pickLists.map((pl) => pl.id)
                  )
                }
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectedLists.length === staff.pickLists.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            <div className="space-y-2">
              {staff.pickLists.map((pl) => (
                <label
                  key={pl.id}
                  className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedLists.includes(pl.id)}
                    onChange={() => toggleList(pl.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {pl.batchNumber}
                    </div>
                    <div className="text-sm text-gray-600">
                      {pl.pickedItems}/{pl.totalItems} picked •{" "}
                      {pl.totalItems - pl.pickedItems} remaining
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      pl.status === "IN_PROGRESS"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {pl.status}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          {selectedLists.length > 0 && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-900">
                <strong>Summary:</strong> Reassigning {selectedLists.length}{" "}
                pick list(s) with approximately {totalItemsReassigning}{" "}
                remaining items
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleReassign}
            disabled={!targetStaffId || selectedLists.length === 0 || loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading
              ? "Reassigning..."
              : `Reassign ${selectedLists.length} List(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminReassignmentDashboard;
