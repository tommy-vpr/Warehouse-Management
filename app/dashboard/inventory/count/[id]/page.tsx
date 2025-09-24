"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Package,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Camera,
  Save,
  SkipForward,
  AlertCircle,
  RefreshCw,
  Calculator,
  Barcode,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

interface CycleCountTask {
  id: string;
  taskNumber: string;
  locationId: string;
  productVariantId?: string;
  systemQuantity: number;
  countedQuantity?: number;
  variance?: number;
  variancePercentage?: number;
  status:
    | "PENDING"
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "VARIANCE_REVIEW"
    | "RECOUNT_REQUIRED"
    | "SKIPPED"
    | "CANCELLED";
  notes?: string;
  tolerancePercentage?: number;
  requiresRecount: boolean;
  assignedTo?: string;
  startedAt?: string;
  completedAt?: string;
  location: {
    id: string;
    name: string;
    zone?: string;
    aisle?: string;
    shelf?: string;
    bin?: string;
  };
  productVariant?: {
    id: string;
    sku: string;
    name: string;
    upc?: string;
    product: {
      id: string;
      name: string;
    };
  };
  assignedUser?: {
    id: string;
    name: string;
  };
}

interface CycleCountCampaign {
  id: string;
  name: string;
  description?: string;
  countType: string;
  status: "PLANNED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  totalTasks: number;
  completedTasks: number;
  variancesFound: number;
  tasks: CycleCountTask[];
}

export default function CycleCountInterface() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = params.id;

  const [campaign, setCampaign] = useState<CycleCountCampaign | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [countInput, setCountInput] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentTaskIndex]);

  const loadCampaign = async () => {
    try {
      const response = await fetch(
        `/api/inventory/cycle-counts/campaigns/${campaignId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCampaign(data);

        // Find first uncounted task
        const firstUncounted = data.tasks.findIndex(
          (task: CycleCountTask) =>
            task.status === "PENDING" ||
            task.status === "ASSIGNED" ||
            task.status === "IN_PROGRESS"
        );
        if (firstUncounted !== -1) {
          setCurrentTaskIndex(firstUncounted);
        } else {
          setCurrentTaskIndex(0);
        }
      } else {
        router.push("/dashboard/inventory/count");
      }
    } catch (error) {
      console.error("Failed to load campaign:", error);
      setError("Failed to load campaign data");
      router.push("/dashboard/inventory/count");
    }
    setIsLoading(false);
  };

  const saveCount = async (
    quantity: number | null,
    taskNotes?: string,
    skip = false
  ) => {
    if (!campaign) return;

    setIsSaving(true);
    setError(null);

    try {
      const currentTask = campaign.tasks[currentTaskIndex];
      if (!currentTask) return;

      const response = await fetch(
        `/api/inventory/cycle-counts/tasks/${currentTask.id}/count`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            countedQuantity: skip ? null : quantity,
            notes: taskNotes || notes,
            status: skip ? "SKIPPED" : undefined,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();

        // Update local state
        setCampaign((prev) => {
          if (!prev) return prev;

          const updatedTasks = [...prev.tasks];
          updatedTasks[currentTaskIndex] = {
            ...updatedTasks[currentTaskIndex],
            countedQuantity: skip ? undefined : quantity ?? undefined,
            variance: result.variance,
            status: result.task.status,
            notes: taskNotes || notes,
            completedAt: result.task.completedAt,
            requiresRecount: result.requiresRecount || false,
          };

          return {
            ...prev,
            tasks: updatedTasks,
            completedTasks: updatedTasks.filter(
              (t) => t.status === "COMPLETED" || t.status === "SKIPPED"
            ).length,
          };
        });

        // Move to next task
        const nextIndex = campaign.tasks.findIndex(
          (task, index) =>
            index > currentTaskIndex &&
            (task.status === "PENDING" || task.status === "ASSIGNED")
        );

        if (nextIndex !== -1) {
          setCurrentTaskIndex(nextIndex);
          resetForm();
        } else {
          await completeCampaign();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save count");
      }
    } catch (error) {
      console.error("Failed to save count:", error);
      setError("Failed to save count. Please try again.");
    }
    setIsSaving(false);
  };

  const resetForm = () => {
    setCountInput("");
    setNotes("");
    setError(null);
  };

  const completeCampaign = async () => {
    try {
      await fetch(
        `/api/inventory/cycle-counts/campaigns/${campaignId}/complete`,
        {
          method: "POST",
        }
      );
      router.push("/dashboard/inventory/count");
    } catch (error) {
      console.error("Failed to complete campaign:", error);
      setError("Failed to complete campaign.");
    }
  };

  const handleSubmitCount = () => {
    const currentTask = campaign?.tasks[currentTaskIndex];
    if (!currentTask) return;

    setError(null);

    // Validate input
    if (!countInput.trim()) {
      setError("Please enter a quantity or skip this task");
      inputRef.current?.focus();
      return;
    }

    const quantity = parseInt(countInput);
    if (isNaN(quantity)) {
      setError("Please enter a valid number");
      inputRef.current?.focus();
      return;
    }

    if (quantity < 0) {
      setError("Quantity cannot be negative");
      inputRef.current?.focus();
      return;
    }

    // Save the count
    saveCount(quantity, notes, false);
  };

  const handleSkipTask = () => {
    const currentTask = campaign?.tasks[currentTaskIndex];
    if (!currentTask) return;

    const confirmed = confirm(
      "Are you sure you want to skip this task? This cannot be undone."
    );
    if (!confirmed) return;

    saveCount(null, notes || "Task skipped by user", true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSaving) {
      e.preventDefault();
      handleSubmitCount();
    } else if (e.key === "Escape" && !isSaving) {
      e.preventDefault();
      handleSkipTask();
    }
  };

  const getVarianceColor = (
    variance: number,
    systemQty: number,
    tolerance: number = 5
  ) => {
    if (variance === 0) return "text-green-600";

    const percentVariance = Math.abs((variance / systemQty) * 100);
    if (percentVariance <= tolerance) return "text-yellow-600";
    return "text-red-400";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-gray-100 text-gray-800";
      case "ASSIGNED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "VARIANCE_REVIEW":
        return "bg-orange-100 text-orange-800";
      case "RECOUNT_REQUIRED":
        return "bg-red-100 text-red-800";
      case "SKIPPED":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-200">
            Loading campaign...
          </p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">Campaign not found</p>
          <Button
            onClick={() => router.push("/dashboard/inventory/count")}
            className="mt-4"
          >
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const currentTask = campaign.tasks[currentTaskIndex];

  if (!currentTask) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">All Tasks Complete!</h2>
          <p className="text-gray-600 mb-4">
            No more tasks to process in this campaign.
          </p>
          <Button onClick={() => router.push("/dashboard/inventory/count")}>
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const progress = (campaign.completedTasks / campaign.totalTasks) * 100;
  const estimatedVariance = countInput
    ? parseInt(countInput) - currentTask.systemQuantity
    : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/inventory/count")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-200">
              {campaign.name}
            </h1>
            <p className="text-gray-600 dark:text-blue-500">
              {campaign.countType.replace("_", " ")} Count
            </p>
          </div>
          <Badge className={getStatusColor(campaign.status)}>
            {campaign.status}
          </Badge>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30">
            <CardContent className="p-4">
              <div className="flex items-center text-red-800 dark:text-red-200">
                <AlertTriangle className="w-5 h-5 mr-2" />
                {error}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">Progress</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Task {currentTaskIndex + 1} of {campaign.totalTasks}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {campaign.completedTasks}/{campaign.totalTasks}
                </div>
                <div className="text-sm text-gray-600">
                  {progress.toFixed(1)}% Complete
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {campaign.variancesFound > 0 && (
              <div className="mt-2 text-sm text-red-400">
                {campaign.variancesFound} items with variances detected
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Task */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Task</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setScanMode(!scanMode)}
                    >
                      <Barcode className="w-4 h-4 mr-1" />
                      {scanMode ? "Manual" : "Scan"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCamera(true)}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Product Info */}
                <div className="p-4 bg-background rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">
                        {currentTask.productVariant?.product.name ||
                          "Location Count"}
                      </h3>
                      <div className="mt-1 space-y-1">
                        {currentTask.productVariant && (
                          <>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">SKU:</span>{" "}
                              {currentTask.productVariant.sku}
                            </div>
                            {currentTask.productVariant.upc && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium">UPC:</span>{" "}
                                {currentTask.productVariant.upc}
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4 mr-1" />
                          {currentTask.location.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-blue-500">
                          Task: {currentTask.taskNumber}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {currentTask.systemQuantity}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        System Qty
                      </div>
                    </div>
                  </div>
                </div>

                {/* Count Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-green-600 mb-2">
                    Physical Count
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        ref={inputRef}
                        type="number"
                        min="0"
                        value={countInput}
                        onChange={(e) => {
                          setCountInput(e.target.value);
                          setError(null);
                        }}
                        onKeyDown={handleKeyPress}
                        placeholder="Enter quantity found"
                        className="text-lg h-12"
                        disabled={isSaving}
                      />
                    </div>
                    <Button
                      onClick={handleSubmitCount}
                      disabled={!countInput || isSaving}
                      className="h-12 px-6"
                    >
                      {isSaving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Count
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Variance Preview */}
                  {countInput && (
                    <div
                      className={`mt-2 p-3 rounded-lg ${
                        estimatedVariance === 0
                          ? "bg-green-50 border border-green-200 dark:bg-green-800/30 dark:border-green-500"
                          : Math.abs(
                              (estimatedVariance / currentTask.systemQuantity) *
                                100
                            ) <= (currentTask.tolerancePercentage || 5)
                          ? "bg-yellow-50 border border-yellow-200"
                          : "bg-red-50 border border-red-200 dark:bg-red-800/30 dark:border-red-500"
                      }`}
                    >
                      <div className="flex items-center justify-between text-gray-700">
                        <span className="text-sm font-medium">Variance:</span>
                        <span
                          className={`font-bold ${getVarianceColor(
                            estimatedVariance,
                            currentTask.systemQuantity,
                            currentTask.tolerancePercentage || 5
                          )}`}
                        >
                          {estimatedVariance > 0 ? "+" : ""}
                          {estimatedVariance}
                        </span>
                      </div>
                      {estimatedVariance !== 0 && (
                        <div className="text-xs text-gray-600 dark:text-gray-200 mt-1">
                          {(
                            (Math.abs(estimatedVariance) /
                              currentTask.systemQuantity) *
                            100
                          ).toFixed(1)}
                          % variance
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this count..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSkipTask}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Skip Task
                  </Button>
                  <Button
                    onClick={() => {
                      const reason = prompt("Reason for marking as problem:");
                      if (reason) {
                        setNotes(reason);
                        handleSkipTask();
                      }
                    }}
                    variant="outline"
                    disabled={isSaving}
                    className="flex-1"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Problem Item
                  </Button>
                </div>

                {/* Instructions */}
                {campaign.description && (
                  <div className="p-4 bg-blue-50 border border-blue-200 dark:bg-blue-800/30 dark:border-blue-600 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-400 mb-2">
                      Instructions
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-400">
                      {campaign.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  Count Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-200">
                    Completed:
                  </span>
                  <span className="font-medium">{campaign.completedTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-200">
                    Remaining:
                  </span>
                  <span className="font-medium">
                    {campaign.totalTasks - campaign.completedTasks}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-200">
                    Variances:
                  </span>
                  <span className="font-medium text-red-400">
                    {campaign.variancesFound}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-200">
                    Accuracy:
                  </span>
                  <span className="font-medium">
                    {campaign.completedTasks > 0
                      ? (
                          ((campaign.completedTasks - campaign.variancesFound) /
                            campaign.completedTasks) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <Card>
              <CardHeader>
                <CardTitle>Task Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const prevIndex = Math.max(0, currentTaskIndex - 1);
                        setCurrentTaskIndex(prevIndex);
                        resetForm();
                      }}
                      disabled={currentTaskIndex === 0}
                      className="flex-1"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextIndex = Math.min(
                          campaign.tasks.length - 1,
                          currentTaskIndex + 1
                        );
                        setCurrentTaskIndex(nextIndex);
                        resetForm();
                      }}
                      disabled={currentTaskIndex === campaign.tasks.length - 1}
                      className="flex-1"
                    >
                      Next
                    </Button>
                  </div>

                  <div className="text-center text-sm text-gray-600">
                    Jump to task:
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max={campaign.totalTasks}
                    placeholder={`1-${campaign.totalTasks}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const taskNum = parseInt(
                          (e.target as HTMLInputElement).value
                        );
                        if (taskNum >= 1 && taskNum <= campaign.totalTasks) {
                          setCurrentTaskIndex(taskNum - 1);
                          resetForm();
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recent Counts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Counts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {campaign.tasks
                    .filter(
                      (task) =>
                        task.status !== "PENDING" && task.status !== "ASSIGNED"
                    )
                    .slice(-5)
                    .reverse()
                    .map((task, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-background rounded"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium truncate">
                            {task.productVariant?.product.name ||
                              "Location Count"}
                          </div>
                          <div className="text-xs text-gray-600">
                            {task.location.name}
                          </div>
                        </div>
                        <div className="text-right">
                          {task.status === "SKIPPED" ? (
                            <Badge variant="secondary" className="text-xs">
                              Skipped
                            </Badge>
                          ) : (
                            <>
                              <div className="text-sm font-medium">
                                {task.countedQuantity}
                              </div>
                              {task.variance !== null &&
                                task.variance !== 0 && (
                                  <div
                                    className={`text-xs ${
                                      task.variance! > 0
                                        ? "text-red-400"
                                        : "text-blue-600"
                                    }`}
                                  >
                                    {task.variance! > 0 ? "+" : ""}
                                    {task.variance}
                                  </div>
                                )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Keyboard Shortcuts:</strong>
              <span className="ml-2">Enter = Submit Count</span>
              <span className="ml-4">Esc = Skip Task</span>
              <span className="ml-4">Tab = Focus Next Field</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
