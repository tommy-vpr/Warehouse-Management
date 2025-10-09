// app/api/inventory-planner/test/route.ts
import { NextResponse } from "next/server";

const API_URL = process.env.INVENTORY_PLANNER_API!;
const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!;

export async function GET() {
  const tests: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    connection: {},
  };

  // Test 1: Environment Variables
  console.log("[Test] Checking environment variables...");
  tests.environment = {
    API_URL: {
      exists: !!API_URL,
      value: API_URL || "MISSING",
    },
    API_KEY: {
      exists: !!API_KEY,
      length: API_KEY?.length || 0,
      preview: API_KEY ? `${API_KEY.substring(0, 10)}...` : "MISSING",
    },
    ACCOUNT_ID: {
      exists: !!ACCOUNT_ID,
      value: ACCOUNT_ID || "MISSING",
    },
  };

  if (!API_URL || !API_KEY || !ACCOUNT_ID) {
    return NextResponse.json({
      success: false,
      error: "Missing required environment variables",
      tests,
    });
  }

  // Test 2: API Connection
  console.log("[Test] Testing API connection...");
  try {
    // FIX: Don't add /api/v1 again - it's already in API_URL
    const testUrl = `${API_URL}/variants?limit=1&page=0`;
    console.log(`[Test] Calling: ${testUrl}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const startTime = Date.now();
    const res = await fetch(testUrl, {
      headers: {
        Authorization: API_KEY,
        Account: ACCOUNT_ID,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const responseTime = Date.now() - startTime;
    console.log(`[Test] Response: ${res.status} in ${responseTime}ms`);

    tests.connection = {
      status: res.status,
      statusText: res.statusText,
      responseTime: `${responseTime}ms`,
      ok: res.ok,
    };

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Test] Error response:`, errorText);

      return NextResponse.json({
        success: false,
        error: `API returned ${res.status}`,
        tests,
        apiResponse: errorText.substring(0, 500),
        possibleIssues: [
          res.status === 401 ? "Invalid API Key" : null,
          res.status === 403
            ? "Invalid Account ID or insufficient permissions"
            : null,
          res.status === 404 ? "Wrong API URL or endpoint doesn't exist" : null,
          res.status >= 500
            ? "Inventory Planner API is down or having issues"
            : null,
        ].filter(Boolean),
      });
    }

    // Parse response
    const data = await res.json();
    console.log(`[Test] Response data keys:`, Object.keys(data));

    tests.connection.dataReceived = {
      hasVariants: !!data.variants,
      variantCount: data.variants?.length || 0,
      hasMeta: !!data.meta,
      metaTotal: data.meta?.total,
    };

    return NextResponse.json({
      success: true,
      message:
        "✅ All tests passed! Your Inventory Planner API connection is working.",
      tests,
      sampleData: data.variants?.[0]
        ? {
            sku: data.variants[0].sku,
            title: data.variants[0].title,
            hasWarehouse: !!data.variants[0].warehouse,
          }
        : null,
    });
  } catch (error: any) {
    console.error("[Test] Connection error:", error);

    tests.connection = {
      error: error.message,
      errorType: error.name,
    };

    return NextResponse.json({
      success: false,
      error: "Failed to connect to Inventory Planner API",
      tests,
      possibleIssues: [
        error.name === "AbortError"
          ? "Request timeout - API is slow or unreachable"
          : null,
        error.message.includes("fetch")
          ? "Network error - check if API URL is correct"
          : null,
        error.message.includes("ENOTFOUND")
          ? "DNS error - API URL is invalid"
          : null,
      ].filter(Boolean),
    });
  }
}
