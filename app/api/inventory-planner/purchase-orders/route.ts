// app/api/inventory-planner/purchase-orders/route.ts
// UPDATED - Now includes barcode information
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const API_URL = process.env.INVENTORY_PLANNER_API!;
const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "open";
    const limit = searchParams.get("limit") || "100";
    const page = searchParams.get("page") || "0";

    console.log(
      `[PO API] Fetching POs: status=${status}, limit=${limit}, page=${page}`
    );

    // Build Inventory Planner API URL
    const url = new URL(`${API_URL}/purchase-orders`);
    url.searchParams.set("limit", limit);
    url.searchParams.set("page", page);

    // Add status filter (only if not "all")
    if (status !== "all") {
      url.searchParams.set("status", status);
    }

    // Add sorting (newest first)
    url.searchParams.set("created_at_sort", "desc");

    console.log(`[PO API] Request URL: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: API_KEY,
        Account: ACCOUNT_ID,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PO API] IP API error:`, errorText);
      throw new Error(`IP API error: ${response.status} - ${errorText}`);
    }

    const text = await response.text();
    console.log(`[PO API] Response length: ${text.length} chars`);

    if (!text || text.trim() === "") {
      throw new Error("Empty response from API");
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error(`[PO API] JSON parse error:`, text.substring(0, 200));
      throw new Error("Invalid JSON response");
    }

    console.log(`[PO API] Response keys:`, Object.keys(data));

    // ✅ Handle different response formats
    const rawPOs =
      data["purchase-orders"] ||
      data.purchase_orders ||
      data.purchaseOrders ||
      [];

    // ✅ Get all PO IDs for batch queries
    const poIds = rawPOs.map((po: any) => po.id);

    // ✅ Get all pending receiving sessions for these POs
    const pendingSessions = await prisma.receivingSession.findMany({
      where: {
        poId: { in: poIds },
        status: "PENDING",
        submittedAt: { not: null },
      },
      select: {
        poId: true,
      },
    });

    // Create a Set of PO IDs that have pending sessions
    const pendingPOIds = new Set(pendingSessions.map((s) => s.poId));

    // ✅ NEW: Get all barcodes for these POs
    const barcodes = await prisma.pOBarcode.findMany({
      where: {
        poId: { in: poIds },
      },
      select: {
        poId: true,
        id: true,
        status: true,
      },
    });

    // Create a map for quick barcode lookup
    const barcodeMap = new Map(
      barcodes.map((b) => [b.poId, { id: b.id, status: b.status }])
    );

    console.log(
      `[PO API] Found ${pendingPOIds.size} POs with pending sessions`
    );
    console.log(`[PO API] Found ${barcodes.length} POs with barcodes`);

    // ✅ Transform each PO to include line_items, pending status, and barcode info
    const purchaseOrders = rawPOs.map((po: any) => {
      const barcode = barcodeMap.get(po.id);

      return {
        id: po.id,
        reference: po.reference,
        vendor_name:
          po.vendor_display_name || po.vendor || po.source_display_name,
        status: po.status,
        created_at: po.created_at,
        expected_date: po.expected_date,
        total_cost: po.total,
        currency: po.currency,
        // ✅ Check if this PO has a pending receiving session
        hasPendingSession: pendingPOIds.has(po.id),
        // ✅ Include line items count for the list view
        line_items: (po.items || []).map((item: any) => ({
          sku: item.sku?.trim(),
          quantity_ordered: item.replenishment || item.remaining || 0,
        })),
        // ✅ NEW: Barcode information
        barcodeId: barcode?.id || null,
        barcodeStatus: barcode?.status || null,
        hasBarcode: !!barcode,
      };
    });

    console.log(`[PO API] Success - received ${purchaseOrders.length} POs`);

    return NextResponse.json({
      success: true,
      purchaseOrders,
      meta: data.meta || {},
    });
  } catch (error: any) {
    console.error("[PO API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        purchaseOrders: [],
      },
      { status: 500 }
    );
  }
}

// // app/api/inventory-planner/purchase-orders/route.ts
// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";

// export const dynamic = "force-dynamic";
// export const maxDuration = 60;

// const API_URL = process.env.INVENTORY_PLANNER_API!;
// const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
// const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!;

// export async function GET(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { searchParams } = new URL(request.url);
//     const status = searchParams.get("status") || "open";
//     const limit = searchParams.get("limit") || "100";
//     const page = searchParams.get("page") || "0";

//     console.log(
//       `[PO API] Fetching POs: status=${status}, limit=${limit}, page=${page}`
//     );

//     // Build Inventory Planner API URL
//     const url = new URL(`${API_URL}/purchase-orders`);
//     url.searchParams.set("limit", limit);
//     url.searchParams.set("page", page);

//     // Add status filter (only if not "all")
//     if (status !== "all") {
//       url.searchParams.set("status", status);
//     }

//     // Add sorting (newest first)
//     url.searchParams.set("created_at_sort", "desc");

//     console.log(`[PO API] Request URL: ${url.toString()}`);

//     const response = await fetch(url.toString(), {
//       headers: {
//         Authorization: API_KEY,
//         Account: ACCOUNT_ID,
//         Accept: "application/json",
//       },
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error(`[PO API] IP API error:`, errorText);
//       throw new Error(`IP API error: ${response.status} - ${errorText}`);
//     }

//     const text = await response.text();
//     console.log(`[PO API] Response length: ${text.length} chars`);

//     if (!text || text.trim() === "") {
//       throw new Error("Empty response from API");
//     }

//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch (parseError) {
//       console.error(`[PO API] JSON parse error:`, text.substring(0, 200));
//       throw new Error("Invalid JSON response");
//     }

//     console.log(`[PO API] Response keys:`, Object.keys(data));

//     // ✅ Handle different response formats
//     const rawPOs =
//       data["purchase-orders"] ||
//       data.purchase_orders ||
//       data.purchaseOrders ||
//       [];

//     // ✅ Get all pending receiving sessions for these POs
//     const pendingSessions = await prisma.receivingSession.findMany({
//       where: {
//         status: "PENDING",
//       },
//       select: {
//         poId: true,
//       },
//     });

//     // Create a Set of PO IDs that have pending sessions
//     const pendingPOIds = new Set(pendingSessions.map((s) => s.poId));

//     console.log(
//       `[PO API] Found ${pendingPOIds.size} POs with pending sessions`
//     );

//     // ✅ Transform each PO to include line_items and pending status
//     const purchaseOrders = rawPOs.map((po: any) => ({
//       id: po.id,
//       reference: po.reference,
//       vendor_name:
//         po.vendor_display_name || po.vendor || po.source_display_name,
//       status: po.status,
//       created_at: po.created_at,
//       expected_date: po.expected_date,
//       total_cost: po.total,
//       currency: po.currency,
//       // ✅ Check if this PO has a pending receiving session
//       hasPendingSession: pendingPOIds.has(po.id),
//       // ✅ Include line items count for the list view
//       line_items: (po.items || []).map((item: any) => ({
//         sku: item.sku?.trim(),
//         quantity_ordered: item.replenishment || item.remaining || 0,
//       })),
//     }));

//     console.log(`[PO API] Success - received ${purchaseOrders.length} POs`);

//     return NextResponse.json({
//       success: true,
//       purchaseOrders,
//       meta: data.meta || {},
//     });
//   } catch (error: any) {
//     console.error("[PO API] Error:", error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message,
//         purchaseOrders: [],
//       },
//       { status: 500 }
//     );
//   }
// }

// ==============================================
// Second
// ==============================================

// // app/api/inventory-planner/purchase-orders/route.ts
// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";

// export const dynamic = "force-dynamic";
// export const maxDuration = 60;

// const API_URL = process.env.INVENTORY_PLANNER_API!;
// const API_KEY = process.env.INVENTORY_PLANNER_KEY!;
// const ACCOUNT_ID = process.env.INVENTORY_PLANNER_ACCOUNT!;

// export async function GET(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { searchParams } = new URL(request.url);
//     const status = searchParams.get("status") || "open";
//     const limit = searchParams.get("limit") || "100";
//     const page = searchParams.get("page") || "0";

//     console.log(
//       `[PO API] Fetching POs: status=${status}, limit=${limit}, page=${page}`
//     );

//     // Build Inventory Planner API URL
//     const url = new URL(`${API_URL}/purchase-orders`);
//     url.searchParams.set("limit", limit);
//     url.searchParams.set("page", page);

//     // Add status filter (only if not "all")
//     if (status !== "all") {
//       url.searchParams.set("status", status);
//     }

//     // Add sorting (newest first)
//     url.searchParams.set("created_at_sort", "desc");

//     console.log(`[PO API] Request URL: ${url.toString()}`);

//     const response = await fetch(url.toString(), {
//       headers: {
//         Authorization: API_KEY,
//         Account: ACCOUNT_ID,
//         Accept: "application/json",
//       },
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error(`[PO API] IP API error:`, errorText);
//       throw new Error(`IP API error: ${response.status} - ${errorText}`);
//     }

//     const text = await response.text();
//     console.log(`[PO API] Response length: ${text.length} chars`);

//     if (!text || text.trim() === "") {
//       throw new Error("Empty response from API");
//     }

//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch (parseError) {
//       console.error(`[PO API] JSON parse error:`, text.substring(0, 200));
//       throw new Error("Invalid JSON response");
//     }

//     console.log(`[PO API] Response keys:`, Object.keys(data));

//     // ✅ Handle different response formats
//     const rawPOs =
//       data["purchase-orders"] ||
//       data.purchase_orders ||
//       data.purchaseOrders ||
//       [];

//     // ✅ Transform each PO to include line_items from items
//     const purchaseOrders = rawPOs.map((po: any) => ({
//       id: po.id,
//       reference: po.reference,
//       vendor_name:
//         po.vendor_display_name || po.vendor || po.source_display_name,
//       status: po.status,
//       created_at: po.created_at,
//       expected_date: po.expected_date,
//       total_cost: po.total,
//       currency: po.currency,
//       // ✅ Include line items count for the list view
//       line_items: (po.items || []).map((item: any) => ({
//         sku: item.sku?.trim(),
//         quantity_ordered: item.replenishment || item.remaining || 0,
//       })),
//     }));

//     console.log(`[PO API] Success - received ${purchaseOrders.length} POs`);

//     return NextResponse.json({
//       success: true,
//       purchaseOrders,
//       meta: data.meta || {},
//     });
//   } catch (error: any) {
//     console.error("[PO API] Error:", error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message,
//         purchaseOrders: [],
//       },
//       { status: 500 }
//     );
//   }
// }
