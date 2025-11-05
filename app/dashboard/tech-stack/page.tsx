"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const WMSCostBreakdown = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [userCount, setUserCount] = useState(1);
  const [orderVolume, setOrderVolume] = useState(400);
  const [storageGB, setStorageGB] = useState(20);

  // Calculate costs based on WMS usage - FIXED VERSION
  const calculateCosts = () => {
    // Supabase calculations
    const supabaseBase = 25;
    const dbStorage = storageGB > 8 ? (storageGB - 8) * 0.125 : 0;
    const fileStorage = storageGB > 100 ? (storageGB - 100) * 0.021 : 0;
    const bandwidth = ((orderVolume * 0.5) / 1000) * 0.09;
    const maus = userCount > 100 ? (userCount - 100) * 0.00325 : 0;
    const supabaseTotal =
      supabaseBase + dbStorage + fileStorage + bandwidth + maus;

    // GCP calculations
    const monthlyImagesMB = orderVolume * 1.7;
    const monthlyImagesGB = monthlyImagesMB / 1024;
    const gcpStorage = storageGB * 0.02;
    const uploadOps = ((orderVolume * 3) / 10000) * 0.05;
    const downloadOps = ((orderVolume * 4) / 10000) * 0.004;
    const gcpOperations = uploadOps + downloadOps;
    const egressMB = orderVolume * 1.5;
    const egressGB = egressMB / 1024;
    const gcpEgress = egressGB * 0.12;
    const gcpTotal = gcpStorage + gcpOperations + gcpEgress;

    // Vercel calculations
    const vercelSeats = Math.ceil(userCount / 5) * 20;
    const vercelBandwidthGB = orderVolume * 0.02;
    const vercelCredit = 20;
    const bandwidthOverageGB = Math.max(vercelBandwidthGB - 1000, 0);
    const bandwidthCost = (bandwidthOverageGB / 1000) * 150;
    const functionCalls = orderVolume * 5;
    const functionCost = Math.max(
      (functionCalls / 1000000) * 2 - vercelCredit,
      0
    );
    const vercelTotal = vercelSeats + bandwidthCost + Math.max(functionCost, 0);

    return {
      supabase: supabaseTotal,
      gcp: gcpTotal,
      vercel: vercelTotal,
      total: supabaseTotal + gcpTotal + vercelTotal,
    };
  };

  const costs = calculateCosts();
  const vercelSeats = Math.ceil(userCount / 5) * 20;

  // Monthly growth projection
  const growthProjection = [
    { month: "Month 1", orders: 300, cost: 26.6 },
    { month: "Month 2", orders: 400, cost: 26.79 },
    { month: "Month 3", orders: 500, cost: 26.98 },
    { month: "Month 4", orders: 750, cost: 27.51 },
    { month: "Month 5", orders: 1000, cost: 28.04 },
    { month: "Month 6", orders: 1500, cost: 29.08 },
  ];

  // Cost breakdown by service
  const costBreakdown = [
    { name: "Supabase", value: costs.supabase, color: "#3ECF8E" },
    { name: "GCP", value: costs.gcp, color: "#EA4335" },
    { name: "Vercel", value: costs.vercel, color: "#0070F3" },
  ];

  // Detailed WMS cost scenarios
  const scenarios = [
    {
      name: "Small Business",
      orders: 400,
      users: 1,
      storage: 20,
      supabase: 26.52,
      gcp: 0.27,
      vercel: 20,
      total: 46.79,
    },
    {
      name: "Growing Business",
      orders: 2000,
      users: 5,
      storage: 100,
      supabase: 32.36,
      gcp: 2.24,
      vercel: 20,
      total: 54.6,
    },
    {
      name: "Enterprise",
      orders: 10000,
      users: 20,
      storage: 500,
      supabase: 85.5,
      gcp: 10.74,
      vercel: 80,
      total: 176.24,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">
                WMS Tech Stack Cost Breakdown
              </h1>
              <p className="mt-2 text-xl text-blue-100 dark:text-blue-200">
                Complete cost analysis for Supabase + GCP + Vercel
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-200 dark:text-blue-300">
                Estimated Monthly Cost
              </div>
              <div className="text-5xl font-bold">
                ${costs.total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex flex-wrap gap-1 bg-white dark:bg-zinc-800 rounded-lg p-1 shadow-sm dark:shadow-zinc-900/50">
          {["overview", "calculator", "your-setup"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                activeTab === tab
                  ? "bg-blue-600 dark:bg-blue-700 text-white"
                  : "text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-zinc-700"
              }`}
            >
              {tab === "your-setup"
                ? "Your Setup"
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Current Cost Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg dark:shadow-zinc-900/50 p-6 border border-gray-200 dark:border-zinc-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                  Monthly Cost Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costBreakdown.filter((item) => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) =>
                        `${entry.name}: $${entry.value.toFixed(2)}`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costBreakdown
                        .filter((item) => item.value > 0)
                        .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => `$${Number(value).toFixed(2)}`}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid rgb(63 63 70)",
                        borderRadius: "0.5rem",
                        color: "white",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Cost Summary */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg dark:shadow-zinc-900/50 p-6 border border-gray-200 dark:border-zinc-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                  Cost Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">
                        Supabase (Backend)
                      </div>
                      <div className="text-sm text-slate-600 dark:text-gray-400">
                        Database, Auth, Functions, Real-time
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${costs.supabase.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">
                        GCP (Storage)
                      </div>
                      <div className="text-sm text-slate-600 dark:text-gray-400">
                        Images, Documents, Labels
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      ${costs.gcp.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">
                        Vercel Pro (Frontend)
                      </div>
                      <div className="text-sm text-slate-600 dark:text-gray-400">
                        $20/seat + overages (if any)
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      ${costs.vercel.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg border-2 border-purple-500 dark:border-purple-600">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white text-lg">
                        Total Monthly Cost
                      </div>
                      <div className="text-sm text-slate-600 dark:text-gray-400">
                        All services combined
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      ${costs.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Growth Projection */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg dark:shadow-zinc-900/50 p-6 border border-gray-200 dark:border-zinc-700">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
                6-Month Cost Projection
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={growthProjection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="month" stroke="#888" />
                  <YAxis
                    yAxisId="left"
                    stroke="#888"
                    label={{
                      value: "Monthly Orders",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#888",
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#888"
                    label={{
                      value: "Cost (USD)",
                      angle: 90,
                      position: "insideRight",
                      fill: "#888",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgb(39 39 42)",
                      border: "1px solid rgb(63 63 70)",
                      borderRadius: "0.5rem",
                      color: "white",
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    stroke="#3B82F6"
                    fill="#93C5FD"
                    name="Orders"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="cost"
                    stroke="#10B981"
                    fill="#6EE7B7"
                    name="Cost ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="mt-4 text-sm text-slate-600 dark:text-gray-400 text-center">
                Costs scale gradually as your order volume grows
              </p>
            </div>
          </div>
        )}

        {/* Calculator Tab */}
        {activeTab === "calculator" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg dark:shadow-zinc-900/50 p-6 border border-gray-200 dark:border-zinc-700">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
                Custom Cost Calculator
              </h3>
              <p className="text-slate-600 dark:text-gray-400 mb-6">
                Adjust the sliders to estimate costs for your specific WMS needs
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                    Development Team Size
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={userCount}
                    onChange={(e) => setUserCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-blue-200 dark:bg-blue-900 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-slate-600 dark:text-gray-400 mt-1">
                    <span>1</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {userCount} devs
                    </span>
                    <span>20</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-500 mt-2">
                    Developers who need to deploy code
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                    Monthly Order Volume
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={orderVolume}
                    onChange={(e) => setOrderVolume(parseInt(e.target.value))}
                    className="w-full h-2 bg-green-200 dark:bg-green-900 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-slate-600 dark:text-gray-400 mt-1">
                    <span>100</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {orderVolume.toLocaleString()} orders
                    </span>
                    <span>10K</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                    Storage Required (GB)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={storageGB}
                    onChange={(e) => setStorageGB(parseInt(e.target.value))}
                    className="w-full h-2 bg-red-200 dark:bg-red-900 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-slate-600 dark:text-gray-400 mt-1">
                    <span>10GB</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {storageGB}GB
                    </span>
                    <span>500GB</span>
                  </div>
                </div>
              </div>

              {/* Calculated Costs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border-2 border-green-200 dark:border-green-800">
                  <div className="text-sm text-slate-600 dark:text-gray-400 mb-1">
                    Supabase
                  </div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    ${costs.supabase.toFixed(2)}
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border-2 border-red-200 dark:border-red-800">
                  <div className="text-sm text-slate-600 dark:text-gray-400 mb-1">
                    Google Cloud
                  </div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    ${costs.gcp.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-gray-500 mt-1">
                    {((orderVolume * 1.7) / 1024).toFixed(2)}GB/month growth
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-slate-600 dark:text-gray-400 mb-1">
                    Vercel Pro
                  </div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    ${costs.vercel.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-gray-500 mt-1">
                    ${vercelSeats}/mo + overages
                  </div>
                </div>

                <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-6 border-2 border-purple-500 dark:border-purple-600">
                  <div className="text-sm text-slate-600 dark:text-gray-400 mb-1">
                    Total Cost
                  </div>
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    ${costs.total.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* GCP Detailed Breakdown */}
              <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800">
                <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center">
                  <span className="text-xl mr-2">☁️</span>
                  GCP Cost Breakdown (Images: 2-4 per order, avg 3)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Storage */}
                  <div>
                    <div className="font-semibold text-red-600 dark:text-red-400 mb-2">
                      Storage:
                    </div>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Current stored:</span>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {storageGB}GB
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly growth:</span>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {((orderVolume * 1.7) / 1024).toFixed(2)}GB
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost ($0.02/GB):</span>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          ${(storageGB * 0.02).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-gray-500 mt-2">
                        Images per order: ~3 (avg)
                        <br />
                        Size per order: ~1.7MB
                      </div>
                    </div>
                  </div>

                  {/* Operations */}
                  <div>
                    <div className="font-semibold text-red-600 dark:text-red-400 mb-2">
                      Operations:
                    </div>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Uploads (Class A):</span>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          ${(((orderVolume * 3) / 10000) * 0.05).toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Downloads (Class B):</span>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          ${(((orderVolume * 4) / 10000) * 0.004).toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-gray-300 dark:border-zinc-600 pt-1">
                        <span>Total ops:</span>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          $
                          {(
                            ((orderVolume * 3) / 10000) * 0.05 +
                            ((orderVolume * 4) / 10000) * 0.004
                          ).toFixed(3)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-gray-500 mt-2">
                        3 uploads + 4 views per order
                      </div>
                    </div>
                  </div>

                  {/* Egress */}
                  <div>
                    <div className="font-semibold text-red-600 dark:text-red-400 mb-2">
                      Network Egress:
                    </div>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Downloads/month:</span>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {((orderVolume * 1.5) / 1024).toFixed(2)}GB
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost ($0.12/GB):</span>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          ${(((orderVolume * 1.5) / 1024) * 0.12).toFixed(3)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-gray-500 mt-2">
                        ~1.5MB downloaded per order
                        <br />
                        (viewing images in app)
                      </div>
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded text-xs border border-yellow-200 dark:border-yellow-800">
                        <strong>💡 Tip:</strong> Enable CDN to save 60-70%!
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Image Growth */}
                <div className="mt-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700">
                  <div className="font-semibold text-slate-800 dark:text-white mb-2">
                    📊 Storage Growth Projection:
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 dark:text-gray-400">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">
                        Month 1:
                      </div>
                      <div>{((orderVolume * 1.7) / 1024).toFixed(2)}GB</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">
                        Month 6:
                      </div>
                      <div>{((orderVolume * 1.7 * 6) / 1024).toFixed(2)}GB</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">
                        Month 12:
                      </div>
                      <div>
                        {((orderVolume * 1.7 * 12) / 1024).toFixed(2)}GB
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">
                        Your limit:
                      </div>
                      <div className="text-green-600 dark:text-green-400 font-bold">
                        {(storageGB / ((orderVolume * 1.7) / 1024)).toFixed(1)}{" "}
                        months
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Annual Projection */}
              <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-lg text-slate-800 dark:text-white">
                      Annual Cost Estimate
                    </div>
                    <div className="text-sm text-slate-600 dark:text-gray-400">
                      ${(costs.total / orderVolume).toFixed(4)} per order
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                      ${(costs.total * 12).toFixed(2)}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-gray-400">
                      per year
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Your Setup Tab */}
        {activeTab === "your-setup" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-700 dark:to-purple-900 text-white rounded-xl shadow-lg p-8">
              <h3 className="text-3xl font-bold mb-2">
                Your Specific WMS Setup
              </h3>
              <p className="text-purple-100 dark:text-purple-200 text-lg mb-6">
                1 developer • 10 warehouse workers • 400 orders/month • 20GB
                storage
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 text-slate-800 dark:text-white border border-gray-200 dark:border-zinc-700">
                  <div className="text-sm text-slate-600 dark:text-gray-400 mb-1">
                    Monthly Cost
                  </div>
                  <div className="text-5xl font-bold text-purple-600 dark:text-purple-400">
                    $46.79
                  </div>
                  <div className="text-xs text-slate-500 dark:text-gray-500 mt-2">
                    All services included
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 text-slate-800 dark:text-white border border-gray-200 dark:border-zinc-700">
                  <div className="text-sm text-slate-600 dark:text-gray-400 mb-1">
                    Annual Cost
                  </div>
                  <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                    $561
                  </div>
                  <div className="text-xs text-slate-500 dark:text-gray-500 mt-2">
                    Projected yearly spend
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 text-slate-800 dark:text-white border border-gray-200 dark:border-zinc-700">
                  <div className="text-sm text-slate-600 dark:text-gray-400 mb-1">
                    Per Order
                  </div>
                  <div className="text-5xl font-bold text-green-600 dark:text-green-400">
                    $0.117
                  </div>
                  <div className="text-xs text-slate-500 dark:text-gray-500 mt-2">
                    11.7 cents per order
                  </div>
                </div>
              </div>
            </div>

            {/* Bandwidth Optimization Best Practices */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg dark:shadow-zinc-900/50 p-6 border border-gray-200 dark:border-zinc-700">
              <div className="flex items-center mb-6">
                <span className="text-3xl mr-3">🚀</span>
                <h4 className="text-2xl font-bold text-slate-800 dark:text-white">
                  Bandwidth Optimization Best Practices
                </h4>
              </div>

              <div className="space-y-6">
                {/* Vercel Bandwidth */}
                <div className="border-2 border-blue-500 dark:border-blue-600 rounded-lg p-6 bg-blue-50 dark:bg-blue-900/20">
                  <h5 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    <span className="text-2xl mr-2">📊</span>
                    Vercel Bandwidth Optimization
                  </h5>

                  <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="font-semibold text-slate-800 dark:text-white mb-2">
                      Current Usage Estimate:
                    </div>
                    <div className="text-sm text-slate-600 dark:text-gray-400">
                      • 400 orders/month × 20MB ={" "}
                      <strong className="text-slate-800 dark:text-white">
                        8GB/month
                      </strong>
                      <br />• Included:{" "}
                      <strong className="text-slate-800 dark:text-white">
                        1,000GB (1TB)
                      </strong>{" "}
                      per seat
                      <br />• Status:{" "}
                      <strong className="text-green-600 dark:text-green-400">
                        Well within limits! ✅
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-3">
                        1. Optimize Images
                      </h6>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Use Next.js Image component:
                            </strong>{" "}
                            Automatic optimization, lazy loading
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Enable WebP format:
                            </strong>{" "}
                            25-35% smaller than JPEG
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Responsive images:
                            </strong>{" "}
                            Serve different sizes per device
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Set quality to 75-80:
                            </strong>{" "}
                            Barely noticeable difference
                          </span>
                        </li>
                      </ul>
                      <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 rounded text-xs border border-green-200 dark:border-green-800">
                        <strong>💰 Savings:</strong> Reduce image bandwidth by
                        50-70%
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-3">
                        2. Code Splitting
                      </h6>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Dynamic imports:
                            </strong>{" "}
                            Load components on demand
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Route-based splitting:
                            </strong>{" "}
                            Automatic in Next.js
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Tree shaking:
                            </strong>{" "}
                            Remove unused code
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Bundle analysis:
                            </strong>{" "}
                            Use @next/bundle-analyzer
                          </span>
                        </li>
                      </ul>
                      <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 rounded text-xs border border-green-200 dark:border-green-800">
                        <strong>💰 Savings:</strong> Reduce JS bundle size by
                        30-50%
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-3">
                        3. Caching Strategy
                      </h6>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Static assets:
                            </strong>{" "}
                            Cache-Control: public, max-age=31536000
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              API responses:
                            </strong>{" "}
                            Use stale-while-revalidate
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              ISR for pages:
                            </strong>{" "}
                            Incremental Static Regeneration
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              CDN at edge:
                            </strong>{" "}
                            Vercel Edge Network handles this
                          </span>
                        </li>
                      </ul>
                      <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 rounded text-xs border border-green-200 dark:border-green-800">
                        <strong>💰 Savings:</strong> Reduce repeat bandwidth by
                        60-80%
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-3">
                        4. Compression
                      </h6>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Brotli compression:
                            </strong>{" "}
                            Automatic on Vercel (20% better than gzip)
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Minify CSS/JS:
                            </strong>{" "}
                            Next.js does this automatically
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Remove source maps:
                            </strong>{" "}
                            In production builds
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Compress fonts:
                            </strong>{" "}
                            Use woff2 format
                          </span>
                        </li>
                      </ul>
                      <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 rounded text-xs border border-green-200 dark:border-green-800">
                        <strong>💰 Savings:</strong> Already enabled! Free
                        compression
                      </div>
                    </div>
                  </div>
                </div>

                {/* GCP Bandwidth */}
                <div className="border-2 border-red-500 dark:border-red-600 rounded-lg p-6 bg-red-50 dark:bg-red-900/20">
                  <h5 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    <span className="text-2xl mr-2">☁️</span>
                    GCP Egress Optimization
                  </h5>

                  <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="font-semibold text-slate-800 dark:text-white mb-2">
                      ⚠️ This is your biggest cost driver!
                    </div>
                    <div className="text-sm text-slate-600 dark:text-gray-400">
                      GCP egress is{" "}
                      <strong className="text-slate-800 dark:text-white">
                        89% of your GCP costs
                      </strong>{" "}
                      ($0.24 out of $0.27)
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-3">
                        1. Enable Cloud CDN
                      </h6>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Cache at edge:
                            </strong>{" "}
                            Serve from Google's global network
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Reduce origin hits:
                            </strong>{" "}
                            70-90% reduction in egress
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Set cache headers:
                            </strong>{" "}
                            Cache-Control for images
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Cost:
                            </strong>{" "}
                            $0.04-0.08/GB (vs $0.12/GB egress)
                          </span>
                        </li>
                      </ul>
                      <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 rounded text-xs border border-green-200 dark:border-green-800">
                        <strong>💰 Savings:</strong> $0.16-0.20/month (67-74%
                        reduction!)
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-3">
                        2. Image Optimization
                      </h6>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Compress before upload:
                            </strong>{" "}
                            Use imagemin or sharp
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Target 100-200KB per image:
                            </strong>{" "}
                            Instead of 400KB
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Use WebP/AVIF:
                            </strong>{" "}
                            30-50% smaller than JPEG
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Generate thumbnails:
                            </strong>{" "}
                            Serve smaller versions in lists
                          </span>
                        </li>
                      </ul>
                      <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 rounded text-xs border border-green-200 dark:border-green-800">
                        <strong>💰 Savings:</strong> Cut egress in half!
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-3">
                        3. Signed URLs & Caching
                      </h6>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Use signed URLs:
                            </strong>{" "}
                            Enable CDN caching with security
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Long TTL for images:
                            </strong>{" "}
                            1 year cache for product photos
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Browser caching:
                            </strong>{" "}
                            Set cache headers properly
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-3">
                        4. Lazy Loading
                      </h6>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Load on demand:
                            </strong>{" "}
                            Only fetch images when visible
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Intersection Observer:
                            </strong>{" "}
                            Load as user scrolls
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Loading="lazy":
                            </strong>{" "}
                            Native browser lazy loading
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Supabase Bandwidth */}
                <div className="border-2 border-green-500 dark:border-green-600 rounded-lg p-6 bg-green-50 dark:bg-green-900/20">
                  <h5 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    <span className="text-2xl mr-2">🗄️</span>
                    Supabase Bandwidth Optimization
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-3">
                        Query Optimization
                      </h6>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                        <li className="flex items-start">
                          <span className="text-green-600 dark:text-green-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Select specific columns:
                            </strong>{" "}
                            .select('id, name') not .select('*')
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 dark:text-green-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Paginate results:
                            </strong>{" "}
                            Limit to 50-100 per query
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 dark:text-green-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Use count():
                            </strong>{" "}
                            Instead of fetching all rows
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-3">
                        Frontend Caching
                      </h6>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
                        <li className="flex items-start">
                          <span className="text-green-600 dark:text-green-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              React Query / SWR:
                            </strong>{" "}
                            Cache API responses
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 dark:text-green-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Dedupe requests:
                            </strong>{" "}
                            Automatic with SWR
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 dark:text-green-400 mr-2">
                            ✓
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-white">
                              Stale-while-revalidate:
                            </strong>{" "}
                            Instant UI updates
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Monitoring & Alerts */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-6">
                  <h5 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    <span className="text-2xl mr-2">📊</span>
                    Monitoring & Alerts
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-2">
                        Vercel
                      </h6>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-gray-400">
                        <li>• Analytics dashboard</li>
                        <li>• Spend Management (enabled by default)</li>
                        <li>• Set budget alerts at 50%, 75%, 90%</li>
                        <li>• Default $200/month limit</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-2">
                        GCP
                      </h6>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-gray-400">
                        <li>• Cloud Monitoring</li>
                        <li>• Budget alerts in Billing</li>
                        <li>• Track egress by bucket</li>
                        <li>• Set up usage quotas</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                      <h6 className="font-semibold text-slate-800 dark:text-white mb-2">
                        Supabase
                      </h6>
                      <ul className="space-y-1 text-sm text-slate-600 dark:text-gray-400">
                        <li>• Usage dashboard</li>
                        <li>• Bandwidth graphs</li>
                        <li>• Email alerts at 80%</li>
                        <li>• API analytics</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Quick Wins */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-800 text-white rounded-lg p-6">
                  <h5 className="text-xl font-bold mb-4">
                    🎯 Quick Wins (Do These First!)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white text-slate-800 bg-opacity-20 dark:bg-opacity-10 rounded-lg p-4">
                      <div className="font-bold mb-2">Immediate Actions:</div>
                      <ol className="space-y-1 text-slate-600 text-sm list-decimal list-inside">
                        <li>Enable GCP Cloud CDN (biggest impact!)</li>
                        <li>Use Next.js Image component everywhere</li>
                        <li>Compress images before upload (imagemin)</li>
                        <li>Set proper Cache-Control headers</li>
                      </ol>
                    </div>
                    <div className="bg-white text-slate-800 bg-opacity-20 dark:bg-opacity-10 rounded-lg p-4">
                      <div className="font-bold mb-2">Expected Savings:</div>
                      <ul className="space-y-1 text-sm text-slate-600">
                        <li>
                          • GCP egress: <strong>-$0.16/month (67%)</strong>
                        </li>
                        <li>• Vercel bandwidth: Already optimized ✓</li>
                        <li>
                          • Supabase: <strong>-$0.01/month</strong>
                        </li>
                        <li>
                          • <strong>Total: Save ~$0.17/month</strong>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WMSCostBreakdown;
