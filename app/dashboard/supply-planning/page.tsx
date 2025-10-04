"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Database,
  Clock,
  Activity,
  Loader2,
} from "lucide-react";

interface SyncLog {
  id: string;
  type: string;
  status: string;
  count: number | null;
  error: string | null;
  runAt: string;
}

interface Stats {
  totalSyncs: number;
  successRate: number;
  lastForecastSync: string | null;
  lastPOSync: string | null;
  forecastCount: number;
  poCount: number;
}

export default function SyncDashboard() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({ forecast: false, po: false });

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch("/api/inventory-planner/sync-logs"),
        fetch("/api/inventory-planner/sync-stats"),
      ]);

      if (logsRes.ok) setSyncLogs(await logsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error("Failed to load sync data:", err);
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async (type: "forecast" | "po") => {
    setSyncing((prev) => ({ ...prev, [type]: true }));
    try {
      const endpoint =
        type === "forecast"
          ? "/api/inventory-planner/sync-forecast"
          : "/api/inventory-planner/sync-purchase-orders";

      const res = await fetch(endpoint);
      const data = await res.json();

      if (res.ok) {
        alert(
          `Sync complete: ${data.count} items processed${
            data.errors ? ` (${data.errors.length} errors)` : ""
          }`
        );
        loadData();
      } else {
        alert(`Sync failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setSyncing((prev) => ({ ...prev, [type]: false }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "partial_success":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      success:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      partial_success:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          styles[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading supply planning...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Inventory Planner Sync Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage data synchronization
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-card p-6 rounded-lg shadow border">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg w-fit mb-4">
                <Database className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Total Syncs
              </h3>
              <p className="text-2xl font-bold">{stats.totalSyncs}</p>
            </div>

            <div className="bg-card p-6 rounded-lg shadow border">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg w-fit mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Success Rate
              </h3>
              <p className="text-2xl font-bold">{stats.successRate}%</p>
            </div>

            <div className="bg-card p-6 rounded-lg shadow border">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg w-fit mb-4">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Forecasts Synced
              </h3>
              <p className="text-2xl font-bold">
                {stats.forecastCount?.toLocaleString()}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg shadow border">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg w-fit mb-4">
                <Activity className="w-6 h-6 text-orange-600 dark:text-orange-300" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">
                POs Synced
              </h3>
              <p className="text-2xl font-bold">
                {stats.poCount?.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold mb-4">Forecast Sync</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sync replenishment suggestions and forecasts
            </p>
            {stats?.lastForecastSync && (
              <p className="text-xs text-muted-foreground mb-4">
                Last sync: {new Date(stats.lastForecastSync).toLocaleString()}
              </p>
            )}
            <button
              onClick={() => triggerSync("forecast")}
              disabled={syncing.forecast}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition"
            >
              {syncing.forecast ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </>
              )}
            </button>
          </div>

          <div className="bg-card p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold mb-4">Purchase Orders Sync</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sync purchase orders and line items
            </p>
            {stats?.lastPOSync && (
              <p className="text-xs text-muted-foreground mb-4">
                Last sync: {new Date(stats.lastPOSync).toLocaleString()}
              </p>
            )}
            <button
              onClick={() => triggerSync("po")}
              disabled={syncing.po}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition"
            >
              {syncing.po ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Recent Sync Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                    Run Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {syncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(log.status)}
                        <span className="ml-2">
                          {getStatusBadge(log.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm capitalize">
                        {log.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm">
                        {log.count?.toLocaleString() || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(log.runAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.error ? (
                        <details className="text-sm text-red-600 dark:text-red-400">
                          <summary className="cursor-pointer hover:underline">
                            View error
                          </summary>
                          <pre className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs overflow-x-auto max-w-md">
                            {typeof log.error === "string"
                              ? log.error
                              : JSON.stringify(JSON.parse(log.error), null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
