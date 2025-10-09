import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getLastSyncTime } from "@/lib/getLastSyncTime";

const API_URL = process.env.INVENTORY_PLANNER_API!; // https://app.inventory-planner.com
const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!;

interface POLineItem {
  sku: string;
  title?: string;
  quantity?: number;
  cost_price?: number;
  total_cost?: number;
}

interface IPPurchaseOrder {
  id: string | number;
  reference?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  status?: string;
  created_at?: string;
  expected_date?: string;
  currency?: string;
  total_value?: number;
  updated_at?: string;
  line_items?: POLineItem[];
}

interface APIResponse {
  meta?: { total: number; count: number; limit: number; page: number };
  purchase_orders?: IPPurchaseOrder[];
  ["purchase-orders"]?: IPPurchaseOrder[];
}

export async function GET() {
  const startedAt = new Date();
  let totalProcessed = 0;
  const errors: Array<{ poId: string; error: string }> = [];

  try {
    // Prevent concurrent syncs
    const recentRun = await prisma.syncLog.findFirst({
      where: {
        type: "purchase_order",
        runAt: { gte: new Date(Date.now() - 60000) },
      },
    });

    if (recentRun) {
      console.log("[PO Sync] Already running, skipping");
      return NextResponse.json({
        message: "Sync already in progress",
        lastRun: recentRun.runAt,
      });
    }

    const lastSync = await getLastSyncTime("purchase_order");
    let page = 0;
    const limit = 100;

    console.log(
      `[PO Sync] Starting - Last sync: ${lastSync?.toISOString() || "never"}`
    );

    while (true) {
      const url = new URL(`${API_URL}/api/v1/purchase-orders`);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("page", String(page));

      if (lastSync) {
        url.searchParams.set("updated_at_gte", lastSync.toISOString());
      }

      console.log(`[PO Sync] Fetching page ${page}...`);

      const res = await fetchWithRetry(url.toString(), {
        headers: {
          Authorization: API_KEY,
          Account: ACCOUNT_ID,
          Accept: "application/json",
        },
      });

      const json = (await res.json()) as APIResponse;

      // Handle both possible response formats
      const data = json?.purchase_orders ?? json?.["purchase-orders"] ?? [];

      console.log(`[PO Sync] Received ${data.length} purchase orders`);

      if (data.length === 0) {
        console.log("[PO Sync] No more data to fetch");
        break;
      }

      // Process each purchase order
      for (const po of data) {
        try {
          const poId = String(po.id);

          await prisma.$transaction(async (tx) => {
            // Upsert the purchase order
            const upsertedPO = await tx.inventoryPlannerPurchaseOrder.upsert({
              where: { poId },
              update: {
                reference: po.reference ?? null,
                vendorId: po.vendor_id ?? null,
                vendorName: po.vendor_name ?? null,
                status: po.status ?? "unknown",
                createdAt: po.created_at ? new Date(po.created_at) : startedAt,
                expectedDate: po.expected_date
                  ? new Date(po.expected_date)
                  : null,
                currency: po.currency ?? null,
                totalValue:
                  typeof po.total_value === "number" ? po.total_value : null,
                lastUpdated: po.updated_at
                  ? new Date(po.updated_at)
                  : startedAt,
              },
              create: {
                poId,
                reference: po.reference ?? null,
                vendorId: po.vendor_id ?? null,
                vendorName: po.vendor_name ?? null,
                status: po.status ?? "unknown",
                createdAt: po.created_at ? new Date(po.created_at) : startedAt,
                expectedDate: po.expected_date
                  ? new Date(po.expected_date)
                  : null,
                currency: po.currency ?? null,
                totalValue:
                  typeof po.total_value === "number" ? po.total_value : null,
                lastUpdated: po.updated_at
                  ? new Date(po.updated_at)
                  : startedAt,
              },
            });

            // Delete existing line items for this PO to avoid duplicates
            await tx.inventoryPlannerPOLine.deleteMany({
              where: { purchaseOrderId: upsertedPO.id },
            });

            // Insert new line items (filter out items without required fields)
            if (Array.isArray(po.line_items) && po.line_items.length > 0) {
              const validItems = po.line_items.filter(
                (item) =>
                  item.sku &&
                  typeof item.quantity === "number" &&
                  item.quantity > 0
              );

              if (validItems.length > 0) {
                await tx.inventoryPlannerPOLine.createMany({
                  data: validItems.map((item) => ({
                    purchaseOrderId: upsertedPO.id,
                    sku: String(item.sku),
                    productName: item.title ?? null,
                    qtyOrdered: item.quantity!,
                    unitCost:
                      typeof item.cost_price === "number"
                        ? item.cost_price
                        : null,
                    totalCost:
                      typeof item.total_cost === "number"
                        ? item.total_cost
                        : null,
                  })),
                });
              }
            }
          });

          totalProcessed++;
        } catch (err: any) {
          const errorMsg = err?.message || String(err);
          errors.push({
            poId: String(po.id),
            error: errorMsg,
          });
          console.error(`[PO Sync] Failed to process PO ${po.id}:`, errorMsg);
        }
      }

      // Check if we should continue pagination
      if (json.meta) {
        const total = json.meta.total ?? 0;
        const fetched = (page + 1) * limit;

        if (data.length < limit || fetched >= total) {
          console.log(
            `[PO Sync] Pagination complete: processed ${fetched} / ${total}`
          );
          break;
        }
      } else {
        // No meta, just check if we got fewer items than limit
        if (data.length < limit) {
          console.log("[PO Sync] Last page reached");
          break;
        }
      }

      page++;
    }

    // Log completion
    const status = errors.length > 0 ? "partial_success" : "success";
    console.log(
      `[PO Sync] Complete - ${totalProcessed} processed, ${errors.length} errors`
    );

    await prisma.syncLog.create({
      data: {
        type: "purchase_order",
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
    console.error("[PO Sync] Fatal error:", errorMsg);

    await prisma.syncLog.create({
      data: {
        type: "purchase_order",
        status: "error",
        error: errorMsg,
        runAt: startedAt,
      },
    });

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
