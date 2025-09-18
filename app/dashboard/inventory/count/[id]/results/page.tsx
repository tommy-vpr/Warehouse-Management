// app/dashboard/inventory/count/[id]/results/page.tsx - Campaign Results Page
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Package,
  MapPin,
  Calendar,
  User,
  BarChart3,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

interface CampaignResults {
  id: string;
  name: string;
  description?: string;
  countType: string;
  status: string;
  startDate: string;
  endDate?: string;
  totalTasks: number;
  completedTasks: number;
  variancesFound: number;
  accuracy: number;
  tasks: Array<{
    id: string;
    taskNumber: string;
    location: { name: string; zone?: string };
    productVariant?: {
      sku: string;
      name: string;
      product: { name: string };
    };
    systemQuantity: number;
    countedQuantity?: number;
    variance?: number;
    variancePercentage?: number;
    status: string;
    completedAt?: string;
    notes?: string;
  }>;
}

export default function CampaignResults() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = params.id;

  const [results, setResults] = useState<CampaignResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<
    "ALL" | "VARIANCES" | "COMPLETED"
  >("ALL");

  useEffect(() => {
    if (campaignId) {
      loadResults();
    }
  }, [campaignId]);

  const loadResults = async () => {
    try {
      const response = await fetch(
        `/api/inventory/cycle-counts/campaigns/${campaignId}`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        router.push("/dashboard/inventory/count");
      }
    } catch (error) {
      console.error("Failed to load campaign results:", error);
      router.push("/dashboard/inventory/count");
    }
    setIsLoading(false);
  };

  const exportResults = async () => {
    try {
      const response = await fetch(
        `/api/inventory/cycle-counts/campaigns/${campaignId}/export`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `campaign-${results?.name}-results.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to export results:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading campaign results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
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

  const filteredTasks = results.tasks.filter((task) => {
    switch (viewFilter) {
      case "VARIANCES":
        return task.variance !== null && task.variance !== 0;
      case "COMPLETED":
        return task.status === "COMPLETED";
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const formatVariance = (variance: number) => {
    return variance > 0 ? `+${variance}` : variance.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard/inventory/count")}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {results.name} - Results
              </h1>
              <p className="text-gray-600">
                Campaign completion summary and analysis
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={exportResults}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Campaign Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Campaign Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {results.totalTasks}
                </div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {results.completedTasks}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {results.variancesFound}
                </div>
                <div className="text-sm text-gray-600">Variances</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {results.accuracy.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <span>
                  {new Date(results.startDate).toLocaleDateString()} -{" "}
                  {results.endDate
                    ? new Date(results.endDate).toLocaleDateString()
                    : "Ongoing"}
                </span>
              </div>
              <div className="flex items-center">
                <Package className="w-4 h-4 mr-2 text-gray-400" />
                <span>{results.countType.replace(/_/g, " ")}</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-gray-400" />
                <Badge className={getStatusColor(results.status)}>
                  {results.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variance Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <TrendingUp className="w-5 h-5 mr-2" />
                Positive Variances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {results.tasks.filter((t) => (t.variance || 0) > 0).length}
              </div>
              <div className="text-sm text-gray-600">
                Items over system quantity
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <TrendingDown className="w-5 h-5 mr-2" />
                Negative Variances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {results.tasks.filter((t) => (t.variance || 0) < 0).length}
              </div>
              <div className="text-sm text-gray-600">
                Items under system quantity
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-600">
                <AlertTriangle className="w-5 h-5 mr-2" />
                High Variances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {
                  results.tasks.filter((t) => (t.variancePercentage || 0) > 10)
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Over 10% variance</div>
            </CardContent>
          </Card>
        </div>

        {/* Task Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Task Details</span>
              <div className="flex gap-2">
                <Button
                  variant={viewFilter === "ALL" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewFilter("ALL")}
                >
                  All ({results.tasks.length})
                </Button>
                <Button
                  variant={viewFilter === "VARIANCES" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewFilter("VARIANCES")}
                >
                  Variances (
                  {
                    results.tasks.filter(
                      (t) => t.variance !== null && t.variance !== 0
                    ).length
                  }
                  )
                </Button>
                <Button
                  variant={viewFilter === "COMPLETED" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewFilter("COMPLETED")}
                >
                  Completed (
                  {results.tasks.filter((t) => t.status === "COMPLETED").length}
                  )
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Task</th>
                    <th className="text-left py-2">Location</th>
                    <th className="text-left py-2">Product</th>
                    <th className="text-right py-2">System Qty</th>
                    <th className="text-right py-2">Counted Qty</th>
                    <th className="text-right py-2">Variance</th>
                    <th className="text-center py-2">Status</th>
                    <th className="text-left py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{task.taskNumber}</td>
                      <td className="py-2">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                          {task.location.name}
                          {task.location.zone && (
                            <span className="ml-1 text-gray-500">
                              ({task.location.zone})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2">
                        {task.productVariant ? (
                          <div>
                            <div className="font-medium">
                              {task.productVariant.product.name}
                            </div>
                            <div className="text-gray-500">
                              {task.productVariant.sku}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">Location Count</span>
                        )}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {task.systemQuantity}
                      </td>
                      <td className="py-2 text-right">
                        {task.countedQuantity !== null
                          ? task.countedQuantity
                          : "-"}
                      </td>
                      <td className="py-2 text-right">
                        {task.variance !== null ? (
                          <span
                            className={`font-medium ${
                              task.variance > 0
                                ? "text-green-600"
                                : task.variance < 0
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            {formatVariance(task.variance)}
                            {task.variancePercentage && (
                              <div className="text-xs text-gray-500">
                                ({task.variancePercentage.toFixed(1)}%)
                              </div>
                            )}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 text-center">
                        <Badge
                          className={getStatusColor(task.status)}
                          size="sm"
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-2 max-w-xs truncate">
                        {task.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No tasks match the current filter
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
