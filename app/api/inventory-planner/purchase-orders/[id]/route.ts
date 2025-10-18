// app/api/inventory-planner/purchase-orders/[id]/route.ts
// FINAL WORKING VERSION
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const API_URL = process.env.INVENTORY_PLANNER_API!;
const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const poId = params.id;
    console.log(`[PO API] Fetching PO: ${poId}`);

    const url = `${API_URL}/purchase-orders/${poId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: API_KEY,
        Account: ACCOUNT_ID,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PO API] API error:`, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      throw new Error("Empty response from API");
    }

    const data = JSON.parse(text);

    // ✅ CRITICAL: Extract the purchase order from the wrapper
    // The API returns: { "purchase-order": { ... } }
    const po = data["purchase-order"] || data.purchase_order || data;

    console.log(`[PO API] Found ${po.items?.length || 0} items`);

    // Transform items to line_items
    const line_items = (po.items || []).map((item: any) => ({
      id: item.id || item.line_id,
      sku: (item.sku || "").trim(), // Trim whitespace
      product_name: item.title || item.title_original || "Unknown Product",
      quantity_ordered: item.replenishment || item.remaining || 0,
      quantity_received: item.received || 0,
      unit_cost: item.cost_price || item.landing_cost_price || 0,
    }));

    // Build purchase order
    const purchaseOrder = {
      id: po.id,
      reference: po.reference,
      vendor_name:
        po.vendor_display_name ||
        po.warehouse_display_name ||
        po.source_display_name ||
        po.vendor ||
        "Unknown Vendor",
      status: po.status || "unknown",
      created_at: po.created_at || po.created_date,
      expected_date: po.expected_date,
      total_cost: po.total || 0,
      currency: po.currency || "USD",
      line_items: line_items,
    };

    console.log(
      `[PO API] Success - PO #${purchaseOrder.reference} with ${line_items.length} items`
    );

    return NextResponse.json({
      success: true,
      purchaseOrder,
    });
  } catch (error: any) {
    console.error("[PO API] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
