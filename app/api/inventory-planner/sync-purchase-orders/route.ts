import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getLastSyncTime } from "@/lib/getLastSyncTime";

const API_URL = process.env.INVENTORY_PLANNER_API!;
const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!; // <-- add this to .env

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
  items?: Array<{
    sku: string;
    title?: string; // <-- was product_name
    replenishment?: number; // <-- was qty_ordered
    cost_price?: number; // <-- was unit_cost
    ordered_cost?: number; // <-- was total_cost
  }>;
}

interface APIResponse {
  meta: { total: number; count: number; limit: number; page: number };
  ["purchase-orders"]: IPPurchaseOrder[];
}

export async function GET() {
  const startedAt = new Date();
  let totalProcessed = 0;
  const errors: Array<{ poId: string; error: string }> = [];

  try {
    const lastSync = await getLastSyncTime("purchase_order");
    let page = 0;
    const limit = 100;

    console.log(`[PO Sync] Starting - Last sync: ${lastSync || "never"}`);

    while (true) {
      const url = new URL(`${API_URL}/purchase-orders`);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("page", String(page));

      console.log(`[PO Sync] Fetching page ${page}...`);

      const res = await fetchWithRetry(url.toString(), {
        headers: {
          Authorization: API_KEY,
          Account: ACCOUNT_ID,
          Accept: "application/json",
        },
      });

      const json = (await res.json()) as APIResponse;
      const data = json?.["purchase-orders"] ?? [];

      if (data.length === 0) break;

      // process data...

      totalProcessed += data.length;

      // ✅ safer break condition
      const total = json.meta?.total ?? 0;
      const end = (page + 1) * limit;
      if (end >= total) {
        console.log(`[PO Sync] Reached end: processed ${end} / ${total}`);
        break;
      }

      page++;
    }

    const status = errors.length > 0 ? "partial_success" : "success";
    await prisma.syncLog.create({
      data: {
        type: "purchase_order",
        status,
        count: totalProcessed,
        error: errors.length ? JSON.stringify(errors.slice(0, 10)) : null,
        runAt: startedAt,
      },
    });

    return NextResponse.json({ success: true, count: totalProcessed, status });
  } catch (error: any) {
    await prisma.syncLog.create({
      data: {
        type: "purchase_order",
        status: "error",
        error: error.message,
        runAt: startedAt,
      },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
