import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getLastSyncTime } from "@/lib/getLastSyncTime";

const API_URL = process.env.INVENTORY_PLANNER_API!;
const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!;

interface VariantWarehouse {
  in_stock?: number;
  replenishment?: number;
}

interface Variant {
  id: string;
  sku: string;
  title?: string;
  vendor_id?: string;
  warehouse?: VariantWarehouse[];
  cost_price?: number;
  replenishment?: number;
  last_updated?: string;
}

interface APIResponse {
  meta?: {
    total: number;
    count: number;
    limit: number;
    page: number;
  };
  variants?: Variant[];
}

// Helper to update progress
async function updateProgress(
  type: string,
  progress: number,
  total: number,
  currentPage: number,
  message: string,
  status: "running" | "completed" | "error" = "running"
) {
  try {
    await prisma.syncProgress.upsert({
      where: { type },
      update: {
        progress,
        total,
        currentPage,
        message,
        status,
        updatedAt: new Date(),
      },
      create: {
        type,
        progress,
        total,
        currentPage,
        message,
        status,
        startedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[Progress Update] Error:", err);
  }
}

// Helper to check if sync is already running
async function checkSyncLock(type: string): Promise<boolean> {
  const running = await prisma.syncProgress.findFirst({
    where: {
      type,
      status: "running",
      startedAt: { gte: new Date(Date.now() - 3600000) }, // 1 hour timeout
    },
  });
  return !!running;
}

// Main sync handler with progress tracking
export async function POST() {
  const startedAt = new Date();
  let totalProcessed = 0;
  const errors: Array<{ sku: string; error: string }> = [];
  const syncType = "forecast";

  try {
    // Check if sync is already running
    const isRunning = await checkSyncLock(syncType);
    if (isRunning) {
      return NextResponse.json(
        {
          queued: false,
          message: "Sync already in progress",
          error: "Another sync is currently running",
        },
        { status: 409 }
      );
    }

    // Initialize progress tracking
    await updateProgress(syncType, 0, 0, 0, "Initializing sync...", "running");

    const lastSync = await getLastSyncTime(syncType);
    let page = 0;
    const limit = 100;

    console.log(
      `[Forecast Sync] Starting - Last sync: ${
        lastSync?.toISOString() || "never"
      }`
    );

    // First, get total count
    const countUrl = new URL(`${API_URL}/api/v1/variants`);
    countUrl.searchParams.set("limit", "1");
    countUrl.searchParams.set("page", "0");
    if (lastSync) {
      countUrl.searchParams.set("updated_at_gte", lastSync.toISOString());
    }

    const countRes = await fetchWithRetry(countUrl.toString(), {
      headers: {
        Authorization: API_KEY,
        Account: ACCOUNT_ID,
        Accept: "application/json",
      },
    });

    const countJson = (await countRes.json()) as APIResponse;
    const totalItems = countJson.meta?.total || 0;

    await updateProgress(
      syncType,
      0,
      totalItems,
      0,
      `Found ${totalItems} items to sync`,
      "running"
    );

    while (true) {
      const url = new URL(`${API_URL}/api/v1/variants`);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("page", String(page));
      url.searchParams.set(
        "fields",
        "id,sku,title,vendor_id,warehouse,cost_price,replenishment,last_updated"
      );

      if (lastSync) {
        url.searchParams.set("updated_at_gte", lastSync.toISOString());
      }

      console.log(`[Forecast Sync] Fetching page ${page}...`);
      await updateProgress(
        syncType,
        totalProcessed,
        totalItems,
        page,
        `Processing page ${page}...`,
        "running"
      );

      const res = await fetchWithRetry(url.toString(), {
        headers: {
          Authorization: API_KEY,
          Account: ACCOUNT_ID,
          Accept: "application/json",
        },
      });

      const json = (await res.json()) as APIResponse;
      const data = Array.isArray(json?.variants) ? json.variants : [];

      if (data.length === 0) break;

      // Process in batches of 20 for better performance
      const batchSize = 20;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(async (variant) => {
            try {
              const warehouse = Array.isArray(variant.warehouse)
                ? variant.warehouse[0]
                : undefined;

              await prisma.forecastSuggestion.upsert({
                where: { sku: String(variant.sku) },
                update: {
                  productName: variant.title ?? null,
                  vendorId: variant.vendor_id ?? null,
                  currentStock: warehouse?.in_stock ?? null,
                  recommendedQty:
                    warehouse?.replenishment ?? variant.replenishment ?? null,
                  unitCost:
                    typeof variant.cost_price === "number"
                      ? variant.cost_price
                      : null,
                  lastUpdated: variant.last_updated
                    ? new Date(variant.last_updated)
                    : startedAt,
                },
                create: {
                  sku: String(variant.sku),
                  productName: variant.title ?? null,
                  vendorId: variant.vendor_id ?? null,
                  currentStock: warehouse?.in_stock ?? null,
                  recommendedQty:
                    warehouse?.replenishment ?? variant.replenishment ?? null,
                  unitCost:
                    typeof variant.cost_price === "number"
                      ? variant.cost_price
                      : null,
                  lastUpdated: variant.last_updated
                    ? new Date(variant.last_updated)
                    : startedAt,
                },
              });

              totalProcessed++;
            } catch (err: any) {
              errors.push({
                sku: String(variant.sku),
                error: err?.message || String(err),
              });
            }
          })
        );

        // Update progress after each batch
        await updateProgress(
          syncType,
          totalProcessed,
          totalItems,
          page,
          `Processed ${totalProcessed} of ${totalItems} items`,
          "running"
        );
      }

      if (data.length < limit) break;
      page++;
    }

    const status = errors.length > 0 ? "partial_success" : "success";

    // Mark as completed
    await updateProgress(
      syncType,
      totalProcessed,
      totalItems,
      page,
      `Completed: ${totalProcessed} items processed`,
      "completed"
    );

    await prisma.syncLog.create({
      data: {
        type: syncType,
        status,
        count: totalProcessed,
        error: errors.length > 0 ? JSON.stringify(errors.slice(0, 10)) : null,
        runAt: startedAt,
      },
    });

    // Clean up progress after 1 minute
    setTimeout(async () => {
      await prisma.syncProgress
        .delete({ where: { type: syncType } })
        .catch(() => {});
    }, 60000);

    return NextResponse.json({
      success: true,
      count: totalProcessed,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      status,
    });
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error("[Forecast Sync] Fatal error:", errorMsg);

    await updateProgress(
      syncType,
      totalProcessed,
      0,
      0,
      `Error: ${errorMsg}`,
      "error"
    );

    await prisma.syncLog.create({
      data: {
        type: syncType,
        status: "error",
        error: errorMsg,
        runAt: startedAt,
      },
    });

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// Keep GET for backwards compatibility
export async function GET() {
  try {
    const activeSyncs = await prisma.syncProgress.findMany({
      where: {
        status: "running",
        startedAt: {
          gte: new Date(Date.now() - 3600000),
        },
      },
    });

    const progress: Record<string, any> = {};

    activeSyncs.forEach((sync) => {
      progress[sync.type] = {
        type: sync.type,
        status: sync.status,
        progress: sync.progress,
        total: sync.total,
        currentPage: sync.currentPage,
        message: sync.message,
        startedAt: sync.startedAt.toISOString(),
        userId: sync.userId,
      };
    });

    return NextResponse.json(progress);
  } catch (error: any) {
    console.error("[Sync Progress] Error:", error.message);

    if (error.code === "P2021" || error.message.includes("does not exist")) {
      return NextResponse.json({});
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
