// app/dashboard/inventory/count/page.tsx - Complete Campaign Dashboard
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  Eye,
  Play,
  Pause,
  Archive,
  Settings,
  Download,
  FileText,
  Users,
  CheckCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface CycleCountCampaign {
  id: string;
  name: string;
  description?: string;
  countType: string;
  status: "PLANNED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  startDate: string;
  endDate?: string;
  totalTasks: number;
  completedTasks: number;
  variancesFound: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assignedTo: string[];
}

interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedThisWeek: number;
  averageAccuracy: number;
  totalVariances: number;
  pendingReviews: number;
  tasksCompletedThisMonth: number;
  totalTasksThisMonth: number;
}

export default function CycleCountDashboard() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CycleCountCampaign[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch("/api/inventory/cycle-counts/campaigns");
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
        setStats(data.stats);
      } else {
        console.error("Failed to load campaigns");
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
    setIsLoading(false);
  };

  const handleStartCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(
        `/api/inventory/cycle-counts/campaigns/${campaignId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ACTIVE" }),
        }
      );

      if (response.ok) {
        setCampaigns((prev) =>
          prev.map((campaign) =>
            campaign.id === campaignId
              ? { ...campaign, status: "ACTIVE" as const }
              : campaign
          )
        );
      }
    } catch (error) {
      console.error("Failed to start campaign:", error);
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(
        `/api/inventory/cycle-counts/campaigns/${campaignId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PAUSED" }),
        }
      );

      if (response.ok) {
        setCampaigns((prev) =>
          prev.map((campaign) =>
            campaign.id === campaignId
              ? { ...campaign, status: "PAUSED" as const }
              : campaign
          )
        );
      }
    } catch (error) {
      console.error("Failed to pause campaign:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PLANNED":
        return "bg-blue-100 text-blue-800";
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-gray-100 text-gray-800";
      case "PAUSED":
        return "bg-yellow-100 text-yellow-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCountTypeLabel = (countType: string) => {
    return countType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || campaign.status === statusFilter;
    const matchesType =
      typeFilter === "ALL" || campaign.countType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const displayStats = stats || {
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedThisWeek: 0,
    averageAccuracy: 0,
    totalVariances: 0,
    pendingReviews: 0,
    tasksCompletedThisMonth: 0,
    totalTasksThisMonth: 0,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Cycle Count Campaigns
            </h1>
            <p className="text-gray-600">
              Manage inventory cycle counting campaigns and tasks
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={() => router.push("/dashboard/inventory/count/create")}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Campaigns
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {displayStats.totalCampaigns}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Archive className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                All time campaigns
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active Campaigns
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {displayStats.activeCampaigns}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Currently running
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Average Accuracy
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {displayStats.averageAccuracy.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">Last 30 days</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Reviews
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {displayStats.pendingReviews}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Requiring attention
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed This Week</p>
                  <p className="text-xl font-bold text-gray-900">
                    {displayStats.completedThisWeek}
                  </p>
                </div>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tasks This Month</p>
                  <p className="text-xl font-bold text-gray-900">
                    {displayStats.tasksCompletedThisMonth}/
                    {displayStats.totalTasksThisMonth}
                  </p>
                </div>
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Variances</p>
                  <p className="text-xl font-bold text-gray-900">
                    {displayStats.totalVariances}
                  </p>
                </div>
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PLANNED">Planned</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="PAUSED">Paused</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="FULL">Full Count</option>
                <option value="PARTIAL">Partial Count</option>
                <option value="ABC_ANALYSIS">ABC Analysis</option>
                <option value="FAST_MOVING">Fast Moving</option>
                <option value="SLOW_MOVING">Slow Moving</option>
                <option value="NEGATIVE_STOCK">Negative Stock</option>
                <option value="ZERO_STOCK">Zero Stock</option>
                <option value="HIGH_VALUE">High Value</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Campaigns ({filteredCampaigns.length})</span>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No campaigns found</p>
                  <Button
                    className="mt-4"
                    onClick={() =>
                      router.push("/dashboard/inventory/count/create")
                    }
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Campaign
                  </Button>
                </div>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {campaign.name}
                          </h3>
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                          <Badge variant="outline">
                            {getCountTypeLabel(campaign.countType)}
                          </Badge>
                        </div>

                        {campaign.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {campaign.description}
                          </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>
                              {campaign.status === "PLANNED"
                                ? `Starts: ${new Date(
                                    campaign.startDate
                                  ).toLocaleDateString()}`
                                : campaign.status === "ACTIVE"
                                ? `Started: ${new Date(
                                    campaign.startDate
                                  ).toLocaleDateString()}`
                                : campaign.endDate
                                ? `Completed: ${new Date(
                                    campaign.endDate
                                  ).toLocaleDateString()}`
                                : `Started: ${new Date(
                                    campaign.startDate
                                  ).toLocaleDateString()}`}
                            </span>
                          </div>

                          <div className="flex items-center">
                            <Package className="w-4 h-4 mr-1" />
                            <span>
                              {campaign.completedTasks}/{campaign.totalTasks}{" "}
                              tasks
                            </span>
                          </div>

                          <div className="flex items-center">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            <span>
                              {campaign.completedTasks > 0
                                ? (
                                    ((campaign.completedTasks -
                                      campaign.variancesFound) /
                                      campaign.completedTasks) *
                                    100
                                  ).toFixed(1)
                                : 0}
                              % accuracy
                            </span>
                          </div>

                          {campaign.variancesFound > 0 && (
                            <div className="flex items-center text-red-600">
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              <span>{campaign.variancesFound} variances</span>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {campaign.status === "ACTIVE" &&
                          campaign.totalTasks > 0 && (
                            <div className="mt-3">
                              <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>
                                  {Math.round(
                                    (campaign.completedTasks /
                                      campaign.totalTasks) *
                                      100
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${
                                      (campaign.completedTasks /
                                        campaign.totalTasks) *
                                      100
                                    }%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {campaign.status === "PLANNED" && (
                          <Button
                            size="sm"
                            onClick={() => handleStartCampaign(campaign.id)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                        )}

                        {campaign.status === "ACTIVE" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/dashboard/inventory/count/${campaign.id}`
                                )
                              }
                            >
                              Continue
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePauseCampaign(campaign.id)}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {campaign.status === "PAUSED" && (
                          <Button
                            size="sm"
                            onClick={() => handleStartCampaign(campaign.id)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Resume
                          </Button>
                        )}

                        {campaign.status === "COMPLETED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(
                                `/dashboard/inventory/count/${campaign.id}/results`
                              )
                            }
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Results
                          </Button>
                        )}

                        <Button size="sm" variant="ghost">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
