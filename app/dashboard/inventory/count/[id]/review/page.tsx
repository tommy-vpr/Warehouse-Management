"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  MapPin,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface TaskToReview {
  id: string;
  taskNumber: string;
  location: { name: string };
  productVariant?: {
    sku: string;
    name: string;
    product: { name: string };
  };
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  variancePercentage: number;
  status: string;
  notes?: string;
}

export default function VarianceReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const campaignId = params.id;

  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [reviewNotes, setReviewNotes] = useState("");

  // Fetch tasks needing review
  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign-review", campaignId],
    queryFn: async () => {
      const response = await fetch(
        `/api/inventory/cycle-counts/campaigns/${campaignId}`
      );
      if (!response.ok) throw new Error("Campaign not found");
      const data = await response.json();

      // Filter only tasks needing review
      return {
        ...data,
        tasks: data.tasks.filter(
          (t: any) =>
            t.status === "VARIANCE_REVIEW" || t.status === "RECOUNT_REQUIRED"
        ),
      };
    },
  });

  // Approve variance mutation
  const approveMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(
        `/api/inventory/cycle-counts/tasks/${taskId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: reviewNotes }),
        }
      );
      if (!response.ok) throw new Error("Failed to approve variance");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Variance Approved",
        description: "Task marked as completed",
      });
      queryClient.invalidateQueries({ queryKey: ["campaign-review"] });
      setReviewNotes("");
      // Move to next task or finish
      if (currentTaskIndex < (campaign?.tasks.length || 0) - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1);
      } else {
        router.push(`/dashboard/inventory/count/${campaignId}/results`);
      }
    },
  });

  // Request recount mutation
  const recountMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(
        `/api/inventory/cycle-counts/tasks/${taskId}/request-recount`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: reviewNotes }),
        }
      );
      if (!response.ok) throw new Error("Failed to request recount");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Recount Requested",
        description: "Worker will be notified",
      });
      queryClient.invalidateQueries({ queryKey: ["campaign-review"] });
      setReviewNotes("");
      if (currentTaskIndex < (campaign?.tasks.length || 0) - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1);
      }
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!campaign?.tasks.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            All Variances Reviewed!
          </h2>
          <Button
            onClick={() =>
              router.push(`/dashboard/inventory/count/${campaignId}/results`)
            }
          >
            View Results
          </Button>
        </div>
      </div>
    );
  }

  const currentTask = campaign.tasks[currentTaskIndex];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Variance Review</h1>
            <p className="text-gray-600">
              Review {currentTaskIndex + 1} of {campaign.tasks.length}
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg mb-2">
                  {currentTask.productVariant?.product.name || "Location Count"}
                </h3>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-1" />
                  {currentTask.location.name}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">
                    {currentTask.systemQuantity}
                  </div>
                  <div className="text-sm text-gray-600">System Qty</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {currentTask.countedQuantity}
                  </div>
                  <div className="text-sm text-gray-600">Counted Qty</div>
                </div>
                <div>
                  <div
                    className={`text-2xl font-bold ${
                      currentTask.variance > 0
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  >
                    {currentTask.variance > 0 ? "+" : ""}
                    {currentTask.variance}
                  </div>
                  <div className="text-sm text-gray-600">
                    Variance ({currentTask.variancePercentage.toFixed(1)}%)
                  </div>
                </div>
              </div>

              {currentTask.notes && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="text-sm font-medium mb-1">Counter Notes:</div>
                  <div className="text-sm text-gray-600">
                    {currentTask.notes}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Supervisor Notes
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => approveMutation.mutate(currentTask.id)}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Variance
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => recountMutation.mutate(currentTask.id)}
                  disabled={recountMutation.isPending}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Request Recount
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
