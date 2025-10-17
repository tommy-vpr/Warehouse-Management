// app/api/inventory-planner/inventory/route.ts
import { NextResponse } from "next/server";

const API_URL = process.env.INVENTORY_PLANNER_API!;
const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!;

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  console.log("[Inventory API] Starting request...");

  try {
    if (!API_URL || !API_KEY || !ACCOUNT_ID) {
      return NextResponse.json(
        { success: false, error: "Missing API configuration" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") || "50";
    const page = searchParams.get("page") || "0";
    const filter = searchParams.get("filter") || "all";
    const search = searchParams.get("search") || "";

    // Build API URL for variants endpoint
    const url = new URL(`${API_URL}/variants`);
    url.searchParams.set("limit", limit);
    url.searchParams.set("page", page);

    // Request specific fields for inventory view
    url.searchParams.set(
      "fields",
      "id,sku,title,in_stock,replenishment,oos,cost_price,vendor,lead_time,review_period,safety_stock,price,barcode"
    );

    // Apply filters
    if (filter === "low-stock") {
      url.searchParams.set("oos_lte", "30");
    } else if (filter === "reorder") {
      url.searchParams.set("replenishment_gt", "0");
    } else if (filter === "out-of-stock") {
      url.searchParams.set("in_stock_lte", "0");
    } else if (filter === "negative") {
      url.searchParams.set("in_stock_lt", "0");
    }

    // Search by SKU
    if (search) {
      url.searchParams.set("sku_match", search); // Use sku_match for partial search
    }

    console.log(`[Inventory API] Fetching: ${url.toString()}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: API_KEY,
          Account: ACCOUNT_ID,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      console.log(`[Inventory API] Response status: ${res.status}`);

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Inventory API] Error:`, errorText);
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log(
        `[Inventory API] Successfully fetched ${
          data.variants?.length || 0
        } variants`
      );

      // Transform data
      const inventory = (data.variants || []).map((variant: any) => ({
        id: variant.id,
        sku: variant.sku,
        productName: variant.title,
        vendorId: variant.vendor,
        currentStock: variant.in_stock,
        daysOfStock: variant.oos,
        safetyStock: variant.safety_stock,
        leadTimeDays: variant.lead_time,
        recommendedQty: variant.replenishment,
        unitCost: variant.cost_price,
        price: variant.price,
        barcode: variant.barcode,
        replenishment: variant.replenishment,
        reviewPeriod: variant.review_period,
      }));

      // Calculate stats from current page
      const totalStock = inventory.reduce(
        (sum: number, item: any) => sum + (item.currentStock || 0),
        0
      );
      const totalDaysOfStock = inventory.reduce(
        (sum: number, item: any) => sum + (item.daysOfStock || 0),
        0
      );
      const avgDaysOfStock =
        inventory.length > 0
          ? Math.round(totalDaysOfStock / inventory.length)
          : 0;
      const lowStockItems = inventory.filter(
        (item: any) => item.daysOfStock !== null && item.daysOfStock <= 30
      ).length;
      const outOfStockItems = inventory.filter(
        (item: any) => item.currentStock !== null && item.currentStock <= 0
      ).length;
      const reorderNeeded = inventory.reduce(
        (sum: number, item: any) => sum + (item.recommendedQty || 0),
        0
      );

      const stats = {
        totalItems: data.meta?.total || inventory.length,
        totalStock,
        avgDaysOfStock,
        lowStockItems,
        outOfStockItems,
        reorderNeeded,
      };

      return NextResponse.json({
        success: true,
        data: {
          inventory,
          total: data.meta?.total || inventory.length,
          page: parseInt(page),
          limit: parseInt(limit),
          stats: parseInt(page) === 0 ? stats : undefined, // Only return stats on first page
        },
        meta: data.meta,
      });
    } catch (fetchError: any) {
      if (fetchError.name === "AbortError") {
        throw new Error("Request timeout after 30 seconds");
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error("[Inventory API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch inventory",
      },
      { status: 500 }
    );
  }
}
