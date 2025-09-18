// app/dashboard/inventory/count/create/page.tsx - Campaign Creation Form
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  Settings,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Location {
  id: string;
  name: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
}

export default function CreateCampaign() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    countType: "PARTIAL",
    startDate: "",
    endDate: "",
    locationIds: [] as string[],
    zoneFilter: "",
    lastCountedBefore: "",
    abcClass: "",
    tolerancePercentage: "5.0",
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const response = await fetch("/api/inventory/locations");
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error("Failed to load locations:", error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Campaign name is required";
    }

    if (!formData.countType) {
      newErrors.countType = "Count type is required";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (
      formData.endDate &&
      new Date(formData.endDate) <= new Date(formData.startDate)
    ) {
      newErrors.endDate = "End date must be after start date";
    }

    if (
      formData.countType === "PARTIAL" &&
      formData.locationIds.length === 0 &&
      !formData.zoneFilter
    ) {
      newErrors.locations =
        "Select locations or specify a zone for partial counts";
    }

    const tolerance = parseFloat(formData.tolerancePercentage);
    if (isNaN(tolerance) || tolerance < 0 || tolerance > 100) {
      newErrors.tolerancePercentage = "Tolerance must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/inventory/cycle-counts/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          locationIds:
            formData.locationIds.length > 0 ? formData.locationIds : null,
          lastCountedBefore: formData.lastCountedBefore || null,
          endDate: formData.endDate || null,
          tolerancePercentage: parseFloat(formData.tolerancePercentage),
        }),
      });

      if (response.ok) {
        const campaign = await response.json();
        router.push(`/dashboard/inventory/count`);
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || "Failed to create campaign" });
      }
    } catch (error) {
      setErrors({ submit: "Failed to create campaign" });
    }
    setIsSubmitting(false);
  };

  const handleLocationToggle = (locationId: string) => {
    setFormData((prev) => ({
      ...prev,
      locationIds: prev.locationIds.includes(locationId)
        ? prev.locationIds.filter((id) => id !== locationId)
        : [...prev.locationIds, locationId],
    }));
  };

  const getCountTypeInfo = (type: string) => {
    const info = {
      FULL: "Count all inventory items across all locations",
      PARTIAL: "Count specific items or locations",
      ABC_ANALYSIS: "Count items based on ABC classification",
      FAST_MOVING: "Count high-velocity items",
      SLOW_MOVING: "Count low-velocity items",
      NEGATIVE_STOCK: "Count items showing negative quantities",
      ZERO_STOCK: "Count items showing zero quantities",
      HIGH_VALUE: "Count high-dollar-value items",
    };
    return info[type as keyof typeof info] || "";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Create Cycle Count Campaign
            </h1>
            <p className="text-gray-600">
              Set up a new inventory counting campaign
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Campaign Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Q1 2024 ABC Count"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Count Type *
                  </label>
                  <select
                    value={formData.countType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        countType: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="FULL">Full Count</option>
                    <option value="PARTIAL">Partial Count</option>
                    <option value="ABC_ANALYSIS">ABC Analysis</option>
                    <option value="FAST_MOVING">Fast Moving</option>
                    <option value="SLOW_MOVING">Slow Moving</option>
                    <option value="NEGATIVE_STOCK">Negative Stock</option>
                    <option value="ZERO_STOCK">Zero Stock</option>
                    <option value="HIGH_VALUE">High Value</option>
                  </select>
                  {formData.countType && (
                    <p className="text-sm text-gray-600 mt-1 flex items-start">
                      <Info className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                      {getCountTypeInfo(formData.countType)}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional description or special instructions..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    min={new Date().toISOString().split("T")[0]}
                    className={errors.startDate ? "border-red-500" : ""}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.startDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    min={formData.startDate}
                    className={errors.endDate ? "border-red-500" : ""}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.endDate}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Criteria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Count Criteria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zone Filter
                  </label>
                  <Input
                    value={formData.zoneFilter}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        zoneFilter: e.target.value,
                      }))
                    }
                    placeholder="e.g., Zone A, Receiving"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Count all items in specific zones
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Counted Before
                  </label>
                  <Input
                    type="date"
                    value={formData.lastCountedBefore}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lastCountedBefore: e.target.value,
                      }))
                    }
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Items not counted since this date
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ABC Class
                  </label>
                  <select
                    value={formData.abcClass}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        abcClass: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Classes</option>
                    <option value="A">Class A (High Value)</option>
                    <option value="B">Class B (Medium Value)</option>
                    <option value="C">Class C (Low Value)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tolerance Percentage
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.tolerancePercentage}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tolerancePercentage: e.target.value,
                      }))
                    }
                    className={
                      errors.tolerancePercentage ? "border-red-500" : ""
                    }
                  />
                  {errors.tolerancePercentage && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.tolerancePercentage}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    Variance threshold for recount requirement
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Selection */}
          {(formData.countType === "PARTIAL" ||
            formData.countType === "FULL") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Locations
                  </span>
                  <Badge variant="outline">
                    {formData.locationIds.length} selected
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          locationIds: locations.map((l) => l.id),
                        }))
                      }
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, locationIds: [] }))
                      }
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        formData.locationIds.includes(location.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleLocationToggle(location.id)}
                    >
                      <div className="text-sm font-medium">{location.name}</div>
                      {(location.zone || location.aisle) && (
                        <div className="text-xs text-gray-600">
                          {location.zone && `Zone: ${location.zone}`}
                          {location.zone && location.aisle && " • "}
                          {location.aisle && `Aisle: ${location.aisle}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {errors.locations && (
                  <p className="text-sm text-red-600 mt-2">
                    {errors.locations}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {errors.submit && (
            <Card className="border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {errors.submit}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/inventory/count")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                "Creating..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Campaign
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
