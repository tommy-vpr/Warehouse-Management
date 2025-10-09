import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getLastSyncTime } from "@/lib/getLastSyncTime";

const API_URL = process.env.INVENTORY_PLANNER_API!; // https://app.inventory-planner.com
const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!;

interface VariantWarehouse {
  in_stock?: number;
  replenishment?: number;
  warehouse_id?: string;
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
  // Additional fields from API docs
  lead_time?: number;
  review_period?: number;
  oos?: number; // days to sell out
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

export async function GET() {
  const startedAt = new Date();
  let totalProcessed = 0;
  const errors: Array<{ sku: string; error: string }> = [];

  try {
    // Prevent concurrent syncs (within 1 minute)
    const recentRun = await prisma.syncLog.findFirst({
      where: {
        type: "forecast",
        runAt: { gte: new Date(Date.now() - 60000) },
      },
    });

    if (recentRun) {
      console.log("[Forecast Sync] Already running, skipping");
      return NextResponse.json({
        message: "Sync already in progress",
        lastRun: recentRun.runAt,
      });
    }

    const lastSync = await getLastSyncTime("forecast");
    let page = 0;
    const limit = 100;

    console.log(
      `[Forecast Sync] Starting - Last successful sync: ${
        lastSync?.toISOString() || "never"
      }`
    );

    while (true) {
      const url = new URL(`${API_URL}/api/v1/variants`);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("page", String(page));

      // Request specific fields for efficiency (optional but recommended)
      url.searchParams.set(
        "fields",
        "id,sku,title,vendor_id,warehouse,cost_price,replenishment,last_updated,lead_time,review_period,oos"
      );

      if (lastSync) {
        // API supports filtering, use lastSync if available
        url.searchParams.set("updated_at_gte", lastSync.toISOString());
      }

      console.log(`[Forecast Sync] Fetching page ${page}...`);

      const res = await fetchWithRetry(url.toString(), {
        headers: {
          Authorization: API_KEY,
          Account: ACCOUNT_ID,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`API request failed: ${res.status} ${res.statusText}`);
      }

      const json = (await res.json()) as APIResponse;
      const data = Array.isArray(json?.variants) ? json.variants : [];

      console.log(
        `[Forecast Sync] Received ${data.length} variants (page ${page})`
      );

      if (data.length === 0) {
        console.log("[Forecast Sync] No more data to fetch");
        break;
      }

      // Process variants in batches for better performance
      const batchSize = 10;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(async (variant) => {
            try {
              // Safely extract warehouse data
              let warehouseData: VariantWarehouse | null = null;
              if (
                Array.isArray(variant.warehouse) &&
                variant.warehouse.length > 0
              ) {
                warehouseData = variant.warehouse[0];
              }

              // Determine the best replenishment value
              const replenishmentQty =
                warehouseData?.replenishment ?? variant.replenishment ?? null;

              // Determine the best stock value
              const currentStock = warehouseData?.in_stock ?? null;

              await prisma.forecastSuggestion.upsert({
                where: { sku: String(variant.sku) },
                update: {
                  productName: variant.title ?? null,
                  vendorId: variant.vendor_id ?? null,
                  currentStock,
                  recommendedQty: replenishmentQty,
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
                  currentStock,
                  recommendedQty: replenishmentQty,
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
              const errorMsg = err?.message || String(err);
              errors.push({
                sku: String(variant.sku),
                error: errorMsg,
              });
              console.error(
                `[Forecast Sync] Failed to process SKU ${variant.sku}:`,
                errorMsg
              );
            }
          })
        );
      }

      // Improved pagination logic
      const shouldContinue = (() => {
        // If we got fewer items than limit, we're done
        if (data.length < limit) {
          return false;
        }

        // If we have meta information, check against total
        if (json.meta) {
          const fetched = (page + 1) * limit;
          if (fetched >= json.meta.total) {
            console.log(
              `[Forecast Sync] Reached end: ${fetched} / ${json.meta.total}`
            );
            return false;
          }
        }

        return true;
      })();

      if (!shouldContinue) {
        console.log("[Forecast Sync] No more pages available");
        break;
      }

      page++;
    }

    // Log completion
    const status = errors.length > 0 ? "partial_success" : "success";
    console.log(
      `[Forecast Sync] Complete - ${totalProcessed} processed, ${errors.length} errors`
    );

    await prisma.syncLog.create({
      data: {
        type: "forecast",
        status,
        count: totalProcessed,
        error: errors.length > 0 ? JSON.stringify(errors.slice(0, 10)) : null,
        runAt: startedAt,
      },
    });

    return NextResponse.json({
      success: true,
      count: totalProcessed,
      errors: errors.length > 0 ? errors : undefined,
      status,
    });
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error("[Forecast Sync] Fatal error:", errorMsg);

    await prisma.syncLog.create({
      data: {
        type: "forecast",
        status: "error",
        error: errorMsg,
        runAt: startedAt,
      },
    });

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
