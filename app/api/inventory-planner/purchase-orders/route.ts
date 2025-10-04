// app/api/inventory-planner/purchase-orders/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 0);
  const limit = Number(searchParams.get("limit") || 20);

  const [orders, total] = await Promise.all([
    prisma.inventoryPlannerPurchaseOrder.findMany({
      skip: page * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        poId: true,
        reference: true,
        vendorName: true,
        status: true,
        createdAt: true,
        expectedDate: true,
        totalValue: true,
      },
    }),
    prisma.inventoryPlannerPurchaseOrder.count(),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}
