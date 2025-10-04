import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalSyncs,
      successSyncs,
      lastForecastSync,
      lastPOSync,
      forecastCount,
      poCount,
    ] = await Promise.all([
      // Total syncs
      prisma.syncLog.count(),

      // Successful syncs
      prisma.syncLog.count({
        where: { status: "success" },
      }),

      // Last forecast sync
      prisma.syncLog.findFirst({
        where: { type: "forecast", status: "success" },
        orderBy: { runAt: "desc" },
      }),

      // Last PO sync
      prisma.syncLog.findFirst({
        where: { type: "purchase_order", status: "success" },
        orderBy: { runAt: "desc" },
      }),

      // Total forecast items
      prisma.forecastSuggestion.count(),

      // Total PO items
      prisma.inventoryPlannerPurchaseOrder.count(),
    ]);

    const successRate =
      totalSyncs > 0 ? Math.round((successSyncs / totalSyncs) * 100) : 0;

    return NextResponse.json({
      totalSyncs,
      successRate,
      lastForecastSync: lastForecastSync?.runAt || null,
      lastPOSync: lastPOSync?.runAt || null,
      forecastCount,
      poCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
