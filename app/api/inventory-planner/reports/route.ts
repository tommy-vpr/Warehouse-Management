// app/api/inventory-planner/reports/route.ts
import { NextResponse } from "next/server";

const API_URL = process.env.INVENTORY_PLANNER_API!;
const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!;

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  console.log("[Reports] Starting request...");

  try {
    if (!API_URL || !API_KEY || !ACCOUNT_ID) {
      console.error("[Reports] Missing env vars:", {
        hasURL: !!API_URL,
        hasKey: !!API_KEY,
        hasAccount: !!ACCOUNT_ID,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Missing API configuration. Check environment variables.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || "variants";
    const fields = searchParams.get("fields");
    const limit = searchParams.get("limit") || "50";
    const page = searchParams.get("page") || "0";
    const format = searchParams.get("format") || "json";
    const sort = searchParams.get("sort"); // NEW: Get sort parameter

    // Build API URL
    const url = new URL(`${API_URL}/${endpoint}`);

    // Only add pagination for list endpoints
    if (!endpoint.includes("/")) {
      url.searchParams.set("limit", limit);
      url.searchParams.set("page", page);

      // NEW: Add default sorting for purchase-orders
      if (endpoint === "purchase-orders" && !sort) {
        url.searchParams.set("created_at_sort", "desc"); // Sort by created date descending
      }
    }

    if (fields) {
      url.searchParams.set("fields", fields);
    }

    // Pass through filter params including sort
    searchParams.forEach((value, key) => {
      if (!["endpoint", "fields", "limit", "page", "format"].includes(key)) {
        url.searchParams.set(key, value);
      }
    });

    console.log(`[Reports] Fetching: ${url.toString()}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: API_KEY,
          Account: ACCOUNT_ID,
          Accept: format === "csv" ? "text/csv" : "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      console.log(`[Reports] Response status: ${res.status}`);

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Reports] API error response:`, errorText);
        throw new Error(
          `API error: ${res.status} ${res.statusText} - ${errorText.substring(
            0,
            200
          )}`
        );
      }

      if (format === "csv") {
        const csv = await res.text();
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${endpoint.replace(
              /\//g,
              "-"
            )}-${new Date().toISOString().split("T")[0]}.csv"`,
          },
        });
      }

      const text = await res.text();
      console.log(`[Reports] Response length: ${text.length} chars`);

      if (!text || text.trim() === "") {
        throw new Error("Empty response from API");
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error(
          `[Reports] JSON parse error. First 200 chars:`,
          text.substring(0, 200)
        );
        throw new Error("Invalid JSON response from API");
      }

      console.log(
        `[Reports] Successfully parsed response. Keys:`,
        Object.keys(data)
      );

      // Handle different response formats
      let responseData;
      if (endpoint.includes("/")) {
        responseData =
          data.variant || data["purchase-order"] || data.purchase_order || data;
      } else {
        responseData =
          data.variants ||
          data["purchase-orders"] ||
          data.purchase_orders ||
          data;
      }

      return NextResponse.json({
        success: true,
        endpoint,
        meta: data.meta || null,
        data: responseData,
      });
    } catch (fetchError: any) {
      if (fetchError.name === "AbortError") {
        throw new Error("Request timeout after 30 seconds");
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error("[Reports] Error:", error);
    console.error("[Reports] Error stack:", error.stack);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch report",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
