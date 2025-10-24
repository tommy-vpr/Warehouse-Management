// components/tasks/ReassignTaskDialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Users, Package } from "lucide-react";
import type { ReassignmentReason } from "@/types/audit-trail";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface TaskProgress {
  completedItems: number;
  totalItems: number;
  completedOrders: number;
  totalOrders: number;
}

interface ReassignTaskDialogProps {
  taskId: string;
  taskNumber: string;
  taskType: string;
  currentAssignee: User | null;
  progress: TaskProgress;
  availableUsers: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const REASSIGNMENT_REASONS: { value: ReassignmentReason; label: string }[] = [
  { value: "STAFF_UNAVAILABLE", label: "Staff Unavailable" },
  { value: "SHIFT_CHANGE", label: "Shift Change" },
  { value: "WORKLOAD_BALANCE", label: "Workload Balance" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "SKILL_MISMATCH", label: "Skill Mismatch" },
  { value: "EQUIPMENT_ISSUE", label: "Equipment Issue" },
  { value: "PERFORMANCE_ISSUE", label: "Performance Issue" },
  { value: "OTHER", label: "Other" },
];

export default function ReassignTaskDialog({
  taskId,
  taskNumber,
  taskType,
  currentAssignee,
  progress,
  availableUsers,
  open,
  onOpenChange,
  onSuccess,
}: ReassignTaskDialogProps) {
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [reason, setReason] = useState<ReassignmentReason | "">("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReassign = async () => {
    if (!newAssignedTo || !reason) {
      setError("Please select a user and reason");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newAssignedTo,
          reason,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reassign");
      }

      // Reset form
      setNewAssignedTo("");
      setReason("");
      setNotes("");

      // Call success callback and close dialog
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Reassignment failed:", err);
      setError(err instanceof Error ? err.message : "Failed to reassign task");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNewAssignedTo("");
    setReason("");
    setNotes("");
    setError(null);
    onOpenChange(false);
  };

  // Filter out current assignee from available users
  const selectableUsers = currentAssignee
    ? availableUsers.filter((user) => user.id !== currentAssignee.id)
    : availableUsers;

  const progressPercentage =
    progress.totalItems > 0
      ? Math.round((progress.completedItems / progress.totalItems) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Reassign {taskType} Task
          </DialogTitle>
          <DialogDescription>
            Reassign {taskNumber} to a different team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Progress */}
          <div className="space-y-2">
            <Label>Current Progress</Label>
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">
                    {progress.completedItems} / {progress.totalItems} items
                  </span>
                </div>
                <span className="text-sm font-bold text-blue-600">
                  {progressPercentage}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {progress.completedOrders} / {progress.totalOrders} orders
                completed
              </p>
            </div>
          </div>

          {/* Current Assignee */}
          <div className="space-y-2">
            <Label>Current Assignee</Label>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
              {currentAssignee ? (
                <>
                  <p className="font-medium">
                    {currentAssignee.name || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {currentAssignee.email}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">Unassigned</p>
              )}
            </div>
          </div>

          {/* New Assignee */}
          <div className="space-y-2">
            <Label htmlFor="newAssignee">Reassign To *</Label>
            <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
              <SelectTrigger id="newAssignee">
                <SelectValue placeholder="Select new assignee" />
              </SelectTrigger>
              <SelectContent>
                {selectableUsers.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">
                    No other users available
                  </div>
                ) : (
                  selectableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span>{user.name || "Unknown"}</span>
                        <span className="text-xs text-gray-500">
                          {user.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as ReassignmentReason)}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REASSIGNMENT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">{notes.length}/500</p>
          </div>

          {/* Warning if task is in progress */}
          {progress.completedItems > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This task is already in progress. The new assignee will continue
                from where the previous assignee left off.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleReassign}
            disabled={
              !newAssignedTo ||
              !reason ||
              loading ||
              selectableUsers.length === 0
            }
            className="flex-1"
          >
            {loading ? "Reassigning..." : "Reassign Task"}
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
