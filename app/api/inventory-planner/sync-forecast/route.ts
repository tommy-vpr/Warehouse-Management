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
  meta: {
    total: number;
    count: number;
    limit: number;
    page: number;
  };
  variants: Variant[];
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

      const json = (await res.json()) as APIResponse;
      const data = Array.isArray(json?.variants) ? json.variants : [];

      console.log(`[Forecast Sync] Received ${data.length} variants`);

      if (data.length === 0) {
        console.log("[Forecast Sync] No more data to fetch");
        break;
      }

      for (const variant of data) {
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
      }

      if (json.meta && data.length < limit) {
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
